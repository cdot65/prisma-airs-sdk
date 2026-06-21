# Model Security API

Scan ML models for supply-chain threats — malicious code, backdoors, unsafe serialization formats, and license/policy violations — before you load them into production.

## How it works

Model Security inspects a model artifact (its weights, config, and bundled files) and runs each file through a set of **security rules**. Think of it like an antivirus scan for ML models: it unpacks the model, looks for known dangerous patterns (e.g. arbitrary-code-execution in pickle files, suspicious imports, disallowed file formats), and returns a verdict.

Three concepts do the work:

- **Security rules** — the individual checks (e.g. "Pickle Scan", "unapproved format"). These are read-only and provided by the platform. Browse them with `client.securityRules`.
- **Security groups** — a named bundle of rule _instances_, each set to a posture: `BLOCKING`, `ALLOWING`, or `DISABLED`. A group is the policy you point a scan at. You pick which rules apply and how strict each one is.
- **Scans** — a single evaluation of one model against one security group. A scan produces an overall **eval outcome** (`ALLOWED` / `BLOCKED` / `PENDING`), plus per-rule **evaluations**, the **files** that were inspected, and any **violations** found.

The flow: define a security group once → run scans against it → read the outcome and drill into violations. Scans run asynchronously, so a fresh scan starts as `PENDING` and you poll `get()` until it settles.

**When to use it:** vetting third-party models (Hugging Face, S3, registries) before deployment, gating models in CI, or auditing what's already in use. Two planes are involved — a **data plane** for scans (`client.scans`) and a **management plane** for groups and rules (`client.securityGroups`, `client.securityRules`) — but a single OAuth2 token covers both, handled for you.

## Authentication

The Model Security API uses OAuth2 `client_credentials` flow. Credentials fall back to `PANW_MGMT_*` env vars if `PANW_MODEL_SEC_*` vars are not set.

| Env Var                         | Required | Fallback                   | Description                                                                       |
| ------------------------------- | -------- | -------------------------- | --------------------------------------------------------------------------------- |
| `PANW_MODEL_SEC_CLIENT_ID`      | Yes      | `PANW_MGMT_CLIENT_ID`      | OAuth2 client ID from SCM                                                         |
| `PANW_MODEL_SEC_CLIENT_SECRET`  | Yes      | `PANW_MGMT_CLIENT_SECRET`  | OAuth2 client secret                                                              |
| `PANW_MODEL_SEC_TSG_ID`         | Yes      | `PANW_MGMT_TSG_ID`         | Tenant Service Group ID                                                           |
| `PANW_MODEL_SEC_DATA_ENDPOINT`  | No       | --                         | Data plane URL (default: `https://api.sase.paloaltonetworks.com/aims/data`)       |
| `PANW_MODEL_SEC_MGMT_ENDPOINT`  | No       | --                         | Mgmt plane URL (default: `https://api.sase.paloaltonetworks.com/aims/mgmt`)       |
| `PANW_MODEL_SEC_TOKEN_ENDPOINT` | No       | `PANW_MGMT_TOKEN_ENDPOINT` | Token URL (default: `https://auth.apps.paloaltonetworks.com/oauth2/access_token`) |

### Setup

```bash
export PANW_MODEL_SEC_CLIENT_ID=your-client-id
export PANW_MODEL_SEC_CLIENT_SECRET=your-client-secret
export PANW_MODEL_SEC_TSG_ID=1234567890
```

Or reuse existing management credentials:

```bash
export PANW_MGMT_CLIENT_ID=your-client-id
export PANW_MGMT_CLIENT_SECRET=your-client-secret
export PANW_MGMT_TSG_ID=1234567890
```

### Client Initialization

```ts
import { ModelSecurityClient } from '@cdot65/prisma-airs-sdk';

// From env vars (recommended)
const client = new ModelSecurityClient();

// Explicit
const client = new ModelSecurityClient({
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret',
  tsgId: '1234567890',
});

// Custom endpoints
const client = new ModelSecurityClient({
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret',
  tsgId: '1234567890',
  dataEndpoint: 'https://api.eu.sase.paloaltonetworks.com/aims/data',
  mgmtEndpoint: 'https://api.eu.sase.paloaltonetworks.com/aims/mgmt',
});
```

Token fetch, caching, and refresh are handled automatically. A single OAuth2 token is shared across both the data plane and management plane.

### Architecture

The client exposes three sub-clients:

- `client.scans` -- data plane scan operations (create, list, get, evaluations, files, labels, violations)
- `client.securityGroups` -- management plane CRUD for security groups and their rule instances
- `client.securityRules` -- management plane read-only access to security rules

## Walkthrough: scan a model and read the result

This is the most common task — scan a model against a security group, wait for it to finish, then inspect what (if anything) it found.

```ts
// 1. Kick off a scan. A scan always targets one security group.
const scan = await client.scans.create({
  model_uri: 'hf://my-org/my-model',
  security_group_uuid: '550e8400-e29b-41d4-a716-446655440000',
  scan_origin: 'MODEL_SECURITY_SDK',
});

// 2. Scans run async — poll until the outcome is no longer PENDING.
let result = await client.scans.get(scan.uuid);
while (result.eval_outcome === 'PENDING') {
  await new Promise((r) => setTimeout(r, 5000));
  result = await client.scans.get(scan.uuid);
}
console.log(result.eval_outcome); // 'ALLOWED' or 'BLOCKED'

// 3. If it was blocked, drill into the violations to see why.
if (result.eval_outcome === 'BLOCKED') {
  const { violations } = await client.scans.getViolations(scan.uuid, { limit: 20 });
  for (const v of violations) {
    console.log(`${v.rule_name}: ${v.description}`);
  }
}
```

`model_uri` accepts source-prefixed URIs (e.g. `hf://org/model` for Hugging Face). `scan_origin` is a free-form label identifying who launched the scan.

## Scans

More data plane operations for creating and querying model security scans.

### List Scans

```ts
// All scans
const result = await client.scans.list();

// With filters and pagination
const page = await client.scans.list({
  skip: 0,
  limit: 10,
  sort_by: 'created_at',
  sort_order: 'desc',
  eval_outcomes: ['BLOCKED'],
  source_types: ['HUGGING_FACE'],
});
```

### Get a Scan

```ts
const scan = await client.scans.get('scan-uuid');
```

### Get Evaluations

```ts
const evaluations = await client.scans.getEvaluations('scan-uuid', {
  skip: 0,
  limit: 20,
});

// With sorting
const sorted = await client.scans.getEvaluations('scan-uuid', {
  sort_field: 'created_at',
  sort_order: 'desc',
});

// Get a single evaluation by UUID
const evaluation = await client.scans.getEvaluation('evaluation-uuid');
```

### Get Files

```ts
const files = await client.scans.getFiles('scan-uuid', {
  type: 'model',
  result: 'malicious',
  limit: 50,
});
```

### Get Violations

```ts
const violations = await client.scans.getViolations('scan-uuid', {
  limit: 20,
});

// Get a single violation by UUID
const violation = await client.scans.getViolation('violation-uuid');
```

### Labels

Labels are arbitrary `key`/`value` tags you attach to scans for filtering and organization (team, environment, model family, etc.).

```ts
// Add labels (merge with existing)
await client.scans.addLabels('scan-uuid', {
  labels: [
    { key: 'team', value: 'ml-platform' },
    { key: 'env', value: 'production' },
  ],
});

// Set labels (replace all existing)
await client.scans.setLabels('scan-uuid', {
  labels: [{ key: 'team', value: 'ml-platform' }],
});

// Delete labels by key
await client.scans.deleteLabels('scan-uuid', ['team', 'env']);

// Get all distinct label keys across scans
const keys = await client.scans.getLabelKeys();

// Get distinct values for a label key
const values = await client.scans.getLabelValues('team');
```

## Walkthrough: define a security group (your scan policy)

A security group is the policy a scan runs against. Create one per source type and tune its rules to your risk tolerance, then reuse it across all scans for that source.

```ts
// 1. Create a group for a given source type.
const group = await client.securityGroups.create({
  name: 'hf-strict',
  source_type: 'HUGGING_FACE',
  description: 'Block unsafe Hugging Face models',
});

// 2. See which rules are active and how strict each is.
const { rule_instances } = await client.securityGroups.listRuleInstances(group.uuid);
for (const ri of rule_instances) {
  console.log(`${ri.rule.name}: ${ri.state}`); // BLOCKING | ALLOWING | DISABLED
}

// 3. Tighten a rule from warn-only to blocking.
await client.securityGroups.updateRuleInstance(group.uuid, 'rule-instance-uuid', {
  security_group_uuid: group.uuid,
  state: 'BLOCKING',
});
```

A rule in `BLOCKING` state fails the scan (`eval_outcome: 'BLOCKED'`) when violated; `ALLOWING` records the violation but lets the scan pass; `DISABLED` skips the check entirely.

## Security Groups

More management plane CRUD for security groups and their rule instances.

### Create

```ts
const group = await client.securityGroups.create({
  name: 'production-models',
  source_type: 'HUGGING_FACE',
  description: 'Security group for production ML models',
});

console.log(group.uuid);
```

### List

```ts
// Basic pagination
const result = await client.securityGroups.list({
  skip: 0,
  limit: 10,
  sort_field: 'created_at',
  sort_dir: 'desc',
});

// Filter by source types and search
const filtered = await client.securityGroups.list({
  source_types: ['HUGGING_FACE', 'S3'],
  search_query: 'production',
});

// Filter by groups with specific rules enabled
const withRules = await client.securityGroups.list({
  enabled_rules: ['rule-uuid-1', 'rule-uuid-2'],
});
```

### Get

```ts
const group = await client.securityGroups.get('group-uuid');
```

### Update

```ts
const updated = await client.securityGroups.update('group-uuid', {
  name: 'production-models-v2',
  description: 'Updated description',
});
```

### Delete

```ts
await client.securityGroups.delete('group-uuid');
```

### Rule Instances

Each security group has rule instances that configure how security rules are applied.

```ts
// List rule instances for a group
const instances = await client.securityGroups.listRuleInstances('group-uuid', {
  limit: 20,
});

// Filter by security rule UUID
const filtered = await client.securityGroups.listRuleInstances('group-uuid', {
  security_rule_uuid: 'rule-uuid',
});

// Filter by state
const blocking = await client.securityGroups.listRuleInstances('group-uuid', {
  state: 'BLOCKING',
});

// Get a single rule instance
const instance = await client.securityGroups.getRuleInstance('group-uuid', 'rule-instance-uuid');

// Update a rule instance
const updated = await client.securityGroups.updateRuleInstance('group-uuid', 'rule-instance-uuid', {
  security_group_uuid: 'group-uuid',
  state: 'ALLOWING',
});
```

## Security Rules

Read-only access to available security rules on the management plane.

### List

```ts
const rules = await client.securityRules.list({
  skip: 0,
  limit: 20,
});

// Filter by source type
const hfRules = await client.securityRules.list({
  source_type: 'HUGGING_FACE',
});

// Search by name or UUID
const found = await client.securityRules.list({
  search_query: 'pickle',
});
```

### Get

```ts
const rule = await client.securityRules.get('rule-uuid');
```

## PyPI Authentication

Get credentials for accessing model scanning tools from Google Artifact Registry.

```ts
const auth = await client.getPyPIAuth();
console.log(auth.url);
console.log(auth.expires_at);
```

## Get the most out of it

:::tip[Define groups once, scan many times]
Treat security groups as reusable policy. Create one per source type (Hugging Face, S3, etc.), tune its rule states, and point every scan at it. Editing a single group is far easier than re-specifying rules per scan, and it gives you one place to audit your posture.
:::
- **Start in `ALLOWING`, then escalate.** When rolling out a new rule, set it to `ALLOWING` first so scans still pass while you observe what it flags. Flip it to `BLOCKING` once you trust the signal. This avoids surprise CI failures.
- **Always inspect violations, not just the outcome.** A `BLOCKED` outcome tells you _that_ something failed; `getViolations()` and `getEvaluations()` tell you _what_ and _why_. `getEvaluations()` groups results by rule; `getViolations()` lists individual findings with descriptions.
- **Scans are asynchronous.** A fresh scan returns `PENDING`. Poll `get()` (with a sensible delay) until the outcome settles — don't assume the create response is the final verdict.
- **Use labels for fleet-wide queries.** Tag scans with team/env/model-family labels, then filter with `list({ labels_query: ... })` and discover existing tags via `getLabelKeys()` / `getLabelValues()`. Labels are `{ key, value }` pairs (an array), not a plain object.
- **Filter lists server-side.** `list()` supports `eval_outcomes`, `source_types`, `security_group_uuid`, and time ranges (`start_time` / `end_time`). Filtering on the server is cheaper than paging everything and filtering in your code.
- **Rules are read-only.** You can't author rules — you choose which platform rules apply and how strict each is, via a group's rule instances. `client.securityRules` is for discovery (e.g. searching for `pickle`).
- **PyPI credentials expire.** `getPyPIAuth()` returns a short-lived token URL (`expires_at`); fetch fresh credentials rather than caching them long-term.

For the complete, per-method list with input/output shapes (`ModelSecurityClient` and its sub-clients), see the [Full API reference](../reference/api/index.md).

## Error Handling

```ts
import { AISecSDKException, ErrorType } from '@cdot65/prisma-airs-sdk';

try {
  await client.scans.list();
} catch (err) {
  if (err instanceof AISecSDKException) {
    switch (err.errorType) {
      case ErrorType.OAUTH_ERROR:
        console.error('Auth failed:', err.message);
        break;
      case ErrorType.CLIENT_SIDE_ERROR:
        console.error('Bad request:', err.message);
        break;
      case ErrorType.SERVER_SIDE_ERROR:
        console.error('Server error:', err.message);
        break;
      case ErrorType.MISSING_VARIABLE:
        console.error('Missing config:', err.message);
        break;
      case ErrorType.USER_REQUEST_PAYLOAD_ERROR:
        console.error('Invalid input:', err.message);
        break;
    }
  }
}
```

All UUID parameters are validated before making API calls. Invalid UUIDs throw `AISecSDKException` with `ErrorType.USER_REQUEST_PAYLOAD_ERROR`.
