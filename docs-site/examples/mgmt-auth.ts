import { reportExampleError } from './example-support.js';
import assert from 'node:assert/strict';
import { ManagementClient, OAuthClient, AISecSDKException } from '@cdot65/prisma-airs-sdk';

async function main() {
  // Option 1: Credentials via env vars (recommended)
  // export PANW_MGMT_CLIENT_ID=your-client-id
  // export PANW_MGMT_CLIENT_SECRET=your-client-secret
  // export PANW_MGMT_TSG_ID=1234567890
  const client = new ManagementClient();

  // Option 2: Explicit credentials
  // const client = new ManagementClient({
  //   clientId: 'your-client-id',
  //   clientSecret: 'your-client-secret',
  //   tsgId: '1234567890',
  // });

  // Option 3: EU / FedRAMP endpoint override
  // const client = new ManagementClient({
  //   clientId: 'your-client-id',
  //   clientSecret: 'your-client-secret',
  //   tsgId: '1234567890',
  //   apiEndpoint: 'https://api.eu.sase.paloaltonetworks.com/aisec',
  // });

  try {
    // Auth happens automatically on first API call
    const profiles = await client.profiles.list();
    console.log('Authenticated successfully');
    console.log('Profiles found:', profiles.ai_profiles.length);
    const { PANW_MGMT_CLIENT_ID, PANW_MGMT_CLIENT_SECRET, PANW_MGMT_TSG_ID } = process.env;
    if (!PANW_MGMT_CLIENT_ID || !PANW_MGMT_CLIENT_SECRET || !PANW_MGMT_TSG_ID)
      throw new Error('Set PANW_MGMT_CLIENT_ID, PANW_MGMT_CLIENT_SECRET and PANW_MGMT_TSG_ID');
    let refreshes = 0;
    const oauth = new OAuthClient({
      clientId: PANW_MGMT_CLIENT_ID,
      clientSecret: PANW_MGMT_CLIENT_SECRET,
      tsgId: PANW_MGMT_TSG_ID,
      onTokenRefresh: () => {
        refreshes++;
      },
    });
    const [first, second] = await Promise.all([oauth.getToken(), oauth.getToken()]);
    assert.equal(first, second);
    assert.equal(refreshes, 1);
    oauth.clearToken();
    await oauth.getToken();
    assert.equal(refreshes, 2);
    assert(oauth.getTokenInfo().isValid);
    // Tokens are never logged. Clearing only affects this local cache, not other clients.
    console.log(
      'Standalone OAuth lifecycle:',
      JSON.stringify({
        concurrentRefreshDeduplicated: true,
        explicitRefreshSucceeded: true,
        refreshCallbacks: refreshes,
        tokenValid: oauth.getTokenInfo().isValid,
      }),
    );
  } catch (error) {
    process.exitCode = 1;
    if (error instanceof AISecSDKException) {
      console.error('Error:', error.message);
      console.error('Type:', error.errorType);
    }
  }
}

main().catch(reportExampleError);
