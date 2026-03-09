# Release Notes

## v0.6.2

### Documentation Accuracy Fixes

- **Model Security**: Corrected scan list parameter names (`sort_field`/`sort_dir`/`search_query` instead of `sort_by`/`sort_direction`/`search`)
- **Management API**: Added documentation sections for 6 sub-clients (`ApiKeysClient`, `CustomerAppsClient`, `DlpProfilesClient`, `DeploymentProfilesClient`, `ScanLogsClient`, `OAuthManagementClient`)
- **Type definitions**: Added missing type definitions for new management and model security option types

### Other

- Hotfix version bump

---

## v0.6.1

### OpenAPI Spec Alignment

- **Management API**: 6 new sub-clients — `ApiKeysClient`, `CustomerAppsClient`, `DlpProfilesClient`, `DeploymentProfilesClient`, `ScanLogsClient`, `OAuthManagementClient`; `ProfilesClient.forceDelete()` and `TopicsClient.forceDelete(updatedBy?)` added
- **Scan API**: 8 typed detection report schemas (`TcReport`, `DbsReport`, `McReport`, `AgentReport`, `TgReport`, `CgReport`, `DlpPatternDetection`, `ContentError`); `ScanResponse` gains `timeout`, `error`, `errors` fields; `AIRS_ENDPOINTS` regional URL constants; `DetectionServiceName`, `ContentErrorType`, `ErrorStatus` enums
- **Model Security**: Per-endpoint option types (`ModelSecurityScanListOptions`, `ModelSecurityEvaluationListOptions`, `ModelSecurityFileListOptions`, `ModelSecurityLabelListOptions`, `ModelSecurityViolationListOptions`)

---

## v0.6.0

### Red Team Management — Typed Schemas & New Methods

- **Typed connection schemas**: `MultiTurnStatefulConfig`, `MultiTurnStatelessConfig`, `OpenAIConnectionParams`, `HuggingfaceConnectionParams`, `DatabricksConnectionParams`, `BedrockAccessConnectionParams`, `RestConnectionParams`, `StreamingConnectionParams`, `ConnectionParams` (union)
- **Typed context schemas**: `TargetBackground` (industry/use_case/competitors as proper types), `TargetAdditionalContext` (base_model/system_prompt/languages as proper types), `TargetMetadata` sub-fields typed (rate_limit, error_json as records)
- **`validate` query param**: `targets.create()` and `targets.update()` now accept `{ validate: true }` to trigger connection validation on the server
- **`customAttacks.uploadPromptsCsv()`**: Upload CSV files of custom prompts for a prompt set (multipart/form-data)
- **`CustomPromptSetVersionInfo.stats`** now uses typed `PromptSetStatsSchema` instead of `z.unknown()`

---

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
