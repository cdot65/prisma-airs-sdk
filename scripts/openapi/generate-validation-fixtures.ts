/** @internal Freeze corrected source schemas, not SDK-generated JSON schemas, for offline CI. */
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { emitPatch } from './emit-patch.js';
import { inventory, root } from './inventory.js';
import { loadContractSpec, compatibilityCorrections } from './compatibility.js';
import type { Schema } from './conformance.js';
import { withReferences } from './negative-conformance.js';
import { requestSchemaName } from './validators.js';
import { gatewayInventory } from './gateway-inventory.js';

const domain =
  process.argv[2] === 'gateway'
    ? await gatewayInventory()
    : (await inventory()).find((item) => item.plane === process.argv[2]);
if (!domain) throw new Error('Pass an AIRS inventory plane or gateway');
const spec = await loadContractSpec(
  domain.plane === 'gateway'
    ? domain.file
    : join(process.env.AIRS_OPENAPI_DIR ?? join(root, 'schemas'), domain.file),
  domain.plane,
);
const contracts = new Map<
  string,
  { direction: 'request' | 'response'; validator: string; operations: string[]; schema: Schema }
>();
for (const operation of domain.operations) {
  const op = (spec.paths?.[operation.path] as Record<string, unknown>)[
    operation.method.toLowerCase()
  ] as {
    requestBody?: { content?: Record<string, { schema?: Schema }> };
    responses?: Record<string, { content?: Record<string, { schema?: Schema }> }>;
  };
  for (const call of operation.implementations.filter(
    (call) =>
      domain.plane !== 'gateway' ||
      /(?:inference|runtime-resources|model-pricing)-client/.test(call.source),
  ))
    for (const direction of ['request', 'response'] as const) {
      const validator = direction === 'request' ? requestSchemaName(call) : call.responseSchema;
      const bodies =
        direction === 'request'
          ? [op.requestBody]
          : Object.entries(op.responses ?? {})
              .filter(([status]) => /^2\d\d$/.test(status))
              .map(([, body]) => body);
      for (const body of bodies) {
        const original = body?.content?.['application/json']?.schema;
        if (!original) continue;
        if (!validator && call.member === 'downloadFile') continue; // File bytes, not JSON.
        if (!validator) throw new Error(`Missing ${direction} validator: ${operation.path}`);
        const schema = withReferences(original);
        const key = `${direction}:${validator}:${createHash('sha256').update(JSON.stringify(schema)).digest('hex')}`;
        const existing = contracts.get(key);
        const label = `${operation.method} ${operation.path}`;
        if (existing) existing.operations.push(label);
        else contracts.set(key, { direction, validator, operations: [label], schema });
      }
    }
}
const chunkSize = 8;
if (domain.plane === 'gateway') {
  const schemas = (spec as unknown as { components: { schemas: Record<string, Schema> } })
    .components.schemas;
  contracts.set('stream:CreatePromptCompletionStreamResponse', {
    direction: 'response',
    validator: 'GatewayInferenceCreatePromptCompletionStreamResponseSchema',
    operations: ['POST /prompts/{promptId}/completions (SSE)'],
    schema: withReferences({
      anyOf: [schemas.CreateChatCompletionStreamResponse, schemas.CreateCompletionResponse],
    }),
  });
  for (const name of ['CreateChatCompletionStreamResponse', 'ResponseStreamEvent']) {
    const schema = (spec as unknown as { components: { schemas: Record<string, Schema> } })
      .components.schemas[name];
    contracts.set(`stream:${name}`, {
      direction: 'response',
      validator: `GatewayInference${name}Schema`,
      operations: [
        name === 'ResponseStreamEvent' ? 'POST /responses (SSE)' : 'POST /chat/completions (SSE)',
      ],
      schema: withReferences(schema),
    });
  }
}
if (process.argv[3] === '--count') console.log(Math.ceil(contracts.size / chunkSize));
else {
  const chunk = Number(process.argv[3] ?? 0);
  if (!Number.isInteger(chunk) || chunk < 0 || chunk * chunkSize >= contracts.size)
    throw new Error('Invalid schema chunk');
  const payload = {
    source: domain.file,
    sha256: domain.sha256,
    corrections: compatibilityCorrections.filter((c) => c.plane === domain.plane).map((c) => c.id),
    contracts: [...contracts.values()].slice(chunk * chunkSize, (chunk + 1) * chunkSize),
  };
  const path = `test/openapi/validation/${domain.plane}-${chunk}.json`;
  emitPatch(path, JSON.stringify(payload, null, 2) + '\n');
}
