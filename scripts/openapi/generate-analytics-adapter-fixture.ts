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
const verifiedNames = [
  'trace_id',
  'metadata',
  'status_code',
  'api_key_ids',
  'ai_org_model',
  'total_units_min',
  'total_units_max',
  'cost_min',
  'cost_max',
];
const operations = ['requests', 'cost', 'tokens', 'latency'].map((metric) => {
  const upstreamPath = `/analytics/graphs/${metric}`;
  const operation = spec.paths?.[upstreamPath]?.get;
  assert(operation);
  const queries = (operation.parameters ?? []).filter(
    (parameter) => 'in' in parameter && parameter.in === 'query',
  );
  const filters = queries.filter(
    (parameter) => 'name' in parameter && verifiedNames.includes(parameter.name),
  );
  assert.equal(filters.length, verifiedNames.length);
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
        'SCM uses camel-case query names and a distinct envelope. One trace, string-valued metadata, status/API-key/provider-model CSV lists and inclusive total-token/cost bounds are verified. Other upstream filters and the complete aggregation contract remain unimplemented.',
      operations,
    },
    null,
    2,
  ) + '\n',
);
