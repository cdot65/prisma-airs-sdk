import { RedTeamClient, AISecSDKException } from '@cdot65/prisma-airs-sdk';

async function main() {
  // Uses PANW_RED_TEAM_* env vars (falls back to PANW_MGMT_*) for auth.
  // Override the broker endpoint with PANW_RED_TEAM_NETWORK_BROKER_ENDPOINT or:
  //   new RedTeamClient({ networkBrokerEndpoint: 'https://...' })
  const client = new RedTeamClient();

  try {
    // --- LIST CHANNELS ---
    console.log('Listing network broker channels...');
    const channels = await client.networkBroker.listChannels({
      status: ['ONLINE', 'DRAFT'],
      limit: 20,
    });
    console.log(`Found ${channels.pagination?.total_items ?? 0} channels:`);
    for (const c of channels.data) {
      console.log(`  - ${c.uuid}: ${c.name} [${c.status}]`);
    }

    // --- CREATE A CHANNEL ---
    console.log('\nCreating a channel...');
    const created = await client.networkBroker.createChannel({
      name: 'sdk-example-broker',
      description: 'Created from the SDK network broker example',
    });
    console.log('  Created:', created.uuid, created.name, created.status);

    // --- GET / UPDATE ---
    if (created.uuid) {
      const detail = await client.networkBroker.getChannel(created.uuid);
      console.log('\nChannel detail:', detail.name, detail.status);

      const updated = await client.networkBroker.updateChannel(created.uuid, {
        description: 'Updated from the SDK example',
      });
      console.log('  Updated description:', updated.description);

      // The channel UUID is what a target references via network_broker_channel_uuid.
      console.log('  Use this UUID for target.network_broker_channel_uuid:', created.uuid);
    }

    // --- STATS ---
    console.log('\nGetting channel stats...');
    const stats = await client.networkBroker.getChannelStats();
    console.log('  Broker server:', stats.network_channels_server_domain);
    console.log('  Online channels:', stats.online_channels);
    console.log('  Total channels:', stats.total_channels);
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
