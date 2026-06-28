import { RedTeamClient, AISecSDKException } from '@cdot65/prisma-airs-sdk';

async function main() {
  // Uses PANW_MGMT_* env vars as fallback for auth
  const client = new RedTeamClient();

  try {
    // --- LIST TARGETS ---
    console.log('Listing targets...');
    const targets = await client.targets.list({ limit: 10 });
    console.log(`Found ${targets.pagination?.total_items ?? 0} targets:`);
    for (const t of targets.data ?? []) {
      console.log(
        `  - ${t.uuid}: ${t.name} [${t.status}] (${t.target_type}, ${t.connection_type})`,
      );
    }

    // --- GET TARGET DETAILS ---
    const first = targets.data?.[0];
    if (first) {
      console.log(`\nGetting target details for ${first.uuid}...`);
      const detail = await client.targets.get(first.uuid);
      console.log('  Name:', detail.name);
      console.log('  Type:', detail.target_type);
      console.log('  Connection:', detail.connection_type);
      console.log('  Endpoint:', detail.api_endpoint_type);
      console.log('  Response mode:', detail.response_mode);
      console.log('  Status:', detail.status);
      console.log('  Active:', detail.active);
      console.log('  Validated:', detail.validated);
      console.log('  Created:', detail.created_at);

      // --- GET TARGET PROFILE ---
      console.log(`\nGetting target profile for ${first.uuid}...`);
      try {
        const profile = await client.targets.getProfile(first.uuid);
        console.log('  Profile:', JSON.stringify(profile, null, 2));
      } catch (e) {
        if (e instanceof AISecSDKException) {
          console.log('  Profile not available:', e.message);
        }
      }
    }

    // --- LIST CUSTOM PROMPT SETS ---
    console.log('\nListing custom prompt sets...');
    const promptSets = await client.customAttacks.listPromptSets();
    console.log(`Found ${promptSets.pagination?.total_items ?? 0} prompt sets:`);
    for (const ps of promptSets.data ?? []) {
      console.log(`  - ${ps.uuid}: ${ps.name}`);
    }
  } catch (error) {
    if (error instanceof AISecSDKException) {
      console.error('Error:', error.message);
      console.error('Type:', error.errorType);
    } else {
      throw error;
    }
  }
}

main().catch(console.error);
