/** Shared safety helpers for executable documentation, not part of the SDK API. */
import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { AISecSDKException } from '@cdot65/prisma-airs-sdk';

export const exampleName = `sdk-example-${randomUUID().slice(0, 8)}`;
const fixtures: { resource: string; id: string; name: string }[] = [];
export function recordExampleFixture(resource: string, id: string, name = exampleName): void {
  fixtures.push({ resource, id, name });
  const path = process.env.E2E_EXAMPLE_JOURNAL;
  if (path) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify(fixtures, null, 2) + '\n', { mode: 0o600 });
  }
}
export function reportExampleError(error: unknown): void {
  process.exitCode = 1;
  console.error(
    'Example failed:',
    error instanceof AISecSDKException
      ? `${error.errorType}${error.statusCode ? ` HTTP ${error.statusCode}` : ''}`
      : error instanceof Error
        ? error.name
        : 'UnknownError',
  );
}
