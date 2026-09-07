/** @internal Verification is deliberately separate from upstream operation coverage. */
export const gatewayExperimental: Record<string, string> = {
  'inference.connectRealtime':
    'Explicit caller-owned WebSocket adapter, bounded JSON events and deterministic cancellation. The prescribed-model live probe upgrades with HTTP 101, then receives invalid_model before session readiness. A successful provider session/generation remains unverified; an upgrade is not a successful realtime workflow.',
  'inference.updateFeedback':
    'Confirmed runtime handler; owned-record PUT returns HTTP 500 because feedback lookup requires uninitialized ClickHouse in control-plane storage mode. Typed contracts are experimental, not a successful live update.',
  'inference.getLog':
    'Confirmed runtime handler; owned-log reads return HTTP 500 because the deployed handler has no control-plane storage branch. Typed contracts and v2 timestamp validation are experimental, not successful live retrieval.',
  'inference.createCompletion':
    'Deployed route confirmed; prescribed-model legacy completion returns HTTP 404. Typed JSON/SSE contracts are experimental, not live certification.',
  'inference.createPromptCompletion':
    'Deployed route dispatches to chat/legacy completion handlers. No owned live template is provisioned; flattened input and JSON/SSE contracts remain experimental.',
  'inference.createPromptRender':
    'Deployed route confirmed. No owned live template is provisioned; flattened request and rendered-response contracts remain experimental.',
  'inference.createImage':
    'Offline JSON contract only. The prescribed-model generation probe returned HTTP 400; no alternate model used.',
  'inference.createImageEdit':
    'Offline multipart contract only. The prescribed-model edit probe returned HTTP 400; successful live editing is unverified.',
  'inference.createImageVariation':
    'Offline multipart contract only. The prescribed-model variation probe returned HTTP 404; successful live variation is unverified.',
  'inference.createSpeech':
    'Offline binary-response contract only. The prescribed-model speech probe returned HTTP 404; no audio model was substituted.',
  'inference.createTranscription':
    'Offline multipart/format-specific response contracts only. The prescribed-model transcription probe returned HTTP 400 with model incompatibility.',
  'inference.createTranslation':
    'Offline multipart/format-specific response contracts only. The prescribed-model translation probe returned HTTP 400 with model incompatibility.',
  'inference.createModeration':
    'Offline JSON contract only. The prescribed-model moderation probe returned HTTP 400; no specialized model was substituted.',
  'inference.createRerank':
    'Offline JSON contract only. The prescribed-provider rerank probe returned HTTP 500; no different provider was configured.',
  'inference.createOcr':
    'Offline JSON contract only. The prescribed-provider OCR probe returned HTTP 500; no different provider was configured.',
  'mcpServers.test': 'SCM returned HTTP 403 on an owned server; authorization remains unverified.',
  'mcpServers.deleteConnections':
    'SCM returned HTTP 403 on an owned server; authorization remains unverified.',
  'mcpServers.updateCapabilities':
    'Owned public-upstream discovery, capability updates and eventual runtime tool visibility pass 16/16; an independent 17/17 audit verifies all new fixtures retired (2026-09-07). Authenticated-source clones still require a caller identity; the private synthetic upstream was rejected by unchanged SSRF protection. No tools were invoked. The published experimental stability annotation is retained; prompt/resource capability variants are not live-certified.',
  'usageLimits.resetEntity':
    'Post-release owned traffic/reset lifecycle passes 8/8 with an independent 2/2 retirement audit (2026-09-07). This supersedes the earlier missing-entity prerequisite. SDK 0.21.0 still labels the method experimental; its published stability guarantee is unchanged.',
  'logExports.start':
    'SCM returned HTTP 500 (AB04) for an isolated export; successful execution is unverified.',
  'logExports.cancel': 'No running owned export was available; contract-tested only.',
  'logExports.download': 'The owned export could not start; successful download is unverified.',
  'inference.deleteModel':
    'No owned fine-tuned model was provisioned for deletion; offline contract only.',
  'inference.createFineTuningJob':
    'No training job was started. The designated inference model does not support fine-tuning; offline contract only.',
  'inference.retrieveFineTuningJob': 'No owned training job was available; offline contract only.',
  'inference.cancelFineTuningJob':
    'No owned training job was available; existing jobs were not changed. Offline contract only.',
  'inference.listFineTuningEvents': 'No owned training job was available; offline contract only.',
  'inference.listFineTuningJobCheckpoints':
    'No owned training job checkpoints were available; offline contract only.',
  'inference.cancelVectorStoreFileBatch':
    'The owned file-batch cancellation endpoint returned HTTP 500; successful cancellation remains unverified. Create, completed retrieval and file listing passed.',
};

export function gatewayDisposition(method: string, path: string, direct: boolean) {
  if (direct)
    return {
      status: 'direct-contract',
      reason:
        'SDK route exists. Typed field coverage does not imply successful live execution; consult the method verification table.',
    };
  if (
    path === '/logs' ||
    path === '/logs/{logId}' ||
    path === '/feedback' ||
    path === '/feedback/{id}'
  )
    return {
      status: 'tenant-unverified',
      reason:
        'SCM log-detail reads returned 500 even with real storage metadata. Runtime feedback update on an owned record returned 500. Runtime feedback creation and log ingestion are separately implemented and live-verified; SCM still denies their writes. Remaining routes are gaps, not covered operations.',
    };
  if (/^\/admin\/workspaces(?:\/\{[^}]+\})?$/.test(path))
    return {
      status: 'scm-adapted',
      reason:
        'SCM uses /workspaces: reads are available on the data and admin planes; writes use the admin plane. Creation requires SCM scope provisioning and remains live-unverified. Not a wire-equivalent Portkey implementation.',
    };
  if (path.startsWith('/api-keys'))
    return {
      status: 'scm-adapted',
      reason:
        'SCM splits service and user API keys into /api-keys/service and /api-keys/user. Virtual keys are not aliases.',
    };
  if (path === '/analytics/graphs/requests')
    return {
      status: 'scm-adapted-partial',
      reason:
        'SCM /logs/charts/requests has live-verified traceId and string-valued metadata filters; known and nonexistent synthetic controls pass. Upstream trace_id is ignored. Full upstream aggregation/filter equivalence is not established and this remains outside direct operation coverage.',
    };
  if (path.startsWith('/analytics/'))
    return {
      status: 'scm-adapted-partial',
      reason:
        'SCM exposes /logs/charts and /logs/groups. Related telemetry exists, but upstream aggregations are not all semantically equivalent. Not counted as full operation coverage.',
    };
  if (/^\/(assistants|threads)(\/|$)/.test(path))
    return {
      status: 'runtime-retired-upstream',
      reason:
        'OpenAI retired Assistants/Threads on 2026-08-26 (developers.openai.com/api/docs/assistants/migration). These 23 pinned operations remain unimplemented and in the 242-operation denominator. The configured OpenAI backend cannot live-certify them; Responses is not counted as a wire-equivalent replacement. This does not establish every other provider or gateway compatibility mode is unavailable.',
    };
  if (
    /^\/(chat|realtime|completions|images|embeddings|rerank|ocr|audio|files|fine_tuning|models|moderations|assistants|responses|threads|vector_stores|batches)(\/|$)/.test(
      path,
    ) ||
    /^\/prompts\/\{[^}]+\}\/(completions|render)$/.test(path)
  )
    return {
      status: 'runtime-unimplemented',
      reason:
        'Realtime is not implemented. A bounded live WebSocket probe completed HTTP 101, then received invalid_model before session creation with the prescribed model. Same-key authentication and socket/key cleanup passed. No alternate model or successful realtime lifecycle is claimed.',
    };
  if (
    /^\/(collections|labels|prompts|virtual-keys|admin\/users|admin\/workspaces\/.*\/users|scim\/workspaces|model-configs\/pricing|secret-references)(\/|$)/.test(
      path,
    )
  )
    return {
      status: 'tenant-unverified',
      reason:
        'Read-only probes of this family were denied or unavailable on the supplied SCM tenant. This is not proof that every method is unsupported. No speculative write API added.',
    };
  return {
    status: 'unimplemented',
    reason: `${method} ${path} has not been verified on SCM. It remains an explicit gap, not counted as covered.`,
  };
}
