---
'@cdot65/prisma-airs-sdk': patch
---

Accept empty response bodies on red-team `targets.delete`, `customAttacks.deletePrompt`, and `customAttacks.createPropertyName`. AIRS red-team API returns 2xx with an empty body on these mutations; SDK now tolerates that via `allowEmptyBody: true` (same precedent as DLP `dictionaries.replace`) instead of throwing `AISEC_RESPONSE_VALIDATION`. Return types widened to `BaseResponse | undefined` to reflect the empty-body case. Closes #168.
