import { ManagementClient, AISecSDKException } from '@cdot65/prisma-airs-sdk';

/**
 * Pull per-application token consumption and violation breakdown from the SCM AIRS
 * "AI Security > Runtime > API Applications" panel.
 *
 * Requires: PANW_MGMT_CLIENT_ID, PANW_MGMT_CLIENT_SECRET, PANW_MGMT_TSG_ID.
 */
async function main() {
  const mgmt = new ManagementClient();

  try {
    const apps = await mgmt.customerApps.list({ offset: 0, limit: 100 });
    const customerApps = apps.customer_apps ?? [];
    if (customerApps.length === 0) {
      console.log('No applications found in tenant.');
      return;
    }

    for (const app of customerApps) {
      if (!app.customer_appId) continue;
      console.log(`\n=== ${app.app_name} (${app.customer_appId}) ===`);

      const overview = await mgmt.dashboard.application({
        appId: app.customer_appId,
        appName: app.app_name,
      });

      const ts = overview.token_stats;
      if (ts?.average_daily_tokens != null) {
        console.log(
          `  daily avg: ${ts.average_daily_tokens}${ts.average_daily_tokens_scale ?? ''}, ` +
            `monthly: ${ts.monthly_total_tokens}${ts.monthly_total_tokens_scale ?? ''}`,
        );
      } else {
        console.log('  no token activity in window');
      }

      const ss = overview.session_stats;
      if (ss) {
        console.log(`  sessions: ${ss.total ?? 0} total, ${ss.violating ?? 0} violating`);
      }

      const breakdown = await mgmt.dashboard.applicationViolationBreakdown({
        appId: app.customer_appId,
        appName: app.app_name,
      });
      const detectors = breakdown.detection_type_violation_breakdown ?? [];
      const firing = detectors.filter((d) => (d.violation_breakdown?.total ?? 0) > 0);
      if (firing.length > 0) {
        console.log(`  detectors firing (${breakdown.total_violating ?? 0} total violating):`);
        for (const d of firing) {
          console.log(
            `    - ${d.detection_type}: ${d.violation_breakdown?.total} ` +
              `(c=${d.violation_breakdown?.critical ?? 0} h=${d.violation_breakdown?.high ?? 0} ` +
              `m=${d.violation_breakdown?.medium ?? 0} l=${d.violation_breakdown?.low ?? 0})`,
          );
        }
      } else {
        console.log('  no detector violations in window');
      }
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
