import { reportExampleError } from './example-support.js';
import { exampleName, recordExampleFixture } from './example-support.js';
import { RedTeamClient } from '@cdot65/prisma-airs-sdk';

async function main() {
  // Uses PANW_RED_TEAM_* env vars (falls back to PANW_MGMT_*) for auth.
  // Override the broker endpoint with PANW_RED_TEAM_NETWORK_BROKER_ENDPOINT or:
  //   new RedTeamClient({ networkBrokerEndpoint: 'https://...' })
  const client = new RedTeamClient({ numRetries: 0 });

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
    if (process.argv.includes('--writes')) {
      const ownedName = process.env.E2E_BROKER_NAME ?? exampleName;
      if (!/^sdk-example-[a-f0-9]{8}$/.test(ownedName)) throw new Error('Invalid fixture owner');
      console.log(
        process.env.E2E_BROKER_ID ? '\nResuming a journaled draft...' : '\nCreating a channel...',
      );
      const created = process.env.E2E_BROKER_ID
        ? await client.networkBroker.getChannel(process.env.E2E_BROKER_ID)
        : await client.networkBroker.createChannel({
            name: ownedName,
            description: 'Created from the SDK network broker example',
          });
      if (
        created.name !== ownedName ||
        created.status !== 'DRAFT' ||
        (created.connected_clients_count ?? 0) !== 0
      )
        throw new Error('The fixture must remain an owned, unused draft');
      console.log('  Created:', created.uuid, created.name, created.status);

      // --- GET / UPDATE ---
      if (created.uuid) {
        recordExampleFixture('red-team.network-broker-audit-record', created.uuid, ownedName);
        const detail = await client.networkBroker.getChannel(created.uuid);
        console.log('\nChannel detail:', detail.name, detail.status);

        const updated = await client.networkBroker.updateChannel(created.uuid, {
          name: ownedName,
          description: 'Updated from the SDK example',
        });
        console.log('  Updated description:', updated.description);

        // The channel UUID is what a target references via network_broker_channel_uuid.
        console.log('  Use this UUID for target.network_broker_channel_uuid:', created.uuid);
      }
      console.log('A draft channel remains: the API has no delete operation.');
    } else console.log('Read-only: --writes creates a persistent draft channel.');

    // --- STATS ---
    console.log('\nGetting channel stats...');
    const stats = await client.networkBroker.getChannelStats();
    console.log('  Broker server:', stats.network_channels_server_domain);
    console.log('  Online channels:', stats.online_channels);
    console.log('  Total channels:', stats.total_channels);
  } catch (error) {
    reportExampleError(error);
  }
}

main().catch(reportExampleError);
