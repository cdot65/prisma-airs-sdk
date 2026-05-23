---
'@cdot65/prisma-airs-sdk': minor
---

Add DLP Dictionaries subclient (`management.dlp.dictionaries`) covering list, create (multipart keyword-file upload), get, replace (PUT, handles 200+body or 204 empty), patch (JSON Merge Patch), and delete. Adds `allowEmptyBody` flag on the HTTP request pipeline so endpoints that return either 200 with a body or 204 with no body parse correctly.
