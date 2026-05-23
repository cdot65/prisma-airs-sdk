---
'@cdot65/prisma-airs-sdk': minor
---

Added DLP Data Patterns subclient. `ManagementClient.dlp.dataPatterns` exposes full CRUD against `/v2/api/data-patterns`: list, create, get, replace (PUT), patch (JSON Merge Patch with `application/merge-patch+json`), and delete (soft-delete, 204 No Content).
