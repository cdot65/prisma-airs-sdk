#!/usr/bin/env tsx
/**
 * @internal
 * AI Gateway live smoke test.
 *
 * Calls every AI Gateway READ method (43 total) against a real tenant and reports which
 * parse cleanly. Unit tests use recorded fixtures written by the same person who wrote the
 * schemas, so they cannot catch a schema that disagrees with the live API — this is the one
 * mechanism that can. See PRD-ai-gateway-client.md in the Obsidian vault for the schema
 * rationale and the defects this script has previously caught.
 *
 * Opt-in, read-only, NOT part of CI or `npm test` — it needs live credentials and hits a
 * real tenant. Requires both SCM role grants on the service account (see
 * `AIGatewayClient`'s class doc): an admin role at tenant-root scope (unlocks
 * `/ai_gw/admin/v2/*`) and `view_only_admin`+ on the `main_airs_workspace_<TSG>` scope
 * (unlocks `/ai_gw/v2/*`). Reads `PANW_AI_GW_*` env vars, falling back to `PANW_MGMT_*`.
 *
 * Usage:
 *   set -a && source .env && set +a && npx tsx scripts/smoke-ai-gateway.ts
 *   npm run smoke:ai-gateway
 */
import { fileURLToPath } from 'node:url';
import { AIGatewayClient, AISecSDKException } from '../src/index.js';

export interface CheckResult {
  name: string;
  ok: boolean;
  detail: string;
}

const gw = new AIGatewayClient();
const results: CheckResult[] = [];
const logLevel = process.env.AI_GATEWAY_E2E_LOG_LEVEL ?? 'normal';

function printResult(result: CheckResult): void {
  if (logLevel === 'quiet') return;
  const detail = logLevel === 'verbose' && result.detail ? `  ${result.detail}` : '';
  console.log(`${result.ok ? ' ok ' : 'FAIL'}  ${result.name}${detail}`);
}

async function check(name: string, fn: () => Promise<unknown>): Promise<void> {
  try {
    const r = await fn();
    let shape = '';
    if (Array.isArray(r)) shape = `${r.length} rows`;
    else if (r && typeof r === 'object') {
      const o = r as Record<string, unknown>;
      if (Array.isArray(o.data)) shape = `${o.data.length} rows`;
      else if (Array.isArray(o.records)) shape = `${o.records.length} records`;
      else if (o.data && typeof o.data === 'object') shape = 'envelope';
      else shape = `${Object.keys(o).length} fields`;
    }
    const result = { name, ok: true, detail: shape };
    results.push(result);
    printResult(result);
  } catch (e) {
    const rawMessage =
      e instanceof AISecSDKException
        ? `${e.errorType}${e.statusCode ? ` ${e.statusCode}` : ''}: ${e.message}`
        : String(e);
    const msg =
      logLevel === 'verbose' ? rawMessage.slice(0, 4_000) : rawMessage.split('\n')[0].slice(0, 120);
    const result = { name, ok: false, detail: msg };
    results.push(result);
    printResult(result);
  }
}

export async function main(): Promise<CheckResult[]> {
  const ws = await gw.workspaces.list();
  const slug = ws.data[0].slug;
  const wsId = ws.data[0].id;
  const tsg = process.env.PANW_AI_GW_TSG_ID ?? process.env.PANW_MGMT_TSG_ID ?? '';
  const win = { workspaceSlug: slug, days: 7 };

  // --- data plane: telemetry (15 charts + 3 aggregates + raw logs) ---
  await check('telemetry.cost', () => gw.telemetry.cost(win));
  await check('telemetry.requests', () => gw.telemetry.requests(win));
  await check('telemetry.latency', () => gw.telemetry.latency(win));
  await check('telemetry.tokens', () => gw.telemetry.tokens(win));
  await check('telemetry.errors', () => gw.telemetry.errors(win));
  await check('telemetry.users', () => gw.telemetry.users(win));
  await check('telemetry.cacheSummary', () => gw.telemetry.cacheSummary(win));
  await check('telemetry.cacheHitTrend', () => gw.telemetry.cacheHitTrend(win));
  await check('telemetry.userTrends', () => gw.telemetry.userTrends(win));
  await check('telemetry.errorTrends', () => gw.telemetry.errorTrends(win));
  await check('telemetry.rescuedRetries', () => gw.telemetry.rescuedRetries(win));
  await check('telemetry.feedbackTrend', () => gw.telemetry.feedbackTrend(win));
  await check('telemetry.feedbackWeighted', () => gw.telemetry.feedbackWeighted(win));
  await check('telemetry.feedbackScoreDistribution', () =>
    gw.telemetry.feedbackScoreDistribution(win),
  );
  await check('telemetry.feedbackModels', () => gw.telemetry.feedbackModels(win));
  await check('telemetry.groupBy(ai_service)', () =>
    gw.telemetry.groupBy('ai_service', {
      ...win,
      columns: ['cost', 'avg_latency', 'avg_tokens', 'total_tokens', 'success_rate', 'last_seen'],
    }),
  );
  await check('telemetry.groupBy(model)', () =>
    gw.telemetry.groupBy('model', { ...win, columns: ['cost', 'total_tokens'] }),
  );
  await check('telemetry.groupBy(api_key)', () =>
    gw.telemetry.groupBy('api_key', { ...win, columns: ['cost'] }),
  );
  await check('telemetry.groupBy(provider)', () =>
    gw.telemetry.groupBy('provider', { ...win, columns: ['cost'] }),
  );
  await check('telemetry.byUser', () => gw.telemetry.byUser(win));
  await check('telemetry.byStatusCode', () =>
    gw.telemetry.byStatusCode({ ...win, columns: ['cost', 'avg_latency'] }),
  );
  await check('telemetry.logs', () => gw.telemetry.logs({ ...win, pageSize: 5 }));
  await check('telemetry.logs(statusCode)', () =>
    gw.telemetry.logs({ ...win, statusCode: 200, pageSize: 3 }),
  );

  // --- data plane: config ---
  await check('workspaces.list', () => gw.workspaces.list());
  await check('workspaces.get', () => gw.workspaces.get(wsId));
  await check('configs.list', () => gw.configs.list({ workspaceId: wsId }));
  await check('guardrails.list', () => gw.guardrails.list({ workspaceId: wsId }));
  const grs = await gw.guardrails.list({ workspaceId: wsId }).catch(() => null);
  if (grs?.data?.[0]) await check('guardrails.get', () => gw.guardrails.get(grs.data[0].id));
  await check('providers.list', () => gw.providers.list({ workspaceId: wsId }));
  await check('apiKeys.listService', () => gw.apiKeys.listService({ workspaceId: wsId }));
  await check('apiKeys.listUser', () => gw.apiKeys.listUser({ workspaceId: wsId }));

  const cfgs = await gw.configs.list({ workspaceId: wsId }).catch(() => null);
  if (cfgs?.data?.[0]) {
    await check('configs.get', () => gw.configs.get(cfgs.data[0].id));
    await check('configs.listVersions', () => gw.configs.listVersions(cfgs.data[0].id));
  }
  const providers = await gw.providers.list({ workspaceId: wsId }).catch(() => null);
  if (providers?.data?.length) {
    await check('providers.get(all)', () =>
      Promise.all(providers.data.map((provider) => gw.providers.get(provider.id))),
    );
  }

  // --- admin plane ---
  await check('integrations.list', () => gw.integrations.list());
  await check('mcpIntegrations.list', () => gw.mcpIntegrations.list());
  await check('deployments.list', () => gw.deployments.list());
  await check('plugins.list', () => gw.plugins.list());
  await check('organisations.getSelf', () => gw.organisations.getSelf());
  await check('organisations.getAuthSettings', () => gw.organisations.getAuthSettings(tsg));
  await check('auditLogs.list', () =>
    gw.auditLogs.list({ start: new Date(Date.now() - 7 * 86_400_000), end: new Date() }),
  );

  const ints = await gw.integrations.list().catch(() => null);
  if (ints?.data?.[0]) {
    await check('integrations.get', () => gw.integrations.get(ints.data[0].id));
    await check('integrations.getModels', () => gw.integrations.getModels(ints.data[0].id));
    await check('integrations.getWorkspaces', () => gw.integrations.getWorkspaces(ints.data[0].id));
  }
  const deps = await gw.deployments.list().catch(() => null);
  const activeDep = deps?.data?.find((d) => d.status === 'active');
  if (activeDep) await check('deployments.get', () => gw.deployments.get(activeDep.id));
  const mcp = await gw.mcpIntegrations.list().catch(() => null);
  if (mcp?.data?.[0]) {
    await check('mcpIntegrations.get', () => gw.mcpIntegrations.get(mcp.data[0].id));
    await check('mcpIntegrations.getCapabilities', () =>
      gw.mcpIntegrations.getCapabilities(mcp.data[0].id),
    );
    await check('mcpIntegrations.getMetadata', () =>
      gw.mcpIntegrations.getMetadata(mcp.data[0].id),
    );
  }

  const pass = results.filter((r) => r.ok);
  const fail = results.filter((r) => !r.ok);
  console.log(`\n${pass.length}/${results.length} read methods parse against the live tenant`);
  if (fail.length) {
    console.log(`\nFAILURES:`);
    for (const f of fail) console.log(`  ${f.name}\n    ${f.detail}`);
  }
  return results;
}

const invokedDirectly = process.argv[1] === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  main().catch((e: unknown) => {
    console.error('harness failed:', e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
