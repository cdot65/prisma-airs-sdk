---
'@cdot65/prisma-airs-sdk': patch
---

Internal: add OpenAPI schema pre-flight check (no public API change).

- New `npm run preflight` / `preflight:warn` scripts diff every Zod schema in `src/models/` against the dereferenced OpenAPI components in `specs/`.
- CI runs `preflight:warn` on every PR — drift is logged but does not block merge yet. Drift fixes land in follow-up PRs (#118), after which the gate flips to strict.
