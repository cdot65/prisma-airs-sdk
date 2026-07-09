---
'@cdot65/prisma-airs-sdk': patch
---

Align a few Model Security schemas with the latest OpenAPI spec (surfaced by an improved preflight schema matcher):

- `ScanCreateRequest.scan_origin` is now optional (the server defaults it).
- `ScanBaseResponse.model_version_uuid` is now optional/nullable (a scan may not have a resolved model version yet).
- `ViolationResponse` now types the `remediation` field (new `ViolationRemediation` schema: `steps` + `url`) instead of only passing it through.
