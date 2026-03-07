# SDK Overview

TypeScript SDK for Palo Alto Networks **AI Runtime Security (AIRS)**. Published as `@cdot65/prisma-airs-sdk` on npm. Zero external HTTP dependencies (native `fetch` + `crypto`).

## Install

```bash
npm install @cdot65/prisma-airs-sdk
```

Requires Node.js 18+. ESM-first with dual CJS/ESM exports.

## Two Separate APIs

The SDK exposes two independent client systems targeting different AIRS services:

### 1. Scan API — real-time content scanning

- **Auth**: API key (`X-Pan-Token` + HMAC-SHA256 payload hash) or pre-obtained bearer token
- **Base URL**: `https://service.api.aisecurity.paloaltonetworks.com`
- **Init**: global singleton via `init()`, then `new Scanner()`
- **Operations**: sync scan, async batch scan, query results by scan/report IDs
- **Docs**: [scan-api.md](scan-api.md)

### 2. Management API — CRUD for security configuration

- **Auth**: OAuth2 `client_credentials` flow (client_id + client_secret + TSG ID → bearer token)
- **Base URL**: `https://api.sase.paloaltonetworks.com/aisec`
- **Init**: `new ManagementClient()` (no global state)
- **Operations**: CRUD for security profiles and custom topics
- **Docs**: [management-api.md](management-api.md)

These two APIs use **different base URLs, different auth flows, and different HTTP clients**. They are fully independent — you can use one without the other.

## Environment Variables

All configuration can be passed as constructor options or read from env vars. Copy `.env.example` to `.env` to get started.

### Scan API

| Env Var                    | Required         | Default                                               |
| -------------------------- | ---------------- | ----------------------------------------------------- |
| `PANW_AI_SEC_API_KEY`      | One of key/token | —                                                     |
| `PANW_AI_SEC_API_TOKEN`    | One of key/token | —                                                     |
| `PANW_AI_SEC_PROFILE_NAME` | For examples     | —                                                     |
| `PANW_AI_SEC_API_ENDPOINT` | No               | `https://service.api.aisecurity.paloaltonetworks.com` |

### Management API

| Env Var                    | Required | Default                                                      |
| -------------------------- | -------- | ------------------------------------------------------------ |
| `PANW_MGMT_CLIENT_ID`      | Yes      | —                                                            |
| `PANW_MGMT_CLIENT_SECRET`  | Yes      | —                                                            |
| `PANW_MGMT_TSG_ID`         | Yes      | —                                                            |
| `PANW_MGMT_ENDPOINT`       | No       | `https://api.sase.paloaltonetworks.com/aisec`                |
| `PANW_MGMT_TOKEN_ENDPOINT` | No       | `https://auth.apps.paloaltonetworks.com/oauth2/access_token` |

## Error Handling

All errors throw `AISecSDKException` with an `errorType` enum:

| ErrorType                    | When                                               |
| ---------------------------- | -------------------------------------------------- |
| `SERVER_SIDE_ERROR`          | 5xx from API                                       |
| `CLIENT_SIDE_ERROR`          | 4xx from API / network failures                    |
| `USER_REQUEST_PAYLOAD_ERROR` | Invalid input (bad UUID, oversized content, etc.)  |
| `MISSING_VARIABLE`           | Missing required config (API key, client ID, etc.) |
| `AISEC_SDK_ERROR`            | Internal SDK errors                                |
| `OAUTH_ERROR`                | OAuth2 token fetch failures                        |

```ts
import { AISecSDKException, ErrorType } from '@cdot65/prisma-airs-sdk';

try {
  // any SDK operation
} catch (err) {
  if (err instanceof AISecSDKException) {
    console.error(err.errorType, err.message);
  }
}
```

## Project Structure

```
src/
├── index.ts                  # barrel export (public API surface)
├── configuration.ts          # global singleton for scan API init()
├── constants.ts              # endpoints, env var names, limits, paths
├── errors.ts                 # AISecSDKException + ErrorType enum
├── http-client.ts            # scan API fetch wrapper (API key/token auth)
├── http-retry.ts             # shared retry logic (exponential backoff)
├── utils.ts                  # UUID validation, HMAC payload hash
├── scan/
│   ├── scanner.ts            # Scanner class (syncScan, asyncScan, query*)
│   └── content.ts            # Content class with byte-length validation
├── management/
│   ├── client.ts             # ManagementClient facade
│   ├── oauth-client.ts       # OAuth2 token manager (cache, refresh, dedup)
│   ├── management-http-client.ts  # mgmt fetch wrapper (bearer auth, retry)
│   ├── profiles.ts           # ProfilesClient (CRUD)
│   └── topics.ts             # TopicsClient (CRUD + forceDelete)
└── models/                   # Zod schemas + inferred TypeScript types
    ├── mgmt-security-profile.ts
    ├── mgmt-custom-topic.ts
    ├── oauth-token.ts
    └── ... (scan models)
```

## Build & Test

```bash
npm run build          # tsup → CJS + ESM + types in dist/
npm run test           # vitest
npm run test:coverage  # vitest with v8 coverage
npm run lint           # eslint
npm run typecheck      # tsc --noEmit
```

## Running Examples

```bash
cp .env.example .env   # fill in credentials
npm run example:scan
npm run example:async-scan
npm run example:query
npm run example:mgmt-auth
npm run example:mgmt-profiles
npm run example:mgmt-topics
```
