# Configuration

All SDK clients can be configured via constructor options or environment variables. Copy `.env.example` to `.env` to get started.

```bash
cp .env.example .env
```

## Scan API

| Env Var                    | Required         | Default                                               |
| -------------------------- | ---------------- | ----------------------------------------------------- |
| `PANW_AI_SEC_API_KEY`      | One of key/token | —                                                     |
| `PANW_AI_SEC_API_TOKEN`    | One of key/token | —                                                     |
| `PANW_AI_SEC_API_ENDPOINT` | No               | `https://service.api.aisecurity.paloaltonetworks.com` |

## Management API

| Env Var                    | Required | Default                                                      |
| -------------------------- | -------- | ------------------------------------------------------------ |
| `PANW_MGMT_CLIENT_ID`      | Yes      | —                                                            |
| `PANW_MGMT_CLIENT_SECRET`  | Yes      | —                                                            |
| `PANW_MGMT_TSG_ID`         | Yes      | —                                                            |
| `PANW_MGMT_ENDPOINT`       | No       | `https://api.sase.paloaltonetworks.com/aisec`                |
| `PANW_MGMT_TOKEN_ENDPOINT` | No       | `https://auth.apps.paloaltonetworks.com/oauth2/access_token` |

## Model Security API

Falls back to `PANW_MGMT_*` variables if service-specific ones are not set.

| Env Var                         | Required           | Default                                           |
| ------------------------------- | ------------------ | ------------------------------------------------- |
| `PANW_MODEL_SEC_CLIENT_ID`      | Falls back to MGMT | —                                                 |
| `PANW_MODEL_SEC_CLIENT_SECRET`  | Falls back to MGMT | —                                                 |
| `PANW_MODEL_SEC_TSG_ID`         | Falls back to MGMT | —                                                 |
| `PANW_MODEL_SEC_DATA_ENDPOINT`  | No                 | `https://api.sase.paloaltonetworks.com/aims/data` |
| `PANW_MODEL_SEC_MGMT_ENDPOINT`  | No                 | `https://api.sase.paloaltonetworks.com/aims/mgmt` |
| `PANW_MODEL_SEC_TOKEN_ENDPOINT` | Falls back to MGMT | —                                                 |

## Red Team API

Falls back to `PANW_MGMT_*` variables if service-specific ones are not set.

| Env Var                        | Required           | Default                                                           |
| ------------------------------ | ------------------ | ----------------------------------------------------------------- |
| `PANW_RED_TEAM_CLIENT_ID`      | Falls back to MGMT | —                                                                 |
| `PANW_RED_TEAM_CLIENT_SECRET`  | Falls back to MGMT | —                                                                 |
| `PANW_RED_TEAM_TSG_ID`         | Falls back to MGMT | —                                                                 |
| `PANW_RED_TEAM_DATA_ENDPOINT`  | No                 | `https://api.sase.paloaltonetworks.com/ai-red-teaming/data-plane` |
| `PANW_RED_TEAM_MGMT_ENDPOINT`  | No                 | `https://api.sase.paloaltonetworks.com/ai-red-teaming/mgmt-plane` |
| `PANW_RED_TEAM_TOKEN_ENDPOINT` | Falls back to MGMT | —                                                                 |

## Regional Endpoints

Override endpoint variables for non-US deployments:

```bash
# EU
export PANW_MGMT_ENDPOINT=https://api.eu.sase.paloaltonetworks.com/aisec

# UK
export PANW_MGMT_ENDPOINT=https://api.uk.sase.paloaltonetworks.com/aisec

# FedRAMP
export PANW_MGMT_ENDPOINT=https://api.gov.sase.paloaltonetworks.com/aisec
```

!!! info "Shared Credentials"
If you use the same OAuth2 client for all services, you only need to set `PANW_MGMT_CLIENT_ID`, `PANW_MGMT_CLIENT_SECRET`, and `PANW_MGMT_TSG_ID`. The Model Security and Red Team clients will use these automatically.
