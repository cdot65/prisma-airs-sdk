---
'@cdot65/prisma-airs-sdk': minor
---

Add `integrations.catalog()` (static provider catalog), `integrations.resolveProviderId(slugOrUuid)`,
and `customHostConfiguration({ host, headers })`, and type `provider_auth_type` on the custom-host
configuration. Live-verified 2026-09-12: a self-hosted endpoint needs
`{ provider_auth_type: 'apiKey', custom_host, custom_headers }` on create or update.
