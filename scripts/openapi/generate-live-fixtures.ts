/** @internal Freeze already-redacted live response structures for offline regression tests. */
import { readFileSync } from 'node:fs';
import { emitPatch } from './emit-patch.js';
const sources = [
  'gateway-extensions',
  'gateway-owned-writes',
  'gateway-secret-references',
  'gateway-usage-reset',
  'gateway-mcp-discovery',
  'gateway-mcp-public',
];
const reports = sources.map(
  (name) =>
    JSON.parse(readFileSync(`artifacts/e2e/${name}-canonical-responses.json`, 'utf8')) as {
      capturedAt: string;
      redaction: string;
      fixtures: { method: string; path: string; validator: string; body: unknown }[];
    },
);
const unique = new Map<string, (typeof reports)[number]['fixtures'][number]>();
for (const report of reports)
  for (const fixture of report.fixtures)
    unique.set(JSON.stringify([fixture.validator, fixture.body]), fixture);
emitPatch(
  'test/ai-gateway/fixtures/live-responses.json',
  JSON.stringify(
    {
      source: 'Live SCM synthetic-value response fixtures, September 6–7, 2026',
      redaction: reports[0].redaction,
      capturedAt: reports.map((r) => r.capturedAt),
      fixtures: [...unique.values()],
    },
    null,
    2,
  ) + '\n',
);
