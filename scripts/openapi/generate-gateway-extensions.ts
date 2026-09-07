/** @internal Emit a reviewable patch for the SCM-exposed Portkey extension surface.
 * No runtime generator or external HTTP dependency is added to the SDK.
 * Run with a destination path argument; apply the emitted patch after review.
 */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import YAML from 'yaml';
import { emitPatch } from './emit-patch.js';
import { gatewayExperimental } from './gateway-status.js';

const source =
  process.env.GATEWAY_OPENAPI_FILE ??
  '/home/cdot/development/others/ai-gateway-openapi/openapi.yaml';
const raw = readFileSync(source, 'utf8');
const spec = YAML.parse(raw);
const hash = createHash('sha256').update(raw).digest('hex');
type Schema = import('./conformance.js').Schema & {
  $ref?: string;
  pattern?: string;
  maxItems?: number;
  exclusiveMinimum?: boolean | number;
  exclusiveMaximum?: boolean | number;
  multipleOf?: number;
  name?: string;
  in?: string;
  schema?: Schema;
  content?: Record<string, { schema?: Schema }>;
};
type Operation = [name: string, method: string, path: string];
export const groups: Record<
  string,
  { className: string; property: string; operations: Operation[] }
> = {
  'mcp-servers': {
    className: 'AIGatewayMcpServersClient',
    property: 'mcpServers',
    operations: [
      ['list', 'get', '/mcp-servers'],
      ['create', 'post', '/mcp-servers'],
      ['get', 'get', '/mcp-servers/{mcpServerId}'],
      ['update', 'put', '/mcp-servers/{mcpServerId}'],
      ['delete', 'delete', '/mcp-servers/{mcpServerId}'],
      ['test', 'post', '/mcp-servers/{mcpServerId}/test'],
      ['getCapabilities', 'get', '/mcp-servers/{mcpServerId}/capabilities'],
      ['updateCapabilities', 'put', '/mcp-servers/{mcpServerId}/capabilities'],
      ['getUserAccess', 'get', '/mcp-servers/{mcpServerId}/user-access'],
      ['updateUserAccess', 'put', '/mcp-servers/{mcpServerId}/user-access'],
      ['getConnections', 'get', '/mcp-servers/{mcpServerId}/connections'],
      ['deleteConnections', 'delete', '/mcp-servers/{mcpServerId}/connections'],
    ],
  },
  'usage-limits': {
    className: 'AIGatewayUsageLimitsClient',
    property: 'usageLimits',
    operations: [
      ['list', 'get', '/policies/usage-limits'],
      ['create', 'post', '/policies/usage-limits'],
      ['get', 'get', '/policies/usage-limits/{policyUsageLimitsId}'],
      ['update', 'put', '/policies/usage-limits/{policyUsageLimitsId}'],
      ['delete', 'delete', '/policies/usage-limits/{policyUsageLimitsId}'],
      ['listEntities', 'get', '/policies/usage-limits/{policyUsageLimitsId}/entities'],
      [
        'resetEntity',
        'put',
        '/policies/usage-limits/{policyUsageLimitsId}/entities/{entityId}/reset',
      ],
    ],
  },
  'rate-limits': {
    className: 'AIGatewayRateLimitsClient',
    property: 'rateLimits',
    operations: [
      ['list', 'get', '/policies/rate-limits'],
      ['create', 'post', '/policies/rate-limits'],
      ['get', 'get', '/policies/rate-limits/{rateLimitsPolicyId}'],
      ['update', 'put', '/policies/rate-limits/{rateLimitsPolicyId}'],
      ['delete', 'delete', '/policies/rate-limits/{rateLimitsPolicyId}'],
    ],
  },
  'log-exports': {
    className: 'AIGatewayLogExportsClient',
    property: 'logExports',
    operations: [
      ['list', 'get', '/logs/exports'],
      ['create', 'post', '/logs/exports'],
      ['get', 'get', '/logs/exports/{exportId}'],
      ['update', 'put', '/logs/exports/{exportId}'],
      ['start', 'post', '/logs/exports/{exportId}/start'],
      ['cancel', 'post', '/logs/exports/{exportId}/cancel'],
      ['download', 'get', '/logs/exports/{exportId}/download'],
    ],
  },
  'secret-references': {
    className: 'AIGatewaySecretReferencesClient',
    property: 'secretReferences',
    operations: [
      ['list', 'get', '/secret-references'],
      ['create', 'post', '/secret-references'],
      ['get', 'get', '/secret-references/{secretReferenceId}'],
      ['update', 'put', '/secret-references/{secretReferenceId}'],
      ['delete', 'delete', '/secret-references/{secretReferenceId}'],
    ],
  },
};
const models = new Map<string, string>();
const visiting = new Set<string>();
const resolve = (v: Schema): Schema => {
  if (!v?.$ref) return v;
  const parts = v.$ref.split('/');
  const name = parts.at(-1);
  if (parts[0] !== '#' || parts[1] !== 'components' || !name)
    throw new Error(`Unsupported reference: ${v.$ref}`);
  const resolved = spec.components[parts[2]]?.[name];
  if (!resolved) throw new Error(`Unresolved reference: ${v.$ref}`);
  return resolved;
};
const title = (v: string) => v[0].toUpperCase() + v.slice(1);
function named(name: string, schema: Schema, request = false): string {
  // Narrow, live-verified SCM response adapters; upstream schemas stay untouched on disk.
  if (name === 'GenerationsFilterSchema') {
    schema = structuredClone(schema);
    schema.properties!.trace_id = {
      oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
    };
  }
  if (name === 'UpdateExportResponse') {
    schema = structuredClone(schema);
    schema.required = schema.required!.filter((key: string) => key !== 'total');
  }
  const catalog =
    !name.startsWith('Catalog') && (name.endsWith('Configuration') || name === 'SecretMapping');
  const id = `Gateway${catalog ? 'Catalog' : ''}${request && !name.endsWith('Request') && !name.endsWith('Options') ? 'Request' : ''}${name}`;
  if (visiting.has(id)) throw new Error(`Recursive schema requires an explicit type: ${id}`);
  if (!models.has(id)) {
    visiting.add(id);
    // Authentication variants are discriminated wire contracts, not open provider catalogs.
    // Widening accessKey/serviceRole would let incomplete access-key credentials match the
    // service-role branch, silently bypassing required-field validation.
    const closedEnums =
      request && (name.endsWith('AuthConfig') || name.includes('SecretReference'));
    let expression = compile(schema, request, closedEnums);
    if (
      request &&
      ['CreateSecretReferenceRequest', 'UpdateSecretReferenceRequest'].includes(name)
    ) {
      expression += `.superRefine((value, ctx) => {
        if (value.allow_all_workspaces === true && value.allowed_workspaces !== undefined)
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['allowed_workspaces'], message: 'Cannot combine allowed_workspaces with allow_all_workspaces=true' });
        ${
          name === 'CreateSecretReferenceRequest'
            ? `const config = value.auth_config;
        const matches = value.manager_type === 'aws_sm' ? 'aws_auth_type' in config
          : value.manager_type === 'azure_kv' ? 'azure_auth_mode' in config : 'vault_auth_type' in config;
        if (!matches) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['auth_config'], message: 'Authentication configuration must match manager_type' });`
            : `if (Object.keys(value).length === 0)
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Provide at least one update field' });`
        }
      })`;
    }
    visiting.delete(id);
    const type = compileType(schema, request, closedEnums);
    models.set(
      id,
      `/** SCM ${name}; ${request ? 'stable request fields are strict; extension maps accept finite JSON' : 'unknown response fields are preserved'}. */\nexport const ${id}Schema: z.ZodType<${type}> = ${expression};\nexport type ${id} = z.infer<typeof ${id}Schema>;`,
    );
  }
  return id;
}
/** Named structural types prevent exponential Zod implementation detail in emitted declarations. */
function compileType(s: Schema = {}, request = false, closedEnums = false): string {
  let result: string;
  if (s.$ref) result = named(s.$ref.split('/').at(-1)!, resolve(s), request);
  else if (s.allOf)
    result = '(' + s.allOf.map((part) => compileType(part, request, closedEnums)).join(' & ') + ')';
  else if (s.oneOf || s.anyOf)
    result =
      '(' +
      (s.oneOf ?? s.anyOf)!.map((part) => compileType(part, request, closedEnums)).join(' | ') +
      ')';
  else if (s.enum)
    result =
      !closedEnums && s.enum.every((v) => typeof v === 'string')
        ? 'string'
        : '(' + s.enum.map((v) => JSON.stringify(v)).join(' | ') + ')';
  else if (s.type === 'object' || s.properties || s.additionalProperties) {
    const props = Object.entries(s.properties ?? {}).map(
      ([key, value]) =>
        `${JSON.stringify(key)}${s.required?.includes(key) ? '' : '?'}: ${compileType(value, request, closedEnums)}`,
    );
    if (s.additionalProperties !== false && (!request || s.additionalProperties || !s.properties)) {
      const extension =
        typeof s.additionalProperties === 'object'
          ? compileType(s.additionalProperties, request, closedEnums)
          : request
            ? 'GatewayJsonValue'
            : 'unknown';
      props.push(
        `[key: string]: ${extension}${Object.keys(s.properties ?? {}).length && request ? ' | undefined' : ''}`,
      );
    }
    result = `{ ${props.join('; ')} }`;
  } else if (s.type === 'array') result = `Array<${compileType(s.items, request, closedEnums)}>`;
  else if (s.type === 'integer' || s.type === 'number') result = 'number';
  else if (s.type === 'string' || s.type === 'boolean' || s.type === 'null') result = s.type;
  else result = request ? 'GatewayJsonValue' : 'unknown';
  return result + (s.nullable ? ' | null' : '');
}
function compile(s: Schema = {}, request = false, closedEnums = false): string {
  let result: string;
  if (s.$ref) result = named(s.$ref.split('/').at(-1)!, resolve(s), request) + 'Schema';
  else if (s.allOf)
    result = s.allOf
      .map((part) => compile(part, request, closedEnums))
      .reduce((a: string, b: string) => `z.intersection(${a}, ${b})`);
  else if (s.oneOf || s.anyOf) {
    const options = (s.oneOf ?? s.anyOf)!.map((part) => compile(part, request, closedEnums));
    result = options.length === 1 ? options[0] : `z.union([${options.join(', ')}])`;
  } else if (s.enum) {
    // Portkey-only catalog values are not a closed SCM contract. Known values remain documented upstream.
    const options =
      !closedEnums && s.enum.every((v) => typeof v === 'string')
        ? [request ? 'z.string().min(1)' : 'z.string()']
        : s.enum.map((v: unknown) => (v === null ? 'z.null()' : `z.literal(${JSON.stringify(v)})`));
    result = options.length === 1 ? options[0] : `z.union([${options.join(', ')}])`;
  } else if (s.type === 'object' || s.properties || s.additionalProperties) {
    const props = Object.entries(s.properties ?? {}).map(
      ([key, value]) =>
        `${JSON.stringify(key)}: ${compile(value as Schema, request, closedEnums)}${s.required?.includes(key) ? '' : '.optional()'}`,
    );
    result = `z.object({${props.join(', ')}})`;
    result +=
      s.additionalProperties === false
        ? '.strict()'
        : typeof s.additionalProperties === 'object'
          ? `.catchall(${compile(s.additionalProperties, request, closedEnums)})`
          : request
            ? s.additionalProperties === true || !s.properties
              ? '.catchall(GatewayJsonValueSchema)'
              : '.strict()'
            : '.passthrough()';
  } else if (s.type === 'array')
    result = `z.array(${compile(s.items, request, closedEnums)})${s.minItems === undefined ? '' : `.min(${s.minItems})`}${s.maxItems === undefined ? '' : `.max(${s.maxItems})`}`;
  else if (s.type === 'string') {
    result = 'z.string()';
    if (s.minLength !== undefined) result += `.min(${s.minLength})`;
    if (s.maxLength !== undefined) result += `.max(${s.maxLength})`;
    if (s.pattern) result += `.regex(new RegExp(${JSON.stringify(s.pattern)}))`;
    // SCM uses numeric organisation IDs and SQL timestamps in fields upstream calls UUID/date-time.
    // Keep their wire type, without enforcing Portkey-only formats on hosted responses.
  } else if (s.type === 'number' || s.type === 'integer') {
    result = 'z.number().finite()' + (s.type === 'integer' ? '.int()' : '');
    if (s.minimum !== undefined)
      result += `.${s.exclusiveMinimum === true ? 'gt' : 'min'}(${s.minimum})`;
    if (s.maximum !== undefined)
      result += `.${s.exclusiveMaximum === true ? 'lt' : 'max'}(${s.maximum})`;
    if (typeof s.exclusiveMinimum === 'number') result += `.gt(${s.exclusiveMinimum})`;
    if (typeof s.exclusiveMaximum === 'number') result += `.lt(${s.exclusiveMaximum})`;
    if (s.multipleOf !== undefined) result += `.multipleOf(${s.multipleOf})`;
  } else if (s.type === 'boolean') result = 'z.boolean()';
  else if (s.type === 'null') result = 'z.null()';
  else if (!s.type) result = request ? 'GatewayJsonValueSchema' : 'z.unknown()';
  else throw new Error(`Unsupported schema type: ${s.type}`);
  return result + (s.nullable ? '.nullable()' : '');
}
const outputs = new Map<string, string>();
for (const [file, group] of Object.entries(groups)) {
  const imports = new Set<string>();
  const methods: string[] = [];
  for (const [name, method, path] of group.operations) {
    const item = spec.paths[path];
    const op = item[method];
    const parameters = [...(item.parameters ?? []), ...(op.parameters ?? [])].map(resolve);
    const ids = parameters.filter((p) => p.in === 'path').map((p) => p.name);
    const query = parameters.filter((p) => p.in === 'query');
    const args = ids.map((id) => `${id}: string`);
    let body = op.requestBody?.content?.['application/json']?.schema;
    if (body && file === 'log-exports') {
      // SCM AB01 validation (2026-09-06) requires these fields omitted by upstream Portkey.
      body = structuredClone(body);
      body.properties.description = { type: 'string', minLength: 1 };
      body.required = [...new Set([...(body.required ?? []), 'description'])];
      const filters = structuredClone(resolve(body.properties.filters));
      filters.properties = {
        ...filters.properties,
        time_of_generation_min: { type: 'string' },
        time_of_generation_max: { type: 'string' },
      };
      filters.required = [
        ...new Set([
          ...(filters.required ?? []),
          'time_of_generation_min',
          'time_of_generation_max',
        ]),
      ];
      body.properties.filters = filters;
    }
    let requestType: string | undefined;
    if (body) {
      requestType = named(
        `${group.className.replace('AIGateway', '')}${title(name)}Request`,
        body,
        true,
      );
      imports.add(requestType);
      imports.add(requestType + 'Schema');
      args.push(`body: ${requestType}`);
    }
    let queryType: string | undefined;
    if (query.length) {
      queryType = named(
        `${group.className.replace('AIGateway', '')}${title(name)}Options`,
        {
          type: 'object',
          additionalProperties: false,
          properties: Object.fromEntries(query.map((p) => [p.name, p.schema])),
          required: query
            .filter((p) => p.required)
            .map((p) => {
              if (!p.name) throw new Error('Query parameter has no name');
              return p.name;
            }),
        },
        true,
      );
      imports.add(queryType);
      imports.add(queryType + 'Schema');
      args.push(`opts: ${queryType} = {}`);
    }
    const response = Object.entries(op.responses).find(([status]) =>
      /^2/.test(status),
    )?.[1] as Schema;
    const responseType = named(
      `${group.className.replace('AIGateway', '')}${title(name)}Response`,
      response?.content?.['application/json']?.schema ?? { type: 'object' },
    );
    imports.add(responseType);
    imports.add(responseType + 'Schema');
    const pathExpr =
      '`' + path.replace(/\{([^}]+)\}/g, (_, id) => '${gatewayPathSegment(' + id + ')}') + '`';
    const sampleArgs = [
      ...ids.map(() => "'resource-id'"),
      ...(body ? ['body'] : []),
      ...(query.length ? ['{}'] : []),
    ].join(', ');
    const experimental = gatewayExperimental[`${group.property}.${name}`];
    methods.push(
      `  /** ${op.summary ?? `${title(name)} ${group.property}`}.\n${experimental ? `   * @experimental ${experimental}\n` : '   * Verified on an isolated SCM fixture, 2026-09-06.\n'}   * @example \`await gw.${group.property}.${name}(${sampleArgs});\`\n   */\n  async ${name}(${args.join(', ')}): Promise<${responseType}> {\n${ids.map((id) => `    assertLength(${id}, 1, 512, '${id}');`).join('\n')}\n    return request({\n      method: '${method.toUpperCase()}', baseUrl: this.options.baseUrl, path: ${pathExpr},\n${body ? `      body, requestSchema: ${requestType}Schema,\n` : ''}${query.length ? `      params: queryParams(opts, ${queryType}Schema),\n` : ''}      responseSchema: ${responseType}Schema,\n      auth: this.options.auth, numRetries: this.options.numRetries,\n${file === 'mcp-servers' || file === 'log-exports' || file === 'secret-references' ? '      omitDebugBody: true,\n' : ''}    });\n  }`,
    );
  }
  outputs.set(
    `src/ai-gateway/${file}-client.ts`,
    `import { queryParams } from '../http/query.js';\nimport { request } from '../http/request.js';\nimport { gatewayPathSegment } from './runtime-wire.js';\nimport { assertLength } from '../validators.js';\nimport type { AIGatewaySubClientOptions } from './types.js';\nimport { ${[...imports].map((n) => (n.endsWith('Schema') ? n : `type ${n}`)).join(', ')} } from '../models/ai-gateway-extensions.js';\n\n/** ${file === 'secret-references' ? 'Organisation-level secret-reference CRUD on the SCM admin plane. Never resolves an external secret.' : `Workspace-scoped ${group.property} operations on the SCM data plane.`}\n * @example \`const client = new AIGatewayClient().${group.property};\`\n */\nexport class ${group.className} {\n  constructor(private readonly options: AIGatewaySubClientOptions) {}\n\n${methods.join('\n\n')}\n}\n`,
  );
}
// Existing sub-clients consume these additional schema definitions.
for (const name of [
  'BulkSyncMcpServerMappingsRequest',
  'BulkSyncMcpServerMappingsResponse',
  'McpServerMapping',
  'UpsertMcpServerMappingRequest',
  'UpsertMcpServerMappingResponse',
  'McpIntegrationWorkspacesListResponse',
  'McpIntegrationWorkspacesLegacyResponse',
])
  named(name, spec.components.schemas[name], name.endsWith('Request'));
// Additive catalog types for the documented dynamic configuration/parameter extension points.
// They do not close those extension maps or claim that every upstream provider is deployed on SCM.
named('CatalogGuardrailParameters', spec.components.schemas.GuardrailCheck.properties.parameters);
named(
  'CatalogProviderConfiguration',
  spec.components.schemas.CreateIntegrationRequest.properties.configurations,
);
named(
  'CatalogMcpConfiguration',
  spec.components.schemas.CreateMcpIntegration.properties.configurations,
);
for (const name of ['PricingAdjustments', 'PricingConfig', 'SecretMapping', 'DeploymentTags'])
  named(name, spec.components.schemas[name]);
named('PricingAdjustmentsRequest', spec.components.schemas.PricingAdjustments, true);
named('PricingConfigRequest', spec.components.schemas.PricingConfig, true);
models.set(
  'GatewayMcpServerMappingsResponse',
  '/** Normalize the upstream bare array and the live SCM data envelope to one result. */\nexport const GatewayMcpServerMappingsResponseSchema = z.union([z.array(GatewayMcpServerMappingSchema), z.object({ data: z.array(GatewayMcpServerMappingSchema) }).passthrough().transform(value => value.data)]);\nexport type GatewayMcpServerMappingsResponse = z.infer<typeof GatewayMcpServerMappingsResponseSchema>;',
);
outputs.set(
  'src/models/ai-gateway-extensions.ts',
  `/** SCM-exposed Portkey extension models.\n * Generated from openapi.yaml SHA-256 ${hash}.\n * Regenerate with scripts/openapi/generate-gateway-extensions.ts; review compatibility changes.\n */\nimport { z } from 'zod';\nimport { GatewayJsonValueSchema, type GatewayJsonValue } from './ai-gateway-routing.js';\n\n${[...models.values()].join('\n\n')}\n`,
);
const destination = process.argv[2];
if (!destination) console.log([...outputs.keys()].join('\n'));
else {
  const content = outputs.get(destination);
  if (!content) throw new Error(`Unknown destination ${destination}`);
  emitPatch(destination, content);
}
