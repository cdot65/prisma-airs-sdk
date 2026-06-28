import { ManagementClient, AISecSDKException } from '@cdot65/prisma-airs-sdk';

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
  } catch (error) {
    if (error instanceof AISecSDKException) {
      console.error('Error:', error.message);
      console.error('Type:', error.errorType);
    }
  }
}

main().catch(console.error);
