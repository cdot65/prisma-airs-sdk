# prisma-airs-sdk

TypeScript SDK for Palo Alto Networks **AI Runtime Security (AIRS)**. API-compatible with the official [Python `pan-aisecurity` SDK](https://pypi.org/project/pan-aisecurity/).

## Installation

```bash
npm install @cdot65/prisma-airs-sdk
```

Requires Node.js 18+.

## Quick Start

```ts
import { init, Scanner, Content } from '@cdot65/prisma-airs-sdk';

// Initialize (mirrors Python's aisecurity.init())
init({ apiKey: 'YOUR_API_KEY' });

const scanner = new Scanner();
const content = new Content({
  prompt: 'What is the capital of France?',
  response: 'The capital of France is Paris.',
});

const result = await scanner.syncScan({ profile_name: 'my-profile' }, content);

console.log(result.category); // "benign" | "malicious"
console.log(result.action); // "allow" | "block"
```

## Initialization

```ts
import { init } from '@cdot65/prisma-airs-sdk';

init({
  apiKey: 'your-api-key', // or set PANW_AI_SEC_API_KEY env var
  apiToken: 'your-bearer-token', // or set PANW_AI_SEC_API_TOKEN env var
  apiEndpoint: 'https://...', // optional, defaults to production
  numRetries: 3, // optional, 0-5, default 5
});
```

At least one of `apiKey` or `apiToken` must be provided (directly or via environment variables).

## Scanner Methods

| Method                                | Description                                |
| ------------------------------------- | ------------------------------------------ |
| `syncScan(aiProfile, content, opts?)` | Synchronous inline scan                    |
| `asyncScan(scanObjects)`              | Batch async scan (up to 5)                 |
| `queryByScanIds(scanIds)`             | Get results by scan IDs (up to 5)          |
| `queryByReportIds(reportIds)`         | Get threat reports by report IDs (up to 5) |

### Sync Scan

```ts
const result = await scanner.syncScan(
  { profile_name: 'my-profile' },
  new Content({ prompt: 'user input', response: 'model output' }),
  {
    trId: 'transaction-123',
    sessionId: 'session-456',
    metadata: { app_name: 'my-app', ai_model: 'gpt-4' },
  },
);
```

### Async Scan

```ts
const result = await scanner.asyncScan([
  {
    req_id: 1,
    scan_req: {
      ai_profile: { profile_name: 'my-profile' },
      contents: [{ prompt: 'hello', response: 'world' }],
    },
  },
]);
```

### Query Results

```ts
const results = await scanner.queryByScanIds(['scan-uuid-here']);
const reports = await scanner.queryByReportIds(['report-id-here']);
```

## Content Class

```ts
import { Content } from '@cdot65/prisma-airs-sdk';

const content = new Content({
  prompt: 'user prompt',
  response: 'model response',
  context: 'grounding context',
  codePrompt: 'code input',
  codeResponse: 'code output',
  toolEvent: {
    metadata: { ecosystem: 'mcp', method: 'invoke', server_name: 'my-server' },
    input: '{"query": "test"}',
  },
});

// Serialize
const json = content.toJSON();

// Deserialize
const restored = Content.fromJSON(json);
const fromFile = Content.fromJSONFile('./content.json');
```

## Error Handling

```ts
import { AISecSDKException, ErrorType } from '@cdot65/prisma-airs-sdk';

try {
  await scanner.syncScan(profile, content);
} catch (err) {
  if (err instanceof AISecSDKException) {
    console.error(err.message); // includes ErrorType prefix
    console.error(err.errorType); // ErrorType enum value
  }
}
```

Error types: `SERVER_SIDE_ERROR`, `CLIENT_SIDE_ERROR`, `USER_REQUEST_PAYLOAD_ERROR`, `MISSING_VARIABLE`, `AISEC_SDK_ERROR`.

## Migration from v0.1

| v0.1                                    | v0.2                                          |
| --------------------------------------- | --------------------------------------------- |
| `new PrismaAirsSdkClient({ apiToken })` | `init({ apiKey }); new Scanner()`             |
| `client.scanSyncRequest(body)`          | `scanner.syncScan(aiProfile, content, opts?)` |
| `client.scanAsyncRequest(body)`         | `scanner.asyncScan(scanObjects)`              |
| `client.getScanResultsByScanIds(ids)`   | `scanner.queryByScanIds(ids)`                 |
| `client.getThreatScanReports(ids)`      | `scanner.queryByReportIds(ids)`               |
| `PrismaAirsApiError`                    | `AISecSDKException`                           |
| `axios` dependency                      | Native `fetch` (zero HTTP deps)               |

## Development

```bash
npm install
npm run build     # tsup (CJS + ESM + .d.ts)
npm run test      # vitest
npm run lint      # eslint
```

## License

MIT
