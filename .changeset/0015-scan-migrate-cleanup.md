---
'@cdot65/prisma-airs-sdk': patch
---

Internal: migrate scan domain to unified `request()` helper, delete legacy HTTP helpers (no public API change).

- `Scanner` uses `request()` with `responseSchema` — runtime Zod validation is now on for **every** SDK domain (scan, management, model-security, red-team).
- `Scanner` constructs an `ApiKeyAuth` adapter from `globalConfiguration` per request; HMAC body signing moves into the adapter. `init()` global singleton continues to work for back-compat.
- `src/http-client.ts` deleted (replaced by `request()` + `ApiKeyAuth`).
- `src/management/management-http-client.ts` deleted (replaced by `request()` + `OAuthAuth`).
- Their test specs (covering retry, error mapping, payload hash, 401-refresh) are subsumed by `test/http/request.spec.ts`, `test/http/auth/api-key.spec.ts`, `test/http/auth/oauth.spec.ts`.

Concludes the unified-request-pipeline campaign (#113).
