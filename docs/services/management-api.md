# Management API

CRUD operations for AIRS configuration via OAuth2 client credentials. Covers security profiles, custom topics, API keys, customer apps, DLP profiles, deployment profiles, scan logs, and OAuth token management.

## Authentication

The Management API uses OAuth2 `client_credentials` flow, separate from the scan API's API key auth. Three values are required:

| Env Var                    | Required | Description                                                                       |
| -------------------------- | -------- | --------------------------------------------------------------------------------- |
| `PANW_MGMT_CLIENT_ID`      | Yes      | OAuth2 client ID from SCM                                                         |
| `PANW_MGMT_CLIENT_SECRET`  | Yes      | OAuth2 client secret                                                              |
| `PANW_MGMT_TSG_ID`         | Yes      | Tenant Service Group ID                                                           |
| `PANW_MGMT_ENDPOINT`       | No       | API base URL (default: `https://api.sase.paloaltonetworks.com/aisec`)             |
| `PANW_MGMT_TOKEN_ENDPOINT` | No       | Token URL (default: `https://auth.apps.paloaltonetworks.com/oauth2/access_token`) |

### Setup

```bash
# Copy the example env file and fill in your credentials
cp .env.example .env
```

Or export directly:

```bash
export PANW_MGMT_CLIENT_ID=your-client-id
export PANW_MGMT_CLIENT_SECRET=your-client-secret
export PANW_MGMT_TSG_ID=1234567890
```

### Regional Endpoints

Override `PANW_MGMT_ENDPOINT` for non-US deployments:

```bash
# EU
export PANW_MGMT_ENDPOINT=https://api.eu.sase.paloaltonetworks.com/aisec

# UK
export PANW_MGMT_ENDPOINT=https://api.uk.sase.paloaltonetworks.com/aisec

# FedRAMP
export PANW_MGMT_ENDPOINT=https://api.gov.sase.paloaltonetworks.com/aisec
```

### Client Initialization

```ts
import { ManagementClient } from '@cdot65/prisma-airs-sdk';

// From env vars (recommended)
const client = new ManagementClient();

// Explicit
const client = new ManagementClient({
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret',
  tsgId: '1234567890',
});

// EU endpoint
const client = new ManagementClient({
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret',
  tsgId: '1234567890',
  apiEndpoint: 'https://api.eu.sase.paloaltonetworks.com/aisec',
});
```

Token fetch, caching, and refresh are handled automatically. If a request gets a 401 or 403, the client refreshes the token and retries once.

### Token Lifecycle

The SDK provides fine-grained control over OAuth token state via `OAuthClient`:

```ts
import { OAuthClient } from '@cdot65/prisma-airs-sdk';

const oauth = new OAuthClient({
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret',
  tsgId: '1234567890',
  tokenBufferMs: 60_000, // refresh 60s before expiry (default: 30s)
  onTokenRefresh: (info) => {
    console.log(`Token refreshed, expires in ${info.expiresInMs}ms`);
  },
});

// Check token state without triggering a refresh
const info = oauth.getTokenInfo();
// { hasToken, isValid, isExpired, isExpiringSoon, expiresInMs, expiresAt }

// Individual checks
oauth.isTokenExpired(); // true if past expiry time
oauth.isTokenExpiringSoon(); // true if within buffer window
oauth.isTokenExpiringSoon(120_000); // custom buffer override (2 min)
```

The `ManagementClient` handles this internally — you only need `OAuthClient` directly for advanced monitoring or custom auth workflows.

## Security Profiles

Full CRUD on AI security profile configurations.

### Create

```ts
const profile = await client.profiles.create({
  profile_name: 'my-profile',
  active: true,
  policy: {
    'ai-security-profiles': [
      {
        'model-type': 'default',
        'model-configuration': {
          'app-protection': {
            'default-url-category': { member: null },
            'url-detected-action': '',
          },
          'data-protection': {
            'data-leak-detection': { action: '', member: null },
            'database-security': null,
          },
          latency: {
            'inline-timeout-action': 'block',
            'max-inline-latency': 5,
          },
          'mask-data-in-storage': false,
          'model-protection': [],
          'agent-protection': [],
        },
      },
    ],
    'dlp-data-profiles': [],
  },
});

console.log(profile.profile_id);
```

### List

```ts
// All profiles for the TSG
const { ai_profiles } = await client.profiles.list();

// Paginated
const page = await client.profiles.list({ offset: 0, limit: 10 });
console.log(page.next_offset); // undefined if no more pages
```

### Update

```ts
const updated = await client.profiles.update(profile.profile_id, {
  profile_name: 'my-profile-v2',
  active: true,
  policy: {
    'ai-security-profiles': [
      {
        'model-type': 'default',
        'model-configuration': {
          'app-protection': {
            'default-url-category': { member: null },
            'url-detected-action': '',
          },
          'data-protection': {
            'data-leak-detection': { action: '', member: null },
            'database-security': null,
          },
          latency: {
            'inline-timeout-action': 'allow',
            'max-inline-latency': 10,
          },
          'mask-data-in-storage': false,
          'model-protection': [],
          'agent-protection': [],
        },
      },
    ],
    'dlp-data-profiles': [],
  },
});
```

### Delete

```ts
const result = await client.profiles.delete(profile.profile_id);
```

If the profile is in use by a policy, the API returns a 409 conflict with the referencing policies.

### Force Delete

```ts
// Force delete removes the profile even if referenced by a policy
// updatedBy is required for profiles
const result = await client.profiles.forceDelete(profile.profile_id, 'user@example.com');
```

## Custom Topics

CRUD for custom detection topics used in security profiles.

### Create

```ts
const topic = await client.topics.create({
  topic_name: 'credit-card-numbers',
  active: true,
  description: 'Detects credit card numbers',
  examples: ['4111-1111-1111-1111', '5500 0000 0000 0004', 'My card number is 4242424242424242'],
});
```

### List

```ts
const { custom_topics } = await client.topics.list();
const page = await client.topics.list({ offset: 0, limit: 10 });
```

### Update

```ts
const updated = await client.topics.update(topic.topic_id, {
  topic_name: 'credit-card-numbers',
  description: 'Updated description',
  examples: ['4111-1111-1111-1111', 'CVV: 123'],
});
```

### Delete

```ts
// Standard delete (fails with 409 if referenced by a profile)
const result = await client.topics.delete(topic.topic_id);

// Force delete (removes even if referenced)
// updatedBy is optional for topics
const result = await client.topics.forceDelete(topic.topic_id);
// or with updatedBy
const resultWithUser = await client.topics.forceDelete(topic.topic_id, 'user@example.com');
```

## API Keys

Manage AIRS API keys for your TSG.

### Create

```ts
const apiKey = await client.apiKeys.create({
  auth_code: 'my-auth-code',
  cust_app: 'my-app',
  revoked: false,
  created_by: 'user@example.com',
  api_key_name: 'production-key',
  rotation_time_interval: 90,
  rotation_time_unit: 'days',
});

console.log(apiKey.api_key_id);
```

### List

```ts
const { api_keys } = await client.apiKeys.list();

// Paginated
const page = await client.apiKeys.list({ offset: 0, limit: 10 });
```

### Delete

```ts
const result = await client.apiKeys.delete('my-key-name', 'user@example.com');
```

### Regenerate

```ts
const newKey = await client.apiKeys.regenerate('api-key-uuid', {
  rotation_time_interval: 30,
  rotation_time_unit: 'days',
});
```

## Customer Apps

Manage customer applications for your TSG.

### Get

```ts
const app = await client.customerApps.get('my-app');
```

### List

```ts
const { customer_apps } = await client.customerApps.list();

// Paginated
const page = await client.customerApps.list({ offset: 0, limit: 10 });
```

### Update

```ts
const updated = await client.customerApps.update('customer-app-uuid', {
  app_name: 'updated-app',
  cloud_provider: 'aws',
  environment: 'production',
});
```

### Delete

```ts
const result = await client.customerApps.delete('my-app', 'user@example.com');
```

## DLP Profiles

List DLP data profiles configured for the TSG.

```ts
const { dlp_profiles } = await client.dlpProfiles.list();
```

## Deployment Profiles

List deployment profiles for the TSG.

```ts
// All deployment profiles
const { deployment_profiles } = await client.deploymentProfiles.list();

// Include unactivated profiles
const all = await client.deploymentProfiles.list({ unactivated: true });
```

## Scan Logs

Query scan activity logs by time range.

```ts
const results = await client.scanLogs.query({
  time_interval: 24,
  time_unit: 'hour',
  pageNumber: 1,
  pageSize: 50,
  filter: 'all', // 'all', 'benign', or 'threat'
});

console.log(results.total_pages);
console.log(results.scan_results);

// Continue pagination with page_token
const nextPage = await client.scanLogs.query({
  time_interval: 24,
  time_unit: 'hour',
  pageNumber: 2,
  pageSize: 50,
  filter: 'all',
  page_token: results.page_token,
});
```

## OAuth Token Management

Manage OAuth tokens for client credential flows.

### Get Access Token

```ts
const token = await client.oauth.getAccessToken({
  body: { client_id: 'cid', customer_app: 'my-app' },
  tokenTtlInterval: 24,
  tokenTtlUnit: 'hours',
});

console.log(token.access_token);
```

### Invalidate Token

```ts
await client.oauth.invalidateToken('token-value', {
  client_id: 'cid',
  customer_app: 'my-app',
});
```

## Error Handling

```ts
import { AISecSDKException, ErrorType } from '@cdot65/prisma-airs-sdk';

try {
  await client.profiles.list();
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
    }
  }
}
```

## Running the Examples

```bash
# Copy env file and fill in credentials
cp .env.example .env

# Run examples
npm run example:mgmt-auth
npm run example:mgmt-profiles
npm run example:mgmt-topics
```
