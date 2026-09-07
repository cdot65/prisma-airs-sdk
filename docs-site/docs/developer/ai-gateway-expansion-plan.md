---
title: AI Gateway API expansion plan
sidebar_position: 5
---

# AI Gateway API expansion plan

## September 2026 implementation checkpoint

The local SDK now adds MCP server, usage/rate policy and log-export clients, MCP guardrail mappings,
MCP integration workspace reads and custom integration-model deletion. These follow the existing
SCM OAuth/plane design. The user-authorized 2026-09-06 runtime expansion additionally introduces
`AIGatewayInferenceClient` and `AIGatewayClient.inference`, with explicit runtime endpoint and
API-key configuration. This supersedes the earlier runtime deferral; SCM defaults remain unchanged.
The [operation ledger](./gateway-coverage.md) records all 242 upstream operations and live exceptions.
The [conformance report](./openapi-conformance.md) explains request validation, fixture evidence and
the explicit denominator. Experimental methods remain labeled pending successful tenant validation.

Subsequent dev-scoped discovery verified admin-plane `/secret-references` without a workspace query. The focused `secretReferences` client now has five typed CRUD methods, a seven-check live owned-fixture lifecycle and explicit credential-subtree redaction. Only unbound references with invalid synthetic credentials were used; external secret resolution remains untested. The remaining Assistants/Threads routes in the pinned Portkey document are retired on the configured OpenAI backend as of August 26, 2026 ([official notice](https://developers.openai.com/api/docs/assistants/migration)). They remain gaps in the full 242-operation denominator, not substituted with Responses coverage.

This document scopes the next AI Gateway SDK additions while Palo Alto Networks does not yet publish an AI Gateway OpenAPI document. It is an implementation plan, not a claim that every endpoint described below is currently available from Strata Cloud Manager (SCM).

The later runtime increment adds experimental image/audio/moderation/rerank/OCR and legacy/prompt completion/rendering contracts. Both exact deployed gateway replicas register the three completion/render routes; prompt completion dispatches to the ordinary chat/legacy handlers. The pinned prompt schema's educational hyperparameter nesting is corrected to its explicitly documented root-level wire format. Successful provider/template workflows remain unverified, so these additions do not satisfy the release-ready gate below.

A subsequent bounded realtime probe completed the WebSocket upgrade but received `invalid_model` before session creation using the prescribed model. Same-key authentication and socket/key cleanup passed; no generation was requested or alternate model selected. The route is registered on both deployed replicas, but no successful realtime lifecycle or SDK implementation is claimed. Test-only WebSocket discovery does not add a production dependency or count as implementation coverage.

The focused implementation design for exported write schemas, structured routing configuration,
pre-network validation, dotted-value builders, and secret metadata is in the
[SDK 0.20 request model plan](sdk-0.20-request-model-plan.md).

## Evidence and authority

Runtime observability was subsequently verified on September 6: `POST /feedback` and `POST /logs` succeed with a runtime key on the explicitly configured gateway even though SCM denies both. Typed feedback creation and single/batch log ingestion pass live checks, with independent SCM reads confirming retained synthetic records. `PUT /feedback/{id}` returned HTTP 500 on an owned record and remained an implementation gap at that checkpoint. These findings refine plane selection; they do not authorize sending runtime keys to SCM or imply full Portkey coverage.

The September 7 follow-up implements `updateFeedback` and `getLog` as experimental runtime contracts after confirming both deployed handlers. It adds strict score/UUID/query validation, the v2 storage timestamp dependency, additive response types and body-log suppression tests. Typed live calls reproduce both storage-handler HTTP 500s; they remain failed workflows, not release-ready methods. This closes two implementation gaps without implying that the backend limitations are fixed or changing storage settings.

The Portkey OpenAPI 2.0.0 document at commit `9d7eca77222db12623c044a862b5873cae758956` is the capability and payload-shape research source. Prisma AIRS uses Portkey technology, so the document is useful for discovering likely resources and relationships. It is not authoritative for Prisma routing, authentication, authorization, or response envelopes.

Sources have this precedence:

1. A request and response verified against an SCM tenant.
2. Existing SDK behavior already verified against SCM.
3. A future Palo Alto Networks API specification or documentation.
4. The Portkey OpenAPI document, used as a research hypothesis only.

If these disagree, SCM-observed behavior wins. Each new operation must record its verification status in its API documentation.

## Transport contract that must not change

The September 7 public-pricing addition is an explicit exception to SCM/runtime plane selection:
the pinned pricing operation declares `https://api.portkey.ai` (without `/v1`) and `security: []`.
Both prescribed models returned 200 there. `AIGatewayModelPricingClient` therefore stands alone
with an explicit endpoint and no credentials, without changing SCM or inference defaults. Its
catalog values are not Prisma tenant billing. Earlier SCM denial on that relative path did not
establish public-service unavailability. See [public pricing](../guides/ai-gateway-model-pricing.md).

New clients will reuse `AIGatewayClient` and its existing transport:

- SCM OAuth client-credentials authentication through the SDK's current OAuth resolver.
- The existing `x-tsg-id` header adapter.
- The configured Prisma data-plane and admin-plane base URLs, whose defaults currently end in `/ai_gw/v2` and `/ai_gw/admin/v2`.
- Existing retry, timeout, error normalization, and debug behavior.

Portkey hostnames and credentials must not become implicit SCM defaults. The separate runtime
client deliberately uses `x-portkey-api-key`, as verified by the supplied working Prisma request;
it requires an explicit endpoint/key and never sends management OAuth or TSG credentials.
A Portkey path is appended to an SCM base only after that combination has been verified.
In particular, Portkey's `/admin/workspaces` does not supersede Prisma's verified admin-base `/workspaces` route.

## Current coverage and nearest gaps

The SDK already exposes telemetry, workspaces, configs, guardrails, providers, API keys, integrations, MCP integrations, deployments, plugins, organisations, and audit logs. These existing resources provide the safest first expansion because their SCM planes and neighboring routes are already known.

| Resource | Existing SDK coverage | Candidate additions from Portkey research | Expected plane | Confidence |
| --- | --- | --- | --- | --- |
| Configs | list, get, list versions, create, update, delete | — | Data | Verified |
| Guardrails | list, get, create, update, delete | — | Data | Verified |
| Providers | list, get, create, update, delete | — | Data | Verified |
| Deployments | list, get, create, update, ping, delete/archive | — (update and ping delivered 2026-08-30) | Admin | Verified |
| Integrations | CRUD, models, workspaces | reconcile any missing model/workspace removal semantics | Admin | High |
| MCP integrations | list, get, create, update, delete, workspace bindings, capability reads and updates, metadata | — (delivered 2026-08-30) | Admin | Verified |
| API keys | service/user list, get, create, update, delete, rotate | — (delivered 2026-08-30; Prisma requires the split `service`/`user` collections) | Data | Verified |

“High” means the resource and plane are already established, not that the candidate operation is confirmed. Every candidate still needs an SCM probe.

## Proposed delivery phases

### Phase 0: conformance ledger and probe harness

Before production methods are written, add an opt-in integration harness that can exercise a proposed method and path against SCM without printing credentials or persisted secrets. For every candidate operation, record:

- SDK resource and method name.
- HTTP method, path, plane, query parameters, and body.
- Portkey operation ID and schema references used as the hypothesis.
- SCM result: verified, divergent, unavailable, or insufficient permissions.
- A redacted request/response fixture and verification date.

HTTP 401 and 403 results establish authentication or authorization behavior, not response schemas. HTTP 404 may indicate a different Prisma route and must not be treated as proof that the feature is absent.

The initial harness is available through `npm run probe:ai-gateway`. It is dry-run by default:

```bash
# Review the versioned candidate ledger without authenticating
npm run probe:ai-gateway -- --list

# Resolve a candidate path without making a network request
npm run probe:ai-gateway -- \
  --operation providers.get \
  --var providerId=11111111-1111-4111-8111-111111111111

# Execute a read probe through the normal SCM OAuth and x-tsg-id chain
npm run probe:ai-gateway -- \
  --operation providers.get \
  --var providerId=11111111-1111-4111-8111-111111111111 \
  --execute \
  --output ./provider-get-probe.json
```

Mutation candidates require both `--execute` and `--allow-mutation`, plus a JSON body supplied with `--body-file`. Probe output files are created with owner-only permissions. The harness recursively redacts credential-shaped fields and records only a small allowlist of response headers, but evidence must still be reviewed before it is committed.

### Phase 1: complete established resources

Implement the high-confidence gaps in small, independently reviewable changes:

Completed and live-verified on 2026-08-29: config versions; guardrail update; provider detail and update; MCP integration detail, capabilities, and metadata. Guardrail and provider updates were verified through disposable create-update-read-delete cycles confined to `ws-develo-71f8d8`.

Phase 1 CRUD is complete and live-verified as of 2026-08-30. Deployment update and ping,
MCP integration update/delete/capability updates, and API-key get/delete/rotate are implemented.
Prisma API keys require explicit `service` and `user` sub-collection paths; the generic Portkey
`/api-keys/{id}` route is OPA-denied. The deployment ping schema is verified against an unhealthy
response. The private deployment intentionally rejects control-plane-initiated ingress required by
`ping()`; its outbound heartbeat is live and SCM reports the deployment connection as healthy.

Do not alias Portkey `virtual-keys` to Prisma API keys without live evidence; they may have different lifecycle and secret semantics.

### Phase 2: adjacent administration resources

Add new subclients after their SCM routes and permissions are verified:

| Proposed SDK property | Portkey capability used for research | Expected plane |
| --- | --- | --- |
| `mcpServers` | server CRUD, test, capabilities, user access, connections | Admin |
| `usageLimitPolicies` | policy CRUD, entity assignment, reset | Admin |
| `rateLimitPolicies` | policy CRUD | Admin |
| `secretReferences` | secret-reference CRUD | Admin |
| `users` / `invites` | organisation users, invitations, workspace membership | Admin |

SCIM operations should remain a separate later decision. Their security impact and provisioning semantics warrant a dedicated design rather than being folded into ordinary user CRUD.

### Phase 3: data-plane authoring and observability

Research and validate collections, labels, prompts, prompt versions, prompt partials, feedback, log detail/query, and log exports. Prefer focused subclients such as `prompts`, `promptPartials`, and `logExports` over one large generic Portkey client.

The current telemetry client remains the authority for SCM-verified analytics. Portkey analytics graph endpoints should only extend it when the metric name, grouping rules, time-window format, and response envelope match SCM.

### Phase 4: inference-compatible APIs

Runtime authority is established as of 2026-09-06: the dev deployment accepts a gateway service
key on its `/v1` runtime URL, provider-prefixed model IDs, and `x-portkey-provider` for provider
resource operations. Chat and Responses support SSE; embeddings support float/base64. Files
use native multipart uploads and byte-preserving downloads. These contracts are implemented
with native fetch, strict inputs, additive response fields, bounded cancellable SSE, and zero
automatic retries by default (generation can be billable). No runtime hostname or model is
silently selected by the SDK. See [runtime inference](../guides/ai-gateway-inference.md) for
verification results and explicit compatibility corrections. WebSocket realtime and the retired
Assistants/Threads surface remain gaps. The newly modeled provider HTTP and legacy/prompt
methods are experimental, not successful tenant-verification claims.

Chat completions, Responses, embeddings, reranking, OCR, audio, images, files, batches, assistants, threads, vector stores, fine-tuning, models, and moderations form a distinct surface. They should not be added merely because they appear in Portkey's specification.

For each additional family, continue to verify:

- Whether inference requests use SCM OAuth or a generated gateway API key.
- The actual gateway hostname and path prefix.
- Streaming and WebSocket behavior.
- Provider-routing headers and Prisma-specific policy headers.
- Upload/download handling, binary bodies, and maximum payload sizes.
- Whether OpenAI-compatible schemas are passed through or normalized by Prisma.

If verified, expose these through a dedicated `inference` client so management OAuth and runtime gateway-key authentication cannot be confused at compile time or in documentation.

## Public API design rules

- Model Prisma's observed wire format, including its casing and envelopes; do not rename fields merely to match Portkey.
- Use explicit request interfaces and Zod response schemas. Preserve unknown response fields with `.passthrough()` where forward compatibility is valuable, while validating the fields the SDK promises.
- Prefer resource-specific result types over a generic write response once a live response is captured.
- Validate UUIDs and numeric TSG identifiers consistently with existing clients, but do not assume every Portkey slug is a UUID.
- Keep list pagination, filtering, and sorting options aligned with the actual SCM query contract.
- Represent secret-bearing create or rotate responses with distinct types and document that the secret may only be returned once.
- Never include live tenant identifiers, tokens, provider keys, or unredacted payloads in fixtures, snapshots, examples, or debug output.
- Treat destructive operations explicitly: distinguish hard delete, archive, revoke, detach, and reset in both method names and documentation.

## Test-driven implementation gate

Each operation follows a red-green-refactor sequence:

1. Add a failing unit test that asserts the plane, URL, HTTP method, query encoding, request body, OAuth/TSG authentication, response parsing, and error behavior.
2. Add schema fixture tests for the redacted SCM response. Portkey-only examples may inform a draft schema but cannot be the sole passing fixture for a released method.
3. Implement the smallest client and model change that passes those tests.
4. Run type checking, linting, unit tests, package build, and documentation build.
5. Run the opt-in SCM integration probe and record its result. Mutation probes must create uniquely named disposable resources and remove only those exact resources afterward.
6. Add a runnable documentation example and regenerate the API reference.

A method is release-ready only when its route and response are SCM-verified. If an unverified method is intentionally shipped for discovery, it must be clearly marked experimental, avoid overly strict response promises, and remain outside semantic-versioning guarantees until verified.

## Definition of done for the expansion

- Existing authentication and base-URL behavior remains backward compatible.
- Every new operation has unit tests and a redacted SCM fixture.
- Every new response type states whether it is live-verified.
- No Portkey URL or credential mode is silently used by Prisma clients.
- SDK guide, generated API reference, README capability summary, and CLI integration documentation agree.
- The SDK is released before the CLI dependency is bumped, installed, tested, and released.
