# Release Notes

## v0.5.0

### OAuth Token Lifecycle Management

- `OAuthClient` now exported from public API with `TokenInfo` type
- `isTokenExpired()` — check if the current token has passed its expiry time
- `isTokenExpiringSoon(bufferMs?)` — check if token is within the pre-expiry buffer
- `getTokenInfo()` — snapshot of token state (hasToken, isValid, isExpired, isExpiringSoon, expiresInMs, expiresAt)
- Configurable `tokenBufferMs` option (default 30s) to control pre-expiry refresh window
- `onTokenRefresh` callback for monitoring/logging token refreshes
- Auto-retry on 403 responses (in addition to existing 401 handling) for expired token recovery

---

## v0.4.0

### Red Team Service

- `RedTeamClient` with 5 sub-clients covering 60+ API endpoints
- 30 typed enum const objects for all Red Team API values
- ~80 Zod schemas for full Red Team model coverage
- Sub-clients: scans, reports, customAttackReports, targets, customAttacks
- 7 convenience methods on the top-level client (dashboard, quota, sentiment)

### E2E Examples

- `npm run example:model-sec-scans` — Model Security read operations
- `npm run example:red-team-scans` — Red Team scan and category listing
- `npm run example:red-team-targets` — Red Team target and profile details

---

## v0.3.0

### Model Security Service

- `ModelSecurityClient` with 3 sub-clients
- 17 typed enum const objects for Model Security API values
- ~30 Zod schemas for scan, evaluation, violation, and group models
- Sub-clients: scans (13 methods), securityGroups (8 methods), securityRules (2 methods)
- `getPyPIAuth()` for PyPI integration

---

## v0.2.1

### Enhancements

- **Typed enums**: `Verdict`, `Action`, `Category` as const objects with union types
- **JSDoc/TSDoc**: All exported symbols documented
- **Shared retry logic**: Extracted into `http-retry.ts`, shared across all HTTP clients

### Bug Fixes

- Fixed `SDK_VERSION` constant mismatch with `package.json`
- Fixed `pnpm` references in documentation (should be `npm`)

---

## v0.2.0

### Management API

- `ManagementClient` with OAuth2 client_credentials flow
- `ProfilesClient`: CRUD for AI security profiles
- `TopicsClient`: CRUD + forceDelete for custom topics
- Automatic token caching, refresh, and deduplication

---

## v0.1.0

### Initial Release

- Scan API: `syncScan`, `asyncScan`, `queryByScanIds`, `queryByReportIds`
- `Content` class with byte-length validation
- API key (HMAC-SHA256) and Bearer token authentication
- Exponential backoff retry on 5xx errors
- Zod schema validation for all API responses
- Dual CJS/ESM exports, TypeScript strict mode
