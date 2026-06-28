# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

TypeScript SDK for Palo Alto Networks Prisma AIRS — covers the full lifecycle across all three service domains (AI Runtime Security, Model Security, AI Red Teaming) plus configuration management. Extends beyond the official Python `pan-aisecurity` SDK. Published as `@cdot65/prisma-airs-sdk` on npm. Zero external HTTP dependencies (native fetch + crypto).

## Commands

```bash
npm run build          # tsup → CJS + ESM + types in dist/
npm run test           # vitest single run
npm run test:watch     # vitest watch mode
npm run test:coverage  # vitest with v8 coverage
npm run lint           # eslint
npm run typecheck      # tsc --noEmit
npm run format         # prettier --write
npm run format:check   # prettier --check
npm run clean          # rm -rf dist/
npm run docs:api       # typedoc → API reference
npm run docs:serve     # build typedoc, then run docs-site (Docusaurus) dev server
npm run docs:build     # build typedoc + docs-site static site
npm run docs:check     # verify every public symbol has example coverage (CI gate)
npm run docs:check:warn # same, exit 0 even on gaps
npm run preflight      # diff Zod schemas vs OpenAPI specs (strict; CI gate)
npm run preflight:warn # same, exit 0 even on drift
```

`preflight` diffs the Zod schemas in `src/models/` against the OpenAPI specs in `specs/` and gates CI; run it before tagging a release or after API-side changes. Runnable usage examples live in `docs-site/examples/` (one `*.ts` per workflow) and are surfaced through the docs site, not via `npm run` scripts.

Run a single test file:

```bash
npx vitest run test/scan/scanner.spec.ts
```

Run a single test by name:

```bash
npx vitest run -t "test name pattern"
```

## Architecture

**4 service domains**, 2 auth methods:

- **Scan API** (API Key): `init()` → `Scanner` → `syncScan()`, `asyncScan()`, `queryByScanIds()`, `queryByReportIds()` against the AIRS content scanning endpoint
- **Management API** (OAuth2): `ManagementClient` exposes sub-clients `profiles`, `topics`, `apiKeys`, `customerApps`, `dlpProfiles`, `deploymentProfiles`, `scanLogs`, `oauth`, `dashboard`, and `dlp` (namespace over `dataFilteringProfiles`, `dataPatterns`, `dataProfiles`, `dictionaries` — separate DLP base URL, shared OAuth creds)
- **Model Security API** (OAuth2): `ModelSecurityClient` exposes `scans`, `securityGroups`, `securityRules` (read-only) + `getPyPIAuth()`
- **Red Team API** (OAuth2): `RedTeamClient` exposes `scans`, `reports`, `customAttackReports`, `targets`, `customAttacks`, `eula`, `instances` + dashboard convenience methods (`getScanStatistics`, `getScoreTrend`, `getQuota`, `getErrorLogs`, `updateSentiment`, `getSentiment`, `getDashboardOverview`). Splits data-plane vs management-plane base URLs.

Key modules:

- `src/scan/` — Scanner, Content (API key auth via `init()`)
- `src/management/` — ManagementClient, OAuthClient + per-resource clients (profiles, topics, api-keys, customer-apps, dlp-profiles, deployment-profiles, scan-logs, oauth-management, dashboard) and `dlp/` namespace
- `src/model-security/` — ModelSecurityClient + 3 sub-clients (scans, security-groups, security-rules)
- `src/red-team/` — RedTeamClient + 7 sub-clients (scans, reports, custom-attack-reports, targets, custom-attacks, eula, instances)
- `src/http/` — shared request pipeline (`request.ts`), auth adapters (`auth/api-key.ts` HMAC, `auth/oauth.ts` bearer), opt-in debug logging (`debug.ts`, gated by `PANW_AI_SEC_DEBUG`, hashes token headers), types
- `src/http-retry.ts` — shared exponential backoff + full-jitter retry (used by the request pipeline)
- `src/models/` — Zod schemas + inferred TypeScript types for all API models
- `src/errors.ts` — `AISecSDKException` with `ErrorType` enum (7 types)
- `src/constants.ts` — API paths, content limits, batch limits, header names, endpoints, retry config

**Auth:** API key (HMAC-SHA256) for AIRS scans only. OAuth2 `client_credentials` for everything else (management CRUD, model security, red teaming). Model Security and Red Team OAuth creds fall back to `PANW_MGMT_*` when their own `PANW_MODEL_SEC_*` / `PANW_RED_TEAM_*` vars are unset.

**Validation strategy:** Content validates at setter time, Scanner validates arguments, Zod validates API responses. Models use `.passthrough()` for forward compat.

## Conventions

- ESM-first (`"type": "module"`) with dual CJS/ESM exports
- Target: ES2022, Node ≥18, TypeScript strict mode
- Prettier: 100 char width, single quotes, 2-space indent, trailing commas
- Tests in `test/` mirror `src/` structure, files named `*.spec.ts`
- Tests mock fetch via `vi.fn()`, reset `globalConfiguration` in `beforeEach`
- All public API exported from `src/index.ts` barrel
- Batch operations limited to 5 items max

## CI/CD

- GitHub Actions test matrix: Node 18, 20, 22
- Publish via OIDC trusted publishing on GitHub release (Node 24, no npm tokens)
- `prepublishOnly` runs lint + test
