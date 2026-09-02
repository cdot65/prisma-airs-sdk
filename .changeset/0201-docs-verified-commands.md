---
'@cdot65/prisma-airs-sdk': patch
---

Documentation verification pass — no public API change.

Every Docusaurus page was audited against `src/` and the pan.dev OpenAPI specs, and every runnable
example was executed (live Scan API where credentials allowed, local mocks elsewhere):

- Documented `npx tsx docs-site/examples/<x>.ts` commands work again: the root `tsconfig.json` maps
  `@cdot65/prisma-airs-sdk` to `src/index.ts`, and the four mock-backed validation scripts import the
  public package (the OAuth lifecycle script's 401/403 phases now run through a real
  `ManagementClient` against local mocks).
- Real captured outputs added to the Scan API guide, quick start, examples page, and OAuth lifecycle
  transcript, including live-verified `tr_id`/`session_id` mirroring behaviour.
- Corrected field/enum names, pagination semantics, retry/validation claims, API-key rotation
  guidance (regeneration revokes immediately; one key per deployment profile), and stale
  version/spec/CI references across the guides; AI Gateway added to overview pages; Red Team
  `adapters` sub-client documented.
- `src/red-team/client.ts`: JSDoc example uses `date_range: 'LAST_30_DAYS'` instead of the invalid
  `'30d'` (comment-only change).
