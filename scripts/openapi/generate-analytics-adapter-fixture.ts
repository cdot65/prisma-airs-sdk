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
const groups = process.argv.includes('--groups');
const targets = groups
  ? [
      { metric: 'users', upstreamPath: '/analytics/groups/users', scmPath: '/logs/groups/users' },
      {
        metric: 'model',
        upstreamPath: '/analytics/groups/ai-models',
        scmPath: '/logs/groups/model',
      },
      {
        metric: 'provider',
        upstreamPath: '/analytics/groups/provider',
        scmPath: '/logs/groups/provider',
      },
    ]
  : ['requests', 'cost', 'tokens', 'latency'].map((metric) => ({
      metric,
      upstreamPath: `/analytics/graphs/${metric}`,
      scmPath: `/logs/charts/${metric}`,
    }));
const operations = targets.map(({ metric, upstreamPath, scmPath }) => {
  const operation = spec.paths?.[upstreamPath]?.get;
  assert(operation);
  const queries = (operation.parameters ?? []).filter(
    (parameter) => 'in' in parameter && parameter.in === 'query',
  );
  // The pinned provider grouping does not declare trace_id. SCM independently supports
  // traceId there; retain that as an SCM extension, not a fabricated upstream declaration.
  const matchedNames =
    groups && metric === 'provider'
      ? verifiedNames.filter((name) => name !== 'trace_id')
      : verifiedNames;
  const filters = queries.filter(
    (parameter) => 'name' in parameter && matchedNames.includes(parameter.name),
  );
  assert.equal(filters.length, matchedNames.length);
  return {
    metric,
    method: 'GET',
    upstreamPath,
    scmPath,
    ...(groups ? { scmOnlyFilters: metric === 'provider' ? ['traceId'] : [] } : {}),
    declaredQueryNames: queries.map((parameter) => ('name' in parameter ? parameter.name : '')),
    filters,
  };
});
emitPatch(
  groups ? 'test/openapi/analytics-group-adapters.json' : 'test/openapi/analytics-adapters.json',
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
