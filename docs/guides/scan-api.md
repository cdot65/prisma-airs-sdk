# Scan API

Real-time content scanning for AI prompts and responses.

## Authentication

Two auth methods (mutually exclusive):

1. **API Key** — sets `X-Pan-Token` header + HMAC-SHA256 `X-Payload-Hash`
2. **Bearer Token** — sets `Authorization: Bearer <token>` header

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

## Scanner Methods

### syncScan — synchronous inline scan

```ts
const result = await scanner.syncScan(
  { profile_name: 'my-profile' }, // or { profile_id: 'uuid' }
  content,
  {
    trId: 'transaction-123', // optional, max 100 chars
    sessionId: 'session-456', // optional, max 100 chars
    metadata: {
      // optional
      app_name: 'my-app',
      app_user: 'user123',
      ai_model: 'gpt-4',
    },
  },
);

// result: ScanResponse
console.log(result.category); // "benign" | "malicious"
console.log(result.action); // "allow" | "block"
console.log(result.scan_id);
console.log(result.report_id);
```

### asyncScan — batch async scan (up to 5)

```ts
const result = await scanner.asyncScan([
  {
    req_id: 1,
    scan_req: {
      ai_profile: { profile_name: 'my-profile' },
      contents: [{ prompt: 'hello', response: 'world' }],
    },
  },
  // ... up to 5 objects
]);

// result: AsyncScanResponse
console.log(result.scan_id);
```

### queryByScanIds — get results (up to 5 IDs)

```ts
const results = await scanner.queryByScanIds(['550e8400-e29b-41d4-a716-446655440000']);

// results: ScanIdResult[]
for (const r of results) {
  console.log(r.scan_id, r.status, r.result?.category);
}
```

### queryByReportIds — get threat reports (up to 5 IDs)

```ts
const reports = await scanner.queryByReportIds(['report-id-here']);

// reports: ThreatScanReport[]
for (const report of reports) {
  for (const det of report.detection_results ?? []) {
    console.log(det.detection_service, det.verdict, det.action);
  }
}
```

## HTTP Behavior

- Base URL: `https://service.api.aisecurity.paloaltonetworks.com` (overridable)
- Exponential backoff retry on 500/502/503/504
- Max retries: configurable 0-5, default 5
- User-Agent: `PAN-AIRS/<version>-typescript-sdk`

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
