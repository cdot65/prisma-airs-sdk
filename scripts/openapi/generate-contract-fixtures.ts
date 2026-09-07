/** @internal Emit credential-free transport fixtures derived from the pinned OpenAPI sources.
 * Commit these snapshots so CI runs without a local pan.dev checkout.
 */
import { join } from 'node:path';
import { emitPatch } from './emit-patch.js';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { collectCallSites, inventory, normalizePath, root } from './inventory.js';
import { loadContractSpec, compatibilityCorrections } from './compatibility.js';
import { specimen, type Schema } from './conformance.js';
import { querySpecimen, queryWireValues, type QueryParameter } from './query-fixtures.js';

type Operation = {
  security?: unknown[];
  parameters?: QueryParameter[];
  requestBody?: { content?: Record<string, { schema?: Schema }> };
  responses?: Record<string, { content?: Record<string, { schema?: Schema }> }>;
};
const plane = process.argv[2];
const domains = await inventory();
let domain = domains.find((d) => d.plane === plane);
if (plane === 'gateway' || plane === 'gateway-runtime') {
  const file =
    process.env.GATEWAY_OPENAPI_FILE ??
    '/home/cdot/development/others/ai-gateway-openapi/openapi.yaml';
  const spec = await loadContractSpec(file, plane);
  const calls = collectCallSites().filter(
    (c) =>
      c.plane === 'gateway' &&
      (plane === 'gateway-runtime'
        ? /\/(inference|runtime-resources)-client/.test(c.source)
        : /\/(mcp-servers|usage-limits|rate-limits|log-exports|secret-references|model-pricing)-client/.test(
            c.source,
          ) ||
          ['getMcpServers', 'syncMcpServers', 'upsertMcpServer', 'deleteModels'].includes(
            c.member,
          ) ||
          (c.member === 'getWorkspaces' && c.source.includes('mcp-integrations'))),
  );
  domain = {
    plane: 'gateway' as never,
    file,
    sha256: createHash('sha256').update(readFileSync(file)).digest('hex'),
    components: 0,
    operations: Object.entries(spec.paths ?? {})
      .flatMap(([path, item]) =>
        Object.keys(item ?? {})
          .filter((method) => ['get', 'post', 'put', 'patch', 'delete'].includes(method))
          .map((method) => ({
            path,
            method: method.toUpperCase(),
            operationId: undefined,
            implementations: calls.filter(
              (c) =>
                c.method === method.toUpperCase() && normalizePath(c.path) === normalizePath(path),
            ),
          })),
      )
      .filter((op) => op.implementations.length > 0),
  };
}
if (!domain) throw new Error('Pass one of the inventory plane names, or gateway');
const spec = await loadContractSpec(
  plane === 'gateway' || plane === 'gateway-runtime'
    ? domain.file
    : join(process.env.AIRS_OPENAPI_DIR ?? join(root, 'schemas'), domain.file),
  plane === 'gateway-runtime' ? 'gateway' : plane,
);
const cases = domain.operations.flatMap((operation) => {
  const item = spec.paths?.[operation.path] as Record<string, unknown>;
  const op = item[operation.method.toLowerCase()] as Operation;
  const parameters = [...((item as Operation).parameters ?? []), ...(op.parameters ?? [])];
  // Gateway multipart has dedicated native FormData + exact-byte contract tests. AIRS
  // CSV uploads are exercised by this transport harness and must stay in its inventory.
  if (
    (plane === 'gateway' || plane === 'gateway-runtime') &&
    op.requestBody?.content?.['multipart/form-data']
  )
    return [];
  const wireBody = op.requestBody?.content?.['application/json']?.schema;
  const body = wireBody ? specimen(wireBody, true) : undefined;
  if (plane === 'gateway' && operation.path.startsWith('/logs/exports') && body)
    (body as Record<string, unknown>).description = 'Offline contract fixture';
  // The specification explicitly forbids all-workspace access together with explicit mappings.
  if (plane === 'gateway' && operation.path.startsWith('/secret-references') && body)
    (body as Record<string, unknown>).allow_all_workspaces = false;
  const [status, response] = Object.entries(op.responses ?? {}).find(([key]) =>
    /^2\d\d$/.test(key),
  ) ?? ['204', {}];
  const responseSchema = response.content?.['application/json']?.schema;
  const responseBody = responseSchema ? specimen(responseSchema, true) : 'prompt,goal\n';
  return operation.implementations.map((call) => ({
    method: operation.method,
    path: operation.path,
    call,
    ...(plane === 'gateway-runtime' ? { runtimeClient: true } : {}),
    ...(call.source.endsWith('/model-pricing-client.ts')
      ? {
          publicPricingClient: true,
          publicEndpoint: (item.servers as { url: string }[])[0].url,
          publicSecurity: op.security,
        }
      : {}),
    query: Object.fromEntries(
      parameters.filter((p) => p.in === 'query').map((p) => [p.name, querySpecimen(p)]),
    ),
    queryWire: Object.fromEntries(
      parameters
        .filter((p) => p.in === 'query')
        .map((p) => [p.name, queryWireValues(p, querySpecimen(p))]),
    ),
    body,
    responseBody,
    responseStatus: Number(status),
    responseIsText: !responseSchema || call.member === 'downloadFile',
  }));
});
const payload = {
  source: domain.file.replace(/^.*\/ai-gateway-openapi\//, 'ai-gateway-openapi/'),
  sha256: domain.sha256,
  corrections: compatibilityCorrections
    .filter((c) => c.plane === (plane === 'gateway-runtime' ? 'gateway' : plane))
    .map((c) => c.id),
  cases,
};
const destination = `test/openapi/fixtures/${plane}.json`;
emitPatch(destination, JSON.stringify(payload, null, 2) + '\n');
