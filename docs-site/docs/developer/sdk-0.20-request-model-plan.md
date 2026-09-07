---
title: SDK 0.20 request model plan
sidebar_position: 6
---

# SDK 0.20 request model plan

## Status

The September 2026 local extension preserves this design: exported gateway request types derive
from their Zod schemas, stable fields reject unknown keys, dynamic extension maps admit only finite
JSON, and validation runs before authentication. Open catalog values remain forward-compatible.
See the [new conformance checkpoint](./openapi-conformance.md) for the SDK 0.21.0 additions and
live exceptions; this does not change the historical release status below.

**Shipped in SDK `0.20.0`**; this page is retained as design
history. Everything listed under "Gap before 0.20" below has since been closed, and the live-probe
questions noted in the contract table have been resolved as described in the info box that follows
it.

As specified, SDK `0.20.0` makes the existing AI Gateway write surface
safe and composable enough for structured CLI commands without changing its SCM OAuth, `x-tsg-id`,
base-URL, or plane-selection behavior.

The work is deliberately limited to request modeling, request validation, routing-configuration
helpers, and secret handling. It does not add Portkey authentication, Portkey hostnames, inference
methods, or unverified SCM resources.

## Evidence and authority

The source order from the [AI Gateway expansion plan](ai-gateway-expansion-plan.md) remains binding:

1. Live behavior observed through SCM.
2. Existing behavior already verified by SDK tests and SCM probes.
3. Future Palo Alto Networks documentation or an OpenAPI document.
4. The local Portkey OpenAPI 2.0.0 research document at commit
   `9d7eca77222db12623c044a862b5873cae758956`.

Portkey evidence can justify a typed draft, but it cannot override an SCM payload, identifier type,
path, response envelope, or authentication rule. A Portkey-only enum is not treated as exhaustive
until an SCM response, metadata endpoint, or negative validation probe proves that it is closed.

## Goals

SDK 0.20 will provide:

- an exported Zod schema and inferred TypeScript type for every current AI Gateway create, update,
  rotate, bulk-update, and workspace/model/capability binding body;
- reusable request components for limits, defaults, secret mappings, provider configuration, and
  routing configuration;
- exported value catalogs and literal unions for verified or known deployment types, statuses,
  API-key scopes, MCP transports, MCP authentication types, MCP capability types, rate-limit
  values, cache modes, and routing strategies;
- runtime validation before OAuth preparation or any API request;
- names that distinguish partial updates, bulk updates, and full replacement;
- immutable dotted-path builders for structured nested values;
- public, operation-scoped secret metadata and a matching immutable redactor;
- body redaction in SDK debug logs, using the same metadata the CLI consumes; and
- backward-compatible aliases for public 0.19 request type names where their old name is vague.

## Non-goals

- Generating schemas directly from the Portkey specification.
- Treating the Portkey specification as a Prisma AIRS contract.
- Parsing shell strings such as `"3"` into numbers. The CLI owns text coercion and `--set-string`;
  the SDK builder accepts an already typed JSON value.
- Adding generic inference, prompt, secret-reference, policy, or MCP-server clients.
- Redesigning response schemas, except for a live-observed correction needed to validate a 0.20
  write cycle.
- Mutating organisation-wide settings during automated E2E tests.

## Gap before 0.20 (historical)

Before 0.20, AI Gateway responses were Zod-validated but most write inputs were compile-time interfaces
declared next to their clients. Clients generally assert only path UUIDs or numeric TSG IDs. As a
result, empty updates, misspelled fields, invalid nested values, non-serializable values, and invalid
cross-field combinations can reach SCM.

Several current types are also too broad for structured callers:

- routing and provider configuration are `Record<string, unknown>`;
- API-key scopes, MCP transports, and MCP auth types are plain strings;
- integration workspace bindings and secret mappings contain `unknown[]`;
- API-key update methods reuse the create type;
- config update reuses the create type even though update semantics require separate evidence;
- organisation updates accept an unbounded `Record<string, unknown>`; and
- debug logging redacts auth headers but can print provider keys, plugin credentials, generated API
  keys, deployment credentials, `client_auth`, and `scim_token` values from JSON bodies.

## Contract decisions

### Request schemas are the source of request types

Every public request type will be inferred from its schema:

```ts
export const GatewayWorkspaceCreateRequestSchema = z.object({ /* ... */ }).strict();
export type GatewayWorkspaceCreateRequest = z.infer<
  typeof GatewayWorkspaceCreateRequestSchema
>;
```

Stable request objects use `.strict()` so a misspelled write field fails instead of being stripped
or sent. Forward compatibility remains explicit at documented extension points:

- routing configs;
- provider-specific `configurations`;
- MCP `configurations`;
- deployment configuration; and
- the currently under-specified organisation setting maps.

Those maps accept only recursive JSON values, not arbitrary JavaScript values. Responses continue
to use `.passthrough()` under the existing response-compatibility policy.

### Closed enums and known-value catalogs are different

A verified closed set gets an exported tuple, `z.enum`, and inferred literal union. A set derived
only from Portkey research or positive SCM examples gets a `KNOWN` catalog and autocomplete-friendly
union, while the write schema accepts any non-empty string. This prevents 0.20 from rejecting a new
SCM value merely because Portkey's document has not caught up.

The initial public values are:

| Export | Initial values | Policy |
| --- | --- | --- |
| `AI_GATEWAY_DEPLOYMENT_TYPES` | `non_production`, `production` | Closed; live and OpenAPI-backed |
| `AI_GATEWAY_DEPLOYMENT_STATUSES` | `active`, `archived` | Closed for deployment writes |
| `AI_GATEWAY_MUTABLE_MCP_CAPABILITY_TYPES` | `prompt`, `resource`, `tool` | Closed for the bulk-update body; `resource_template` remains response-only until SCM supports mutating it |
| `AI_GATEWAY_KNOWN_API_KEY_SCOPES` | `agents.invoke`, `completions.write`, `logs.write`, `mcp.invoke`, `prompts.render` | Open known-value catalog |
| `AI_GATEWAY_KNOWN_MCP_AUTH_TYPES` | `headers`, `none`, `oauth_auto`, `oauth_client_credentials` | Open known-value catalog; Portkey create/detail schemas disagree |
| `AI_GATEWAY_KNOWN_MCP_TRANSPORTS` | `http`, `interactive`, `sse` | Open known-value catalog; `interactive` is not proven writable through SCM |
| `AI_GATEWAY_KNOWN_CONFIG_STRATEGIES` | `fallback`, `loadbalance`, `single` | Open Portkey-research catalog |
| `AI_GATEWAY_KNOWN_CACHE_MODES` | `semantic`, `simple` | Open Portkey-research catalog |
| `AI_GATEWAY_KNOWN_RATE_LIMIT_TYPES` | `requests`, `tokens` | Open until SCM rejects unknown values |
| `AI_GATEWAY_KNOWN_RATE_LIMIT_UNITS` | `rpd`, `rph`, `rpm`, `rps`, `rpw` | Open; Portkey components disagree on the last two |

Tuples are alphabetically ordered so SDK-generated CLI choices and help stay deterministic.
Types for open catalogs use a documented literal-union escape hatch so editors suggest known values
without narrowing valid future SCM strings to the current list.

### Partial update, bulk update, and replacement are explicit

- `*CreateRequest` contains the fields accepted at creation.
- `*UpdateRequest` is a partial mutation and must contain at least one recognized field.
- `*BulkUpdateRequest` mutates the listed child records; omission does not imply deletion unless the
  live endpoint proves otherwise.
- `*ReplaceRequest` is reserved for a body that describes the complete desired state and whose
  omission semantics have been verified.

HTTP `PUT` alone is not evidence of full replacement. Existing documentation that calls integration
model/workspace writes replacements will be corrected unless a disposable SCM probe proves those
semantics.

### Validation happens before authentication and transport

`RequestSpec` gains an optional request schema. `request()` parses `spec.body` at function entry,
before calling `auth.prepare()` or `fetch()`, and serializes the parsed result rather than the
unvalidated input.

Validation failures throw `AISecSDKException` with the existing
`ErrorType.USER_REQUEST_PAYLOAD_ERROR`. Messages include the operation and Zod field paths, but never
the rejected values. No new error category is needed.

This shared seam is available to other SDK services later, but 0.20 migrates only AI Gateway write
operations. Existing path-parameter assertions remain in the clients.

## Proposed public schemas

### Shared input components

| Schema and type | Contract |
| --- | --- |
| `GatewayJsonValueSchema` / `GatewayJsonValue` | Recursive finite JSON: string, finite number, boolean, null, array, or object |
| `GatewayJsonObjectSchema` / `GatewayJsonObject` | String-keyed JSON object; the explicit extension-point type |
| `GatewayRateLimitInputSchema` / `GatewayRateLimitInput` | Known `type`, `unit`, and non-negative integer `value` |
| `GatewayUsageLimitInputSchema` / `GatewayUsageLimitInput` | Credit/type/threshold/reset fields with numeric bounds and mutually exclusive reset scheduling |
| `GatewayDefaultsInputSchema` / `GatewayDefaultsInput` | Typed metadata/config defaults with a JSON extension point |
| `GatewaySecretMappingSchema` / `GatewaySecretMapping` | `target_field`, secret-reference id, optional key, and `json`/`string` value format |
| `GatewayWorkspaceBindingSchema` / `GatewayWorkspaceBinding` | Workspace id/slug, enabled state, optional limits, reset/default-provider options |
| `GatewayGlobalWorkspaceAccessInputSchema` / `GatewayGlobalWorkspaceAccessInput` | Enabled state plus optional limit arrays |

Input policy schemas are separate from permissive response schemas. A response can contain
server-maintained fields such as `current_usage`; a request must not silently send them back.

### Resource request matrix

| Client operation | New schema/type | Semantics and validation |
| --- | --- | --- |
| `workspaces.create` | `GatewayWorkspaceCreateRequestSchema` | Strict create; non-empty name/scope; typed defaults and limit arrays |
| `workspaces.update` | `GatewayWorkspaceUpdateRequestSchema` | Non-empty partial update |
| `configs.create` | `GatewayConfigCreateRequestSchema` | Strict create with workspace UUID and `GatewayRoutingConfig` |
| `configs.update` | `GatewayConfigUpdateRequestSchema` | Non-empty partial envelope; a supplied `config` replaces the routing document. `workspace_id` is optional (live-verified) |
| `guardrails.create` | `GatewayGuardrailCreateRequestSchema` | At least one typed check; typed known actions with JSON extension points |
| `guardrails.update` | `GatewayGuardrailUpdateRequestSchema` | Non-empty partial update; a supplied checks array is non-empty |
| `providers.create` | `GatewayProviderCreateRequestSchema` | Workspace/integration/provider identifiers validated; typed limit inputs |
| `providers.update` | `GatewayProviderUpdateRequestSchema` | Non-empty partial update; nullable clearing preserved where SCM supports it |
| `apiKeys.createService` | `GatewayServiceApiKeyCreateRequestSchema` | Service-key create; `user_id` is not accepted |
| `apiKeys.createUser` | `GatewayUserApiKeyCreateRequestSchema` | User-key create; `user_id` required |
| `apiKeys.updateService`, `updateUser` | `GatewayApiKeyUpdateRequestSchema` | Non-empty partial update, separate from creation identity fields |
| `apiKeys.rotateService`, `rotateUser` | `GatewayApiKeyRotateRequestSchema` | Optional integer transition period, minimum 30 minutes |
| `integrations.create` | `GatewayIntegrationCreateRequestSchema` | Strict stable fields; typed provider config or JSON extension; typed secret mappings |
| `integrations.update` | `GatewayIntegrationUpdateRequestSchema` | Non-empty partial; excludes immutable create-only identity fields unless SCM proves them mutable |
| `integrations.setModels` | `GatewayIntegrationModelsBulkUpdateRequestSchema` | Non-empty model list with typed model config/pricing fields; compatibility alias retained |
| `integrations.setWorkspaces` | `GatewayIntegrationWorkspacesBulkUpdateRequestSchema` | Typed workspace/global bindings. `global_workspace_access` is the object form `{ enabled }` (live-verified; a bare boolean is rejected by SCM) |
| `mcpIntegrations.create` | `McpIntegrationCreateRequestSchema` | URL, known/open auth and transport values, JSON configuration, secret mappings |
| `mcpIntegrations.update` | `McpIntegrationUpdateRequestSchema` | Non-empty partial update |
| `mcpIntegrations.setCapabilities` | `McpIntegrationCapabilitiesBulkUpdateRequestSchema` | At least one mutable capability: name/type/enabled |
| `mcpIntegrations.setWorkspaces` | `McpIntegrationWorkspacesBulkUpdateRequestSchema` | Typed, live-observed workspace binding; requires a non-empty body |
| `deployments.create` | `GatewayDeploymentCreateRequestSchema` | Closed deployment type, numeric TSG id, typed auth settings |
| `deployments.update` | `GatewayDeploymentUpdateRequestSchema` | Non-empty partial; closed status/type; rotate and override flags |
| `plugins.create` | `GatewayPluginCreateRequestSchema` | Numeric TSG id, integration UUID, non-empty credential string map |
| `organisations.updateSelf` | `GatewayOrganisationUpdateRequestSchema` | Non-empty JSON object with known `name`; remains an explicit extension map until a safe live capture exists |
| `organisations.updateAuthSettings` | `GatewayOrganisationAuthSettingsUpdateRequestSchema` | Non-empty JSON object with known auth fields and secret metadata; no automated organisation mutation |

The existing public names remain available where possible. Ambiguous names such as
`GatewayIntegrationModelsRequest` and `GatewayIntegrationWorkspacesRequest` become deprecated type
aliases to their semantically named replacements. `GatewayApiKeyCreateRequest` remains a shared
compatibility type, while the two create methods expose their service/user-specific types.

The two evidence gates in the matrix are execution tasks, not planning blockers. Until their probes
pass, their schemas stay safely open at the disputed field rather than asserting Portkey behavior as
SCM fact.

:::info[Live evidence captured 2026-08-30]
Both execution gates passed against `ws-develo-71f8d8`. A name-only config update succeeded without
`workspace_id` or `config`; a supplied routing `config` replaced the document and round-tripped.
Regular integration workspace writes accepted
`global_workspace_access: { enabled: boolean }`; the boolean form was rejected. The final request
schema therefore requires the object form.
:::

## Typed routing and provider configuration

### Routing document

`GatewayRoutingConfigSchema` models the subset supported by concrete OpenAPI examples and current
SDK examples:

```ts
type GatewayRoutingConfig = {
  retry?: {
    attempts?: number;
    on_status_codes?: number[];
  };
  cache?: {
    mode?: GatewayConfigCacheMode;
    max_age?: number;
  };
  strategy?: {
    mode: GatewayConfigStrategy;
  };
  targets?: Array<{
    provider?: string;
    virtual_key?: string;
  }>;
  provider?: string;
  virtual_key?: string;
  [extension: string]: GatewayJsonValue | undefined;
};
```

Known fields receive bounds: retry attempts and cache age are non-negative integers, and retry
status codes are integers from 100 through 599. The root and each explicitly provider-extensible
target accept additional JSON fields. No unsupported routing feature is invented, and the schema
does not imply that every Portkey strategy has been SCM-verified.

### Provider integration configuration

The Portkey document provides enough structure to export focused schemas for OpenAI, Azure OpenAI,
Azure AI, AWS Bedrock/SageMaker, Vertex AI, Workers AI, Hugging Face, Cortex, and custom-host
configuration. Each is usable independently; the integration request also accepts a JSON extension
configuration for an SCM provider the research document does not know.

Cross-field checks are applied only where evidence is unambiguous. For example, the Vertex schema
models `basic` and `serviceAccount`, region, project id, and service-account JSON. The parent
integration request permits a credential body field to be omitted when a matching
`secret_mappings` entry supplies it. Service-account JSON, client secrets, access keys, and custom
headers are marked sensitive.

This gives a CLI enough information for structured flags without forcing every provider into one
fragile discriminated union keyed by `ai_provider_id`; SCM uses provider UUIDs, while the Portkey
research document often uses provider slugs.

## Dotted-value builder contract

Two public, pure helpers support structured callers:

```ts
const config = buildDottedObject([
  { path: 'retry.attempts', value: 3 },
  { path: 'cache.mode', value: 'simple' },
  { path: 'targets[0].provider', value: '@vertex-prod' },
]);

const updated = setDottedValue(config, 'retry.on_status_codes', [429, 500, 503]);
```

The contract is:

- dot segments address objects and bracketed non-negative integers address arrays;
- backslash escapes literal `.`, `[`, `]`, and `\` in a property name;
- inputs and outputs are JSON values, and the input object is never mutated;
- duplicate paths, scalar/container collisions, malformed paths, sparse arrays, and non-JSON values
  throw `AISecSDKException(USER_REQUEST_PAYLOAD_ERROR)`;
- `__proto__`, `prototype`, and `constructor` are rejected in every object segment;
- no implicit string coercion occurs; and
- entry order does not change a valid result.

The prototype-pollution and conflict rules are release gates, not optional hardening.

## Secret metadata and redaction

SDK 0.20 exports operation-scoped metadata rather than treating every field named `key` as secret:

```ts
AI_GATEWAY_SECRET_FIELDS['integrations.create'].request;
// [{ path: ['key'], redact: 'value' },
//  { path: ['configurations', 'azure_entra_client_secret'], redact: 'value' },
//  { path: ['configurations', 'aws_secret_access_key'], redact: 'value' },
//  { path: ['configurations', 'vertex_service_account_json'], redact: 'subtree' },
//  { path: ['configurations', 'custom_headers', '*'], redact: 'value' }]

redactAIGatewaySecrets('integrations.create', requestBody);
```

Rules are grouped under each operation's `request` and `response` lists; each rule has a segment
array, `value` or `subtree` behavior, and an optional `oneTime` marker. Wildcard segments cover dynamic credential maps. The redactor returns a
clone and uses the constant string `[REDACTED]`; it never hashes or mutates body values.

Initial coverage includes:

- integration `key` and provider credential fields;
- MCP custom authorization headers and OAuth credential configuration;
- plugin `credentials`;
- provider detail credential material;
- API-key create/rotate response `key` values;
- deployment `client_auth` and registry credential password;
- organisation `scim_token`; and
- future values under explicitly designated credential containers.

Secret-reference ids, mapping target names, masked values, and ordinary configuration fields are
not redacted merely because they are adjacent to a secret.

The HTTP debug path consumes this same metadata. If a marked JSON response cannot be parsed for
redaction, debug output omits the body instead of printing it raw. Existing auth-header hashing
remains unchanged. Tests assert raw sentinel secrets never appear in either request or response
logs.

## File layout

The implementation will use focused modules instead of extending the 1,100-line response model:

```text
src/
  ai-gateway/
    nested-values.ts             # public pure dotted-value helpers
    secret-fields.ts             # public metadata/redactor
    *-client.ts                   # clients consume request schemas
  http/
    request.ts                    # early request-schema validation
    types.ts                      # optional requestSchema + debug redaction context
    debug.ts                      # JSON-body redaction support
  models/
    ai-gateway.ts                 # existing response schemas
    ai-gateway-requests.ts        # shared inputs + resource request schemas
    ai-gateway-routing.ts         # routing/provider configuration schemas and catalogs
    index.ts                      # public model exports
```

`scripts/preflight-schemas.ts` will list both new AI Gateway model files as intentionally unspecced.
The Portkey document is research evidence and must not be added to the Palo Alto Networks schema
preflight as an authoritative specification.

## TDD execution sequence

Every phase starts with a failing test, adds the minimum implementation, and refactors only after
the focused test passes.

### Phase 1: public contracts and common schemas

1. Add failing schema tests for valid, invalid, unknown, empty-update, cross-field, and JSON-only
   cases.
2. Add failing public-export and `expectTypeOf` checks for every schema, inferred type, tuple, and
   compatibility alias.
3. Implement the shared atoms, catalogs, routing/provider models, and resource schemas.
4. Confirm tuples remain alphabetically ordered with a table-driven test.

Primary tests:

- `test/models/ai-gateway-requests.spec.ts`
- `test/models/ai-gateway-routing.spec.ts`
- `test/ai-gateway/public-api.spec.ts`

### Phase 2: pre-network validation

1. Add failing HTTP tests proving an invalid body calls neither `auth.prepare()` nor `fetch()`.
2. Assert error type and paths, and assert invalid secret values do not appear in the message.
3. Add optional `requestSchema` handling to `RequestSpec` and `request()`.
4. Verify the parsed body, including any schema normalization, is the body serialized on the wire.

Primary tests:

- `test/http/request-validation.spec.ts`
- existing `test/http/request.spec.ts`

### Phase 3: client migration by resource

For each client, first extend its existing test with invalid top-level, nested, and empty-update
cases and assert zero network calls. Then pass the schema to the request pipeline and remove
duplicated body assertions that the schema supersedes.

Migration order minimizes dependency churn:

1. workspaces, configs, guardrails, providers;
2. API keys;
3. integrations and MCP integrations;
4. deployments and plugins; and
5. organisations.

Existing URL, method, plane, auth, response, and deletion tests remain unchanged and passing.

### Phase 4: dotted builders

Add failing table-driven and property-style cases for objects, arrays, escaping, immutability,
ordering, duplicate paths, shape conflicts, sparse arrays, invalid JSON numbers, and prototype
pollution. Implement the parser and immutable builder without CLI dependencies.

Primary test: `test/ai-gateway/nested-values.spec.ts`.

### Phase 5: secret metadata and debug safety

1. Add metadata completeness tests that enumerate every secret-bearing current operation.
2. Add redactor tests for exact, subtree, wildcard, array, absent, masked, and immutable values.
3. Add request/response debug tests with unique sentinel secrets.
4. Wire each secret-bearing client operation to its redaction context.
5. Remove documentation warnings that debug mode prints these secrets and replace them with the
   redaction guarantee and residual-risk statement.

Primary tests:

- `test/ai-gateway/secret-fields.spec.ts`
- `test/http/debug.spec.ts`

### Phase 6: live conformance

Unit tests are necessary but not sufficient for a request contract. The opt-in live pass will:

- run the existing read-only `npm run e2e:ai-gateway` suite;
- use uniquely prefixed, disposable resources in the explicitly selected test workspace;
- exercise create, invalid-local-rejection, update/bulk-update, read-back, and cleanup in `finally`;
- capture only reviewed, redacted fixtures;
- verify config update envelope semantics and regular integration workspace-binding semantics;
- verify a representative routing config round-trips through SCM;
- prove body secrets are absent with debug mode enabled; and
- leave organisation auth/self settings read-only unless the operator separately authorizes an
  exact reversible mutation.

The write suite must require both an execution flag and a mutation flag. Credentials remain loaded
on demand from environment variables or 1Password and are never written to fixtures or command
output.

## Documentation and CLI handoff

Before publishing 0.20:

- update the AI Gateway guide with structured schema and builder examples;
- regenerate TypeDoc and ensure every new export is discoverable;
- document partial/bulk/replacement behavior beside each method;
- update the architecture and error-handling pages for request validation;
- update release notes and README capability summaries; and
- run example coverage and the Docusaurus production build.

After `@cdot65/prisma-airs-sdk@0.20.0` is published and independently installable, the CLI can bump
and install that exact dependency. CLI commands should map named flags to the exported request
models, use SDK value catalogs for deterministic help, use `buildDottedObject` for repeatable
`--set` flags, and apply SDK secret metadata before diagnostic output. Raw JSON/YAML remains an
advanced escape hatch, not the primary interface.

## Required validation gates

The release candidate must pass:

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
npm run docs:api
npm run docs:check
npm run docs:build
npm run preflight
npm run e2e:ai-gateway
```

The opt-in write-conformance command added in phase 6 must also pass against the selected live
workspace before release. A missing local Palo Alto Networks schema checkout may block `preflight`,
but it cannot be silently skipped; the release record must state who ran it and against which spec
revision.

## Definition of done

- Every current AI Gateway body-taking method uses an exported request Zod schema.
- Every request type is inferred from its schema and reachable from the package root.
- Invalid input fails before OAuth and `fetch`, with no secret value in the error.
- Empty partial updates fail locally.
- Bulk, partial, and replacement semantics are correctly named and live-verified where mutation
  behavior matters.
- Routing/provider configuration has typed known fields plus intentional JSON extension points.
- Dotted builders are immutable, array-capable, deterministic, and prototype-pollution safe.
- Public secret metadata covers every known secret-bearing operation.
- SDK debug logs redact marked request and response values.
- Compatibility aliases preserve 0.19 source imports, with deprecation notes where naming changes.
- Unit, type, build, docs, preflight, read-only E2E, and opt-in write-conformance gates pass.
- SDK 0.20 is published before any CLI dependency bump or CLI release work begins.
