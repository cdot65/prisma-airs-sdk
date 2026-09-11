<p align="center">
  <img src="https://raw.githubusercontent.com/cdot65/prisma-airs-sdk/main/docs-site/static/img/logo.svg" alt="Prisma AIRS SDK shield with terminal and spectrum" width="320" />
</p>

# prisma-airs-sdk

[![CI](https://github.com/cdot65/prisma-airs-sdk/actions/workflows/ci.yml/badge.svg)](https://github.com/cdot65/prisma-airs-sdk/actions/workflows/ci.yml)
[![Tests](https://github.com/cdot65/prisma-airs-sdk/actions/workflows/test.yml/badge.svg)](https://github.com/cdot65/prisma-airs-sdk/actions/workflows/test.yml)
[![npm version](https://img.shields.io/npm/v/@cdot65/prisma-airs-sdk)](https://www.npmjs.com/package/@cdot65/prisma-airs-sdk)
[![npm downloads](https://img.shields.io/npm/dm/@cdot65/prisma-airs-sdk)](https://www.npmjs.com/package/@cdot65/prisma-airs-sdk)
[![Coverage](https://img.shields.io/badge/coverage-99%25-brightgreen)](https://github.com/cdot65/prisma-airs-sdk)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6)](https://www.typescriptlang.org/)
[![Node 18+](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

TypeScript SDK for Palo Alto Networks **Prisma AIRS** — covering the full lifecycle from configuration management to operational scanning across all four service domains: **AI Runtime Security**, **AI Red Teaming**, **Model Security**, and **AI Gateway**.

## Installation

Version **0.21.0** includes the September 2026 conformance update. See [SDK-ASSESSMENT.md](SDK-ASSESSMENT.md)
for validation results and remaining live-service limitations, and the
[OpenAPI report](docs-site/docs/developer/openapi-conformance.md) for the exact coverage denominator.
`npm run openapi:check` runs the pinned offline contract suite; `npm run openapi:audit` compares local
upstream checkouts. All 149 AIRS operations are modeled; this is not a claim of full Portkey runtime support.

```bash
npm install @cdot65/prisma-airs-sdk
```

Requires Node.js 18+. Zero external HTTP dependencies (native `fetch` + `crypto`).

## What's Included

| Service                  | Client                        | Auth        | Capabilities                                                           |
| ------------------------ | ----------------------------- | ----------- | ---------------------------------------------------------------------- |
| **AI Runtime Security**  | `Scanner`                     | API Key     | Sync/async content scanning, prompt injection detection                |
| **Management**           | `ManagementClient`            | OAuth2      | Profiles, topics, API keys, apps, DLP, deployment, logs                |
| **Model Security**       | `ModelSecurityClient`         | OAuth2      | ML model scanning, security groups, rule management                    |
| **AI Gateway**           | `AIGatewayClient`             | OAuth2      | SCM-managed gateway telemetry and configuration                        |
| **Gateway runtime**      | `AIGatewayInferenceClient`    | Gateway key | Chat, Responses, embeddings, bounded SSE and provider resources        |
| **Public model pricing** | `AIGatewayModelPricingClient` | None        | Explicit public catalog endpoint; typed rates and unevaluated formulas |
| **AI Red Teaming**       | `RedTeamClient`               | OAuth2      | Automated red team scans, reports, targets, custom attacks             |

All OAuth2 services share credentials and handle token lifecycle automatically (caching, proactive refresh, 401/403 auto-retry).

Gateway inference uses an explicitly configured runtime endpoint and `x-portkey-api-key`, with
zero automatic retries by default. It does not reuse management OAuth credentials.
See the [runtime inference guide](docs-site/docs/guides/ai-gateway-inference.md) for live results,
stream cancellation, CLI integration and the remaining experimental operations.

## Quick Start

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

That's the API-key scanning path. The OAuth2 clients (`ManagementClient`, `ModelSecurityClient`, `RedTeamClient`, `AIGatewayClient`), authentication setup, error handling, and runnable examples are all covered in the documentation.

## Complete list reads

List endpoints still return their native page envelopes through `list()`. For workflows that need
the complete result set, the OAuth resource clients also provide all-page helpers:

```ts
const profiles = await management.profiles.listAll({ latest: true });
const models = await modelSecurity.models.listAllModels({ search_query: 'llama' });
const targets = await redTeam.targets.listAll({ status: 'READY' });
const patterns = await management.dlp.dataPatterns.listAll({ status: 'active' });
```

All-page helpers preserve resource filters and normalize the APIs' different pagination dialects
(`offset`/`limit`, `skip`/`limit`, and Spring `page`/`size`). They collect at most 10,000 records by
default as runaway-pagination protection. Pass `{ max: 500 }` for a smaller bound or `{ max: 0 }`
to remove the bound. Low-level consumers can compose the exported `paginate()` async generator and
`collectAll()` helper for endpoints without a resource-specific convenience method.

Profile and topic reads are revision-aware: `profiles.list({ latest: true })` delegates revision
selection to the service, while `topics.list({ latestOnly: true })` groups all pages by topic name
and returns the highest revision. `getByName()` returns the highest revision for both resources.

## AI Gateway

`AIGatewayClient` covers the SCM-managed Prisma AIRS **AI Gateway** through 17 SCM sub-clients. The data plane (`/ai_gw/v2`) provides `telemetry`, `workspaces`, `configs`, `guardrails`, `providers`, `apiKeys`, `mcpServers`, `usageLimits`, `rateLimits`, and `logExports`. The admin plane (`/ai_gw/admin/v2`) provides `integrations`, `mcpIntegrations`, `deployments`, `plugins`, `organisations`, `auditLogs`, and `secretReferences`; workspace writes also use the admin plane. `gw.iamScopes` manages the SCM IAM scopes (`/iam/v1`) a workspace's `scope_name` must point at, and `gw.workspaces.provision()` runs SCM's scope → workspace → bind sequence in one call. The separate `inference` client uses an explicit runtime endpoint/key, not SCM OAuth.

Runtime observability uses that same explicit runtime client: `inference.createFeedback()` creates trace feedback, and `inference.createLogs()` accepts a single log or an array and returns the plain-text acknowledgement. These routes are live-verified on Prisma AIRS; SCM denies the corresponding writes. Log/feedback audit records have no deletion API. Experimental `inference.updateFeedback()` and `inference.getLog()` model the confirmed runtime detail routes, but both still return HTTP 500 on owned records because of deployed storage-handler limitations. Their typed contracts are not passing live update/retrieval claims; no storage backend is changed. Log v2 paths require an ISO timestamp with a timezone, and log bodies are omitted from SDK debug output.

Experimental runtime methods also model image/audio/moderation/rerank/OCR, legacy completions, prompt completions and prompt rendering. They have independent offline contracts, not successful live certification with the prescribed model and tenant. Prompt parameters belong at the request root, not inside `hyperparameters`; JSON and bounded SSE preserve the declared provider response shapes. These methods remain outside stability guarantees until verified. See the [runtime guide and actual diagnostic output](docs-site/docs/guides/ai-gateway-inference.md).

Secret-reference CRUD is verified using owned, unbound synthetic references; external secret resolution is not certified. See the [captured lifecycle output](docs-site/docs/guides/examples.mdx#secret-reference-management-lifecycle). Portkey compatibility remains partial; retired upstream endpoints and tenant-unverified families stay visible in the [complete operation ledger](docs-site/docs/developer/gateway-coverage.md).

Request, cost, token and latency charts, plus all six grouped analytics endpoints, accept verified trace/metadata filters, status-code/API-key/provider-model lists and inclusive total-token/cost bounds. List members match with OR; distinct filters combine with AND. Cost bounds are in cents. Groups preserve their existing columns and response envelopes; user grouping does not accept extra columns. Empty latency aggregates remain `null`, not measured zero. Unknown filters are rejected before authentication; the SCM query names differ from upstream Portkey. See the [typed telemetry contract](docs-site/docs/guides/ai-gateway-api.mdx#charts).

All AI Gateway write bodies have exported Zod schemas and inferred TypeScript types. Validation
happens before OAuth and network access; documented nonempty-update requirements are enforced. The package also
exports typed routing/provider configuration, deterministic known-value catalogs,
`buildDottedObject()` / `setDottedValue()` for CLI-style nested settings, and operation-scoped
secret metadata used by SDK debug redaction.

### SCM role grants

The two planes authorize against **different SCM role scopes** — a service account needs both, or half the API returns 403:

| Grant                       | Scope                            | Unlocks             |
| --------------------------- | -------------------------------- | ------------------- |
| Admin role                  | tenant root (empty last segment) | `/ai_gw/admin/v2/*` |
| `view_only_admin` or higher | `main_airs_workspace_<TSG>`      | `/ai_gw/v2/*`       |

Decode the service account's JWT `access` claim to check both are present:

```json
{
  "prn:<TSG>::::": ["superuser", "base"],
  "prn:<TSG>::::main_airs_workspace_<TSG>": ["superuser"]
}
```

SCM's Access Management UI **edits an existing role row by default** — use _Add Role_ to add the second grant, or you'll move the first one instead of adding to it. The two failure modes look alike but mean different things: a `403` with body `errorCode: "AB03"` means the workspace-scope grant is missing; a `403` with header `x-opa-decision: false` means the tenant-root grant is.

### Setup

```bash
export PANW_AI_GW_CLIENT_ID=your-client-id
export PANW_AI_GW_CLIENT_SECRET=your-client-secret
export PANW_AI_GW_TSG_ID=1234567890
```

`PANW_AI_GW_*` vars fall back to `PANW_MGMT_*` when unset, so existing management credentials work as-is.

```ts
import { AIGatewayClient, buildDottedObject } from '@cdot65/prisma-airs-sdk';

const gw = new AIGatewayClient();
const workspace = (await gw.workspaces.list()).data[0];

const cost = await gw.telemetry.cost({ workspaceSlug: workspace.slug, days: 7 });
console.log(`$${(cost.data.total / 100).toFixed(2)}`); // cost is returned in cents

const routing = buildDottedObject([
  { path: 'retry.attempts', value: 3 },
  { path: 'strategy.mode', value: 'fallback' },
]);
await gw.configs.create({ name: 'vertex-routing', workspace_id: workspace.id, config: routing });
```

## Documentation

Full docs at **[cdot65.github.io/prisma-airs-sdk](https://cdot65.github.io/prisma-airs-sdk/)**:

- [Getting Started](https://cdot65.github.io/prisma-airs-sdk/getting-started/quick-start) — installation, quick start, configuration, environment variables
- [Scan API](https://cdot65.github.io/prisma-airs-sdk/guides/scan-api) — sync/async content scanning
- [Management API](https://cdot65.github.io/prisma-airs-sdk/guides/management-api) — profiles, topics, API keys, apps, DLP, deployment, logs
- [Model Security API](https://cdot65.github.io/prisma-airs-sdk/guides/model-security-api) — model scans, security groups, rules
- [Red Team API](https://cdot65.github.io/prisma-airs-sdk/guides/red-team-api) — scans, reports, targets, custom attacks
- [OAuth Lifecycle](https://cdot65.github.io/prisma-airs-sdk/guides/oauth-lifecycle) & [Error Handling](https://cdot65.github.io/prisma-airs-sdk/developer/error-handling)
- [API Reference](https://cdot65.github.io/prisma-airs-sdk/reference/api) — generated from source

Runnable example scripts live in [`docs-site/examples/`](docs-site/examples).

## Development

```bash
npm install
npm run build          # tsup (CJS + ESM + .d.ts)
npm run test           # vitest
npm run lint           # eslint
npm run typecheck      # tsc --noEmit
```

## License

MIT
