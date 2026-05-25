# API Key Rotation

End-to-end example of managing AIRS API key lifecycle: listing keys, creating new ones with rotation policies, regenerating expiring keys, and cleaning up old keys.

## Prerequisites

Set up OAuth2 credentials for the Management API:

```bash
export PANW_MGMT_CLIENT_ID=your-client-id
export PANW_MGMT_CLIENT_SECRET=your-client-secret
export PANW_MGMT_TSG_ID=1234567890
```

## Client Setup

```ts
import { ManagementClient } from '@cdot65/prisma-airs-sdk';

const client = new ManagementClient();
```

All API key operations are available under `client.apiKeys`.

---

## List Existing Keys

Retrieve all API keys for your TSG. Use pagination for large key sets.

```ts
// List all keys
const { api_keys } = await client.apiKeys.list();

for (const key of api_keys ?? []) {
  console.log(`${key.api_key_name} (${key.api_key_id})`);
  console.log(`  Last 8: ...${key.api_key_last8}`);
  console.log(`  Expires: ${key.expiration}`);
  console.log(`  Revoked: ${key.revoked}`);
  console.log(`  Rotation: every ${key.rotation_time_interval} ${key.rotation_time_unit}`);
}

// Paginated
const page = await client.apiKeys.list({ offset: 0, limit: 10 });
console.log(`Next offset: ${page.next_offset}`);
```

---

## Create a Key with Rotation Policy

New keys require an `auth_code` (from SCM), a `cust_app` name, and a rotation schedule. The rotation policy tells the platform when the key should be considered stale.

```ts
const newKey = await client.apiKeys.create({
  auth_code: 'my-auth-code',
  cust_app: 'production-llm-gateway',
  cust_env: 'production',
  cust_cloud_provider: 'aws',
  revoked: false,
  created_by: 'admin@example.com',
  api_key_name: 'prod-gateway-key',
  rotation_time_interval: 90,
  rotation_time_unit: 'days',
});

console.log(`Created: ${newKey.api_key_name}`);
console.log(`Key ID: ${newKey.api_key_id}`);
console.log(`API Key: ${newKey.api_key}`); // only returned on create
console.log(`Expires: ${newKey.expiration}`);
```

!!! warning "Save the API key value"
The full `api_key` value is only returned on creation and regeneration. Store it securely (e.g. a secrets manager) immediately — it cannot be retrieved later.

---

## Identify Keys Needing Rotation

Scan your keys to find any approaching expiration or already expired.

```ts
function findKeysNeedingRotation(keys: typeof api_keys, daysThreshold = 14) {
  const now = Date.now();
  const thresholdMs = daysThreshold * 24 * 60 * 60 * 1000;

  return (keys ?? []).filter((key) => {
    if (key.revoked) return false;
    const expiresAt = new Date(key.expiration).getTime();
    return expiresAt - now < thresholdMs;
  });
}

const { api_keys: allKeys } = await client.apiKeys.list();
const expiring = findKeysNeedingRotation(allKeys);

if (expiring.length > 0) {
  console.log(`${expiring.length} key(s) expiring within 14 days:`);
  for (const key of expiring) {
    console.log(`  ${key.api_key_name} — expires ${key.expiration}`);
  }
} else {
  console.log('All keys are healthy.');
}
```

---

## Regenerate an Expiring Key

Regeneration issues a new key value for the same key ID. Pass the desired rotation schedule for the new key.

```ts
for (const key of expiring) {
  const regenerated = await client.apiKeys.regenerate(key.api_key_id, {
    rotation_time_interval: 90,
    rotation_time_unit: 'days',
    updated_by: 'admin@example.com',
  });

  console.log(`Regenerated: ${regenerated.api_key_name}`);
  console.log(`New key: ${regenerated.api_key}`);
  console.log(`New expiration: ${regenerated.expiration}`);

  // TODO: update your secrets manager with regenerated.api_key
}
```

!!! tip "Zero-downtime rotation"
To avoid downtime, update your application's secrets store with the new key value **before** the old key expires. The old key remains valid until its original expiration time.

---

## Delete an Old Key

Remove a key by name. The `updated_by` field records who performed the deletion.

```ts
const result = await client.apiKeys.delete('old-key-name', 'admin@example.com');
console.log(result.message);
```

---

## Full Rotation Script

Putting it all together — a script that audits, rotates, and reports.

```ts
import { ManagementClient, AISecSDKException, ErrorType } from '@cdot65/prisma-airs-sdk';

async function rotateKeys() {
  const client = new ManagementClient();
  const ROTATION_DAYS = 90;
  const WARNING_DAYS = 14;
  const ADMIN_EMAIL = 'admin@example.com';

  // 1. List all keys
  const { api_keys } = await client.apiKeys.list();
  const activeKeys = (api_keys ?? []).filter((k) => !k.revoked);
  console.log(`Found ${activeKeys.length} active key(s)`);

  // 2. Find expiring keys
  const now = Date.now();
  const thresholdMs = WARNING_DAYS * 24 * 60 * 60 * 1000;
  const expiring = activeKeys.filter((k) => {
    const expiresAt = new Date(k.expiration).getTime();
    return expiresAt - now < thresholdMs;
  });

  if (expiring.length === 0) {
    console.log('No keys need rotation.');
    return;
  }

  console.log(`Rotating ${expiring.length} key(s)...`);

  // 3. Regenerate each expiring key
  for (const key of expiring) {
    try {
      const regenerated = await client.apiKeys.regenerate(key.api_key_id, {
        rotation_time_interval: ROTATION_DAYS,
        rotation_time_unit: 'days',
        updated_by: ADMIN_EMAIL,
      });

      console.log(`[OK] ${regenerated.api_key_name}`);
      console.log(`     New expiration: ${regenerated.expiration}`);
      console.log(`     New key: ${regenerated.api_key}`);

      // Store the new key in your secrets manager here
    } catch (err) {
      if (err instanceof AISecSDKException) {
        console.error(`[FAIL] ${key.api_key_name}: ${err.message}`);
      } else {
        throw err;
      }
    }
  }
}

rotateKeys().catch(console.error);
```

---

## Error Handling

API key operations throw `AISecSDKException` with specific error types:

```ts
import { AISecSDKException, ErrorType } from '@cdot65/prisma-airs-sdk';

try {
  await client.apiKeys.regenerate('invalid-uuid', {
    rotation_time_interval: 90,
    rotation_time_unit: 'days',
  });
} catch (err) {
  if (err instanceof AISecSDKException) {
    switch (err.errorType) {
      case ErrorType.USER_REQUEST_PAYLOAD_ERROR:
        console.error('Invalid input:', err.message);
        break;
      case ErrorType.OAUTH_ERROR:
        console.error('Auth failed — check credentials:', err.message);
        break;
      case ErrorType.CLIENT_SIDE_ERROR:
        console.error('Key not found or bad request:', err.message);
        break;
      case ErrorType.SERVER_SIDE_ERROR:
        console.error('Server error — retry later:', err.message);
        break;
    }
  }
}
```
