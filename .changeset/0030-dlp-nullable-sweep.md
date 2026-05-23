---
'@cdot65/prisma-airs-sdk': patch
---

Fix DLP response schemas rejecting `null` and numeric epoch timestamps from the live API (issue #158). Convert every top-level `.optional()` on `DataFilteringProfileResponseSchema`, `DataPatternResponseSchema`, `DataProfileResponseSchema`, `DictionaryResponseSchema`, `DlpReportSchema`, and `AuditResponseSchema` to `.nullish()` so unset values arriving as `null` parse cleanly. Widen `AuditResponseSchema.created_at` and `updated_at` to `z.union([z.string(), z.number()]).nullish()` — the API has been observed emitting epoch-ms integers, not just ISO strings. Request schemas remain strict (no nulls on write).
