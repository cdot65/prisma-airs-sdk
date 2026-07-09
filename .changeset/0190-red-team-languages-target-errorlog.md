---
'@cdot65/prisma-airs-sdk': minor
---

Add Red Team supported-languages and target-profile error-log endpoints to `RedTeamClient`:

- `getLanguages()` / `getManagementLanguages()` — the tenant's allowed languages for scans (`GET /v1/languages` on the data and management planes), returning `TenantLanguagesResponse` (`multilingual_enabled`, `supported_job_types`, `languages: { code, name }[]`).
- `getTargetProfileErrorLogs(targetId, opts?)` — profiling errors for a target (`GET /v1/error-log/target-profile/{target_id}`), reusing the existing `ErrorLogListResponse` shape.

Also refreshes the committed Red Team OpenAPI specs to the latest upstream revision.
