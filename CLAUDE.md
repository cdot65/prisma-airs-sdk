# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

TypeScript SDK for Palo Alto Networks AI Runtime Security (AIRS) API. Mirrors the official Python `pan-aisecurity` SDK. Published as `@cdot65/prisma-airs-sdk` on npm. Zero external HTTP dependencies (native fetch + crypto).

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

**Global singleton config** → `init()` must be called before using Scanner. Reads env vars `PANW_AI_SEC_API_KEY`, `PANW_AI_SEC_API_TOKEN`, `PANW_AI_SEC_API_ENDPOINT`.

**Core flow:** `init(opts)` → `Scanner.syncScan(profile, content)` → `httpRequest()` → AIRS API

Key modules:

- `src/configuration.ts` — global Configuration singleton, `init()` entry point
- `src/http-client.ts` — fetch wrapper with exponential backoff retry (500/502/503/504)
- `src/scan/scanner.ts` — 4 public methods: `syncScan`, `asyncScan`, `queryByScanIds`, `queryByReportIds`
- `src/scan/content.ts` — Content class with byte-length validation and JSON serialization
- `src/models/` — Zod schemas + inferred TypeScript types for all API models
- `src/errors.ts` — `AISecSDKException` with `ErrorType` enum (5 types)
- `src/constants.ts` — API paths, content limits, batch limits, header names, retry config

**Auth:** Two methods — API key (X-Pan-Token header + HMAC-SHA256 payload hash) or Bearer token.

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
