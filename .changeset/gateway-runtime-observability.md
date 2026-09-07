---
'@cdot65/prisma-airs-sdk': minor
---

Add typed runtime feedback creation and single/batch synthetic log ingestion, verified on Prisma AIRS with an explicit runtime key. Preserve plain-text ingestion acknowledgements and finite JSON metadata, with strict pre-network validation, no default write retries and omitted debug bodies. These operations do not use SCM OAuth. Feedback update remains unimplemented after a live HTTP 500; audit records have no deletion API.
