---
title: AI Gateway runtime inference
---

# AI Gateway runtime inference

`AIGatewayInferenceClient` calls your deployed gateway's runtime API. It is separate from
`AIGatewayClient` management: runtime calls use `x-portkey-api-key`, not SCM OAuth or `x-tsg-id`.
The runtime endpoint is required, includes its API prefix (usually `/v1`), and has no default.
HTTPS is required except for local loopback testing. Redirects are rejected to protect credentials.

## Connect and generate

Set `PANW_AI_GW_INFERENCE_ENDPOINT` and `PANW_AI_GW_INFERENCE_API_KEY` through your secret manager
or process environment. Do not put keys in source files, command arguments or committed examples.

```ts
import { AIGatewayInferenceClient } from '@cdot65/prisma-airs-sdk';

const inference = new AIGatewayInferenceClient(); // endpoint and key from the environment
const completion = await inference.createChatCompletion({
  model: '@openai/gpt-5.6-terra',
  messages: [{ role: 'user', content: 'Reply with READY.' }],
  max_completion_tokens: 128,
});
console.log(completion.choices[0].message.content);
```

An existing management client can instead expose a lazy runtime client with
`new AIGatewayClient({ ...managementOptions, inference: { endpoint, apiKey } }).inference`.
That convenience does not convert OAuth credentials into runtime credentials.

## Streaming and cancellation

```ts
const controller = new AbortController();
const stream = await inference.createChatCompletion(
  {
    model: '@openai/gpt-5.6-terra',
    messages: [{ role: 'user', content: 'Reply with READY.' }],
    max_completion_tokens: 128,
    stream: true,
    stream_options: { include_usage: true },
  },
  { signal: controller.signal },
);
for await (const chunk of stream) {
  for (const choice of chunk.choices) process.stdout.write(choice.delta.content ?? '');
}
```

The returned `GatewayStream<T>` is an async iterator with `cancel()`. Breaking a `for await`
loop also releases the connection. Cancel explicitly if you obtain a stream without consuming it.
The default 60-second deadline includes consumption; the default maximum SSE event is 1 MiB.
UTF-8 and CR/LF framing are decoded incrementally. Truncated streams, malformed JSON and invalid
event contracts fail explicitly. Chat requires `[DONE]`; Responses returns its typed terminal
event (`response.completed`, `response.failed` or `response.incomplete`) before closing.
Applications must inspect failed/incomplete Responses events rather than treating EOF as success.

Automatic retries default to **zero**, because replaying inference or resource creation can cause
duplicate work or charges. An explicit `numRetries` budget is available; a handed-off stream is
never replayed. Caller cancellation preserves the caller's abort reason.

## Responses and embeddings

```ts
const response = await inference.createResponse({
  model: '@openai/gpt-5.6-terra',
  input: 'Reply with READY.',
  max_output_tokens: 128,
  store: false,
});
console.log(response.output);

const embeddings = await inference.createEmbedding({
  model: '@openai/text-embedding-3-small',
  input: ['first document', 'second document'],
  dimensions: 32,
  encoding_format: 'float',
});
console.log(embeddings.data);
```

`createResponse({ ...body, stream: true })` returns typed lifecycle events. `createEmbedding`
preserves float arrays and base64 strings; it does not silently decode or change representations.
Provider-prefixed model IDs are passed through unchanged. No provider or model is selected by default.

## Provider resources

Resource requests without a body model generally need explicit provider routing:

```ts
const options = { headers: { 'x-portkey-provider': '@openai' } };
const models = await inference.listModels({}, options);
const files = await inference.listFiles({}, options);
const batches = await inference.listBatches({ limit: 10 }, options);
const stores = await inference.listVectorStores({ limit: 10 }, options);
const fineTuningJobs = await inference.listPaginatedFineTuningJobs({ limit: 1 }, options);
```

Typed methods also cover file upload/retrieval/deletion/download, stored Responses and input
items, vector-store CRUD/files/file batches, batch lifecycle, and six fine-tuning REST operations.
Fine-tuning includes job create/list/retrieve/cancel, events and checkpoints. Requests follow the
pinned Portkey contract, including its required `suffix` and `method` on creation; they are not
an assertion that every current OpenAI-only request shape is wire-equivalent.
File upload takes a native
`Blob` or `File`; native fetch supplies the multipart boundary. `downloadFile` and
`getBatchOutput` return `Uint8Array` without interpreting bytes as JSON. Use a named `File`
(available from `node:buffer` on Node 18) when the provider requires a filename extension.
Resource IDs are escaped as single path segments. Empty and dot-segment identifiers are rejected.

Per-call headers accept non-authentication `x-portkey-*` routing headers and `OpenAI-Beta`.
They cannot override the runtime API key. Configuration, metadata and forwarded-header values
are redacted in SDK debug logs; inference request/response bodies are always omitted.
An optional caller-owned `fetch` implementation supports explicit proxy/network integration.

## Runtime feedback and logs

The observability methods use the same explicit runtime endpoint/key, without a provider header. Creation and ingestion are live-verified; detail retrieval and feedback updates remain experimental. SCM OAuth routes deny the corresponding writes on the tested tenant.

```ts
const feedback = await inference.createFeedback({
  trace_id: 'your-own-request-trace-id',
  value: 0,
  weight: 0,
  metadata: { synthetic: true },
});
const acknowledgement = await inference.createLogs({
  request: { url: 'https://example.invalid/no-request', body: { prompt: 'READY' } },
  response: { status: 200, body: { output: 'READY' }, response_time: 1 },
  metadata: { trace_id: 'your-own-log-trace-id', synthetic: true },
});
```

`createLogs` also accepts an array of log entries. It records the supplied request/response; it does not make a request to the nested `request.url`. Its returned acknowledgement is plain text (`"ok"` in the live run), not parsed JSON. Finite JSON body/metadata extensions are preserved; invalid known fields and unknown stable-object fields are rejected before networking. The pinned metadata declaration has a misplaced `additionalProperties` field: the SDK retains that declared string property and also accepts the additional finite JSON metadata verified live.

The typed creation/ingestion suite passes 5/5, and an independent 5/5 SCM read audit confirms the retained synthetic feedback/log records. These records have no deletion operation in the supplied API. See [actual observability output](./examples.mdx#runtime-feedback-and-log-ingestion).

### Experimental detail and feedback update

`getLog()` and `updateFeedback()` now model the confirmed runtime routes. Their successful-response schemas come from the pinned source, not successful tenant retrieval/update. The September 7 typed E2E run has three passing ownership/authentication/key-cleanup controls and two HTTP 500 failures. It reuses existing neutral synthetic records and creates no new log or feedback. These methods remain outside stability guarantees until live-verified.

```ts
// Use only identifiers and storage metadata already returned for your own records.
const detail = await inference.getLog(ownedLogId, {
  path_format: 'v2',
  created_at: ownedLogCreatedAt, // ISO timestamp including Z or a numeric timezone offset
});
await inference.updateFeedback(ownedFeedbackId, {
  value: 0,
  weight: 0,
  metadata: { synthetic: true },
});
```

These calls currently fail on the tested deployment; the snippet describes the API, not passing output. The update uses the specification's `PUT`, not the inconsistent `POST` curl sample. Feedback IDs are UUIDs; scores are integers from -10 to 10 and optional weights are between 0 and 1. Invalid IDs, unknown stable fields and non-finite/prototype-unsafe metadata fail before authentication. Neither omitted weights nor other defaults are silently added.

Log queries accept `path_format`, `created_at` and optional `type: 'hooks'`; omit `type` for ordinary logs. Omitted `path_format` retains the server's v1 default. The v2/timestamp dependency is enforced both by TypeScript and before-network Zod validation. Log IDs remain opaque encoded path segments. Nested additive response fields are preserved, and log/feedback bodies stay out of SDK debug output even with body logging enabled. Runtime automatic retries remain zero by default.

```bash
E2E_GATEWAY_IPV4_ONLY=1 npx tsx scripts/e2e-gateway-observability-details-sdk.ts --writes
```

See the [actual failed results](./examples.mdx#latest-runtime-diagnostics-failures-remain-visible), including the recorded timestamp. `--writes` provisions and retires a temporary runtime key and updates only the journaled neutral synthetic feedback; it does not authorize updates to unrelated traces.

The deployed `gateway_enterprise:2.20.0` image was inspected read-only on both gateway replicas. With log and analytics storage set to `control_plane`, feedback lookup requires a ClickHouse client that this mode does not initialize, and log-detail retrieval has no matching storage branch. Hash-pinned pure-function reproductions produce the errors behind the observed 500 responses. Creation/ingestion use a different path and remain verified. These are deployment-specific limitations, not universal Portkey capability claims; no storage backend was changed to bypass them. See the [captured diagnostics](./examples.mdx#latest-runtime-diagnostics-failures-remain-visible).

## Live verification and compatibility

The September 6, 2026 live runs used disposable SCM-created service keys in the designated dev
workspace, the requested OpenAI provider/models, native fetch and the user's read-only config.
Temporary files, vector stores, stored Responses and keys were removed after each suite.

| Suite | Result | Evidence |
| --- | ---: | --- |
| SDK chat, Responses, embeddings, streaming and cancellation | 10/10 | `artifacts/e2e/gateway-inference.json` |
| SDK feedback creation, single/batch log ingestion and key cleanup | 5/5 | `artifacts/e2e/gateway-observability.json` |
| Independent SCM visibility of retained synthetic observability records | 5/5 | `artifacts/e2e/gateway-observability-audit.json` |
| SDK model/file/vector-store/Responses resources, fine-tuning listing and cleanup | 26/26 | `artifacts/e2e/gateway-runtime-resources.json` |
| SDK batch completion, both output endpoints and cleanup | 9/9 | `artifacts/e2e/gateway-batches.json` |
| SDK batch cancellation, terminal state and cleanup | 8/8 | `artifacts/e2e/gateway-batches-cancel.json` |
| SDK vector-file-batch lifecycle and cleanup | 12 pass / 3 fail / 15 total | `artifacts/e2e/gateway-vector-batches.json` |
| Built CLI inference and cleanup | 8/8 | `artifacts/e2e/cli-inference.json` |

Explicit differences from the pinned Portkey schema are recorded in the model generator:

- Chat fingerprints may be null; absent log probabilities may be omitted. Intermediate streaming
  usage is null; the final usage-only chunk has an empty choices array.
- Embedding values may be base64 strings as requested by `encoding_format`.
- Responses accepts deployed provider-prefixed model IDs, reports null user values, and has null
  usage during generation. Other stable fields retain validation.
- Empty collection cursors, file status details and unset batch outcome fields may be null.
- Batch output-file IDs and in-progress/finalizing/completed timestamps remain null until their
  lifecycle phase occurs; live validation exposed these values and regression tests preserve them.
- A vector-file response may report zero chunk size while automatic indexing is in progress;
  explicit static chunk-size requests still enforce 100–4096.
- Vector-file batches return `object: "vector_store.file_batch"` on the tested gateway. The
  pinned schema spells this `vector_store.files_batch`; both exact literals are accepted and
  preserved, while unrelated object types and malformed known fields are still rejected.

Successful vector-store creation can precede read visibility. Bounded read polling is appropriate
for newly owned IDs; the SDK does not replay creation. The provider rejects downloads of
assistant-purpose files (HTTP 400); exact-byte round-trips were verified with batch-purpose files.
Model listing without provider routing returned 403; the tested Assistants route returned 404.
These results do not prove all routes or every tenant has the same availability.

Fine-tuning job listing passed with an explicit provider and `limit: 1`. No training job was
started: the designated inference model [does not support fine-tuning](https://developers.openai.com/api/docs/models/gpt-5.6-terra).
An existing job is never cancelled or changed merely to obtain a test pass.

**Still experimental:** fine-tuning create/retrieve/cancel/events/checkpoints,
fine-tuned model deletion, and vector-file-batch cancellation.
Native batch create/retrieve/completion/output and cancellation now pass live using one synthetic
request per job, the required inference model and a 128-token output cap. Cancellation was checked
through the terminal cancelled state, not just HTTP acceptance. Files and temporary keys were
deleted; four terminal batch audit records remain because the API has no deletion operation.
See the [actual batch JSON output](./examples.mdx#validated-batch-inference-output).
File-batch create, completed retrieval and file listing now pass live. Cancellation returned
HTTP 500, followed by two failed assertions that the batch and file had been cancelled; these
are three failing checks of one unsuccessful cancellation workflow, not three independent API
defects. The owned parent store and both files were removed afterward. Unverified methods are
not release-ready claims. Nine additional provider HTTP methods are experimental as described below.
WebSocket realtime remains a runtime gap. Legacy completions and prompt completion/rendering are now experimental, as described below. Consult the full [operation ledger](../developer/gateway-coverage.md);
implemented-route field coverage is not 99% coverage of all 242 Portkey operations.

### Experimental provider HTTP methods

`createImage`, `createImageEdit`, `createImageVariation`, `createSpeech`, `createTranscription`,
`createTranslation`, `createModeration`, `createRerank` and `createOcr` now have typed, offline-tested
contracts. They are outside stability guarantees until successfully live-verified. No model is
selected by the SDK. Raw HTTP and SDK probes with the prescribed `@openai/gpt-5.6-terra` model fail
on all nine operations; successful model lookup verifies authentication, not compatibility with
these other endpoints. See the [actual result records](./examples.mdx#latest-runtime-diagnostics-failures-remain-visible).

Uploads use native `Blob`/`File` objects, not filesystem paths. Use a `File` when a provider needs
the original filename and extension; on Node 18 it is available from `node:buffer`. Fetch supplies
the multipart boundary. Array fields already ending in `[]`, such as `timestamp_granularities[]`,
are repeated without adding another suffix. Speech returns `Uint8Array` without text decoding.
Transcription and translation return typed JSON by default, typed verbose JSON for `verbose_json`,
and an unchanged string for `text`, `srt` or `vtt`. The selected JSON format is validated directly;
malformed verbose fields cannot fall through to the simpler JSON schema.

The pinned schema describes verbose audio duration as a string, while the
[official OpenAI audio reference](https://developers.openai.com/api/reference/resources/audio)
specifies a number. The experimental response validator accepts either representation without
coercion. Overlapping simple/verbose JSON response alternatives are recorded as an explicit
compatibility correction. This does not widen request types or certify unsupported models.

The test host required IPv4-only resolution for the runtime hostname. `E2E_GATEWAY_IPV4_ONLY=1`
enables a test-process-only lookup workaround; neither system DNS nor SDK defaults are changed.

### Experimental legacy and prompt methods

`createCompletion(body, options)` calls the legacy `/completions` route without translating it
into chat or changing the caller's model. JSON and streaming overloads share the legacy text
completion shape. Intermediate null usage, finish reason and fingerprint values are preserved.
Streaming requires the `[DONE]` terminator and uses the same bounded, cancellable parser as chat.
These semantics follow the [official completion reference](https://developers.openai.com/api/reference/resources/completions/methods/create),
not an assumption that the required model supports the endpoint. Its live SDK request returns
404; streaming is skipped after that prerequisite fails.

`createPromptCompletion(promptId, body, options)` and `createPromptRender(promptId, body, options)`
accept required `variables` and optional **root-level** chat or legacy parameter overrides.
The nested `hyperparameters` property in the pinned document is an educational grouping,
explicitly forbidden by its own wire instructions; the SDK rejects it. Variables use finite,
prototype-safe JSON values. No model is silently selected. A variables-only request lets the
server use the already configured template, so callers must know which owned template they use.

Prompt-completion JSON accepts native chat/text results and the pinned `status`/`headers`/`body`
wrapper; wrapper fields remain optional as declared upstream. Streaming emits native chat or
legacy completion events. Rendering returns the declared `success`/`data` object, with rendered
chat or legacy parameters, without requesting a generation.

Both hash-pinned deployed gateway replicas register all three routes, and prompt completion
dispatches to the ordinary chat/legacy handlers. This is route/implementation evidence, not a
successful owned-template lifecycle. Authoring discovery could not provision an owned template;
raw and SDK probes using random unprovisioned IDs both return 404. No existing template was
executed or modified. All three methods are **experimental and outside stability guarantees**
until successfully live-verified. The [examples page](./examples.mdx#latest-runtime-diagnostics-failures-remain-visible)
reproduces their actual failed result records.

```bash
E2E_GATEWAY_IPV4_ONLY=1 npx tsx scripts/e2e-gateway-legacy-completions.ts --writes --sdk
E2E_GATEWAY_IPV4_ONLY=1 npx tsx scripts/e2e-gateway-prompt-runtime.ts --writes
E2E_GATEWAY_IPV4_ONLY=1 npx tsx scripts/e2e-gateway-prompt-runtime.ts --writes --sdk
```

### Realtime discovery: model rejection after upgrade

The bounded realtime probe completed a valid HTTP 101 WebSocket upgrade, then received an `error` event with code `invalid_model` before a session was created. It used only `@openai/gpt-5.6-terra`; no alternative model, audio, client event or generation request was sent. Same-key model lookup, socket closure and temporary-key retirement passed (3 passes / 1 failed session workflow). The [examples page](./examples.mdx#latest-runtime-diagnostics-failures-remain-visible) contains the actual sanitized transport observation.

The test-only probe uses the isolated browser-verification installation of `ws@8.21.3`; it fails before provisioning a key if that prerequisite is absent or changed. TLS remains enabled, redirects/compression/retries are disabled, and the probe bounds handshake time, message size, event count and cleanup. The SDK package gains no WebSocket dependency and no realtime method from this diagnostic.

```bash
E2E_GATEWAY_IPV4_ONLY=1 npx tsx scripts/e2e-gateway-realtime.ts --writes
```

[Official OpenAI documentation](https://developers.openai.com/api/docs/guides/realtime-websocket) describes WebSocket authentication and JSON events, but does not certify this deployment's model compatibility. Both deployed gateway replicas register the route and remove the provider prefix before forwarding. Their upstream-open promise has no error/close rejection; a synthetic reproduction confirms that potential stalled-handshake path. It is not the cause of this observed failure, which upgraded successfully. A successful realtime session remains unverified, and the operation remains an implementation gap.

## CLI

The companion CLI candidate exposes `airs aigateway inference chat|responses|embeddings`.
Use `--model` or configure `PANW_AI_GW_INFERENCE_MODEL` / `PANW_AI_GW_EMBEDDING_MODEL`.
`--file` accepts a JSON request and cannot be combined with a prompt. Explicit flags override
the file and environment/config defaults. Runtime keys are accepted only from config/environment,
not a key flag. `--stream --output json` emits JSONL, one validated event per line; pretty mode
emits text. Streaming YAML is rejected before network activity. Stdout contains data only.
The original CLI config remains unchanged by inference commands.

Protocol references consulted: [OpenAI streaming Responses](https://developers.openai.com/api/docs/guides/streaming-responses)
and [embeddings](https://developers.openai.com/api/reference/resources/embeddings/methods/create).
Prisma live observations and the pinned local Portkey specification determine gateway routing,
authentication and compatibility corrections.
