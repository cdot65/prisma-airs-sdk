---
title: Official Gateway specification alignment
---

# Official Gateway specification alignment

The official specification is maintained at
[PaloAltoNetworks/openapi](https://github.com/PaloAltoNetworks/openapi).
The September 27, 2026 audit uses commit
`2931d49bc38e30793d5923d22125f5f953d141d0`, with `openapi.yaml` SHA-256
`567f53fd7399c4cf87d4fc5e32a8dd5a25765113f698d82de6e538adf4213978`.
The legacy [Gateway compatibility ledger](./gateway-coverage.md) describes a
separate Portkey source and must not be relabeled as coverage of this document.

## Reproduce the audit

Point the existing audit at separate, read-only source checkouts:

```bash
AIRS_OPENAPI_DIR=/path/to/pan.dev/openapi-specs \
GATEWAY_OPENAPI_FILE=/path/to/openapi/openapi.yaml \
npm run openapi:audit
```

Results are written to `artifacts/openapi/audit.json`. This is an offline source
comparison: it does not use credentials, make API requests or mutate source YAML.
`openapi:acceptance` adds the existing 99% per-source operation threshold; the
current official Gateway inventory does **not** meet that threshold.

## Matching semantics

For documents titled `Prisma AIRS AI Gateway API`, matching uses the effective
operation, path or root server, in that precedence order. The server base path is
appended to the operation path. Thus `/admin/v2/guardrails` on `/ai_gw` means the
admin endpoint, not a second spelling of control-plane `/guardrails`.

SDK management routing is derived from constructor bindings in the composition
root. Runtime inference and the public pricing client are separate transports.
Unknown hosts or dynamic routing receive no match. Enum-constrained path values
such as `user` and `service` must each have a concrete implementation; the source
operation is counted once. All declared server alternatives must match. These
are conservative static route matches, not proof of deployed support or full
parameter, schema, authentication or authorization conformance.

The official source deliberately omits prompt runtime operations. Its audit
therefore excludes the legacy prompt-only compatibility corrections while
retaining the shared completion correction. Unexpected reintroduction of prompt
routes or malformed present schemas fails for review. The legacy audit still
requires its prompt routes. Working SDK deployment extensions are not deleted
because the official source omits them.

## Initial result against SDK 0.33.0

- 187 source operations; 124 match SDK routes and API planes; 63 remain unmatched.
- Among matched operations, 1,148/1,149 request-property occurrences and
  1,964/1,968 response-property occurrences are modeled. These percentages do not
  describe the 63 unmatched operations and are not overall implementation coverage.
- API-key creation expands to the existing service/user routes. Remaining key
  operations use different documented and deployed-adapter paths. The unified
  creation schema also exposes `user_id` for the service variant and `key`/`object`
  fields absent from the SDK's shared typed write envelope. These require semantic
  review, not automatic widening of every write response.
- Eight admin guardrail operations are gaps. Existing control-plane guardrail
  operations cannot satisfy them.
- The official source places model-detail/deletion, feedback and pricing on the
  control plane; existing matching SDK methods use runtime/public transports.
  Their old path-only matches do not count here.
- Assistants/Threads and analytics retain their explicit gaps. Their presence in
  this document does not establish live provider availability.

Next work is to reconcile disputed routes against the deployed gateway, add the
appropriate SDK surface with exact-wire tests, and then update CLI commands and
harness skills. This audit change does not alter runtime requests, credentials,
SDK/CLI package versions or the harness bundle. It must not be presented as a
completed SDK/CLI capability release.

## Explicit admin guardrails

`AIGatewayClient.adminGuardrails` uses the configured admin endpoint and management
OAuth. Existing `guardrails` remains workspace-scoped on the control endpoint.
The new client provides `list`, `get`, `create`, `update`, `delete`,
`getMcpServers`, `syncMcpServers` and `upsertMcpServer`. No operation falls back to
another plane or retries against a different resource path after denial.

```ts
import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
const gateway = new AIGatewayClient();
const page = await gateway.adminGuardrails.list({ pageSize: 100, currentPage: 0 });
console.log(page.total);
```

Page size accepts 1–1000; pages start at zero. An optional `workspaceId` filter is
sent only when specified. Organisation records may omit `workspace_id` or carry
`null`. Create input uses an optional organisation **UUID**, not the numeric SCM
TSG identifier. MCP mappings validate input/output phases and capability UUIDs.
Mutations and nonempty admin record contracts are tested against fixtures from
the specification; they have not been exercised against live resources.

API-key creation now types optional one-time `key` and `object` fields separately
from generic update receipts. Older SCM receipts remain accepted. Service keys
still do not require `user_id`; user keys do. Secret-body suppression is retained.

## Read-only deployment evidence, September 27

The selected tenant returned 200 for workspace listing, workspace guardrails,
service-key listing, user-key listing, and admin guardrails without a workspace
filter (an empty list). Combined `/v2/api-keys` returned 403. Admin guardrails with
the tested workspace filter also returned 403. This is tenant-specific evidence,
not a universal claim that the documented paths cannot exist. No resources,
credentials, key rotations or paid inference were changed or submitted.

## Remaining deliberate boundaries

| Official operations | Treatment |
| --- | --- |
| Eight admin guardrail operations | Explicit admin client; route/schema fixtures, bounded live list check |
| Five combined API-key operations | Existing user/service adapters retained; combined list denied live |
| 23 Assistants/Threads operations | Remain unsupported; no legacy assistant lifecycle introduced into Harness |
| 22 analytics operations | Existing SCM telemetry adapters retained; not counted as exact source routes |
| Model detail/delete, feedback and pricing (five) | Runtime/public methods stay on their existing transports; no unverified SCM rerouting |

The resulting inventory has 132/187 route-and-plane matches. The 55 unmatched
operations remain visible and the 99% full-operation acceptance gate remains
unsatisfied. This selective alignment is not full specification implementation.
Gateway runtime authentication, company SSO/CAS, native MCP OAuth and Harness
credential bindings are separate from SDK management OAuth and are not changed
by this specification update.
