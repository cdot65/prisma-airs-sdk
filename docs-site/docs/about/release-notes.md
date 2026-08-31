# Release Notes

## v0.20.1

### Brand consistency

The README, Docusaurus navbar, home page, favicon, and social preview now use the shared Prisma AIRS
shield, terminal, beam, and spectrum logo. The previous SDK-specific cloud icon and banner were
removed in favor of one canonical SVG so GitHub, GitHub Pages, and the npm package README stay in
sync.

## v0.20.0

### Typed and validated AI Gateway writes

Every AI Gateway create, update, rotation, binding, and bulk mutation now has an exported Zod
schema with its TypeScript type inferred from that schema. Stable request envelopes are strict,
partial updates reject empty bodies, and JSON extension points accept only finite serializable
values. The shared request pipeline validates before OAuth preparation or network access and sends
the parsed result.

The release also adds typed Portkey-backed routing and provider configuration models,
forward-compatible known-value catalogs, and explicit `*BulkUpdateRequest` names. Ambiguous 0.19
request names remain as deprecated compatibility aliases.

Live conformance confirmed that config updates are partial at the envelope level (a name-only
update does not require `workspace_id` or `config`) while a supplied routing `config` replaces that
document. Regular integration workspace writes require the object form
`global_workspace_access: { enabled }`; the previous boolean assumption is no longer accepted.

### CLI builders and secret-safe diagnostics

`buildDottedObject()` and `setDottedValue()` construct immutable nested JSON from dotted paths and
array indexes while rejecting duplicate/conflicting paths, sparse arrays, malformed escapes, and
prototype-pollution segments. `AI_GATEWAY_SECRET_FIELDS` exposes operation-scoped request/response
secret metadata, and `redactAIGatewaySecrets()` applies it without mutating input. SDK debug output
now uses the same metadata to redact known provider, plugin, auth, API-key, and one-time deployment
credentials, failing closed when a marked body cannot be parsed.

Schema preflight now follows the current pan.dev Model Security and consolidated DLP spec paths and
compares recursive components without circular-JSON failures. Existing Model Security violation and
rule-instance response schemas now preserve fields the current OpenAPI marks optional instead of
rejecting those valid minimal responses.

## v0.19.0

### Complete established AI Gateway CRUD

The AI Gateway clients now cover the remaining established-resource operations verified against
SCM: config versions; guardrail and provider updates; deployment update and connectivity ping; MCP
integration detail, update, delete, metadata, capabilities, capability enablement, and workspace
bindings; and API-key detail, delete, and rotation.

Prisma keeps service and user API keys in distinct collections. The SDK therefore exposes
`getService()` / `getUser()`, `deleteService()` / `deleteUser()`, and `rotateService()` /
`rotateUser()` instead of the generic Portkey routes that SCM denies through OPA. Rotation returns
a typed, one-time secret response that applications must capture without logging.

MCP workspace binding now has a live-verified request contract and strict empty response. Binding
entries use `{ id, enabled }`; `global_workspace_access` is `{ enabled }`, not a boolean. Set
`override_existing_workspace_access: false` for a targeted change that preserves unrelated
workspace bindings.

### Live-safe validation and deployment behavior

An opt-in conformance probe and end-to-end read suite exercise candidate routes through the SDK's
normal SCM OAuth and `x-tsg-id` transport. Mutation validation uses uniquely named disposable
resources and removes them afterward. Probe evidence recursively redacts credential-shaped fields.

Deployment heartbeats and `deployments.ping()` are intentionally documented as separate signals.
A private gateway may maintain a healthy outbound heartbeat while rejecting the inbound reachability
required by the optional bidirectional ping. Applications should not expose a private data plane
solely to make that diagnostic green.

## v0.18.0

### Complete, bounded reads across OAuth services

Resource clients now expose all-page helpers for the list operations most often used by inventory,
audit, and CLI workflows. The helpers retain the endpoint's filters while adapting its native
pagination contract:

- Management: `profiles.listAll()`, `topics.listAll()`, `apiKeys.listAll()`, and
  `customerApps.listAll()`.
- DLP: `dataFilteringProfiles.listAll()`, `dataPatterns.listAll()`, `dataProfiles.listAll()`, and
  `dictionaries.listAll()`.
- Model Security: `scans.listAll()`, `securityGroups.listAll()`, `securityRules.listAll()`,
  `models.listAllModels()`, `models.listAllModelVersions()`, and
  `models.listAllModelVersionFiles()`.
- Red Team: `scans.listAll()`, `targets.listAll()`, `adapters.listAll()`,
  `customAttacks.listAllPromptSets()`, and `customAttacks.listAllPrompts()`.

Every helper has a 10,000-record default safety cap. Set `max` to a smaller application limit or
use `max: 0` for an explicitly unbounded walk. Pagination stops on the service's terminal metadata
or a short page, and the generic `paginate()` helper rejects repeated cursors rather than looping
forever.

The exported `paginate()` async generator and `collectAll()` collector are available for custom
workflows. `collectAll()` validates its bound and can consume any `AsyncIterable`.

### Revision-correct management reads

Profile and topic lookup no longer assumes the desired revision appears on the first page.
`profiles.get()` / `getByName()` and `topics.get()` / `getByName()` walk the complete inventory;
name lookup returns the highest revision. Profiles expose the service-backed `latest` list filter.
Because topics have no equivalent server filter, `topics.list({ latestOnly: true })` walks all
pages, groups by `topic_name`, and retains the highest revision before applying the requested page.

Existing `list()` calls keep returning one native page, so applications that control pagination
themselves do not change behavior.

## v0.17.0

### Workspace write responses are now typed

`workspaces.create()` returned the permissive `GatewayWriteResponse` placeholder, so `created.id` was `unknown` and every field needed a cast. Both write shapes have now been verified against a live tenant, and the *"Shape unverified against a live tenant"* markers are gone.

`create()` returns the new `GatewayWorkspaceCreateResponse`: `{ id, name, slug, description, created_at, last_updated_at, scope_name, object }`, plus optional `defaults` and `users`.

**Workspace create is the exception to this subsystem's "receipt, not record" pattern.** `configs.create()`, `guardrails.create()`, `providers.create()`, and `deployments.create()` each return a 4–5 field receipt; workspace create returns most of the record. It is still not the full detail shape — `status`, `is_default`, `icon`, `usage_limits`, `rate_limits`, and the settings blocks are absent — so call `get()` when you need those. Conversely `users` appears only here.

`update()` keeps `GatewayWriteResponse`, because the API genuinely returns an empty object `{}`. The write does persist; re-read with `get()` to see it. Typing it as anything richer would misrepresent the API.

### Two behaviours worth knowing before you build on this

- **Archived workspaces are not retrievable by `get()`.** After `delete()` archives a workspace, `get()` answers `404 AB08` for both its UUID and its slug, on either plane — even though `list({ status: 'archived' })` still lists it. A 404 following a delete is expected, not an error; use the list filter to inspect archived workspaces.
- **`status` disagrees between endpoints.** `list()` reports `'active'` for a workspace whose `get()` reports `null`. `GatewayWorkspaceDetail` now types `status` as nullable/optional so it is at least visible; prefer the list value, and read a `null` here as "unknown" rather than "inactive".

### Also fixed

The `update()` JSDoc previously described the `"No update fields provided"` error as unproven inference. It is now confirmed: that message is a **misleading not-found**, not a complaint about your payload. If you hit it, check the workspace ref before the body.

## v0.16.0

### Red Team custom target adapters

New `rt.adapters` sub-client for the `/v1/adapters` management-plane API, contributed by [@thresh97](https://github.com/thresh97) — the SDK's first external contribution. Custom target adapters are Python scripts deployed into an adapter sidecar alongside the network broker client, giving full control over how attack prompts reach targets with non-standard auth, dynamic tokens, or multi-turn session state.

Six methods: `create()`, `list()`, `get()`, `update()`, `delete()`, and `validate()`. Create and update take a `validate` option (default `true`, matching the server): validated scripts save as `ACTIVE`, unvalidated as `DRAFT`. Validation requires the network broker channel client (v1.4.0+) to be running and ONLINE.

Semantics worth knowing:

- **`update()` is a full replacement (PUT), not a patch** — `name`, `script_b64`, and `prompt` are required. For `variables`, the list defines the complete key set: a provided value sets it, `null` keeps the stored value (unchanged secrets), and omitting a key deletes it.
- **Secrets are write-only.** `SECRET`-typed response variables come back with `is_redacted: true` and the value masked as `'**********'` (the upstream spec documents `null` here; the live API returns the placeholder — key off `is_redacted`). Pass the masked variable back together with `adapter_uuid` and the stored value is resolved server-side.
- **`validate()` returns the script's execution outcome** — `{ validated, stdout, stderr, traceback }` — not an adapter record. You must still send the full `variables` array: `adapter_uuid` resolves redacted values *within* it, it does not supply the list. Omitting `variables` runs the script with none set, which usually surfaces as a `KeyError` in `stderr` rather than a clear error.
- **List rows are a 7-field subset** (no `script_b64`, `tsg_id`, or `variables`); call `get()` for the full record.

Target request schemas gain `adapter_uuid` and `adapter_variable_overrides` (an array of `AdapterVar`, not a map) so `CUSTOM_TARGET_ADAPTER` targets are fully typed.

## v0.15.0

### Workspace management

`gw.workspaces` gains `create()`, `update()`, and `delete()`, all on the admin plane (`/ai_gw/admin/v2/workspaces`). Workspace lifecycle was previously impossible through the SDK.

`create()` requires `name` and `scope_name`. `scope_name` is specific to Prisma AIRS and has no upstream equivalent: it is the SCM role scope that grants data-plane access to the new workspace. It is **not** derived from `name`, and a workspace created with a scope nobody holds will not appear in a data-plane `list()`.

`delete()` is a **soft delete** — the workspace is archived, not destroyed. It disappears from a default `list()` but remains under `list({ status: 'archived' })`. Same semantics as `deployments.delete()`, the opposite of `configs`/`guardrails`/`providers`. There is no hard delete.

Create and update responses are typed permissively and marked *"Shape unverified against a live tenant"*, matching the other unconfirmed AI Gateway writes. Follow a write with `get()` rather than trusting the returned body.

### Fixed: `list()` was hiding workspaces two different ways

`workspaces.list()` now takes an options object, because both of its previous defaults silently omitted rows:

- **Archived workspaces were invisible**, with no way to ask for them. `list({ status: 'archived' })` now works; `status` is `'active' | 'archived'`.
- **Only workspaces you were scoped to were returned.** The data plane lists just those your service account holds a workspace-scope grant on. `list({ plane: 'admin' })` enumerates the whole tenant.

`list()` with no arguments behaves exactly as before.

### Fixed: `get()` rejected valid identifiers

`get()` validated its argument as a UUID, but the API accepts a workspace **slug** too — upstream documents the path parameter as *"Workspace UUID. Workspace slug is also accepted for backward compatibility."* `get('ws-produc-985697')` now works. `get()` also accepts `{ plane: 'admin' }`, the only way to read a workspace outside your workspace scope; on the data plane those return `403 AB03`, not `404`.

### Fixed: workspace `description` can be null

`GatewayWorkspace.description` and `GatewayWorkspaceDetail.description` were typed non-nullable. A workspace created without a description returns `null`, which threw `AISEC_RESPONSE_VALIDATION`. Both are now nullable, matching the upstream contract.

### Note for direct sub-client construction

`AIGatewayWorkspacesClient` now takes `AIGatewayWorkspacesClientOptions`, which adds a required `adminBaseUrl`. This affects only code constructing the sub-client directly; `new AIGatewayClient()` wires it automatically.

## v0.14.2

### Fixed: workspace usage and rate limits are arrays, not objects

`workspaces.get()` threw `AISEC_RESPONSE_VALIDATION` against any workspace that had usage or rate limits configured. The SDK typed `usage_limits` and `rate_limits` as object-or-null, but the API returns **arrays of policy objects**. The original schemas were derived from a tenant where every occurrence happened to be `null`, so the array form was never observed.

Three schemas carried the same wrong typing and are all corrected: `GatewayWorkspaceDetail`, `GatewayIntegrationWorkspace`, and `GatewayGlobalWorkspaceAccess`. Both fields now accept an array, and the previous object form is still accepted, so no tenant regresses.

Adds two exported schemas/types for the array elements: `GatewayUsageLimit` (`credit_limit`, `type`, `alert_threshold`, `periodic_reset`, `periodic_reset_days`, `next_usage_reset_at`) and `GatewayRateLimit` (`type`, `unit`, `value`). Both are passthrough, so the server-side bookkeeping a live tenant adds — `id`, `status`, `current_usage`, `is_exhausted_alerts_sent`, `is_threshold_alerts_sent` — survives parsing.

If you read these fields, note they are typed as a union. Narrow with `Array.isArray()` before indexing.

## v0.14.1

### AI Gateway write-response schemas, verified against a live tenant

Tightens three AI Gateway create responses that were previously typed permissively: `configs.create()`, `guardrails.create()`, and `providers.create()` now return resource-specific receipt schemas (`GatewayConfigCreateResponse`, `GatewayGuardrailCreateResponse`, `GatewayProviderCreateResponse`) instead of the generic passthrough shape. All three confirmed live: `configs`/`guardrails` return `{id, version_id, slug, object}`; `providers` returns `{id, slug, object}` with **no** `version_id`. As with `deployments.create()`, these are receipts, not the full record — do not read `name`/`config`/`checks`/`actions`/etc. off them.

Adds `configs.delete()`, `guardrails.delete()`, and `providers.delete()` (`DELETE /ai_gw/v2/{resource}/{id}`). Unlike `deployments.delete()`, which archives (the record survives in `list()` with `status: 'archived'`), these three are **hard deletes** — the object is gone from `list()` entirely. None take an `organisation_id` query param.

Adds `guardrails.get(guardrailId)`, modeled as `GatewayGuardrailDetail` from a verified live response (`checks[]`, `actions` with optional `on_success`/`on_fail` feedback, `version_id`, nullable `updated_by`). The list-row `Guardrail` schema is now tightened to what `list()` actually returns (no `checks`/`actions`/`version_id`).

Fixes a documentation typo: the guardrail check id is `panw-prisma-airs.intercept` (hyphen, then dot), not `panw.prisma-airs.intercept` as previously shown in examples and guides.

## v0.14.0

### AI Gateway support

New `AIGatewayClient` covering the SCM-managed Prisma AIRS AI Gateway across both of its planes: runtime telemetry (`/ai_gw/v2/logs/*`) and configuration (`/ai_gw/v2` and `/ai_gw/admin/v2`). Twelve sub-clients — `telemetry`, `workspaces`, `configs`, `guardrails`, `providers`, `apiKeys`, `integrations`, `mcpIntegrations`, `deployments`, `plugins`, `organisations`, and `auditLogs`. Configure with `PANW_AI_GW_*`, falling back to `PANW_MGMT_*`.

The gateway's two planes authorize against **different SCM role scopes**, so a service account needs both an admin role at tenant-root scope _and_ `view_only_admin` (or higher) on the `main_airs_workspace_<TSG>` scope. With only one grant, half the API returns 403 — `errorCode: "AB03"` means the workspace-scope grant is missing, `x-opa-decision: false` means the tenant-root one is.

Monetary values are returned **in cents**, exactly as the API sends them; the SDK does not convert. `deployments.delete()` archives rather than removes, so the record remains in `list()` with `status: 'archived'`. Write response shapes are verified against a live tenant for `deployments` only; other create and update responses are typed permissively until confirmed.

This is not full admin-plane coverage. `workspaces` is data-plane read-only (`list()` only) — the admin-plane workspace-management endpoints (`GET`/`POST`/`PUT /ai_gw/admin/v2/workspaces`) are not implemented, so 0.14.0 cannot create a workspace. Admin-plane `guardrails` (`GET`) is likewise not implemented; `guardrails` here is the data-plane sub-client only. Both were deferred rather than modeled from unverified response shapes — see the design doc's open questions.

## v0.13.2

### Fix async scan batch limit

Raise the `asyncScan()` submission limit from 5 to 20 request objects to match the current AIRS API. The SDK previously rejected valid 6–20 item batches before making a network request. `queryByScanIds()` and `queryByReportIds()` retain their independent five-ID limits.

## v0.13.1

### Reliable SDK primitives for AIRS bulk scanning

- Every `Scanner` operation accepts an optional per-call `{ numRetries }` override. Omitting it
  preserves the global `init()` setting; `0` means one total fetch attempt. This lets callers avoid
  blind SDK retries on async POSTs while retaining bounded retries for polling GETs.
- `AISecSDKException` now exposes optional `failureKind`, `statusCode`, and `retryAfterMs` fields.
  HTTP failures retain the real transport status, network failures remain
  `CLIENT_SIDE_ERROR`-classified for compatibility, and valid header/body retry guidance is
  normalized to milliseconds.
- `prompt_detected.source_code` is now an explicit optional boolean in the public schema/type.
- Async scan and report documentation now reflects live fan-out: one batch scan/report ID may
  produce multiple unordered rows. Correlate with `(scan_id, req_id)` or `(report_id, req_id)`;
  the SDK preserves server order and cardinality without sorting or deduplicating.

This patch does not claim exactly-once async submission. A network or 5xx failure after an async
POST remains an ambiguous outcome unless the server provides idempotency or reconciliation.

## v0.13.0

### New Features — Red Team Network Broker

Adds `RedTeamClient.networkBroker` (new `RedTeamNetworkBrokerClient`) for discovering and managing the broker channels that Red Team targets reference via `network_broker_channel_uuid`. It uses a distinct network broker data-plane base URL, overridable with the `networkBrokerEndpoint` constructor option or `PANW_RED_TEAM_NETWORK_BROKER_ENDPOINT`, and shares the existing Red Team OAuth credentials.

**New methods:** `listChannels(opts?)` (`GET /v1/channels`, with `status` / `search` / `include_all_if_empty` / `limit` / `skip`), `createChannel(body)`, `getChannel(channelId)`, `updateChannel(channelId, body)`, `getChannelStats()`.

**New exports:** `RedTeamNetworkBrokerClient`, `RedTeamNetworkBrokerClientOptions`, `ChannelListOptions`, and the `Channel`, `ChannelStats`, `ChannelStatus`, `CreateChannelRequest`, `UpdateChannelRequest`, and channel-list schemas/types.

### New Features — Red Team supported languages & target-profile error logs

- **`getLanguages()` / `getManagementLanguages()`** — the tenant's allowed languages for scans (`GET /v1/languages`, data plane and management plane). Returns `TenantLanguagesResponse` (`multilingual_enabled`, `supported_job_types`, `languages: { code, name }[]`).
- **`getTargetProfileErrorLogs(targetId, opts?)`** — profiling errors for a target (`GET /v1/error-log/target-profile/{target_id}`), reusing the existing `ErrorLogListResponse` shape.

### New Features — Model Security models sub-client

Adds a read-only `ModelSecurityClient.models` (new `ModelSecurityModelsClient`) for browsing models and their versions/files on the data plane, complementing point-in-time scans.

**New methods:** `listModels(opts?)` (`GET /v1/models`, with search / sort / `latest_version_*` filters), `getModel(uuid)`, `listModelVersions(modelUuid, opts?)`, `getModelVersion(uuid)`, `listModelVersionFiles(modelVersionUuid, opts?)`.

**New exports:** `ModelSecurityModelsClient` and its option types, plus the `Model`, `ModelVersion`, and their list schemas/types.

### Fixes & Alignment

- `customerApps.list()` now percent-encodes the TSG ID in the request path, so a TSG ID with URL-reserved characters can't corrupt the URL.
- Corrected the Network Broker `ChannelStats` field names to match the live API (`getChannelStats()` previously modeled non-existent fields — `broker_server`, `registry`, `online_channel_count`, etc. — so every typed accessor returned `undefined`; they are now `network_channels_server_domain`, `docker_registry`, `online_channels`, `total_channels`, and friends). `Channel` also gains live fields (`added_by`, `last_online_at`, `connected_clients_count`, `outdated_clients_count`, `features`), and the Network Broker OpenAPI spec is now committed so preflight validates these going forward.
- Model Security schema accuracy vs the latest OpenAPI: `ScanCreateRequest.scan_origin` is now optional, `ScanBaseResponse.model_version_uuid` is now optional/nullable, and `ViolationResponse.remediation` is now typed (new `ViolationRemediation` schema) instead of only passed through.
- Refreshed the committed Red Team and Model Security OpenAPI specs to the latest upstream revisions and expanded schema-vs-spec preflight coverage (128 → 232 matched schemas).

## v0.12.0

### New Features — Dashboard Apps Enumeration

Adds `mgmt.dashboard.applicationsOverview(opts?)` — the canonical apps-list source backing the SCM **AI Security > Runtime > API Applications** view (endpoint `/v1/mgmt/dashboard/v2/apps/applicationsoverview`).

The dashboard buckets traffic by the literal `metadata.app_name` value scan payloads send, so a single registered `customer_appId` can surface here as multiple items — one per distinct scan-payload name (e.g. LiteLLM's `panw_prisma_airs` guardrail overrides `app_name` by default). Enumerate from `applicationsOverview` rather than `customerApps.list` to see every dashboard bucket: the `id` field is the registered `customer_appId` UUID and `name` is the scan-payload value. Pair with `dashboard.application(...)` and `dashboard.applicationViolationBreakdown(...)` to drill into a bucket.

**Verified live behavior (2026-05-29), reflected in the types:**

- `timeInterval?: 1 | 7 | 30 | 60` — other values return HTTP 400.
- `timeUnit?: 'days' | 'day' | 'hour'` — wider than the per-app `application` endpoint (which accepts only `'days'`). Live-tested combinations: `(7, days)`, `(30, days)`, `(60, days)`, `(1, day)`, `(1, hour)`. Defaults to `(30, days)` to match existing dashboard methods.
- `limit` / `offset` provide offset-based pagination (SCM UI uses `limit=25`).

Response shapes use `z.passthrough()` + `nullable().optional()` for forward compatibility. **New exports:** `DashboardApplicationsOverviewQuery`, `DashboardApplicationsOverview`, `DashboardApplicationsOverviewItem`, `DashboardApplicationSessionsBucket`, `DashboardPagination`, and their schemas. Also clarifies `DashboardAppQuery.appName` JSDoc to point at `applicationsOverview` as the canonical source of valid `(appId, appName)` pairs.

## v0.11.0

### New Features — Dashboard Client (per-app token consumption + violations)

Adds `ManagementClient.dashboard` (new `DashboardClient`) covering the SCM **AI Security > Runtime > API Applications** detail panel — and unlocks per-app token chargeback reporting that previously required the SCM UI.

**New methods (both on `client.dashboard`):**

- **`application({ appId, appName, timeInterval?, timeUnit? })`** — per-app overview. Returns `token_stats` (average daily + monthly total, each paired with a `K`/`M` scale qualifier), `session_stats`, attached `profiles[]`, `cloud`, `source`, `created_at`.
- **`applicationViolationBreakdown({ appId, appName, timeInterval?, timeUnit? })`** — per-detector severity counts. Returns one entry per `detection_type` in `detection_type_violation_breakdown[]` plus the rolled-up `total_violating`. 10 detectors observed live as of 2026-05-28: `agent_security`, `contextual_grounding`, `dbs` (database security), `dlp`, `malicious_code`, `pi` (prompt injection), `source_code`, `tc` (toxic content), `topic_guardrails`, `uf` (URL filtering).

**Type signature reflects verified live behavior (2026-05-28):**

- `appId` and a non-empty `appName` are both required. Empty `appname` → HTTP 400; omitting it (different code path) returns an all-null body. The SDK keeps both failure modes off the happy path.
- `timeInterval?: 7 | 30 | 60` (default `30`). Values `1, 3, 14, 21, 28, 90` all returned HTTP 400.
- `timeUnit?: 'days'` only (default `'days'`). `'hours'` / `'minutes'` return HTTP 400.

Response schemas use `.passthrough()` + `.nullable().optional()` for forward compatibility — new detectors and new response fields parse cleanly without an SDK bump.

**Files:** `src/management/dashboard.ts`, `src/models/mgmt-dashboard.ts`, `examples/mgmt-dashboard.ts`. New `MGMT_DASHBOARD_APPLICATION_PATH` / `_VIOLATION_BREAKDOWN_PATH` constants. Guide section added under [Management API → Dashboard](../guides/management-api#dashboard) including the per-app chargeback pattern.

### Bug Fixes — Management `.delete()` Plain-String Bodies

Accept plain-string response bodies on management `.delete()` methods. AIRS API returns `Content-Type: application/json` with a JSON-encoded plain-string body (e.g. `"successfully deleted ..."`) for DELETE on profiles, topics, api-keys, customer-apps; SDK now normalizes that to `{ message: <string> }` instead of throwing `AISEC_RESPONSE_VALIDATION`. `customerApps.delete` return type changes from `CustomerApp` to a new `CustomerAppDeleteResponse` (`{ message: string }`) — the prior signature was a fiction since the server never returned a `CustomerApp` on delete. Closes [#164](https://github.com/cdot65/prisma-airs-sdk/issues/164), [#165](https://github.com/cdot65/prisma-airs-sdk/issues/165), [#166](https://github.com/cdot65/prisma-airs-sdk/issues/166), [#167](https://github.com/cdot65/prisma-airs-sdk/issues/167). PR [#172](https://github.com/cdot65/prisma-airs-sdk/pull/172).

### Bug Fixes — Red-Team Empty 2xx Bodies

Accept empty response bodies on red-team `targets.delete`, `customAttacks.deletePrompt`, and `customAttacks.createPropertyName`. AIRS red-team API returns 2xx with an empty body on these mutations; SDK now tolerates that via `allowEmptyBody: true` (same precedent as DLP `dictionaries.replace`) instead of throwing `AISEC_RESPONSE_VALIDATION`. Return types widened to `BaseResponse | undefined` to reflect the empty-body case. Closes [#168](https://github.com/cdot65/prisma-airs-sdk/issues/168). PR [#173](https://github.com/cdot65/prisma-airs-sdk/pull/173).

### Tests — Lock `getPropertyNames` Data Shape

Regression test in `test/red-team/custom-attacks-client.spec.ts` locks `PropertyNamesListResponseSchema.data` as `string[]` (per documented server contract). Issue [#169](https://github.com/cdot65/prisma-airs-sdk/issues/169) reported `• undefined` in CLI render output; root cause is CLI-side `.name` dereferencing on a plain string, not an SDK schema bug. SDK contract now pinned. PR [#174](https://github.com/cdot65/prisma-airs-sdk/pull/174).

## v0.10.0

### New Default — `service-name: api` Header on Every Request

The SDK now sends `service-name: api` on every outbound HTTP request. Fixes [issue #162](https://github.com/cdot65/prisma-airs-sdk/issues/162): on tenants whose downstream services require the header, DLP `GET /v2/api/data-patterns/{id}` and `GET /v2/api/data-profiles/{id}` returned HTTP 400 for every id. Verified live (tenant 6198141467535401984, 2026-05-27): adding `service-name: api` alone flips both endpoints from 400 → 200. The header is optional in the spec but defensive on the client per AIRS API team guidance.

**Surface:**

- `src/http/request.ts` — header added to the default headers map, so every request through `request()` (Runtime, Management, DLP, Red-Team, Model Security) carries it.
- `test/http/request.spec.ts` — regression test asserts the header is present on every fetch.
- `test/management/dlp/data-patterns.spec.ts`, `test/management/dlp/data-profiles.spec.ts` — `get(id)` call-path regressions.

**Not in this release (deferred):** `POST /v2/api/data-profiles` and `PUT/PATCH` on DLP profiles/patterns continue to return 400 with `"Invalid Request Body"` — a separate server-side validation surface, independent of the `service-name` header. Tracking separately.

Minor bump (not patch) to flag the new default request header as behavior-affecting for proxies/log scrapers parsing SDK traffic.

## v0.9.2

### Bug Fixes — DLP Nested Helper Schemas

Follow-up to v0.9.1. The earlier sweep widened top-level Response fields but missed nested helpers — live `api.dlp.paloaltonetworks.com` still returned `null` on inner fields and failed Zod. Surfaced re-running [prisma-airs-cli PR #78](https://github.com/cdot65/prisma-airs-cli/pull/78) DLP list commands against the live tenant.

**Schema changes (all backward compatible):**

- `DataPatternMatchingRulesSchema` (`src/models/dlp-data-pattern.ts`) — all 5 fields → `.nullish()`. Primary fix for `data-patterns list` Zod failures on nested `matching_rules`.
- `ExpressionTreeNodeSchema` (`src/models/dlp-data-profile.ts`, recursive via `z.lazy`) — `operator_type`, `rule_item`, `sub_expressions` → `.nullish()`. Primary fix for `data-profiles list` Zod failures inside the expression tree. `ExpressionTreeNode` TS interface widened to allow `null` to match.
- `DetectionRuleItemSchema` — 23 inner fields → `.nullish()` (`detection_technique` stays required as the discriminator-ish marker).
- `MultiProfileDataNodeSchema`, `DefaultTreeDetectionRuleSchema.expression_tree`, `MultiProfileDetectionRuleSchema.multi_profile` → `.nullish()`.
- `MetadataCriterionSchema`, `DataPatternDetectionConfigSchema.supported_confidence_levels`, `DataPatternTagsSchema` — all `.nullish()`.
- `dlp-data-filtering-profile.ts` — 8 nested helpers (`AppExclusion`, `URLExclusion`, `Exclusions`, `SourceAttributes`, `DestinationAttributes`, `ExceptionRuleDTO`, `DataFilteringRuleDTO`, `DataFilteringDetails`) → `.nullish()`.
- `dlp-dictionary.ts` — `DictionaryMetaDataDTOSchema`, `DictionaryTagsSchema`, `ResourceModelExtensionSchema` → `.nullish()`.

**Side-effect (acceptable):** these helpers are shared by request schemas, so request payloads now tolerate explicit `null` on the affected inner fields. SDK user code would not intentionally serialize nulls there; top-level `*RequestSchema` files remain strict.

**Test coverage:** 9 new test cases across `dlp-data-pattern.spec.ts`, `dlp-data-profile.spec.ts`, `dlp-data-filtering-profile.spec.ts`, `dlp-dictionary.spec.ts`. All 1255 tests pass.

## v0.9.1

### Bug Fixes — DLP Response Schemas

Hotfix for [issue #158](https://github.com/cdot65/prisma-airs-sdk/issues/158): live `api.dlp.paloaltonetworks.com` responses fail Zod validation because `.optional()` rejects `null` and the API emits `null` (not `undefined`) for unset fields. Surfaced during smoke-testing of [prisma-airs-cli PR #78](https://github.com/cdot65/prisma-airs-cli/pull/78).

**Schema changes (all backward compatible):**

- `AuditResponseSchema` (`src/models/dlp-audit.ts`) — `created_by` / `updated_by` → `.nullish()`. `created_at` / `updated_at` widened to `z.union([z.string(), z.number()]).nullish()` because the API has been observed returning epoch-ms integers, not just ISO strings.
- `DataFilteringProfileResponseSchema` — every top-level `.optional()` → `.nullish()`. Specifically resolves rejection of `description`, `is_end_user_coaching_enabled`, `euc_template_id`, `rule1`, `rule2` when those fields arrive as `null`.
- `DataPatternResponseSchema` — every top-level `.optional()` → `.nullish()`.
- `DataProfileResponseSchema` — every top-level `.optional()` → `.nullish()`.
- `DictionaryResponseSchema` — every top-level `.optional()` → `.nullish()`.
- `DlpReportSchema` (`src/models/dlp-report.ts`) — every field `.nullish()` for consistency.

**Out of scope:**

- `*RequestSchema` files stay strict (`.optional()`) — the API tolerates omission on write but the SDK should not emit explicit `null`s on PUT/POST bodies.
- Patch request schemas (`*PatchRequestSchema`) unchanged — `jsonNullable()` already handles JSON Merge Patch null semantics correctly.

**Test coverage:** added null-acceptance and numeric-timestamp acceptance cases to `test/models/dlp-audit.spec.ts`, `dlp-data-filtering-profile.spec.ts`, `dlp-data-pattern.spec.ts`, `dlp-data-profile.spec.ts`, `dlp-dictionary.spec.ts` (10 new tests). All 1246 tests pass.

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
