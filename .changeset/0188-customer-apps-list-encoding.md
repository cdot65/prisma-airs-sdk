---
'@cdot65/prisma-airs-sdk': patch
---

Harden `customerApps.list()` by percent-encoding the TSG ID in the request path, so a TSG ID containing URL-reserved characters can no longer corrupt the URL. No behavior change for the numeric TSG IDs in normal use.
