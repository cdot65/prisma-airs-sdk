# Environment Variables

Complete reference for all environment variables used by the SDK.

## Scan API

| Variable                   | Required         | Default                                               | Description                       |
| -------------------------- | ---------------- | ----------------------------------------------------- | --------------------------------- |
| `PANW_AI_SEC_API_KEY`      | One of key/token | —                                                     | API key for HMAC-SHA256 auth      |
| `PANW_AI_SEC_API_TOKEN`    | One of key/token | —                                                     | Pre-obtained bearer token         |
| `PANW_AI_SEC_PROFILE_NAME` | For examples     | —                                                     | Default profile name for examples |
| `PANW_AI_SEC_API_ENDPOINT` | No               | `https://service.api.aisecurity.paloaltonetworks.com` | Scan API base URL                 |

## Management API

| Variable                   | Required | Default                                                      | Description             |
| -------------------------- | -------- | ------------------------------------------------------------ | ----------------------- |
| `PANW_MGMT_CLIENT_ID`      | Yes      | —                                                            | OAuth2 client ID        |
| `PANW_MGMT_CLIENT_SECRET`  | Yes      | —                                                            | OAuth2 client secret    |
| `PANW_MGMT_TSG_ID`         | Yes      | —                                                            | Tenant Service Group ID |
| `PANW_MGMT_ENDPOINT`       | No       | `https://api.sase.paloaltonetworks.com/aisec`                | Management API base URL |
| `PANW_MGMT_TOKEN_ENDPOINT` | No       | `https://auth.apps.paloaltonetworks.com/oauth2/access_token` | OAuth2 token endpoint   |

## Model Security API

All fall back to the corresponding `PANW_MGMT_*` variable if not set.

| Variable                        | Fallback                   | Default                                           | Description               |
| ------------------------------- | -------------------------- | ------------------------------------------------- | ------------------------- |
| `PANW_MODEL_SEC_CLIENT_ID`      | `PANW_MGMT_CLIENT_ID`      | —                                                 | OAuth2 client ID          |
| `PANW_MODEL_SEC_CLIENT_SECRET`  | `PANW_MGMT_CLIENT_SECRET`  | —                                                 | OAuth2 client secret      |
| `PANW_MODEL_SEC_TSG_ID`         | `PANW_MGMT_TSG_ID`         | —                                                 | Tenant Service Group ID   |
| `PANW_MODEL_SEC_DATA_ENDPOINT`  | —                          | `https://api.sase.paloaltonetworks.com/aims/data` | Data plane base URL       |
| `PANW_MODEL_SEC_MGMT_ENDPOINT`  | —                          | `https://api.sase.paloaltonetworks.com/aims/mgmt` | Management plane base URL |
| `PANW_MODEL_SEC_TOKEN_ENDPOINT` | `PANW_MGMT_TOKEN_ENDPOINT` | —                                                 | OAuth2 token endpoint     |

## Red Team API

All fall back to the corresponding `PANW_MGMT_*` variable if not set.

| Variable                       | Fallback                   | Default                                                           | Description               |
| ------------------------------ | -------------------------- | ----------------------------------------------------------------- | ------------------------- |
| `PANW_RED_TEAM_CLIENT_ID`      | `PANW_MGMT_CLIENT_ID`      | —                                                                 | OAuth2 client ID          |
| `PANW_RED_TEAM_CLIENT_SECRET`  | `PANW_MGMT_CLIENT_SECRET`  | —                                                                 | OAuth2 client secret      |
| `PANW_RED_TEAM_TSG_ID`         | `PANW_MGMT_TSG_ID`         | —                                                                 | Tenant Service Group ID   |
| `PANW_RED_TEAM_DATA_ENDPOINT`  | —                          | `https://api.sase.paloaltonetworks.com/ai-red-teaming/data-plane` | Data plane base URL       |
| `PANW_RED_TEAM_MGMT_ENDPOINT`  | —                          | `https://api.sase.paloaltonetworks.com/ai-red-teaming/mgmt-plane` | Management plane base URL |
| `PANW_RED_TEAM_TOKEN_ENDPOINT` | `PANW_MGMT_TOKEN_ENDPOINT` | —                                                                 | OAuth2 token endpoint     |
