# Model Security API

Scan ML models for security vulnerabilities, manage security groups, and query security rules via OAuth2 client credentials.

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

## Scans

Data plane operations for creating and querying model security scans.

### Create a Scan

```ts
const scan = await client.scans.create({
  name: 'my-model-scan',
  source_type: 'huggingface',
  source_uri: 'https://huggingface.co/my-org/my-model',
});

console.log(scan.uuid);
```

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

```ts
// Add labels (merge with existing)
await client.scans.addLabels('scan-uuid', {
  labels: { team: 'ml-platform', env: 'production' },
});

// Set labels (replace all existing)
await client.scans.setLabels('scan-uuid', {
  labels: { team: 'ml-platform' },
});

// Delete labels by key
await client.scans.deleteLabels('scan-uuid', ['team', 'env']);

// Get all distinct label keys across scans
const keys = await client.scans.getLabelKeys();

// Get distinct values for a label key
const values = await client.scans.getLabelValues('team');
```

## Security Groups

Management plane CRUD for security groups and their rule instances.

### Create

```ts
const group = await client.securityGroups.create({
  name: 'production-models',
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
console.log(auth.expiration);
```

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
