# Release Notes

## v0.9.0

### New Features — DLP Service Coverage

Adds a new `client.dlp` namespace under `ManagementClient` covering the four DLP resources. Same OAuth2 credentials as the rest of the Management API; the DLP base URL defaults to `https://api.dlp.paloaltonetworks.com` (override via the `dlpEndpoint` constructor option). No breaking changes.

**New subclients (all on `client.dlp`):**

- **`dataFilteringProfiles`** (`/v2/api/data-filtering-profiles`) — `list`, `get`, `replace`. Read + full-replace surface only (API does not expose create or delete). `replace()` is a full PUT; `file_based` and `non_file_based` are required.
- **`dataPatterns`** (`/v2/api/data-patterns`) — full CRUD (`list`, `create`, `get`, `replace`, `patch`, `delete`). PATCH uses JSON Merge Patch (RFC 7396) sent with `Content-Type: application/merge-patch+json`. DELETE soft-deletes server-side. Detection techniques: `regex`, `weighted_regex`, `edm`, `document_fingerprint`, `trainable_classifier`, `ml_document`, `ml`, `titus_tag`, `wildfire`, `file_property`, `dictionary`, `pab`, `document_classifier`.
- **`dataProfiles`** (`/v2/api/data-profiles`) — CRUD without DELETE (`list`, `create`, `get`, `replace`, `patch`). Two `detection_rules[].rule_type` shapes: `expression_tree` (recursive boolean tree of `DetectionRuleItem` leaves) and `multi_profile` (composes other profiles by id).
- **`dictionaries`** (`/v2/api/dictionaries`) — full CRUD with **multipart upload** on `create`/`replace`. Accepts `Blob | ArrayBuffer | Uint8Array | string` for the keyword file; SDK builds the multipart boundary. PUT can return 200+body or 204+empty — `replace()` returns `DictionaryResponse | undefined`.

**Shared infrastructure:**

- New constants in `src/constants.ts`: `DEFAULT_DLP_ENDPOINT`, `DLP_DATA_FILTERING_PROFILES_PATH`, `DLP_DATA_PATTERNS_PATH`, `DLP_DATA_PROFILES_PATH`, `DLP_DICTIONARIES_PATH`.
- `ManagementClient.dlpEndpoint` constructor option (defaults to `DEFAULT_DLP_ENDPOINT`).
- `pageSchema<T>()` helper in `src/models/dlp-page.ts` — Spring `Page<T>` envelope factory used by every DLP list endpoint.
- `jsonNullable<T>()` helper in `src/models/dlp-json-nullable.ts` — encodes JSON Merge Patch nullable semantics (omit to leave unchanged, send `null` to clear).
- `AuditResponseSchema` in `src/models/dlp-audit.ts` — shared `created_at/by`/`updated_at/by` metadata block.
- `request()` pipeline extended with `contentType`, `formData`, and `allowEmptyBody` options to support merge-patch + multipart + 204 responses.

**Zod models added** (in `src/models/dlp-*.ts`):

- `DataFilteringProfileRequest/Response`, `ExceptionRuleDTO`, `Exclusions`, `DataFilteringDetails`, `PageDataFilteringProfileResponse`
- `DataPatternRequest/PatchRequest/Response`, `DataPatternMatchingRules`, `WeightedRegex`, `MetadataCriterion`, `DataPatternTags`, `DataPatternDetectionConfig`, `PageDataPatternResponse`, plus 6 enum types (`DataPatternType/Technique/ConfidenceLevel/LicenseType/Status`, `ComparisonOperatorType`)
- `AdvancedDataProfileRequest/PatchRequest/Response`, `DetectionRule` (discriminated union of `DefaultTreeDetectionRule` + `MultiProfileDetectionRule`), `ExpressionTreeNode` (recursive via `z.lazy`), `MultiProfileDataNode`, `DetectionRuleItem`, `PageDataProfileResponse`, plus 8 enum types
- `DictionaryRequest/PatchRequest/Response`, `DictionaryMetaDataDTO`, `DictionaryTags`, `ResourceModelExtension`, `PageDictionaryResponse`, plus 5 enum types (`DictionaryType/Category/Classification/DetectionTechnique/DetectionSubTechnique`)

**Tooling extensions:**

- `scripts/preflight-schemas.ts` — recursive `specs/` traversal with `DLP_SPEC_WHITELIST` to load only the 4 implemented DLP YAML files (prevents `Policy` name collision with mgmt). Allowlist gained ~24 entries for expected Zod-vs-OpenAPI divergences (pageSchema, jsonNullable rendering, discriminator literals, combined passthrough union).
- `scripts/live-audit.ts` — 4 DLP list probes added.

**Examples and docs:**

- 4 runnable example scripts under `examples/mgmt-dlp-*.ts` with matching `example:dlp-*` npm scripts.
- 4 mkdocs pages under `docs/services/dlp/` with required-fields tables, 2 worked use-case walkthroughs per page (scenario → input → expected JSON output → assertion-style validation), error-handling blocks, and cross-links between subclients.

**Test coverage:** 1236 tests / 61 files (up from 970). Quality gates green across Node 18, 20, 22.

Closes #142, #143, #144, #145, #146, #147, #154.

---

## v0.7.1

### Bug Fix — Target Create/Update/Probe 422

Fixed `targets.create()`, `targets.update()`, and `targets.probe()` returning HTTP 422 for all payloads. Root cause: the API's `additionalProperties: false` rejected `auth_type` and `auth_config` fields that the SDK included but the API does not accept on these endpoints.

**Schema changes:**

- `TargetCreateRequestSchema`, `TargetUpdateRequestSchema`, `TargetProbeRequestSchema` — switched from `.passthrough()` to `.strict()` to match API's `additionalProperties: false`; removed `auth_type`/`auth_config` fields; properly typed all fields using existing sub-schemas (`RestConnectionParamsSchema`, `StreamingConnectionParamsSchema`, `TargetMetadataSchema`, `TargetBackgroundSchema`, `TargetAdditionalContextSchema`)
- Extracted shared `TargetRequestBaseFields` (internal, not exported) for DRY across all three request schemas
- Added `TargetContextUpdateSchema` with properly typed `target_background`/`additional_context` fields
- Removed `ResponseMode.WEBSOCKET` — API only supports `REST` and `STREAMING`

983 tests across 44 test files.

---

## v0.7.0

### New Features — Red Team Management Plane Alignment

Full alignment with the updated Red Team management-plane OpenAPI spec. Adds 2 new sub-clients, 3 new target methods, and 19 new Zod schemas.

**New sub-clients:**

- **`RedTeamEulaClient`** (`client.eula`) — EULA management with `getContent()`, `getStatus()`, `accept()` methods
- **`RedTeamInstancesClient`** (`client.instances`) — Instance/device CRUD with `createInstance()`, `getInstance()`, `updateInstance()`, `deleteInstance()`, `createDevices()`, `updateDevices()` (PATCH), `deleteDevices()`, `getRegistryCredentials()`

**New target methods:**

- `targets.validateAuth()` — validate target authentication credentials
- `targets.getTargetMetadata()` — get field definitions for target configuration
- `targets.getTargetTemplates()` — get provider-specific target templates (OPENAI, HUGGING_FACE, DATABRICKS, BEDROCK, REST, STREAMING)

**Auth config schemas:**

- `HeadersAuthConfigSchema`, `BasicAuthAuthConfigSchema`, `OAuth2AuthConfigSchema`, `AuthConfigSchema` (union)
- `TargetAuthValidationRequestSchema`, `TargetAuthValidationResponseSchema`
- `auth_type` field added to 6 target schemas; `auth_config` added to 3 request schemas

**WebSocket support:**

- `WebSocketConnectionParamsSchema` extends REST params with `ws_response_timeout` (default 110)
- `ConnectionParamsSchema` union now includes WebSocket variant
- `ResponseMode.WEBSOCKET` and `TargetConnectionType.WEBSOCKET` enum values

**New enums:** `TargetAuthType` (HEADERS, BASIC_AUTH, OAUTH2), `BasicAuthLocation` (HEADER, PAYLOAD)

**Instance/licensing schemas:** `DeviceInstanceSchema`, `DeviceLicenseSchema`, `DeviceSchema`, `DeviceStatusSchema`, `DeviceRequestSchema`, `DeviceResponseSchema`, `DeploymentProfileAttributeSchema`, `DeploymentProfileRequestSchema`, `InstanceExtraDetailsSchema`, `InstanceRequestSchema`, `InstanceResponseSchema`, `InstanceGetResponseSchema`, `RegistryCredentialsSchema`

**Other schema fixes (#96):**

- `PropertyNamesListResponseSchema.data`: `z.array(PropertyDefinitionSchema)` → `z.array(z.string())`
- `CustomPromptSetListActiveSchema.data`: now uses `CustomPromptSetReferenceSchema`
- `customAttacks.listPrompts()` gains `status` filter; `getPromptSetVersionInfo()` gains `version` query param

**Infrastructure:** PATCH method support added to `managementHttpRequest`

970 tests across 44 test files.

---

## v0.6.11

### Documentation

- **README**: Fix stale test count (829 → 876), add Red Team convenience methods and `getPyPIAuth()` to quick start
- **Docs index**: Fix schema/enum counts (53 typed enum consts, 226 Zod schemas)
- **Quick start**: Add self-contained validation scripts to example listing
- **Management API docs**: Add `profiles-crud` validation script to examples section
- **New example**: `npm run example:profiles-crud` — full CRUD lifecycle with mock servers (create/list/get/update/delete/force-delete)

---

## v0.6.10

### Bug Fixes

- **Add 4 missing fields from live API**: `csp_id` and `tsg_id` on `SecurityProfile`, `options` on `ModelProtectionItem`, `description` on `DlpDataProfilePolicy`
- 6 new schema tests (876 total, up from 870)

---

## v0.6.9

### Bug Fixes

- **Fix `PolicySchema`**: Replaced 9 incorrect flat policy sub-schemas with 15 properly nested schemas matching the actual AIRS Management API OpenAPI spec
- Policy now correctly typed with `ai-security-profiles[]` array containing `model-configuration` → `data-protection`, `app-protection` (URL categories), `model-protection[]` (topic guardrails), `agent-protection[]`, `latency`
- Added `dlp-data-profiles[]` with rule definitions
- 37 new schema tests with realistic API data (46 total, up from 9)

---

## v0.6.8

### New Features

- **`profiles.get(profileId)`** — retrieve a security profile by UUID (filters from `list()` since no dedicated API endpoint exists)
- **`profiles.getByName(profileName)`** — retrieve a security profile by name, returns highest revision when multiple matches exist
- **E2E validation**: Added `npm run example:profiles-get` self-contained validation script with mock servers

---

## v0.6.7

### Refactoring & Documentation

- **DRY**: Extracted shared `resolveOAuthConfig()` factory from 3 OAuth2 parent clients, eliminating ~150 lines of duplicated credential resolution
- **Fix**: Repositioned orphaned JSDoc block in `src/utils.ts` — `generatePayloadHash` docs were misattributed to `validateJobId`
- **Docs**: Clarified `forceDelete()` parameter differences (required vs optional `updatedBy`) in Management API guide

---

## v0.6.6

### Code Quality & Documentation

- **DRY**: Extracted duplicated `validateJobId()` from two Red Team clients into shared `src/utils.ts`
- **Docs**: Added `sort_field`/`sort_order` example to Model Security `getEvaluations()` guide
- **JSDoc**: Added missing `@returns` tag on `Content.fromJSONFile()`, noted optionality on `TopicsClient.forceDelete()` `updatedBy` param

---

## v0.6.5

### Reliability & Code Quality

- **Zod passthrough**: Added `.passthrough()` to final 4 schemas (`ApiKeyCreateRequestSchema`, `ApiKeyRegenerateRequestSchema`, `ClientIdAndCustomerAppSchema`, `ErrorResponseSchema.retry_after`)
- **Backoff jitter**: Exponential backoff now uses full jitter strategy (`uniform [0, 2^attempt × 1000ms]`) to prevent thundering herd
- **Dedup**: Extracted `buildRedTeamListParams()` shared utility, removing 6× identical `buildListParams()` functions across red-team sub-clients

---

## v0.6.4

### Schema Forward Compatibility & Doc Fixes

- **Zod passthrough**: Added `.passthrough()` to 29 remaining Zod schemas across `error-response.ts`, `model-security.ts`, and `red-team.ts`
- **Test coverage**: 29 new passthrough tests (total 50 passthrough tests)
- **Docs**: Fixed incorrect `sort_by`/`sort_direction` params in Red Team `scans.list()` docs, removed nonexistent `active` param from `targets.list()` docs

---

## v0.6.3

### Forward Compatibility & Documentation

- **Zod passthrough**: Added `.passthrough()` to 18 scan-related Zod schemas for forward compatibility with new API fields
- **Test coverage**: 21 new tests verifying passthrough behavior on scan schemas
- **JSDoc**: Added documentation to exported utility functions (`isValidUuid`, `generatePayloadHash`, `managementHttpRequest`) and incomplete method docstrings (`RedTeamScansClient.create`, `Content.constructor`, `Scanner.queryByReportIds`, `RedTeamTargetsClient.create`, `ModelSecurityScansClient.deleteLabels`, `OAuthManagementClient.invalidateToken`)
- **Build**: Added `.prettierignore` entry for tsup build artifacts

---

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
