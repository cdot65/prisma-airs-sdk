---
'@cdot65/prisma-airs-sdk': patch
---

Internal: foundations for unified request pipeline (no public API change).

- Add `ErrorType.RESPONSE_VALIDATION` for backend response shape mismatches.
- Add internal `request()` helper, `OAuthAuth` / `ApiKeyAuth` adapters, and shared `assertUuid` / `assertLength` validators. Sub-clients still use the legacy helpers; migrations land in subsequent releases.
