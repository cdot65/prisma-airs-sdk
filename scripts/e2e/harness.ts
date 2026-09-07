/** @internal Secret-free live test reporting and bounded fixture lifecycle support. */
import { mkdirSync, writeFileSync, renameSync, unlinkSync, existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { basename, dirname, resolve } from 'node:path';
import { AISecSDKException } from '../../src/index.js';

/** Atomic journals with POSIX owner-only modes. Windows users must protect directory ACLs. */
export function writePrivateReport(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const temporary = resolve(dirname(path), `.${basename(path)}.${randomUUID()}.tmp`);
  try {
    writeFileSync(temporary, JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    renameSync(temporary, path);
  } finally {
    if (existsSync(temporary)) unlinkSync(temporary);
  }
}

export interface LiveResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  durationMs: number;
  errorType?: string;
  statusCode?: number;
  reason?: string;
}

export class LiveHarness {
  constructor(private readonly directory = resolve('artifacts/e2e')) {}
  readonly results: LiveResult[] = [];
  readonly startedAt = new Date().toISOString();
  private readonly cleanups: { name: string; action: () => Promise<unknown> }[] = [];
  readonly fixtures: { resource: string; id: string; name: string }[] = [];
  readonly responseShapes: { operation: string; shape: unknown }[] = [];
  private readonly sensitiveValues = new Set(
    Object.entries(process.env)
      .filter(([key]) => key.startsWith('PANW_'))
      .map(([, value]) => value)
      .filter((v): v is string => !!v && v.length > 3),
  );

  protect(value: unknown): void {
    if (typeof value === 'string' && value.length > 3) this.sensitiveValues.add(value);
    else if (Array.isArray(value)) value.forEach((item) => this.protect(item));
    else if (value && typeof value === 'object')
      Object.values(value).forEach((item) => this.protect(item));
  }

  captureResponseShape(operation: string, value: unknown): void {
    this.responseShapes.push({ operation, shape: responseShape(value) });
  }

  own(resource: string, id: string, name: string): void {
    this.fixtures.push({ resource, id, name });
    const directory = this.directory;
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    writePrivateReport(
      resolve(directory, `fixtures-${this.startedAt.replaceAll(':', '-')}.json`),
      this.fixtures,
    );
  }

  defer(name: string, action: () => Promise<unknown>): void {
    this.cleanups.push({ name, action });
  }

  async cleanup(): Promise<void> {
    for (const item of this.cleanups.splice(0).reverse())
      await this.check(`cleanup.${item.name}`, item.action);
  }

  async check<T>(name: string, action: () => Promise<T>): Promise<T | undefined> {
    const started = Date.now();
    let value: T | undefined;
    try {
      value = await action();
      if (value !== undefined)
        this.responseShapes.push({ operation: name, shape: responseShape(value) });
      this.results.push({ name, status: 'PASS', durationMs: Date.now() - started });
    } catch (error) {
      if (process.env.E2E_DIAGNOSTICS === '1' && error instanceof Error) {
        let summary = error.message;
        for (const secret of [...this.sensitiveValues].sort((a, b) => b.length - a.length))
          summary = summary.replaceAll(secret, '[REDACTED]');
        summary = summary.replace(/Bearer\s+\S+|eyJ[A-Za-z0-9_.-]+/g, '[REDACTED]');
        console.log(JSON.stringify({ name, diagnostic: summary.slice(0, 1000) }));
      }
      this.results.push({
        name,
        status: 'FAIL',
        durationMs: Date.now() - started,
        ...(error instanceof AISecSDKException
          ? { errorType: error.errorType, statusCode: error.statusCode }
          : { errorType: error instanceof Error ? error.name : 'UnknownError' }),
      });
    }
    console.log(JSON.stringify(this.results.at(-1)));
    return value;
  }

  skip(name: string, reason: string): void {
    const result: LiveResult = { name, status: 'SKIP', durationMs: 0, reason };
    this.results.push(result);
    console.log(JSON.stringify(result));
  }

  finish(name: string, credentialsUnchanged: boolean): void {
    const report = {
      startedAt: this.startedAt,
      finishedAt: new Date().toISOString(),
      credentialsUnchanged,
      total: this.results.length,
      passed: this.results.filter((r) => r.status === 'PASS').length,
      failed: this.results.filter((r) => r.status === 'FAIL').length,
      skipped: this.results.filter((r) => r.status === 'SKIP').length,
      results: this.results,
      fixtures: this.fixtures,
    };
    const directory = this.directory;
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    writePrivateReport(resolve(directory, `${name}.json`), report);
    const history = resolve(directory, 'history');
    mkdirSync(history, { recursive: true, mode: 0o700 });
    writePrivateReport(
      resolve(history, `${name}-${this.startedAt.replaceAll(':', '-')}.json`),
      report,
    );
    writePrivateReport(resolve(directory, `${name}-response-shapes.json`), {
      startedAt: this.startedAt,
      redaction:
        'All scalar values removed; arrays retain up to two structural exemplars. These are live shape evidence, not replayable response bodies.',
      responses: this.responseShapes,
    });
    console.log(JSON.stringify({ ...report, results: undefined }));
    if (report.failed || !credentialsUnchanged) process.exitCode = 1;
  }
}

/** Irreversible structural evidence: no scalar values, tokens, URLs or customer text are retained. */
function responseShape(value: unknown): unknown {
  if (value === null) return '<null>';
  if (Array.isArray(value)) return value.slice(0, 2).map(responseShape);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [
        /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(key)
          ? '<uuid-key>'
          : /https?:|@|eyJ/.test(key)
            ? '<redacted-key>'
            : key,
        responseShape(child),
      ]),
    );
  return `<${typeof value}>`;
}
