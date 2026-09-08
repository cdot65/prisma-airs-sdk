/** Local/unreleased SCM dashboard reads. Credentials use the normal SDK environment variables. */
import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
import { reportExampleError } from './example-support.js';

async function main() {
  const workspaceSlug = process.env.AIRS_GATEWAY_WORKSPACE_SLUG;
  const tsgId = process.env.PANW_AI_GW_TSG_ID ?? process.env.PANW_MGMT_TSG_ID;
  if (!workspaceSlug || !tsgId) throw new Error('Workspace slug and TSG ID are required');
  const gateway = new AIGatewayClient();
  const end = new Date();
  const window = { workspaceSlug, start: new Date(end.getTime() - 86400000), end };
  const categories = await gateway.telemetry.errorCategoryTrends(window);
  const grouped = await gateway.telemetry.groupedErrors(window);
  const boundaries = await gateway.telemetry.filterBoundaries(window);
  const info = await gateway.organisations.getInfo(tsgId);
  const catalog = await gateway.guardrails.getCatalog();
  const first = await gateway.telemetry.logs({ ...window, pageSize: 50, currentPage: 0 });
  // Print only explicit aggregates, never raw logs, organisation settings or metadata.
  console.log(JSON.stringify({
    totalErrors: categories.data.summary.totalErrors,
    errorBuckets: grouped.data.trend.length,
    availableModels: boundaries.data.unique_ai_models.length,
    workspaceLimit: info.benefits.limits.maxWorkspaces,
    evaluatorCount: catalog.evals.length,
    firstPageRows: first.data.records.length,
    serverTotal: first.data.total,
    quotaExceeded: first.data.isQuotaExceeded,
  }, null, 2));
}

main().catch(reportExampleError);
