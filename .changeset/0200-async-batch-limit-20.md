---
'@cdot65/prisma-airs-sdk': patch
---

Raise the `asyncScan()` submission limit from 5 to 20 request objects to match the current AIRS API. Scan-result and report-result query limits remain 5 IDs per call.
