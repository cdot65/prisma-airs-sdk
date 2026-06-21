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
| **Security profile** | The named ruleset (managed via the [Management API](management-api.md)) that decides which detections run and whether a hit means _allow_ or _block_. |
| **Verdict**          | The result: `category` (`benign`/`malicious`) and `action` (`allow`/`block`).                                                                         |
| **Sync vs async**    | Sync gives an inline verdict in one call. Async accepts a batch, returns receipts, and you poll for results later.                                    |

:::tip[Profiles live in the Management API]
The Scan API only _references_ a profile by name or ID — it never creates one. Define and tune profiles with the [Management API](management-api.md), then point scans at them.
:::
## Authentication

Two auth methods (mutually exclusive):

1. **API Key** — sets `X-Pan-Token` header + HMAC-SHA256 `X-Payload-Hash`
2. **Bearer Token** — sets `Authorization: Bearer <token>` header

The Scan API uses **API key auth only** — it does _not_ use the OAuth2 flow that the Management, Model Security, and Red Team APIs require.

## Initialization

```ts
import { init, Scanner, Content } from '@cdot65/prisma-airs-sdk';

// From env vars (recommended)
// PANW_AI_SEC_API_KEY or PANW_AI_SEC_API_TOKEN must be set
init();

// Or explicit
init({
  apiKey: 'your-api-key',
  // apiToken: 'your-bearer-token',  // alternative
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

`result` is a `ScanResponse`: `category` is `"benign"` or `"malicious"`; `action` is `"allow"` or `"block"`. Keep `scan_id` / `report_id` to fetch detail later.

### Scan many items off the hot path (asynchronous)

When you have a backlog (logs, batch evaluation, offline review), submit up to **5** items in one call, get a `scan_id` receipt back immediately, then poll for results once processing completes.

```ts
const submitted = await scanner.asyncScan([
  {
    req_id: 1,
    scan_req: {
      ai_profile: { profile_name: 'my-profile' },
      contents: [{ prompt: 'hello', response: 'world' }],
    },
  },
  // ... up to 5 objects
]);

// submitted: AsyncScanResponse — { received, scan_id }
const results = await scanner.queryByScanIds([submitted.scan_id]);
for (const r of results) {
  console.log(r.scan_id, r.status, r.result?.category);
}
```

`req_id` is your own correlation number so you can match each item back in the results.

### Pull the full threat report

`syncScan` / `queryByScanIds` give the verdict. For the per-detector breakdown (which engine fired, what it found), query by report ID — up to **5** at a time.

```ts
const reports = await scanner.queryByReportIds([result.report_id]);
for (const report of reports) {
  for (const det of report.detection_results ?? []) {
    console.log(det.detection_service, det.verdict, det.action);
  }
}
```

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
`asyncScan`, `queryByScanIds`, and `queryByReportIds` each accept **at most 5 items**. The SDK throws a client-side error before any network call if you exceed it — loop in batches of 5 for larger workloads.
:::
**Retry behavior** — every scan call retries automatically on transient server errors (`500`, `502`, `503`, `504`) with exponential backoff plus jitter. Tune the attempt count with `init({ numRetries })` (0–5, default 5). Set it to `0` only if you have your own retry layer; client-side `4xx` errors are never retried.

**Sync vs async — pick deliberately:**

- Use **sync** when a user is waiting and you need to allow/block in the same request.
- Use **async** for throughput: batching amortizes round-trips, and polling keeps your request path fast.

**Reuse the `Scanner`.** `init()` sets a global singleton; construct one `Scanner` and share it. There's no per-call connection setup to repeat.

**Trace your scans.** Always pass `trId` and `sessionId`. They flow into AIRS scan logs (queryable via the [Management API](management-api.md)), making incident triage and per-conversation analysis far easier later.

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
