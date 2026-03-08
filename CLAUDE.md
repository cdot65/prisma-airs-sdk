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
```

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

- **Scan API** (API Key): `init()` → `Scanner.syncScan()` → AIRS content scanning endpoint
- **Management API** (OAuth2): `ManagementClient` → profiles/topics CRUD for AIRS config
- **Model Security API** (OAuth2): `ModelSecurityClient` → model scans, security groups, rules
- **Red Team API** (OAuth2): `RedTeamClient` → scans, reports, targets, custom attacks

Key modules:

- `src/scan/` — Scanner, Content (API key auth via `init()`)
- `src/management/` — ManagementClient, OAuthClient, ProfilesClient, TopicsClient
- `src/model-security/` — ModelSecurityClient + 3 sub-clients (scans, groups, rules)
- `src/red-team/` — RedTeamClient + 5 sub-clients (scans, reports, customAttackReports, targets, customAttacks)
- `src/http-retry.ts` — shared exponential backoff retry (used by all HTTP clients)
- `src/models/` — Zod schemas + inferred TypeScript types for all API models
- `src/errors.ts` — `AISecSDKException` with `ErrorType` enum (6 types)
- `src/constants.ts` — API paths, content limits, batch limits, header names, retry config

**Auth:** API key (HMAC-SHA256) for AIRS scans only. OAuth2 client_credentials for everything else (management CRUD, model security, red teaming).

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
