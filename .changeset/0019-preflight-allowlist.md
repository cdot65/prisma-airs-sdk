---
'@cdot65/prisma-airs-sdk': patch
---

Internal: pre-flight allowlist + strict CI gate (no public API change).

- Added `scripts/preflight/allowlist.ts` documenting **36 acknowledged drift entries** between Zod schemas and the upstream OpenAPI specs. Each entry has a reason; together they cover schemas where the API returns fields the OpenAPI does not document (verified against test suites and live responses).
- Pre-flight output now distinguishes **acknowledged** drift (expected divergence) from **unacknowledged** drift (potentially a bug).
- CI gate flipped from `npm run preflight:warn` to `npm run preflight` (strict). Builds now fail on unacknowledged drift, but acknowledged divergences pass.

Adding new acknowledged drift requires a new allowlist entry with a reason — making divergences explicit and reviewable rather than invisible.
