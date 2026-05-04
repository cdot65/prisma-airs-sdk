---
'@cdot65/prisma-airs-sdk': patch
---

Internal: migrate management domain to unified `request()` helper (no public API change).

- Every method in `src/management/*.ts` now flows through `request()` with a `responseSchema` — runtime Zod validation is on for management responses.
- `ManagementClient` constructs one `OAuthAuth` adapter and shares it across sub-clients.
- Local UUID helpers replaced with shared `assertUuid` from `src/validators.ts`.
- `managementHttpRequest` is unused by management; deletion deferred to PR 5 once `model-security` and `red-team` migrate.
