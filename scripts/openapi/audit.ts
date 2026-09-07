/** @internal Strict source-based audit. Requires the separately checked-out upstream specifications. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { inventory } from './inventory.js';
import { fieldCoverage } from './fields.js';
import { checkConformance } from './conformance.js';
import { negativeConformance } from './negative-conformance.js';
import { queryConformance } from './query-conformance.js';
import { gatewayInventory } from './gateway-inventory.js';
import { gatewayDisposition, gatewayExperimental } from './gateway-status.js';
import { compatibilityCorrections } from './compatibility.js';
import { fullOperationAcceptance } from './acceptance.js';

const domains = await inventory();
const gateway = await gatewayInventory();
// Query checks temporarily mock global fetch, so keep them outside concurrent work.
const query = await queryConformance();
const [
  requests,
  responses,
  positiveRequest,
  positiveResponse,
  negative,
  gatewayRequests,
  gatewayResponses,
] = await Promise.all([
  fieldCoverage('request', true, domains),
  fieldCoverage('response', true, domains),
  checkConformance('request', true),
  checkConformance('response', true),
  negativeConformance(),
  fieldCoverage('request', true, [gateway]),
  fieldCoverage('response', true, [gateway]),
]);
const fieldMetric = (r: {
  modeled: number;
  total: number;
  percentage: number;
  missing: unknown[];
}) => ({ modeled: r.modeled, total: r.total, percentage: r.percentage, missing: r.missing });
const samples = (r: { ok: boolean }[]) => ({
  passed: r.filter((v) => v.ok).length,
  total: r.length,
  failures: r.filter((v) => !v.ok),
});
const report = {
  generatedAt: new Date().toISOString(),
  scope:
    'AIRS corrected operation contracts; Portkey exact-route typed fields only. Classification is not implementation coverage.',
  fullOperationAcceptance: fullOperationAcceptance([...domains, gateway]),
  sources: domains.map((d) => ({
    plane: d.plane,
    file: d.file,
    sha256: d.sha256,
    operations: d.operations.length,
    implemented: d.operations.filter((o) => o.implementations.length).length,
  })),
  corrections: compatibilityCorrections,
  airs: {
    requests: fieldMetric(requests),
    responses: fieldMetric(responses),
    positiveRequest: samples(positiveRequest),
    positiveResponse: samples(positiveResponse),
    negativeRequest: samples(negative),
    query: {
      ...samples(query),
      serialization:
        'Exact OpenAPI form/explode semantics, without comma/repeated-key normalization',
      multiItemArrayParameters: query.filter((result) => (result.arrayItems ?? 0) >= 2).length,
    },
  },
  gateway: {
    source: 'ai-gateway-openapi/openapi.yaml',
    sha256: gateway.sha256,
    total: gateway.operations.length,
    directOperations: gateway.operations.filter((o) => o.implementations.length).length,
    requests: fieldMetric(gatewayRequests),
    responses: fieldMetric(gatewayResponses),
    experimental: gatewayExperimental,
    operations: gateway.operations.map((o) => ({
      method: o.method,
      path: o.path,
      operationId: o.operationId,
      ...gatewayDisposition(o.method, o.path, !!o.implementations.length),
      implementations: o.implementations.map((c) => ({ source: c.source, member: c.member })),
    })),
  },
};
mkdirSync('artifacts/openapi', { recursive: true });
writeFileSync('artifacts/openapi/audit.json', JSON.stringify(report, null, 2) + '\n');
console.log(
  JSON.stringify(
    {
      ...report,
      corrections: report.corrections.map((c) => c.id),
      gateway: { ...report.gateway, operations: undefined },
    },
    null,
    2,
  ),
);
if (
  report.sources.some((d) => d.implemented !== d.operations) ||
  (process.argv.includes('--require-full-coverage') && !report.fullOperationAcceptance.passed) ||
  [requests, responses, gatewayRequests, gatewayResponses].some((r) => r.percentage < 99) ||
  [...positiveRequest, ...positiveResponse, ...negative, ...query].some((r) => !r.ok)
)
  process.exitCode = 1;
