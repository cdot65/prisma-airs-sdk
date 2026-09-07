/** @internal Freeze the four provider upload schemas independently of SDK model generation. */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { loadContractSpec } from './compatibility.js';
import { emitPatch } from './emit-patch.js';
import type { Schema } from './conformance.js';
import { withReferences } from './negative-conformance.js';

const file =
  process.env.GATEWAY_OPENAPI_FILE ??
  '/home/cdot/development/others/ai-gateway-openapi/openapi.yaml';
const spec = await loadContractSpec(file, 'gateway');
const cases = [
  ['/images/edits', 'createImageEdit', 'CreateImageEditRequest'],
  ['/images/variations', 'createImageVariation', 'CreateImageVariationRequest'],
  ['/audio/transcriptions', 'createTranscription', 'CreateTranscriptionRequest'],
  ['/audio/translations', 'createTranslation', 'CreateTranslationRequest'],
].map(([path, method, component]) => {
  const operation = (
    spec.paths?.[path] as {
      post?: { requestBody?: { content?: Record<string, { schema?: Schema }> } };
    }
  ).post;
  const schema = operation?.requestBody?.content?.['multipart/form-data']?.schema;
  if (!schema) throw new Error(`Missing multipart schema: ${path}`);
  return {
    path,
    method,
    validator: `GatewayInferenceInput${component}Schema`,
    schema: withReferences(schema),
  };
});
emitPatch(
  'test/openapi/provider-multipart.json',
  JSON.stringify(
    {
      source: 'ai-gateway-openapi/openapi.yaml',
      sha256: createHash('sha256').update(readFileSync(file)).digest('hex'),
      cases,
    },
    null,
    2,
  ) + '\n',
);
