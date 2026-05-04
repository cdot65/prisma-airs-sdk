---
'@cdot65/prisma-airs-sdk': patch
---

Internal: migrate model-security domain to unified `request()` helper, add Listing module (no public API change).

- All 3 sub-clients in `src/model-security/` use `request()` with `responseSchema` — runtime Zod validation is on for model-security responses.
- `ModelSecurityClient` constructs one `OAuthAuth` adapter, shares across sub-clients.
- New `src/listing.ts` exports `ListingOptions` + `serializeListing` for shared pagination/search params; `model-security` list endpoints already use it. Red-team migration in a follow-up PR.
- `RequestSpec.responseSchema` widened to accept Zod schemas with diverging input/output types (e.g. `.default()`-laden schemas).
