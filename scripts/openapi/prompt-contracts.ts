/** @internal Explicit prompt/legacy corrections, applied to raw or dereferenced upstream schemas. */
import type { Schema } from './conformance.js';

export function correctPromptRuntimeContracts(spec: {
  components?: { schemas?: Record<string, unknown> };
  paths?: Record<string, unknown>;
}): void {
  const schemas = spec.components?.schemas as Record<string, Schema>;
  if (!schemas?.CreateCompletionResponse) throw new Error('Legacy completion schema changed');
  const resolve = (schema: Schema): Schema => {
    if (!schema.$ref) return schema;
    const name = /^#\/components\/schemas\/([^/]+)$/.exec(String(schema.$ref))?.[1];
    if (!name || !schemas[name]) throw new Error('Unexpected prompt schema reference');
    return schemas[name];
  };
  const completion = schemas.CreateCompletionResponse;
  const choices = completion.properties?.choices.items?.properties;
  if (
    !choices?.finish_reason ||
    !completion.properties?.usage ||
    !completion.properties.system_fingerprint
  )
    throw new Error('Legacy streaming fields changed; review nullable-response correction');
  choices.finish_reason = { ...choices.finish_reason, nullable: true };
  completion.properties.usage = { ...completion.properties.usage, nullable: true };
  completion.properties.system_fingerprint = {
    ...completion.properties.system_fingerprint,
    nullable: true,
  };

  for (const path of ['/prompts/{promptId}/completions', '/prompts/{promptId}/render']) {
    const operation = (
      spec.paths?.[path] as {
        post: {
          requestBody: { content: { 'application/json': { schema: Schema } } };
          responses: { '200': { content: { 'application/json': { schema: Schema } } } };
        };
      }
    )?.post;
    if (!operation) throw new Error(`Missing prompt runtime operation: ${path}`);
    const request = operation.requestBody.content['application/json'];
    const source = request.schema.allOf?.[0];
    const hyperparameters = source?.properties?.hyperparameters.oneOf;
    if (
      request.schema.allOf?.length !== 1 ||
      !source?.properties?.variables ||
      hyperparameters?.length !== 2
    )
      throw new Error(`Prompt educational grouping changed; review correction: ${path}`);
    const properties = { ...source.properties };
    delete properties.hyperparameters;
    // The source explicitly says every hyperparameter is optional and belongs at the root.
    // Preserve both parameter families and each family's differing overlapping-field types.
    request.schema = {
      anyOf: hyperparameters.map((variant) => {
        const candidate = resolve(variant);
        if (candidate.type !== 'object' || !candidate.properties)
          throw new Error('Non-object prompt parameters');
        return {
          type: 'object',
          properties: { ...candidate.properties, ...properties },
          required: ['variables'],
        };
      }),
    };
    if (path.endsWith('/completions')) {
      const response = operation.responses['200'].content['application/json'];
      const native = response.schema.properties?.body.oneOf;
      if (native?.length !== 2) throw new Error('Prompt completion response envelope changed');
      // The inspected deployed route dispatches directly to ordinary chat/legacy handlers.
      // Keep the upstream wrapper too, without inventing required fields absent from the pin.
      response.schema = { anyOf: [...native, response.schema] };
    }
  }
}
