# SDK Overview

TypeScript SDK for Palo Alto Networks **AI Runtime Security (AIRS)**. Published as `@cdot65/prisma-airs-sdk` on npm. Zero external HTTP dependencies (native `fetch` + `crypto`).

## Install

```bash
npm install @cdot65/prisma-airs-sdk
```

Requires Node.js 18+. ESM-first with dual CJS/ESM exports.

## Four Independent APIs

The SDK exposes four independent client systems targeting different AIRS services:

### 1. Scan API — real-time content scanning

- **Auth**: API key (`X-Pan-Token` + HMAC-SHA256 payload hash) or pre-obtained bearer token
- **Base URL**: `https://service.api.aisecurity.paloaltonetworks.com`
- **Init**: global singleton via `init()`, then `new Scanner()`
- **Operations**: sync scan, async batch scan, query results by scan/report IDs
- **Docs**: [scan-api.md](scan-api.md)

### 2. Management API — CRUD for security configuration

- **Auth**: OAuth2 `client_credentials` flow (client_id + client_secret + TSG ID)
- **Base URL**: `https://api.sase.paloaltonetworks.com/aisec`
- **Init**: `new ManagementClient()` (no global state)
- **Operations**: CRUD for security profiles and custom topics
- **Docs**: [management-api.md](management-api.md)

### 3. Model Security API — model security scans and policy

- **Auth**: OAuth2 `client_credentials` flow (client_id + client_secret + TSG ID)
- **Base URLs**: data plane (`https://api.sase.paloaltonetworks.com/aims/data`) + management plane (`https://api.sase.paloaltonetworks.com/aims/mgmt`)
- **Init**: `new ModelSecurityClient()` (no global state)
- **Operations**: model security scans, security groups, security rules, PyPI auth
- **Sub-clients**: `scans`, `securityGroups`, `securityRules`
- **Docs**: [model-security-api.md](model-security-api.md)

### 4. Red Team API — adversarial testing

- **Auth**: OAuth2 `client_credentials` flow (client_id + client_secret + TSG ID)
- **Base URLs**: data plane (`https://api.sase.paloaltonetworks.com/ai-red-teaming/data-plane`) + management plane (`https://api.sase.paloaltonetworks.com/ai-red-teaming/mgmt-plane`)
- **Init**: `new RedTeamClient()` (no global state)
- **Operations**: red team scans, reports, custom attack reports, targets, custom attacks, dashboard, quota
- **Sub-clients**: `scans`, `reports`, `customAttackReports`, `targets`, `customAttacks`
- **Docs**: [red-team-api.md](red-team-api.md)

All four APIs use **different base URLs and different HTTP clients**. They are fully independent — you can use any combination without the others. The three OAuth2-based APIs (Management, Model Security, Red Team) share the same `OAuthClient` implementation but each maintains its own token.

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

### Model Security API

Env vars fall back to the Management API equivalents for `CLIENT_ID`, `CLIENT_SECRET`, `TSG_ID`, and `TOKEN_ENDPOINT`.

| Env Var                         | Required | Fallback                   | Default                                                      |
| ------------------------------- | -------- | -------------------------- | ------------------------------------------------------------ |
| `PANW_MODEL_SEC_CLIENT_ID`      | Yes      | `PANW_MGMT_CLIENT_ID`      | —                                                            |
| `PANW_MODEL_SEC_CLIENT_SECRET`  | Yes      | `PANW_MGMT_CLIENT_SECRET`  | —                                                            |
| `PANW_MODEL_SEC_TSG_ID`         | Yes      | `PANW_MGMT_TSG_ID`         | —                                                            |
| `PANW_MODEL_SEC_DATA_ENDPOINT`  | No       | —                          | `https://api.sase.paloaltonetworks.com/aims/data`            |
| `PANW_MODEL_SEC_MGMT_ENDPOINT`  | No       | —                          | `https://api.sase.paloaltonetworks.com/aims/mgmt`            |
| `PANW_MODEL_SEC_TOKEN_ENDPOINT` | No       | `PANW_MGMT_TOKEN_ENDPOINT` | `https://auth.apps.paloaltonetworks.com/oauth2/access_token` |

### Red Team API

Env vars fall back to the Management API equivalents for `CLIENT_ID`, `CLIENT_SECRET`, `TSG_ID`, and `TOKEN_ENDPOINT`.

| Env Var                        | Required | Fallback                   | Default                                                           |
| ------------------------------ | -------- | -------------------------- | ----------------------------------------------------------------- |
| `PANW_RED_TEAM_CLIENT_ID`      | Yes      | `PANW_MGMT_CLIENT_ID`      | —                                                                 |
| `PANW_RED_TEAM_CLIENT_SECRET`  | Yes      | `PANW_MGMT_CLIENT_SECRET`  | —                                                                 |
| `PANW_RED_TEAM_TSG_ID`         | Yes      | `PANW_MGMT_TSG_ID`         | —                                                                 |
| `PANW_RED_TEAM_DATA_ENDPOINT`  | No       | —                          | `https://api.sase.paloaltonetworks.com/ai-red-teaming/data-plane` |
| `PANW_RED_TEAM_MGMT_ENDPOINT`  | No       | —                          | `https://api.sase.paloaltonetworks.com/ai-red-teaming/mgmt-plane` |
| `PANW_RED_TEAM_TOKEN_ENDPOINT` | No       | `PANW_MGMT_TOKEN_ENDPOINT` | `https://auth.apps.paloaltonetworks.com/oauth2/access_token`      |

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
├── model-security/
│   ├── client.ts             # ModelSecurityClient facade
│   ├── index.ts              # barrel export
│   ├── scans-client.ts       # model security scan operations
│   ├── security-groups-client.ts  # security group CRUD
│   └── security-rules-client.ts   # security rule operations (read-only)
├── red-team/
│   ├── client.ts             # RedTeamClient facade
│   ├── index.ts              # barrel export
│   ├── scans-client.ts       # red team scan operations
│   ├── reports-client.ts     # scan report operations
│   ├── custom-attack-reports-client.ts  # custom attack report operations
│   ├── targets-client.ts     # target CRUD
│   └── custom-attacks-client.ts  # custom attack/prompt set CRUD
└── models/                   # Zod schemas + inferred TypeScript types
    ├── enums.ts              # Verdict, Action, Category
    ├── model-security-enums.ts
    ├── model-security.ts
    ├── red-team-enums.ts
    ├── red-team.ts
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
