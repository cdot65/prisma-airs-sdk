---
'@cdot65/prisma-airs-sdk': minor
---

Add a read-only `models` sub-client to `ModelSecurityClient` covering the model and model-version endpoints:

- `models.listModels(opts?)` — `GET /v1/models` with search, sort, and latest-version filters.
- `models.getModel(uuid)` — `GET /v1/models/{uuid}`.
- `models.listModelVersions(modelUuid, opts?)` — `GET /v1/models/{uuid}/model-versions`.
- `models.getModelVersion(uuid)` — `GET /v1/model-versions/{uuid}`.
- `models.listModelVersionFiles(modelVersionUuid, opts?)` — `GET /v1/model-versions/{uuid}/files`.

Adds `Model`, `ModelVersion`, and their list schemas (reusing the existing pagination, eval-summary, and file schemas). Also refreshes the committed Model Security data-plane OpenAPI spec to the latest upstream revision.
