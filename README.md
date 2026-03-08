# prisma-airs-sdk

[![CI](https://github.com/cdot65/prisma-airs-sdk/actions/workflows/ci.yml/badge.svg)](https://github.com/cdot65/prisma-airs-sdk/actions/workflows/ci.yml)
[![Tests](https://github.com/cdot65/prisma-airs-sdk/actions/workflows/test.yml/badge.svg)](https://github.com/cdot65/prisma-airs-sdk/actions/workflows/test.yml)
[![npm version](https://img.shields.io/npm/v/@cdot65/prisma-airs-sdk)](https://www.npmjs.com/package/@cdot65/prisma-airs-sdk)
[![npm downloads](https://img.shields.io/npm/dm/@cdot65/prisma-airs-sdk)](https://www.npmjs.com/package/@cdot65/prisma-airs-sdk)
[![Coverage](https://img.shields.io/badge/coverage-99%25-brightgreen)](https://github.com/cdot65/prisma-airs-sdk)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6)](https://www.typescriptlang.org/)
[![Node 18+](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

TypeScript SDK for Palo Alto Networks **Prisma AIRS** — covering the full lifecycle from configuration management to operational scanning across all three service domains: **AI Runtime Security**, **AI Red Teaming**, and **Model Security**.

## Installation

```bash
npm install @cdot65/prisma-airs-sdk
```

Requires Node.js 18+. Zero external HTTP dependencies (native `fetch` + `crypto`).

## What's Included

| Service                 | Client                | Auth    | Capabilities                                               |
| ----------------------- | --------------------- | ------- | ---------------------------------------------------------- |
| **AI Runtime Security** | `Scanner`             | API Key | Sync/async content scanning, prompt injection detection    |
| **Management**          | `ManagementClient`    | OAuth2  | Security profiles and custom topics CRUD                   |
| **Model Security**      | `ModelSecurityClient` | OAuth2  | ML model scanning, security groups, rule management        |
| **AI Red Teaming**      | `RedTeamClient`       | OAuth2  | Automated red team scans, reports, targets, custom attacks |

All OAuth2 services share credentials and handle token lifecycle automatically (caching, proactive refresh, 401/403 auto-retry).

## Quick Start

### AI Runtime Security — Content Scanning (API Key)

```ts
import { init, Scanner, Content } from '@cdot65/prisma-airs-sdk';

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

### Management — Configuration CRUD (OAuth2)

CRUD operations for all three Prisma AIRS services use OAuth2:

```ts
import { ManagementClient } from '@cdot65/prisma-airs-sdk';

const client = new ManagementClient(); // reads PANW_MGMT_* env vars

// Security Profiles
const profiles = await client.profiles.list();
const created = await client.profiles.create({
  profile_name: 'my-profile',
  active: true,
  policy: {
    /* ... */
  },
});

// Custom Topics
const topic = await client.topics.create({
  topic_name: 'pii-detector',
  examples: ['SSN: 123-45-6789'],
});
```

### Model Security — ML Model Scanning (OAuth2)

```ts
import { ModelSecurityClient } from '@cdot65/prisma-airs-sdk';

const client = new ModelSecurityClient(); // falls back to PANW_MGMT_* env vars

const scans = await client.scans.list({ limit: 10 });
const groups = await client.securityGroups.list();
const rules = await client.securityRules.list();
```

### AI Red Teaming — Automated Testing (OAuth2)

```ts
import { RedTeamClient } from '@cdot65/prisma-airs-sdk';

const client = new RedTeamClient(); // falls back to PANW_MGMT_* env vars

const scans = await client.scans.list({ limit: 5 });
const targets = await client.targets.list();
const categories = await client.scans.getCategories();
```

## Authentication

| Auth Method                     | Used By                                                     |
| ------------------------------- | ----------------------------------------------------------- |
| **API Key** (HMAC-SHA256)       | AI Runtime Security scans only                              |
| **OAuth2** (client_credentials) | Everything else — Management CRUD, Red Team, Model Security |

```bash
# AI Runtime Security scans
export PANW_AI_SEC_API_KEY=your-api-key

# OAuth2 (shared by Management, Red Team, Model Security)
export PANW_MGMT_CLIENT_ID=your-client-id
export PANW_MGMT_CLIENT_SECRET=your-client-secret
export PANW_MGMT_TSG_ID=1234567890
```

## Scanner Methods

| Method                                | Description                                |
| ------------------------------------- | ------------------------------------------ |
| `syncScan(aiProfile, content, opts?)` | Synchronous inline scan                    |
| `asyncScan(scanObjects)`              | Batch async scan (up to 5)                 |
| `queryByScanIds(scanIds)`             | Get results by scan IDs (up to 5)          |
| `queryByReportIds(reportIds)`         | Get threat reports by report IDs (up to 5) |

## Error Handling

```ts
import { AISecSDKException, ErrorType } from '@cdot65/prisma-airs-sdk';

try {
  await scanner.syncScan(profile, content);
} catch (err) {
  if (err instanceof AISecSDKException) {
    console.error(err.message);
    console.error(err.errorType);
  }
}
```

Error types: `SERVER_SIDE_ERROR`, `CLIENT_SIDE_ERROR`, `USER_REQUEST_PAYLOAD_ERROR`, `MISSING_VARIABLE`, `AISEC_SDK_ERROR`, `OAUTH_ERROR`.

## Documentation

Full documentation at **[cdot65.github.io/prisma-airs-sdk](https://cdot65.github.io/prisma-airs-sdk/)** — includes API reference, service guides, OAuth lifecycle docs, and examples.

## Development

```bash
npm install
npm run build          # tsup (CJS + ESM + .d.ts)
npm run test           # vitest (617 tests, 99%+ coverage)
npm run lint           # eslint
npm run typecheck      # tsc --noEmit
```

## License

MIT
