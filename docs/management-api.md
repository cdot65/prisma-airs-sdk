# Management API

CRUD operations for AIRS Security Profiles and Custom Topics via OAuth2 client credentials.

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

Token fetch, caching, and refresh are handled automatically. If a request gets a 401, the client refreshes the token and retries once.

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
const result = await client.topics.forceDelete(topic.topic_id);
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
pnpm example:mgmt-auth
pnpm example:mgmt-profiles
pnpm example:mgmt-topics
```
