/** @internal Capture replayable synthetic-value fixtures from live SCM response structures. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { collectCallSites, normalizePath } from '../openapi/inventory.js';
import { resolveValidator } from '../openapi/validators.js';
import { abortable } from '../../src/http/abort.js';

function redact(value: unknown, key = ''): unknown {
  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1 ? 1 : 0;
  if (Array.isArray(value)) return value.slice(0, 2).map((v) => redact(v));
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [
        /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(k)
          ? '550e8400-e29b-41d4-a716-446655440000'
          : /https?:|@|eyJ/.test(k)
            ? 'redacted-key'
            : k,
        redact(v, k),
      ]),
    );
  if (/secret|token|key|password|credential/i.test(key)) return '[REDACTED]';
  if (/^id$|_id$|uuid/.test(key)) return '550e8400-e29b-41d4-a716-446655440000';
  if (/_at$|timestamp/.test(key)) return '2026-09-06T00:00:00Z';
  if (/url|host/.test(key)) return 'https://example.invalid';
  if (
    ['status', 'object', 'type'].includes(key) &&
    [
      'active',
      'archived',
      'draft',
      'list',
      'success',
      'error',
      'tool',
      'resource',
      'prompt',
    ].includes(String(value))
  )
    return value;
  return 'synthetic-redacted-value';
}

export function observeGatewayFixtures(name: string) {
  const originalFetch = globalThis.fetch;
  const calls = collectCallSites().filter((c) => c.plane === 'gateway' && c.responseSchema);
  const fixtures: { method: string; path: string; validator: string; body: unknown }[] = [];
  let unrepresentable = 0;
  globalThis.fetch = async (input, options) => {
    const response = await originalFetch(input, options);
    const path = new URL(String(input)).pathname.replace(/^\/ai_gw\/(?:admin\/)?v2/, '');
    const method = options?.method ?? 'GET';
    if (response.ok && String(input).includes('/ai_gw/')) {
      const call = calls.find(
        (c) =>
          c.method === method &&
          new RegExp(
            '^' +
              normalizePath(c.path)
                .split('{}')
                .map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
                .join('[^/]+') +
              '$',
          ).test(path),
      );
      if (call?.responseSchema) {
        try {
          const pendingBody = response.clone().json();
          const body = redact(
            await (options?.signal ? abortable(pendingBody, options.signal) : pendingBody),
          );
          if (resolveValidator(call.responseSchema)?.safeParse(body).success)
            fixtures.push({ method, path: call.path, validator: call.responseSchema, body });
          else unrepresentable++;
        } catch {
          /* Empty/non-JSON responses are covered by transport tests. */
        }
      }
    }
    return response;
  };
  return () => {
    globalThis.fetch = originalFetch;
    mkdirSync('artifacts/e2e', { recursive: true });
    writeFileSync(
      `artifacts/e2e/${name}-canonical-responses.json`,
      JSON.stringify(
        {
          capturedAt: new Date().toISOString(),
          redaction:
            'Live structural response fixtures; all free strings, identifiers, timestamps and numeric quantities replaced with synthetic values. Not original customer payloads.',
          unrepresentable,
          fixtures,
        },
        null,
        2,
      ) + '\n',
    );
  };
}
