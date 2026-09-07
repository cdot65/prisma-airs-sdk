/** @internal Explicit, auditable corrections for malformed upstream declarations.
 * Source YAML is never changed. Raw metrics remain available with `--raw`.
 */
import SwaggerParser from '@apidevtools/swagger-parser';
import type { Schema } from './conformance.js';
import { correctPromptRuntimeContracts } from './prompt-contracts.js';

export const compatibilityCorrections = [
  {
    id: 'gateway-pricing-overlapping-calculation-nodes',
    plane: 'gateway',
    pointer: '/components/schemas/ModelCalculateOperation/properties/operands/items',
    reason:
      'Operation and value-reference objects have only optional fields and allow additional properties. A shallow formula containing a captured value-reference node matches both oneOf alternatives and is rejected, while deeper formulas can pass through the permissive value-reference fallback. Use anyOf for overlapping variants; preserve optional fields and validate declared node fields without evaluating formulas. The public unauthenticated endpoint is separate from SCM and runtime routing.',
  },
  {
    id: 'gateway-prompt-root-hyperparameters',
    plane: 'gateway',
    pointer:
      '/paths/~1prompts~1{promptId}~1completions/post/requestBody/content/application~1json/schema',
    additionalPointers: [
      '/paths/~1prompts~1{promptId}~1render/post/requestBody/content/application~1json/schema',
    ],
    reason:
      'The pinned descriptions explicitly require hyperparameters at the root and say all are optional; their nested grouping is educational only. Flatten the chat and legacy parameter alternatives, retaining variables as required. No authoring route or live successful template is implied.',
  },
  {
    id: 'gateway-prompt-native-completion-response',
    plane: 'gateway',
    pointer:
      '/paths/~1prompts~1{promptId}~1completions/post/responses/200/content/application~1json/schema',
    reason:
      'Both hash-pinned gateway_enterprise:2.20.0 replicas register this route and dispatch directly to ordinary chat/legacy completion handlers. Accept their native response objects as well as the pinned status/headers/body wrapper. This is deployed-code compatibility evidence, not successful live template certification.',
  },
  {
    id: 'gateway-legacy-stream-null-fields',
    plane: 'gateway',
    pointer: '/components/schemas/CreateCompletionResponse/properties/usage',
    additionalPointers: [
      '/components/schemas/CreateCompletionResponse/properties/choices/items/properties/finish_reason',
      '/components/schemas/CreateCompletionResponse/properties/system_fingerprint',
    ],
    reason:
      'Legacy JSON and SSE share a response shape. Intermediate events may have no finish reason or usage; the official completion reference explicitly documents null intermediate usage. Preserve nullable completion state and fingerprints without coercion. The prescribed model remains live-incompatible with this endpoint.',
  },
  {
    id: 'gateway-audio-overlapping-json-variants',
    plane: 'gateway',
    pointer: '/paths/~1audio~1transcriptions/post/responses/200/content/application~1json/schema',
    additionalPointers: [
      '/paths/~1audio~1translations/post/responses/200/content/application~1json/schema',
    ],
    reason:
      'The simple JSON response requires only text and allows additional fields, so every verbose response also matches it. Replace the impossible exclusive oneOf with anyOf. Runtime response selection still validates the specific requested format. This is an offline schema correction, not live certification.',
  },
  {
    id: 'gateway-audio-verbose-duration',
    plane: 'gateway',
    pointer: '/components/schemas/CreateTranscriptionResponseVerboseJson/properties/duration',
    additionalPointers: [
      '/components/schemas/CreateTranslationResponseVerboseJson/properties/duration',
    ],
    reason:
      'The pinned Portkey document declares string duration, while the official OpenAI audio reference declares numeric duration (https://developers.openai.com/api/reference/resources/audio). Accept both response representations without coercion; successful live provider execution remains unverified.',
  },
  {
    id: 'gateway-provider-prefixed-response-models',
    plane: 'gateway',
    pointer: '/components/schemas/ModelIdsResponses',
    reason:
      'The runtime accepts provider-prefixed deployment model IDs, including the user-specified @openai/gpt-5.6-terra verified live. The closed upstream 2025 enum is not the gateway model catalog. Preserve the nonempty string contract.',
  },
  {
    id: 'scan-flat-async-batch',
    plane: 'scan',
    pointer: '/paths/~1v1~1scan~1async~1request/post/requestBody/content/application~1json/schema',
    reason:
      'The operation wraps AsyncScanRequest in a second array although that component is already an array. The deployed service accepts a flat batch (live scan E2E).',
  },
  {
    id: 'scan-required-profile-selector',
    plane: 'scan',
    pointer: '/components/schemas/AiProfile',
    reason:
      'The property descriptions require profile_id or profile_name; required/anyOf is missing. Preserve the documented selector requirement.',
  },
  {
    id: 'scan-nonempty-contents',
    plane: 'scan',
    pointer: '/components/schemas/ScanRequest/properties/contents/minItems',
    reason:
      'The scan contract describes the last item as the content to scan; a request must contain at least one item. Existing SDK validation and live scans enforce this.',
  },
  {
    id: 'management-topic-items-indentation',
    plane: 'management',
    pointer: '/components/schemas/ModelProtectionObject/items/properties',
    reason:
      'items is incorrectly a sibling property of topic-list. It describes the topic-list array elements, confirmed by live profile round-trips.',
  },
  {
    id: 'management-server-assigned-revisions',
    plane: 'management',
    pointer: '/components/schemas/{AIProfileObject,CustomTopicObject}/required',
    reason:
      'Live create and update workflows accept omitted revisions; the service assigns the revision. See management-revision and management-compatibility E2E reports.',
  },
  {
    id: 'management-optional-topic-content',
    plane: 'management',
    pointer: '/components/schemas/CustomTopicObject/required',
    reason:
      'Live create/update accept omitted description and examples; responses may omit examples, normalized to an empty array by the SDK. Verified with an owned minimal topic, then deleted.',
  },
  {
    id: 'management-optional-dlp-members',
    plane: 'management',
    pointer: '/components/schemas/DataProtectionObject/properties/data-leak-detection',
    reason:
      'Live profile create/update accept omitted DLP members; existing response fixtures also demonstrate null members. The action remains required.',
  },
  {
    id: 'redteam-overlapping-connection-variants',
    plane: 'redteam-management',
    pointer: '/components/schemas/Target*/properties/connection_params/anyOf/0',
    reason:
      'Native, REST, streaming and WebSocket objects overlap without an internal discriminator. oneOf therefore rejects otherwise valid connections accepted live. Evaluate these alternatives as anyOf, as the SDK and deployed service do.',
  },
  {
    id: 'redteam-csv-template-content-type',
    plane: 'redteam-management',
    pointer:
      '/paths/~1v1~1custom-attack~1download-template~1{prompt_set_uuid}/get/responses/200/content',
    reason:
      'The operation describes and returns a CSV template, not a JSON document. Live template download/upload round-trips verify text/csv handling.',
  },
] as const;

export async function loadContractSpec(path: string, plane: string, corrected = true) {
  const spec = await SwaggerParser.dereference(path);
  if (!corrected) return spec;
  // SwaggerParser keeps reference identity; patching a component updates every use site.
  const schemas = (spec as unknown as { components: { schemas: Record<string, Schema> } })
    .components.schemas;
  if (plane === 'gateway') {
    const operands = schemas.ModelCalculateOperation.properties!.operands.items!;
    if (!operands.oneOf) throw new Error('Pinned model-pricing calculation alternatives changed');
    operands.anyOf = operands.oneOf;
    delete operands.oneOf;
    correctPromptRuntimeContracts(
      spec as unknown as Parameters<typeof correctPromptRuntimeContracts>[0],
    );
    const model = schemas.ModelIdsResponses;
    // Dereferencing a $ref with description siblings clones its outer object, but shares
    // nested arrays. Replace the enum alternative in place so every use sees the correction.
    model.anyOf!.splice(0, model.anyOf!.length, { type: 'string', minLength: 1 });
    for (const name of [
      'CreateTranscriptionResponseVerboseJson',
      'CreateTranslationResponseVerboseJson',
    ]) {
      const duration = schemas[name].properties!.duration;
      delete duration.type;
      duration.anyOf = [{ type: 'string' }, { type: 'number' }];
    }
    for (const route of ['/audio/transcriptions', '/audio/translations']) {
      const op = spec.paths![route] as unknown as {
        post: { responses: { '200': { content: { 'application/json': { schema: Schema } } } } };
      };
      const response = op.post.responses['200'].content['application/json'].schema;
      if (!response.oneOf)
        throw new Error('Audio response alternatives changed; review correction');
      response.anyOf = response.oneOf;
      delete response.oneOf;
    }
  }
  if (plane === 'scan') {
    const profile = schemas.AiProfile;
    profile.anyOf = [
      { type: 'object', properties: profile.properties, required: ['profile_id'] },
      { type: 'object', properties: profile.properties, required: ['profile_name'] },
    ];
    schemas.ScanRequest.properties!.contents.minItems = 1;
    const asyncOperation = (
      spec.paths as unknown as Record<
        string,
        { post?: { requestBody: { content: Record<string, { schema: Schema }> } } }
      >
    )['/v1/scan/async/request']?.post;
    if (!asyncOperation)
      throw new Error('Scan async operation moved; review the compatibility correction');
    asyncOperation.requestBody.content['application/json'].schema = schemas.AsyncScanRequest;
  }
  if (plane === 'management') {
    const properties = schemas.ModelProtectionObject.items!.properties!;
    if (!properties.items || properties['topic-list'].items)
      throw new Error('Upstream topic-list changed; review the compatibility correction');
    properties['topic-list'].items = properties.items;
    delete properties.items;
    // Request omission does not make server-assigned revision/description optional in responses.
    schemas.CustomTopicObject.required = schemas.CustomTopicObject.required!.filter(
      (key) => key !== 'examples',
    );
    for (const item of Object.values(spec.paths ?? {})) {
      for (const operation of Object.values(item ?? {})) {
        const content = (
          operation as { requestBody?: { content?: Record<string, { schema: Schema }> } }
        )?.requestBody?.content?.['application/json'];
        if (content?.schema === schemas.AIProfileObject)
          content.schema = {
            ...content.schema,
            required: content.schema.required!.filter((key) => key !== 'revision'),
          };
        if (content?.schema === schemas.CustomTopicObject)
          content.schema = { ...content.schema, required: ['topic_name'] };
      }
    }
    const dlp = schemas.DataProtectionObject.properties!['data-leak-detection'];
    dlp.required = dlp.required?.filter((key) => key !== 'member');
    dlp.properties!.member.nullable = true;
  }
  if (plane === 'redteam-management') {
    for (const name of [
      'TargetCreateRequestSchema',
      'TargetProbeRequest',
      'TargetRedactSchema',
      'TargetSchema',
      'TargetUpdateRequestSchema',
    ]) {
      const choice = schemas[name]?.properties?.connection_params.anyOf?.[0];
      if (choice?.oneOf) {
        choice.anyOf = choice.oneOf;
        delete choice.oneOf;
      }
    }
    const op = (
      spec.paths as unknown as Record<
        string,
        { get: { responses: Record<string, { content: Record<string, unknown> }> } }
      >
    )['/v1/custom-attack/download-template/{prompt_set_uuid}'].get;
    const content = op.responses['200'].content;
    content['text/csv'] = content['application/json'];
    delete content['application/json'];
  }
  return spec;
}
