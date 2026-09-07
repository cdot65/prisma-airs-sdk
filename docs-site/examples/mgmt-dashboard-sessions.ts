import { ManagementClient } from '@cdot65/prisma-airs-sdk';
import { reportExampleError } from './example-support.js';

/** Read-only consumer example. Sensitive content is fetched only with --include-content. */
async function main() {
  const mgmt = new ManagementClient({
    dashboardEndpoint: 'https://api.apps.paloaltonetworks.com/aisec',
    numRetries: 0,
  });
  const daily = { timeInterval: 1, timeUnit: 'day' } as const;
  const top = await mgmt.dashboard.topApplicationsViolations(daily);
  const trend = await mgmt.dashboard.applicationsViolationsTrend(daily);
  const chart = await mgmt.dashboard.sessionsChart(daily);
  const apps = await mgmt.dashboard.appsList();
  const page = await mgmt.dashboard.sessionsOverview({ ...daily, limit: 25, offset: 0 });
  console.log({
    rankedApps: top.applications.length,
    trendBuckets: trend.violations.length,
    sessionBuckets: chart.buckets.length,
    returnedApps: apps.applications.length,
    sessionPageItems: page.items.length,
    totalSessions: page.pagination.total_items,
  });
  const item = page.items[0];
  if (!item) return;
  const identity = {
    sessionId: item.session_id,
    appId: item.application_id,
    appName: item.application_name,
  };
  const session = await mgmt.dashboard.session(identity);
  const action = session.session_actions[0];
  if (!action) return;
  const scan = { scanId: action.scan_id, scanSubReqId: action.scan_sub_req_id };
  const transaction = await mgmt.dashboard.sessionTransaction({ ...identity, ...scan });
  console.log({
    sessionActions: session.session_actions.length,
    transactionStatus: transaction.status,
    tokens: transaction.tokens,
  });
  if (process.argv.includes('--include-content')) {
    const report = await mgmt.dashboard.scanContent(scan);
    console.log({ contentAvailable: report.scan_contents !== null }); // Never print the content.
  }
}

main().catch(reportExampleError);
