/** @internal Freeze upstream query declarations; SCM corrections remain explicitly partial. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { loadContractSpec } from './compatibility.js';
import { emitPatch } from './emit-patch.js';

const file =
  process.env.GATEWAY_OPENAPI_FILE ??
  '/home/cdot/development/others/ai-gateway-openapi/openapi.yaml';
const spec = await loadContractSpec(file, 'gateway');
const operations = ['requests', 'cost', 'tokens', 'latency'].map((metric) => {
  const upstreamPath = `/analytics/graphs/${metric}`;
  const operation = spec.paths?.[upstreamPath]?.get;
  assert(operation);
  const queries = (operation.parameters ?? []).filter(
    (parameter) => 'in' in parameter && parameter.in === 'query',
  );
  const filters = queries.filter(
    (parameter) => 'name' in parameter && ['trace_id', 'metadata'].includes(parameter.name),
  );
  assert.equal(filters.length, 2);
  return {
    metric,
    method: 'GET',
    upstreamPath,
    scmPath: `/logs/charts/${metric}`,
    declaredQueryNames: queries.map((parameter) => ('name' in parameter ? parameter.name : '')),
    filters,
  };
});
emitPatch(
  'test/openapi/analytics-adapters.json',
  JSON.stringify(
    {
      source: 'ai-gateway-openapi/openapi.yaml',
      sha256: createHash('sha256').update(readFileSync(file)).digest('hex'),
      classification: 'scm-adapted-partial',
      correction:
        'SCM uses camel-case traceId and a distinct envelope. Only one trace and string-valued metadata are exposed; the complete upstream query/aggregation contract is not implemented.',
      operations,
    },
    null,
    2,
  ) + '\n',
);
