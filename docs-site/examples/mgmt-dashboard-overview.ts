import { ManagementClient, DashboardApplicationsOverviewSchema } from '@cdot65/prisma-airs-sdk';
import { reportExampleError } from './example-support.js';

/** Read-only SCM dashboard probe; requires the three PANW_MGMT_* credential variables. */
async function main() {
  const client = new ManagementClient({
    dashboardEndpoint: 'https://api.apps.paloaltonetworks.com/aisec',
    numRetries: 0,
  });
  const query = { timeInterval: 1, timeUnit: 'day', limit: 25, offset: 0 } as const;
  const raw: unknown = await client.dashboard.applicationsOverviewRaw(query);
  const parsed = DashboardApplicationsOverviewSchema.parse(raw);
  console.log(
    JSON.stringify({ receivedItems: parsed.items.length, pagination: parsed.pagination }),
  );

  // Normal CLI/library consumers can use the typed method directly instead.
  const typed = await client.dashboard.applicationsOverview(query);
  console.log(JSON.stringify({ typedItems: typed.items.length }));
}

main().catch(reportExampleError);
