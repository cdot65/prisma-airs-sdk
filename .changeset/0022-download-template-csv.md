---
'@cdot65/prisma-airs-sdk': patch
---

Fix `RedTeamCustomAttacksClient.downloadTemplate()` crashing with `Response body is not valid JSON` when the API returns a CSV body. The method now bypasses the shared `request()` helper (which unconditionally `JSON.parse()`s 2xx bodies), reads the response as text, and returns `string` instead of `unknown`. Closes #77.
