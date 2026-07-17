# Scan API

Real-time threat inspection for the content flowing through your AI app — the prompts users send and the responses your model returns.

## How it works

The Scan API is the data-plane of Prisma AIRS. You hand it a piece of content (a prompt, a model response, or both) along with the name of a **security profile**, and AIRS runs that content through its detection engines — prompt injection, malicious URLs, sensitive-data leakage, toxic content, and more. It hands back a single verdict you can act on.

The mental model is a checkpoint you place around your model:

- **Inbound** — scan the user's prompt _before_ it reaches the model. Block jailbreaks and injections at the door.
- **Outbound** — scan the model's response _before_ it reaches the user. Catch leaked secrets or unsafe output on the way out.

Key concepts:

| Concept              | What it is                                                                                                                                            |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Scanner`            | The client you call. One per process; reads global config set by `init()`.                                                                            |
| `Content`            | A wrapper holding the text to scan (`prompt`, `response`, `context`, code, tool events). Validates size as you set it.                                |
| **Security profile** | The named ruleset (managed via the [Management API](management-api)) that decides which detections run and whether a hit means _allow_ or _block_. |
| **Verdict**          | The result: `category` (`benign`/`malicious`) and `action` (`allow`/`block`).                                                                         |
| **Sync vs async**    | Sync gives an inline verdict in one call. Async accepts 1–20 request objects, returns one batch receipt, and you poll for result rows later.          |

:::tip[Profiles live in the Management API]
The Scan API only _references_ a profile by name or ID — it never creates one. Define and tune profiles with the [Management API](management-api), then point scans at them.
:::
## Authentication

The Scan API is the only AIRS service in this SDK that does **not** use the OAuth2
`client_credentials` flow. Configure it with an API key, a pre-obtained bearer token, or both:

1. **API key** — sets the `x-pan-token` header and, when the request has a body, an
   HMAC-SHA256 `x-payload-hash` header.
2. **Bearer token** — sets the `Authorization: Bearer <token>` header.

`init()` requires at least one of `apiKey` or `apiToken`. If you provide both, the request carries
both the bearer token and the API-key HMAC headers.

## Initialization

```ts
import { init, Scanner, Content } from '@cdot65/prisma-airs-sdk';

// From env vars (recommended)
// PANW_AI_SEC_API_KEY or PANW_AI_SEC_API_TOKEN must be set
init();

// Or explicit
init({
  apiKey: 'your-api-key',
  // apiToken: 'your-bearer-token',  // optional; can also be used without apiKey
  // apiEndpoint: 'https://custom.endpoint.com',  // optional
  // numRetries: 3,  // 0-5, default 5
});

const scanner = new Scanner();
```

`init()` sets a global singleton. Must be called before any `Scanner` method.

## Content Class

Wraps prompt/response data with byte-length validation at setter time.

```ts
const content = new Content({
  prompt: 'user input', // max 2 MB
  response: 'model output', // max 2 MB
  context: 'grounding context', // max 100 MB
  codePrompt: 'code input', // max 2 MB
  codeResponse: 'code output', // max 2 MB
  toolEvent: {
    // MCP tool events
    metadata: { ecosystem: 'mcp', method: 'invoke', server_name: 'my-server' },
    input: '{"query": "test"}',
  },
});
```

At least one field is required. Serialization:

```ts
const json = content.toJSON();
const restored = Content.fromJSON(json);
const fromFile = Content.fromJSONFile('./content.json');
```

## Common tasks

### Gate a single request (synchronous)

The everyday case: scan one prompt/response pair and act on the verdict inline. Use this on the hot path when you need a decision _now_.

```ts
const content = new Content({
  prompt: 'What is the capital of France?',
  response: 'The capital of France is Paris.',
});

const result = await scanner.syncScan(
  { profile_name: 'my-profile' }, // or { profile_id: 'uuid' }
  content,
  {
    trId: 'transaction-123', // optional trace ID, max 100 chars
    sessionId: 'session-456', // optional, groups scans in one conversation, max 100 chars
    metadata: { app_name: 'my-app', app_user: 'user123', ai_model: 'gpt-4' },
  },
);

if (result.action === 'block') {
  // refuse the request / suppress the response
}
console.log(result.category, result.scan_id, result.report_id);
```

`result` is a `ScanResponse`: `category` is `"benign"` or `"malicious"`; `action` is `"allow"` or `"block"`. Prompt detector flags are typed under `prompt_detected`, including the optional boolean `source_code`. Keep `scan_id` / `report_id` to fetch detail later.

### Scan many items off the hot path (asynchronous)

When you have a backlog (logs, batch evaluation, offline review), submit **1–20 request objects** in one call. AIRS returns one batch receipt. A batch `scan_id` can later produce several result rows, one per `req_id`, and those rows can arrive in any order.

```ts
const submitted = await scanner.asyncScan(
  [
    {
      req_id: 1,
      scan_req: {
        ai_profile: { profile_name: 'my-profile' },
        contents: [{ prompt: 'hello', response: 'world' }],
      },
    },
    {
      req_id: 2,
      scan_req: {
        ai_profile: { profile_name: 'my-profile' },
        contents: [{ prompt: 'second prompt' }],
      },
    },
    // ... up to 20 objects, each with a distinct req_id
  ],
  { numRetries: 0 },
);

// submitted: AsyncScanResponse — { received, scan_id }
const results = await scanner.queryByScanIds([submitted.scan_id], { numRetries: 2 });
for (const row of results) {
  console.log(row.scan_id, row.req_id, row.status, row.result?.category);
}
```

`req_id` is your correlation number. Match scan results using the tuple `(scan_id, req_id)`—never array position or `scan_id` alone. The SDK returns every row in server order; it does not sort, deduplicate, or collapse rows that share a scan ID.

:::warning[Async submission is not exactly once]
`{ numRetries: 0 }` guarantees one SDK fetch attempt. It cannot prove whether AIRS accepted a request when the POST ends in a network error or 5xx response. Do not blindly resubmit an ambiguous async outcome unless your application has a safe reconciliation strategy. AIRS does not currently expose an SDK-level idempotency guarantee.
:::

### Pull the full threat report

`syncScan` / `queryByScanIds` give the verdict. For the per-detector breakdown (which engine fired, what it found), query by report ID — up to **5** at a time.

```ts
const reports = await scanner.queryByReportIds([result.report_id]);
for (const report of reports) {
  console.log(report.report_id, report.req_id);
  for (const det of report.detection_results ?? []) {
    console.log(det.detection_service, det.verdict, det.action);
  }
}
```

One report ID can also return multiple rows. Preserve every row and correlate it with `(report_id, req_id)`; do not store reports in a map keyed only by `report_id`.

## Get the most out of it

:::tip[Scan both directions]
A profile is only as good as where you put it. Scan the **prompt inbound** and the **response outbound** — many threats (data exfiltration, unsafe generations) only appear in the model's output.
:::
:::warning[Mind the content limits]
`Content` validates byte length the moment you set a field, so you fail fast rather than getting a 413 mid-flight:

| Field | Limit |
| --- | --- |
| `prompt`, `response`, `codePrompt`, `codeResponse` | 2 MB each |
| `context` | 100 MB |

These are **byte** limits (multibyte characters count for more than one). For very long documents, trim or chunk before scanning. Use `content.length` to check the combined size before sending.
:::
:::note[Batch and query caps are 5]
`asyncScan` accepts **at most 20 request objects**. `queryByScanIds` and `queryByReportIds` independently accept **at most 5 IDs**. The SDK throws a client-side error before any network call if you exceed the applicable limit—submit larger workloads in batches of 20, then query IDs in groups of 5.
:::
**Retry behavior** — every scan call retries automatically on network failures and transient server errors (`500`, `502`, `503`, `504`) with exponential backoff plus jitter. Tune the global count with `init({ numRetries })` (0–5, default 5), or pass `{ numRetries }` to an individual `syncScan`, `asyncScan`, `queryByScanIds`, or `queryByReportIds` call. The per-call value wins when provided; omitting it preserves the global setting. A value of `0` means one total fetch attempt, while `5` permits six attempts. HTTP 429 is not retried automatically.

For bulk scanning, use `numRetries: 0` on the async POST and deliberate retry policy in your application. Polling GETs are idempotent and can safely use a bounded override. On `AISecSDKException`, inspect `failureKind`, `statusCode`, and `retryAfterMs`; a definite 429 rejection differs from an ambiguous network/5xx async outcome.

**Sync vs async — pick deliberately:**

- Use **sync** when a user is waiting and you need to allow/block in the same request.
- Use **async** for throughput: batching amortizes round-trips, and polling keeps your request path fast.

**Reuse the `Scanner`.** `init()` sets a global singleton; construct one `Scanner` and share it. There's no per-call connection setup to repeat.

**Trace your scans.** Always pass `trId` and `sessionId`. They flow into AIRS scan logs (queryable via the [Management API](management-api)), making incident triage and per-conversation analysis far easier later.

**Code and tool content get their own fields.** Put code into `codePrompt` / `codeResponse` and MCP/function-call events into `toolEvent` rather than stuffing everything into `prompt` — detectors are tuned per field.

## HTTP behavior

- Base URL: `https://service.api.aisecurity.paloaltonetworks.com` (override via `init({ apiEndpoint })` or `PANW_AI_SEC_API_ENDPOINT` — regional endpoints exist for EU, India, and Singapore)
- Exponential backoff with jitter on `500`/`502`/`503`/`504`
- Max retries: configurable 0–5, default 5
- User-Agent: `PAN-AIRS/<version>-typescript-sdk`

## Full reference

Every `Scanner` and `Content` method — with input and output examples — is in the [Full API reference](../reference/api/index.md).

## Key Types

All types are Zod-validated and exported:

| Type                | Description                                       |
| ------------------- | ------------------------------------------------- |
| `ScanResponse`      | Sync scan result (category, action, detections)   |
| `AsyncScanResponse` | Batch scan receipt (scan_id)                      |
| `ScanIdResult`      | Query result per scan ID                          |
| `ThreatScanReport`  | Detailed threat report                            |
| `AiProfile`         | Profile identifier (profile_name or profile_id)   |
| `Content`           | Scan content wrapper class                        |
| `Metadata`          | Optional scan metadata (app_name, ai_model, etc.) |
| `ScanCallOptions`   | Per-call Scanner retry override                   |
