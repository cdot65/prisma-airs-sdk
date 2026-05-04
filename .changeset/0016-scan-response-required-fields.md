---
'@cdot65/prisma-airs-sdk': minor
---

Type fix: `ScanResponse.timeout`, `ScanResponse.error`, and `ScanResponse.errors` are now typed as required fields (matching the OpenAPI contract — these are always returned by the AIRS scan API).

Before: `timeout?: boolean | undefined; error?: boolean | undefined; errors?: ContentError[] | undefined`.
After: `timeout: boolean; error: boolean; errors: ContentError[]`.

This is a strictly-better type for consumers (no need to optional-chain or null-check), but technically a breaking change to the type signature. Code that fed `ScanResponse` literals into the SDK without these fields (rare — they come from API responses) will need updating.

Drops pre-flight drift count 81 → 75. Tracked in #118.
