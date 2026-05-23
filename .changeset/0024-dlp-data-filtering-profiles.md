---
'@cdot65/prisma-airs-sdk': minor
---

Add `management.dlp.dataFilteringProfiles` subclient covering the DLP Data Filtering Profiles API: `list(params?)` (page/size/sort[]/status/name filters with Spring `Page<>` envelope), `get(resourceId)`, and `replace(resourceId, body)` (full PUT). Typed Zod schemas for the full nested object graph (`DataFilteringProfileRequest`/`Response`, `DataFilteringDetails`, `ExceptionRuleDTO`, `Exclusions`, `Source/DestinationAttributes`, `App/URLExclusion`, `DataFilteringRuleDTO`). Restructure `src/management/dlp.ts` → `src/management/dlp/` to host subsequent DLP subclients.
