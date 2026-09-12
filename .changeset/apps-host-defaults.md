---
'@cdot65/prisma-airs-sdk': minor
---

Default every management-plane base URL to `api.apps.paloaltonetworks.com`: `DEFAULT_MGMT_ENDPOINT`,
`DEFAULT_RED_TEAM_{DATA,MGMT,NETWORK_BROKER}_ENDPOINT`, and `DEFAULT_MODEL_SEC_{DATA,MGMT}_ENDPOINT`
move off `api.sase.paloaltonetworks.com`, joining AgentGuard, AI Gateway, and IAM. Verified live with
read-only list calls per product; `api.sase` still serves the same paths for existing allowlists.
DLP remains on `api.dlp.paloaltonetworks.com`, which returns 404 on the `apps` host.
