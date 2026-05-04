---
'@cdot65/prisma-airs-sdk': patch
---

Internal: migrate red-team domain to unified `request()` helper (no public API change).

- All 7 sub-clients in `src/red-team/` use `request()` with `responseSchema` — runtime Zod validation is on for red-team responses.
- `RedTeamClient` builds one `OAuthAuth` adapter, shares across sub-clients.
- `buildRedTeamListParams` removed; callers use `serializeListing` from `src/listing.ts`.
- Local UUID validators fold into `assertUuid` from `src/validators.ts`.
- `uploadPromptsCsv` (FormData upload) now routes auth through the adapter.
- 60+ test mocks updated to satisfy the now-validated response schemas; shared `_fixtures.ts` helper. Prior tests asserted on properties that didn't exist in the response schemas — corrected.

After this PR, `managementHttpRequest` has no callers in red-team; only `scan` remains on the legacy `httpRequest`. Cleanup happens in PR 5.
