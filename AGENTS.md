# AGENTS.md

This file provides guidance to coding agents when working with code in this repository. It is kept in sync with `CLAUDE.md`.

## Overview

AgentGuard browser API support is experimental, introduced in SDK 0.29.0: `src/agentguard/client.ts` and `src/models/agentguard.ts`. Four read-only methods share OAuth and `x-tsg-id`, validate queries before authentication, and omit debug bodies. Rules pagination `total_items` is the observed page count; do not treat it as a global total. Failed scans have nullable summaries/durations and historical outcomes can be null. See `docs-site/docs/guides/agentguard.md`; CLI live acceptance resides in its actual repository at `scripts/e2e-agentguard.mjs`. Do not add undocumented APIs to the official OpenAPI coverage denominator.

TypeScript SDK for Palo Alto Networks Prisma AIRS — covers the full lifecycle across all three service domains (AI Runtime Security, Model Security, AI Red Teaming) plus configuration management. Extends beyond the official Python `pan-aisecurity` SDK. Published as `@cdot65/prisma-airs-sdk` on npm. Zero external HTTP dependencies (native fetch + crypto).

## Commands

```bash
npm run build          # tsup → CJS + ESM + types in dist/
npm run test           # vitest single run
npm run test:watch     # vitest watch mode
npm run test:coverage  # vitest with v8 coverage
npm run lint           # eslint
npm run typecheck      # tsc --noEmit
npm run typecheck:tooling # typecheck the OpenAPI audit and E2E tools
npm run format         # prettier --write
npm run format:check   # prettier --check
npm run clean          # rm -rf dist/
npm run docs:api       # typedoc → API reference
npm run docs:serve     # build typedoc, then run docs-site (Docusaurus) dev server
npm run docs:build     # build typedoc + docs-site static site
npm run docs:check     # verify every public symbol has example coverage (CI gate)
npm run docs:check:warn # same, exit 0 even on gaps
npm run preflight      # frozen OpenAPI operation/field/validation contract gate (offline CI)
npm run openapi:audit  # fresh local source audit; records specification hashes
npm run openapi:acceptance # same audit, also requires >=99% operations per supplied source
npm run preflight:legacy # historical component-name comparison (not a coverage measure)
npm run preflight:warn # historical comparison, warning-only
```

`preflight` and `openapi:check` run frozen operation, field, query and validation contracts without needing external checkouts. For a fresh audit, set `AIRS_OPENAPI_DIR` and `GATEWAY_OPENAPI_FILE`; `schemas/` remains a gitignored local fallback. Keep source hashes, compatibility corrections and frozen fixtures synchronized using `scripts/openapi/`. Never equate gateway disposition/classification with implementation coverage. The historical component-name diff is retained only as `preflight:legacy`. Runnable examples live in `docs-site/examples/`, and Docusaurus type-checks them against this checkout.

Run a single test file:

```bash
npx vitest run test/scan/scanner.spec.ts
```

Run a single test by name:

```bash
npx vitest run -t "test name pattern"
```

## Architecture

**AIRS services, SCM AI Gateway and gateway runtime**, 3 explicit auth methods:

- **Scan API** (API Key): `init()` → `Scanner` → `syncScan()`, `asyncScan()`, `queryByScanIds()`, `queryByReportIds()` against the AIRS content scanning endpoint
- **Management API** (OAuth2): `ManagementClient` exposes sub-clients `profiles`, `topics`, `apiKeys`, `customerApps`, `dlpProfiles`, `deploymentProfiles`, `scanLogs`, `oauth`, `dashboard`, and `dlp` (namespace over `dataFilteringProfiles`, `dataPatterns`, `dataProfiles`, `dictionaries` — separate DLP base URL, shared OAuth creds)
- **Model Security API** (OAuth2): `ModelSecurityClient` exposes `scans`, `securityGroups`, `securityRules` (read-only), `models`, `customRules` + `getPyPIAuth()`
- **Red Team API** (OAuth2): `RedTeamClient` exposes `scans`, `reports`, `customAttackReports`, `targets`, `customAttacks`, `eula`, `instances` + dashboard convenience methods (`getScanStatistics`, `getScoreTrend`, `getQuota`, `getErrorLogs`, `updateSentiment`, `getSentiment`, `getDashboardOverview`). Splits data-plane vs management-plane base URLs.

Key modules:

- `src/scan/` — Scanner, Content (API key auth via `init()`)
- `src/management/` — ManagementClient, OAuthClient + per-resource clients (profiles, topics, api-keys, customer-apps, dlp-profiles, deployment-profiles, scan-logs, oauth-management, dashboard) and `dlp/` namespace
- `src/model-security/` — ModelSecurityClient + 5 sub-clients (scans, security-groups, security-rules, models, custom-rules)
- `src/red-team/` — RedTeamClient + 9 sub-clients (scans, reports, custom-attack-reports, targets, custom-attacks, eula, instances, adapters, network-broker)
- `src/ai-gateway/` — 17 SCM sub-clients; OAuth + x-tsg-id; explicit admin/data routing. Separate `AIGatewayInferenceClient` / `AIGatewayClient.inference` runtime uses an explicit endpoint and `x-portkey-api-key`, typed HTTP resources and bounded cancellable SSE. Runtime retries default to zero.
- `src/http/` — shared request pipeline (`request.ts`), auth adapters (`auth/api-key.ts` HMAC, `auth/oauth.ts` bearer), opt-in debug logging (`debug.ts`, gated by `PANW_AI_SEC_DEBUG`, hashes token headers), types
- `src/http-retry.ts` — shared exponential backoff + full-jitter retry (used by the request pipeline)
- `src/models/` — Zod schemas + inferred TypeScript types for all API models
- `src/errors.ts` — `AISecSDKException` with `ErrorType` enum (7 types)
- `src/constants.ts` — API paths, content limits, batch limits, header names, endpoints, retry config

**Auth:** API key (HMAC-SHA256) for AIRS scans only. OAuth2 `client_credentials` for management CRUD, SCM gateway, model security and red teaming. Runtime gateway keys are sent as `x-portkey-api-key`, without OAuth or TSG headers. Model Security and Red Team OAuth creds fall back to `PANW_MGMT_*` when their own `PANW_MODEL_SEC_*` / `PANW_RED_TEAM_*` vars are unset. Never infer a runtime hostname or key from SCM credentials.

**Validation strategy:** Content validates at setter time; requests validate before authentication/network I/O; Zod validates API responses. Stable request objects are strict, declared JSON extension maps are finite/prototype-safe, and response objects use `.passthrough()` for forward compatibility. Debug bodies require separate `PANW_AI_SEC_DEBUG_BODY` opt-in; secret operations always omit them.

## Conventions

- ESM-first (`"type": "module"`) with dual CJS/ESM exports
- Target: ES2022, Node ≥18, TypeScript strict mode
- Prettier: 100 char width, single quotes, 2-space indent, trailing commas
- Tests in `test/` mirror `src/` structure, files named `*.spec.ts`
- Tests mock fetch via `vi.fn()`, reset `globalConfiguration` in `beforeEach`
- All public API exported from `src/index.ts` barrel
- Respect per-operation batch constants: async scan batches permit 20 entries; scan/report ID queries permit 5.

## CI/CD

- GitHub Actions test matrix: Node 18, 20, 22, 24; Node 22 enforces statement/line/function coverage ≥99% and branch coverage ≥95%.
- Publish via OIDC trusted publishing on GitHub release (Node 24, no npm tokens)
- `prepublishOnly` runs lint + test
