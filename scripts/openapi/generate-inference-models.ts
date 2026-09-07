/** @internal Generate reviewable, typed runtime contracts from the pinned Portkey OpenAPI.
 * No generator or OpenAPI parser is shipped as an SDK runtime dependency.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import YAML from 'yaml';
import { emitPatch } from './emit-patch.js';
import type { Schema as BaseSchema } from './conformance.js';
import { gatewayExperimental } from './gateway-status.js';
import { correctPromptRuntimeContracts } from './prompt-contracts.js';

type Schema = BaseSchema & {
  $ref?: string;
  maxItems?: number;
  pattern?: string;
  exclusiveMinimum?: boolean | number;
  exclusiveMaximum?: boolean | number;
  multipleOf?: number;
  /** Internal, operation-scoped validation of a documented ISO timestamp. */
  validateDateTime?: boolean;
};
const path =
  process.env.GATEWAY_OPENAPI_FILE ??
  '/home/cdot/development/others/ai-gateway-openapi/openapi.yaml';
const raw = readFileSync(path, 'utf8');
interface Parameter {
  name: string;
  in: string;
  required?: boolean;
  schema?: Schema;
  $ref?: string;
  explode?: boolean;
}
interface Operation {
  operationId: string;
  parameters?: Parameter[];
  requestBody?: { required?: boolean; content: Record<string, { schema: Schema }> };
  responses: Record<string, { content?: Record<string, { schema: Schema }> }>;
}
const spec = YAML.parse(raw) as {
  components: { schemas: Record<string, Schema>; parameters: Record<string, Parameter> };
  paths: Record<string, Record<string, Operation> & { parameters?: Parameter[] }>;
};
correctPromptRuntimeContracts(spec);
for (const [route, title] of [
  ['/prompts/{promptId}/completions', 'CreatePromptCompletion'],
  ['/prompts/{promptId}/render', 'CreatePromptRender'],
]) {
  const operation = spec.paths[route].post;
  spec.components.schemas[title + 'Request'] =
    operation.requestBody!.content['application/json'].schema;
  spec.components.schemas[title + 'Response'] =
    operation.responses['200'].content!['application/json'].schema;
}
spec.components.schemas.CreatePromptCompletionStreamResponse = {
  anyOf: [
    { $ref: '#/components/schemas/CreateChatCompletionStreamResponse' },
    { $ref: '#/components/schemas/CreateCompletionResponse' },
  ],
};
const models = new Map<string, string>();
const hash = createHash('sha256').update(raw).digest('hex');

function resolve(schema: Schema): Schema {
  if (!schema.$ref) return schema;
  const match = /^#\/components\/schemas\/([^/]+)$/.exec(schema.$ref);
  if (!match || !spec.components.schemas[match[1]])
    throw new Error(`Unresolved schema ${schema.$ref}`);
  const siblings = { ...schema };
  delete siblings.$ref;
  return { ...spec.components.schemas[match[1]], ...siblings };
}

/** Merge object inheritance before strict validation, so sibling fields are not rejected. */
function normalize(schema: Schema): Schema {
  if (!schema.allOf) return schema;
  const parts = schema.allOf.map((part) => normalize(resolve(part)));
  if (
    !parts.every(
      (part) =>
        !part.oneOf && !part.anyOf && !part.allOf && (part.type === 'object' || part.properties),
    )
  )
    return schema;
  const parent = { ...schema };
  delete parent.allOf;
  return {
    ...Object.assign({}, ...parts),
    ...parent,
    type: 'object',
    properties: Object.assign({}, ...parts.map((part) => part.properties), parent.properties),
    required: [
      ...new Set([...parts.flatMap((part) => part.required ?? []), ...(parent.required ?? [])]),
    ],
  };
}

function named(name: string, request: boolean): string {
  const id = `GatewayInference${request ? 'Input' : ''}${name}`;
  if (models.has(id)) return id;
  let schema = spec.components.schemas[name];
  if (!schema) throw new Error(`Missing schema ${name}`);
  if (name === 'ModelIdsResponses') {
    // Provider-prefixed and newly deployed model IDs are a gateway runtime contract, not a
    // closed 2025 snapshot of OpenAI's catalog. Verified @openai/gpt-5.6-terra live.
    schema = { type: 'string', minLength: 1 };
  }
  if (name === 'ResponseUsage') {
    // Lifecycle events have no final token usage while generation is in progress.
    schema = { ...schema, nullable: true };
  }
  if (request && name === 'CustomLog') {
    // The pinned metadata schema places additionalProperties inside properties. Keep that
    // declared string field, but also preserve finite JSON metadata verified by live ingestion.
    schema = structuredClone(schema);
    schema.properties!.metadata.additionalProperties = true;
  }
  if (request && name === 'GetLogQuery') {
    // The query descriptions make created_at mandatory only for v2 paths.
    // Preserve omission/default-v1 and represent the dependency in TS and Zod.
    const properties = schema.properties!;
    if (Object.keys(properties).sort().join(',') !== 'created_at,path_format,type')
      throw new Error('Review changed log-detail query contract');
    const common = {
      ...properties,
      created_at: { ...properties.created_at, validateDateTime: true },
    };
    schema = {
      oneOf: [
        { type: 'object', properties: { ...common, path_format: { enum: ['v1'] } } },
        {
          type: 'object',
          properties: { ...common, path_format: { enum: ['v2'] } },
          required: ['path_format', 'created_at'],
        },
      ],
    };
  }
  if (name === 'Response' && !request) {
    schema = structuredClone(normalize(schema));
    schema.properties!.user = { ...schema.properties!.user, nullable: true };
  }
  if (!request && name === 'OpenAIFile') {
    schema = structuredClone(schema);
    schema.properties!.status_details = { ...schema.properties!.status_details, nullable: true };
  }
  if (
    !request &&
    ['CreateTranscriptionResponseVerboseJson', 'CreateTranslationResponseVerboseJson'].includes(
      name,
    )
  ) {
    // The pinned Portkey schema says string; the official audio reference uses numeric
    // duration. Preserve both without coercion. These provider methods remain experimental.
    schema = structuredClone(schema);
    schema.properties!.duration = { anyOf: [{ type: 'string' }, { type: 'number' }] };
  }
  if (!request && name === 'StaticChunkingStrategy') {
    // Runtime returns zero while reporting automatically selected chunking. Requests retain
    // the documented explicit static range of 100–4096; no input constraints are relaxed.
    schema = structuredClone(schema);
    schema.properties!.max_chunk_size_tokens = {
      anyOf: [schema.properties!.max_chunk_size_tokens, { type: 'integer', enum: [0] }],
    };
  }
  if (!request && name === 'Batch') {
    // Live validating/cancelling batches report unfinished lifecycle fields as null.
    // This is response-only compatibility; request constraints remain unchanged.
    schema = structuredClone(schema);
    for (const field of [
      'errors',
      'output_file_id',
      'error_file_id',
      'in_progress_at',
      'finalizing_at',
      'completed_at',
      'failed_at',
      'expired_at',
      'cancelling_at',
      'cancelled_at',
    ])
      schema.properties![field] = { ...schema.properties![field], nullable: true };
  }
  if (!request && name === 'VectorStoreFileBatchObject') {
    // The pinned type uses "files_batch", but the dev gateway (2026-09-06) and
    // official response examples return "file_batch". Retain both exact literals.
    schema = structuredClone(schema);
    schema.properties!.object = {
      ...schema.properties!.object,
      enum: ['vector_store.files_batch', 'vector_store.file_batch'],
    };
  }
  if (
    !request &&
    [
      'ListVectorStoresResponse',
      'ListVectorStoreFilesResponse',
      'ListFilesInVectorStoreBatchResponse',
      'ListBatchesResponse',
    ].includes(name)
  ) {
    schema = structuredClone(schema);
    for (const field of ['first_id', 'last_id'])
      schema.properties![field] = { ...schema.properties![field], nullable: true };
  }
  if (name === 'Embedding') {
    // The request declares base64 output and the runtime returned it successfully (2026-09-06).
    // Upstream incorrectly restricts this response member to a numeric array.
    schema = structuredClone(schema);
    schema.properties!.embedding = { oneOf: [schema.properties!.embedding, { type: 'string' }] };
  }
  if (name === 'CreateChatCompletionResponse' || name === 'CreateChatCompletionStreamResponse') {
    // Both the supplied successful request and runtime SSE evidence include a null fingerprint.
    schema = structuredClone(schema);
    schema.properties!.system_fingerprint = {
      ...schema.properties!.system_fingerprint,
      nullable: true,
    };
  }
  if (name === 'CreateChatCompletionResponse') {
    // Prisma omits logprobs unless requested; null and omission both mean no log probabilities.
    const choice = schema.properties!.choices.items!;
    choice.required = choice.required?.filter((field) => field !== 'logprobs');
  }
  if (name === 'CreateChatCompletionStreamResponse') {
    // include_usage emits null on intermediate events and an object on the final usage event.
    schema.properties!.usage = { ...schema.properties!.usage, nullable: true };
  }
  // Reserve before recursion. Explicit structural aliases and lazy validators support cycles.
  models.set(id, '');
  const type = compileType(schema, request);
  const validator = compile(schema, request);
  models.set(
    id,
    `/** Portkey ${name}; ${request ? 'strict modeled input with explicit JSON extension maps' : 'additive response fields are preserved'}.\n * @example \`${id}Schema.parse(value);\`\n */\nexport type ${id} = ${type};\nexport const ${id}Schema: z.ZodType<${id}> = z.lazy(() => ${validator});`,
  );
  return id;
}

function compileType(input: Schema = {}, request: boolean): string {
  const s = normalize(input);
  let result: string;
  if (s.$ref) result = named(s.$ref.split('/').at(-1)!, request);
  else if (s.allOf)
    result = '(' + s.allOf.map((part) => compileType(part, request)).join(' & ') + ')';
  else if (s.oneOf || s.anyOf)
    result =
      '(' + (s.oneOf ?? s.anyOf)!.map((part) => compileType(part, request)).join(' | ') + ')';
  else if (s.enum) result = s.enum.map((value) => JSON.stringify(value)).join(' | ');
  else if (s.type === 'object' || s.properties || s.additionalProperties) {
    const properties = Object.entries(s.properties ?? {}).map(
      ([key, child]) =>
        `${JSON.stringify(key)}${s.required?.includes(key) ? '' : '?'}: ${compileType(child, request)}`,
    );
    if (!request || s.additionalProperties || !s.properties) {
      const extension = !request
        ? 'unknown'
        : typeof s.additionalProperties === 'object'
          ? compileType(s.additionalProperties, request)
          : 'GatewayJsonValue';
      properties.push(
        `[key: string]: ${extension}${request && s.properties ? ' | undefined' : ''}`,
      );
    }
    result = `{ ${properties.join('; ')} }`;
  } else if (s.type === 'array') result = `Array<${compileType(s.items, request)}>`;
  else if (s.type === 'string' && s.format === 'binary') result = 'Blob';
  else if (s.type === 'integer' || s.type === 'number') result = 'number';
  else if (['string', 'boolean', 'null'].includes(s.type ?? '')) result = s.type!;
  else result = request ? 'GatewayJsonValue' : 'unknown';
  return s.nullable ? `(${result}) | null` : result;
}

function compile(input: Schema = {}, request: boolean): string {
  const s = normalize(input);
  let result: string;
  if (s.$ref) result = named(s.$ref.split('/').at(-1)!, request) + 'Schema';
  else if (s.allOf)
    result = s.allOf
      .map((part) => compile(part, request))
      .reduce((left, right) => `z.intersection(${left}, ${right})`);
  else if (s.oneOf || s.anyOf) {
    const choices = (s.oneOf ?? s.anyOf)!.map((part) => compile(part, request));
    result = choices.length === 1 ? choices[0] : `z.union([${choices.join(', ')}])`;
  } else if (s.enum) {
    const choices = s.enum.map((value) =>
      value === null ? 'z.null()' : `z.literal(${JSON.stringify(value)})`,
    );
    result = choices.length === 1 ? choices[0] : `z.union([${choices.join(', ')}])`;
  } else if (s.type === 'object' || s.properties || s.additionalProperties) {
    const properties = Object.entries(s.properties ?? {}).map(
      ([key, child]) =>
        `${JSON.stringify(key)}: ${compile(child, request)}${s.required?.includes(key) ? '' : '.optional()'}`,
    );
    result = `z.object({ ${properties.join(', ')} })`;
    if (!request) result += '.passthrough()';
    else if (typeof s.additionalProperties === 'object')
      result += `.catchall(${compile(s.additionalProperties, request)}).and(GatewayJsonObjectSchema)`;
    else if (s.additionalProperties === true || (!s.properties && s.additionalProperties !== false))
      result += '.catchall(GatewayJsonValueSchema).and(GatewayJsonObjectSchema)';
    else result += '.strict()';
  } else if (s.type === 'array') {
    result = `z.array(${compile(s.items, request)})`;
    if (s.minItems !== undefined) result += `.min(${s.minItems})`;
    if (s.maxItems !== undefined) result += `.max(${s.maxItems})`;
  } else if (s.type === 'string') {
    result = s.format === 'binary' ? 'z.instanceof(Blob)' : 'z.string()';
    if (s.minLength !== undefined) result += `.min(${s.minLength})`;
    if (s.maxLength !== undefined) result += `.max(${s.maxLength})`;
    if (s.pattern) result += `.regex(new RegExp(${JSON.stringify(s.pattern)}))`;
    if (s.validateDateTime) result += '.datetime({ offset: true })';
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
  else result = request ? 'GatewayJsonValueSchema' : 'z.unknown()';
  return result + (s.nullable ? '.nullable()' : '');
}

for (const [name, request] of [
  ['CreateCompletionRequest', true],
  ['CreateCompletionResponse', false],
  ['CreatePromptCompletionRequest', true],
  ['CreatePromptCompletionResponse', false],
  ['CreatePromptCompletionStreamResponse', false],
  ['CreatePromptRenderRequest', true],
  ['CreatePromptRenderResponse', false],
  ['CreateChatCompletionRequest', true],
  ['CreateChatCompletionResponse', false],
  ['CreateChatCompletionStreamResponse', false],
  ['CreateEmbeddingRequest', true],
  ['CreateEmbeddingResponse', false],
  ['CreateResponse', true],
  ['Response', false],
  ['ResponseStreamEvent', false],
] as const)
  named(name, request);

// Generate concrete call sites, not a public untyped request escape hatch. Keep transport
// exceptions explicit and independently test every method against frozen wire fixtures.
const resourceMethods: string[] = [];
const resourceImports = new Set<string>();
function rootSchema(schema: Schema, fallback: string, input: boolean): string {
  const name = schema.$ref?.split('/').at(-1) ?? fallback;
  if (!schema.$ref) spec.components.schemas[name] = schema;
  const id = named(name, input);
  resourceImports.add(id);
  resourceImports.add(id + 'Schema');
  return id;
}
for (const [route, item] of Object.entries(spec.paths)) {
  const observability = ['/feedback', '/feedback/{id}', '/logs', '/logs/{logId}'].includes(route);
  if (
    !observability &&
    !/^\/(?:files|models|batches|vector_stores|responses|fine_tuning|images|audio|moderations|rerank|ocr)(?:\/|$)/.test(
      route,
    )
  )
    continue;
  for (const [verb, operation] of Object.entries(item)) {
    if (!['get', 'post', 'put', 'patch', 'delete'].includes(verb)) continue;
    const op = {
      ...(operation as Operation),
      ...(route === '/logs' ? { operationId: 'createLogs' } : {}),
      ...(route === '/logs/{logId}' ? { operationId: 'getLog' } : {}),
    };
    if (op.operationId === 'createResponse') continue; // handwritten JSON/SSE overload
    const title = op.operationId[0].toUpperCase() + op.operationId.slice(1);
    const parameters = [...(item.parameters ?? []), ...(op.parameters ?? [])].map((p) =>
      p.$ref ? spec.components.parameters[p.$ref.split('/').at(-1)!] : p,
    );
    const pathNames = [...route.matchAll(/\{([^}]+)\}/g)].map((m) => m[1]);
    const signature = pathNames.map((name) => `${name}: string`);
    const lines = [
      `...this.runtimeRequestOptions(options),`,
      `method: '${verb.toUpperCase()}',`,
      `path: \`${route.replace(/\{([^}]+)\}/g, (_, name) => '${gatewayPathSegment(' + name + ')}')}\`,`,
    ];
    const body = Object.entries(op.requestBody?.content ?? {})[0];
    let bodyModel: string | undefined;
    if (body) {
      const model = rootSchema(body[1].schema, title + 'Request', true);
      bodyModel = model;
      signature.push(`body: ${model}${op.requestBody?.required === false ? ' = {}' : ''}`);
      lines.push('body,', `requestSchema: ${model}Schema,`);
      if (body[0] === 'multipart/form-data') lines.push('encodeFormData: gatewayMultipart,');
    }
    const query = parameters.filter((p) => p.in === 'query');
    if (query.length) {
      const model = rootSchema(
        {
          type: 'object',
          properties: Object.fromEntries(
            query.map((p) => [p.name, p.schema ?? { type: 'string' }]),
          ),
          required: query.filter((p) => p.required).map((p) => p.name),
        },
        title + 'Query',
        true,
      );
      signature.push(`opts: ${model}${query.some((p) => p.required) ? '' : ' = {}'}`);
      if (query.some((p) => p.explode === false))
        throw new Error(`Review non-exploded query encoding: ${op.operationId}`);
      lines.push(`params: queryParams(opts, ${model}Schema),`);
    }
    signature.push('options: GatewayInferenceRequestOptions = {}');
    const content = Object.entries(op.responses).find(([status]) => /^2\d\d$/.test(status))?.[1]
      .content;
    const response = Object.entries(content ?? {})[0];
    let output = 'void';
    let overloads = '';
    if (['createTranscription', 'createTranslation'].includes(op.operationId)) {
      const variants = response?.[1].schema.oneOf;
      if (!variants || variants.length !== 2 || !bodyModel)
        throw new Error(`Review audio response variants: ${op.operationId}`);
      const json = rootSchema(variants[0], title + 'JsonResponse', false);
      const verbose = rootSchema(variants[1], title + 'VerboseResponse', false);
      output = `${json} | ${verbose} | string`;
      lines.push(
        "responseType: ['text', 'srt', 'vtt'].includes(body?.response_format ?? '') ? 'text' : undefined,",
        `responseSchema: body?.response_format === 'verbose_json' ? ${verbose}Schema : ${json}Schema,`,
      );
      overloads =
        [
          ["{ response_format?: 'json' }", json],
          ["{ response_format: 'verbose_json' }", verbose],
          ["{ response_format: 'text' | 'srt' | 'vtt' }", 'string'],
        ]
          .map(
            ([format, result]) =>
              `${op.operationId}(body: ${bodyModel} & ${format}, options?: GatewayInferenceRequestOptions): Promise<${result}>;`,
          )
          .join('\n') +
        `\n${op.operationId}(body: ${bodyModel}, options?: GatewayInferenceRequestOptions): Promise<${output}>;\n`;
    } else if (['downloadFile', 'getBatchOutput', 'createSpeech'].includes(op.operationId)) {
      output = 'Uint8Array';
      lines.push("responseType: 'bytes',");
    } else if (op.operationId === 'createLogs') {
      output = 'string';
      lines.push("responseType: 'text',");
    } else if (response) {
      if (response[0] !== 'application/json')
        throw new Error(`Review response encoding: ${op.operationId}`);
      output = rootSchema(response[1].schema, title + 'Response', false);
      lines.push(`responseSchema: ${output}Schema,`);
    }
    const experimental = gatewayExperimental[`inference.${op.operationId}`];
    resourceMethods.push(
      `/** ${verb.toUpperCase()} ${route}. ${observability ? (experimental ? 'Explicit Prisma runtime endpoint/key only, not SCM OAuth. Successful response shapes are upstream contracts, not live-certified in this tenant.' : 'Verified on the explicit Prisma runtime endpoint with a runtime key, not SCM OAuth. No deletion API is declared; synthetic audit records may persist.') : "Provider routing uses options.headers['x-portkey-provider']."}${op.operationId === 'getLog' ? '\n * v2 storage paths require an ISO timestamp with a timezone; omit type for ordinary logs. Log bodies may contain sensitive data and are always omitted from SDK debug output.' : ''}${op.operationId === 'updateFeedback' ? '\n * Uses the declared PUT operation, not the inconsistent POST curl sample. No automatic retry by default.' : ''}${experimental ? `\n * @experimental ${experimental} Outside stability guarantees until live-verified.` : ''}\n * @example \`await inference.${op.operationId}(${[...pathNames.map(() => (op.operationId === 'updateFeedback' ? "'550e8400-e29b-41d4-a716-446655440000'" : "'resource-id'")), ...(body ? ['body'] : []), ...(query.length ? ['{}'] : [])].join(', ')});\`\n */\n${overloads}async ${op.operationId}(${signature.join(', ')}): Promise<${output}> {\n ${op.operationId === 'updateFeedback' ? "assertUuid(id, 'feedbackId');\n " : ''}return request<${output}>({\n ${lines.join('\n ')}\n });\n}`,
    );
  }
}

if (process.argv.includes('--resources')) {
  emitPatch(
    'src/ai-gateway/runtime-resources-client.ts',
    `/** Generated, typed runtime resource operations from Portkey SHA-256 ${hash}. */\nimport { request } from '../http/request.js';\nimport { queryParams } from '../http/query.js';\nimport { assertUuid } from '../validators.js';\nimport type { RequestSpec } from '../http/types.js';\nimport type { GatewayInferenceRequestOptions } from './inference-client.js';\nimport { gatewayPathSegment, gatewayMultipart } from './runtime-wire.js';\nimport { ${[...resourceImports].map((name) => (name.endsWith('Schema') ? name : 'type ' + name)).join(', ')} } from '../models/ai-gateway-inference.js';\n\n/** @internal Inherited by the public inference client; no separate credentials or token cache. */\nexport abstract class AIGatewayRuntimeResourcesClient {\n protected abstract runtimeRequestOptions(options: GatewayInferenceRequestOptions): Pick<RequestSpec, 'baseUrl' | 'auth' | 'numRetries' | 'timeoutMs' | 'signal' | 'fetch' | 'headers' | 'redirect' | 'omitDebugBody'>;\n${resourceMethods.join('\n\n')}\n}\n`,
  );
} else {
  emitPatch(
    'src/models/ai-gateway-inference.ts',
    `/** Runtime inference models generated from Portkey OpenAPI SHA-256 ${hash}.\n * Regenerate with scripts/openapi/generate-inference-models.ts and review compatibility changes.\n */\nimport { z } from 'zod';\nimport { GatewayJsonValueSchema, GatewayJsonObjectSchema, type GatewayJsonValue } from './ai-gateway-routing.js';\n\n${[...models.values()].join('\n\n')}\n`,
  );
}
