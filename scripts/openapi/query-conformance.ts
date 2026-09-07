/** @internal Exercise documented query parameters through real SDK methods using a mocked HTTP boundary. */
import SwaggerParser from '@apidevtools/swagger-parser';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { inventory, root } from './inventory.js';
import { specimen, type Schema } from './conformance.js';
import { init, Content } from '../../src/index.js';
import { OAuthClient } from '../../src/management/oauth-client.js';
import { globalConfiguration } from '../../src/configuration.js';
import { querySpecimen, queryWireValues, type QueryParameter } from './query-fixtures.js';

type Operation = {
  parameters?: QueryParameter[];
  requestBody?: { content?: Record<string, { schema?: Schema }> };
  responses?: Record<string, { content?: Record<string, { schema?: Schema }> }>;
};
const camel = (key: string) => key.replace(/_([a-z])/g, (_, char: string) => char.toUpperCase());
const dummyUuid = '550e8400-e29b-41d4-a716-446655440000';

export async function queryConformance() {
  const originalFetch = globalThis.fetch;
  const originalGetToken = OAuthClient.prototype.getToken;
  const configuration = { ...globalConfiguration };
  OAuthClient.prototype.getToken = async () => 'offline-contract-token';
  init({ apiKey: 'offline-contract-key', apiEndpoint: 'https://offline.test', numRetries: 0 });
  const results: {
    operation: string;
    source: string;
    member: string;
    query: string;
    ok: boolean;
    actual?: string[];
    arrayItems?: number;
    reason?: string;
  }[] = [];
  try {
    for (const domain of await inventory()) {
      const spec = await SwaggerParser.dereference(
        join(process.env.AIRS_OPENAPI_DIR ?? join(root, 'schemas'), domain.file),
      );
      for (const operation of domain.operations) {
        const op = (spec.paths?.[operation.path] as Record<string, unknown>)[
          operation.method.toLowerCase()
        ] as Operation;
        const params = [
          ...((spec.paths?.[operation.path] as Operation)?.parameters ?? []),
          ...(op.parameters ?? []),
        ].filter((p) => p.in === 'query');
        if (!params.length) continue;
        for (const call of operation.implementations) {
          if (!call.className) throw new Error(`Unresolved class: ${call.source}:${call.member}`);
          const module = await import(pathToFileURL(join(root, call.source)).href);
          const Client = module[call.className];
          const client = new Client({
            baseUrl: 'https://offline.test',
            dataEndpoint: 'https://offline.test',
            managementEndpoint: 'https://offline.test',
            apiEndpoint: 'https://offline.test',
            clientId: 'contract-client',
            clientSecret: 'contract-secret',
            tsgId: '123456',
            auth: { prepare: async (r: unknown) => r },
            numRetries: 0,
          });
          const options: Record<string, unknown> = {};
          const expected = new Map<string, unknown>();
          for (const param of params) {
            const value = querySpecimen(param);
            options[param.name] = value;
            options[camel(param.name)] = value;
            expected.set(param.name, value);
          }
          const bodySchema = op.requestBody?.content?.['application/json']?.schema;
          if (bodySchema) options.body = specimen(bodySchema, true);
          const pathNames = [...operation.path.matchAll(/\{([^}]+)\}/g)].map((m) => m[1]);
          const implementationNames = [...call.path.matchAll(/\{([^}]+)\}/g)].map((m) =>
            m[1].replace(/^encodeURIComponent\((.+)\)$/, '$1'),
          );
          const pathArguments = new Map(implementationNames.map((name, i) => [name, pathNames[i]]));
          const args = (call.parameters ?? []).map((param) => {
            if (param.name === 'file')
              return new Blob(['prompt,goal\nhello,reply\n'], { type: 'text/csv' });
            if (pathArguments.has(param.name)) return dummyUuid;
            if (param.name === 'body') return options.body;
            if (['opts', 'params', 'options'].includes(param.name)) return options;
            if (param.name === 'format' && expected.has('file_format'))
              return expected.get('file_format');
            const query = params.find((p) => p.name === param.name || camel(p.name) === param.name);
            if (query) return expected.get(query.name);
            if (param.type === 'string') return dummyUuid;
            if (param.type === 'string[]') return [dummyUuid];
            return options;
          });
          if (call.member === 'syncScan') {
            const body = options.body as {
              ai_profile: unknown;
              contents: Record<string, string>[];
            };
            args[0] = body.ai_profile;
            args[1] = new Content(body.contents[0]);
          }
          let captured: URL | undefined;
          globalThis.fetch = async (input) => {
            captured = new URL(String(input));
            const [status, response] = Object.entries(op.responses ?? {}).find(([status]) =>
              /^2\d\d$/.test(status),
            ) ?? ['204', {}];
            const wire = response.content?.['application/json']?.schema;
            return new Response(
              status === '204' ? null : JSON.stringify(wire ? specimen(wire, true) : {}),
              { status: Number(status), headers: { 'Content-Type': 'application/json' } },
            );
          };
          let failure: string | undefined;
          try {
            await client[call.member](...args);
          } catch (error) {
            failure = error instanceof Error ? error.message : 'Unknown error';
          }
          for (const param of params) {
            const expectedValue = expected.get(param.name);
            const actual = captured?.searchParams.getAll(param.name) ?? [];
            const values = queryWireValues(param, expectedValue);
            results.push({
              operation: `${operation.method} ${operation.path}`,
              source: call.source,
              member: call.member,
              query: param.name,
              ok: JSON.stringify(actual) === JSON.stringify(values),
              actual,
              arrayItems: Array.isArray(expectedValue) ? expectedValue.length : undefined,
              reason: captured ? undefined : (failure ?? 'No request issued'),
            });
          }
        }
      }
    }
  } finally {
    globalThis.fetch = originalFetch;
    OAuthClient.prototype.getToken = originalGetToken;
    Object.assign(globalConfiguration, configuration);
  }
  return results;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const results = await queryConformance();
  console.log(
    `${results.filter((r) => r.ok).length}/${results.length} documented query parameters serialized`,
  );
  for (const result of results.filter((r) => !r.ok)) console.log(JSON.stringify(result));
  if (results.some((r) => !r.ok)) process.exitCode = 1;
}
