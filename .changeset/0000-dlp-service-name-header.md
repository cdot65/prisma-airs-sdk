---
'@cdot65/prisma-airs-sdk': minor
---

Send `service-name: api` on every request. Fixes DLP `GET /v2/api/{data-patterns,data-profiles}/{id}` returning HTTP 400 on tenants whose downstream services require this header. Per AIRS API team guidance — header is optional in the spec but defensive on the client.
