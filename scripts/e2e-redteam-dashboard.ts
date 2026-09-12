/** @internal Read-only verification of the seven supplied Red Team dashboard feeds. */
import assert from 'node:assert/strict';
import { RedTeamClient } from '../src/index.js';
import { DEFAULT_TOKEN_ENDPOINT } from '../src/constants.js';
import { loadLiveCredentials } from './live-credentials.js';
import { LiveHarness, writePrivateReport } from './e2e/harness.js';

const credentials = loadLiveCredentials();
// Deliberately do not retain arbitrary diagnostics or configuration/scan response bodies.
delete process.env.E2E_DIAGNOSTICS;
process.env.PANW_AI_SEC_TIMEOUT_MS = '15000';
const harness = new LiveHarness();
const root = 'https://api.apps.paloaltonetworks.com/ai-red-teaming';
const client = new RedTeamClient({
  dataEndpoint: `${root}/data-plane`,
  mgmtEndpoint: `${root}/mgmt-plane`,
  networkBrokerEndpoint: `${root}/data-plane/network-broker`,
  tokenEndpoint: DEFAULT_TOKEN_ENDPOINT,
  numRetries: 0,
});
const output: Record<string, unknown> = {};

async function capture<T>(name: string, read: () => Promise<T>, project: (value: T) => unknown) {
  await harness.check(name, async () => {
    const value = project(await read());
    output[name] = value;
    console.log(JSON.stringify({ name, output: value }));
    return value;
  });
}

try {
  await capture(
    'overview',
    () => client.getDashboardOverview(),
    (r) => ({
      totalTargets: r.total_targets,
      targetTypes: r.targets_by_type?.length ?? null,
    }),
  );
  await capture(
    'scanStatistics',
    () => client.getScanStatistics(),
    (r) => ({
      totalScans: r.total_scans,
      targetsScanned: r.targets_scanned,
      statusGroups: r.scan_status?.length ?? null,
      riskGroups: r.risk_profile?.length ?? null,
    }),
  );
  await capture(
    'targets',
    () => client.targets.list({ skip: 0, limit: 15 }),
    (r) => {
      assert(Array.isArray(r.data), 'Target inventory is missing');
      return { returned: r.data.length, total: r.pagination.total_items };
    },
  );
  await capture(
    'quotaGet',
    () => client.getQuotaSummary(),
    (r) =>
      Object.fromEntries(
        (['static', 'dynamic', 'custom'] as const).map((kind) => [
          kind,
          {
            allocated: r[kind].allocated,
            unlimited: r[kind].unlimited,
            consumed: r[kind].consumed,
          },
        ]),
      ),
  );
  await capture(
    'scans',
    () => client.scans.list({ skip: 0, limit: 15 }),
    (r) => ({
      returned: r.data.length,
      total: r.pagination.total_items,
    }),
  );
  await capture(
    'brokerStats',
    () => client.networkBroker.getChannelStats(),
    (r) => ({
      totalChannels: r.total_channels ?? null,
      onlineChannels: r.online_channels ?? null,
    }),
  );
  await capture(
    'adapters',
    () => client.adapters.list({ include_target_count: true }),
    (r) => {
      assert(Array.isArray(r.data), 'Adapter inventory is missing');
      return {
        returned: r.data.length,
        total: r.pagination.total_items,
        targetCountsPresent: r.data.every((adapter) => typeof adapter.target_count === 'number'),
      };
    },
  );

  // Confirm the new method also works on the SDK's existing default data-plane hostname.
  await capture(
    'quotaDefaultEndpoint',
    () =>
      new RedTeamClient({
        dataEndpoint: 'https://api.apps.paloaltonetworks.com/ai-red-teaming/data-plane',
        tokenEndpoint: DEFAULT_TOKEN_ENDPOINT,
        numRetries: 0,
      }).getQuotaSummary(),
    (r) => ({
      quotaTypes: Object.keys(r).filter((key) => ['static', 'dynamic', 'custom'].includes(key))
        .length,
    }),
  );

  await capture(
    'scanPagination',
    async () => {
      const seen = new Set<string>();
      let total: number | undefined;
      for (let page = 0; page < 10; page++) {
        const result = await client.scans.list({ skip: seen.size, limit: 15 });
        const reportedTotal = result.pagination.total_items;
        assert(
          typeof reportedTotal === 'number' &&
            Number.isSafeInteger(reportedTotal) &&
            reportedTotal >= 0,
        );
        total ??= reportedTotal;
        assert.equal(
          result.pagination.total_items,
          total,
          'Scan inventory changed during pagination',
        );
        assert(result.data.length <= 15, 'Scan page exceeds requested limit');
        for (const row of result.data) {
          assert(!seen.has(row.uuid), 'Repeated scan identity');
          seen.add(row.uuid);
        }
        assert(seen.size <= total, 'Scan inventory exceeds reported total');
        if (seen.size === total)
          return { pages: page + 1, returned: seen.size, total, complete: true };
        assert(result.data.length > 0, 'Premature empty scan page');
      }
      throw new Error('Scan pagination exceeded the ten-page verification budget');
    },
    (r) => r,
  );
} finally {
  credentials.verifyUnchanged();
  const report = {
    startedAt: harness.startedAt,
    finishedAt: new Date().toISOString(),
    credentialsUnchanged: true,
    mutations: false,
    rawResponsesRetained: false,
    window:
      'Server defaults for dashboard statistics; unfiltered paginated scan inventory. Not a daily aggregate.',
    output,
  };
  writePrivateReport('artifacts/examples/redteam-dashboard.json', report);
  writePrivateReport(
    `artifacts/e2e/history/redteam-dashboard-output-${harness.startedAt.replaceAll(':', '-')}.json`,
    report,
  );
  harness.finish('redteam-dashboard', true);
}
