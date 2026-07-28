#!/usr/bin/env tsx
/**
 * AI Gateway usage examples — Prisma AIRS SDK (v0.14.0).
 *
 * Every call below is READ-ONLY; write calls are shown as comments at the bottom instead of
 * being executed. Verified against a live tenant.
 *
 * Requires PANW_AI_GW_* in the environment, falling back to PANW_MGMT_*. The service account
 * needs BOTH SCM role grants or half the calls 403:
 *   - an admin role at tenant-root scope               -> unlocks /ai_gw/admin/v2/*
 *   - view_only_admin+ on main_airs_workspace_<TSG>     -> unlocks /ai_gw/v2/*
 * See the "Authorization" section of docs-site/docs/guides/ai-gateway-api.mdx for how to check
 * and grant these in SCM.
 *
 * This file is excluded from the published package (only `dist` ships) and from `tsc --noEmit`
 * (root tsconfig only includes `src/**\/*`), matching the treatment of `scripts/`.
 *
 * Usage:
 *   set -a && source .env && set +a && npx tsx examples/ai-gateway.ts
 */
import { AIGatewayClient, AISecSDKException } from '../src/index.js';

const usd = (cents: number | null | undefined): string =>
  cents == null ? 'n/a' : `$${(cents / 100).toFixed(2)}`;

async function main(): Promise<void> {
  // ── 1. Construct ────────────────────────────────────────────────────────
  // Reads PANW_AI_GW_*, falling back to PANW_MGMT_*.
  const gw = new AIGatewayClient();

  // ── 2. Workspace: slug drives telemetry, id drives config-plane lists ────
  const ws = (await gw.workspaces.list()).data[0];
  const workspaceSlug = ws.slug;
  const workspaceId = ws.id;
  console.log(`workspace  ${ws.name}  slug=${workspaceSlug}`);
  console.log(`           scope_name=${ws.scope_name}  <- the SCM scope your grant targets\n`);

  // ── 3. Telemetry: COSTS ARE IN CENTS, the SDK never converts ────────────
  const [cost, requests, latency, tokens] = await Promise.all([
    gw.telemetry.cost({ workspaceSlug, days: 7 }),
    gw.telemetry.requests({ workspaceSlug, days: 7 }),
    gw.telemetry.latency({ workspaceSlug, days: 7 }),
    gw.telemetry.tokens({ workspaceSlug, days: 7 }),
  ]);
  console.log('7-day totals');
  console.log(`  spend     ${usd(cost.data.total)}  (wire: ${cost.data.total} cents)`);
  console.log(`  requests  ${requests.data.total?.toLocaleString()}`);
  console.log(
    `  tokens    ${tokens.data.total.toLocaleString()} (in ${tokens.data.total_request_units.toLocaleString()} / out ${tokens.data.total_response_units.toLocaleString()})`,
  );
  console.log(
    `  latency   mean ${latency.data.total.toFixed(0)}ms · p50 ${latency.data.p50} · p99 ${latency.data.p99}\n`,
  );

  // Explicit window instead of a rolling one:
  //   gw.telemetry.cost({ workspaceSlug, start: new Date('2026-07-01'), end: new Date('2026-07-08') })

  // ── 4. Group-by. Dimensions are underscore-named and load-bearing ───────
  const byModel = await gw.telemetry.groupBy('model', {
    workspaceSlug,
    days: 7,
    columns: ['cost', 'total_tokens'],
  });
  console.log('spend by model');
  for (const r of byModel.data) {
    console.log(
      `  ${String(r.model).padEnd(28)} ${String(r.requests).padStart(6)} req  ${usd(r.cost).padStart(10)}`,
    );
  }

  // ── 5. Status codes: 446 = AIRS blocked it before it reached the LLM ────
  const codes = await gw.telemetry.byStatusCode({
    workspaceSlug,
    days: 7,
    columns: ['cost', 'avg_latency'],
  });
  console.log('\nby HTTP status');
  for (const r of codes.data) {
    const note =
      r.status_code === 446 ? '  <- AIRS security block (cost 0, never hit the LLM)' : '';
    console.log(
      `  ${String(r.status_code).padEnd(5)} ${String(r.requests).padStart(6)} req  ${usd(r.cost).padStart(10)}${note}`,
    );
  }

  // ── 6. Raw logs. Paging is broken upstream: only pageSize works, and an
  //      unfiltered call always returns the same recent batch. statusCode is
  //      the one filter that bypasses the ~50-row cap.
  const recent = await gw.telemetry.logs({ workspaceSlug, days: 1, pageSize: 3 });
  console.log('\nrecent requests');
  for (const r of recent.data.records) {
    console.log(
      `  ${r.created_at.slice(0, 19)}  ${String(r.response_status_code).padEnd(4)} ${r.ai_model.padEnd(24)} ${usd(r.cost).padStart(8)}  cache=${r.cache_status}`,
    );
  }
  const blocked = await gw.telemetry.logs({ workspaceSlug, days: 7, statusCode: 446 });
  console.log(`  AIRS blocks in window: ${blocked.data.records.length}`);

  // ── 7. Config plane. NOTE list vs detail are DIFFERENT shapes: list rows
  //      omit config/format/type/version_id. And `config` is a JSON STRING.
  const configs = await gw.configs.list({ workspaceId });
  console.log('\ngateway configs');
  for (const c of configs.data) {
    console.log(`  ${c.name.padEnd(18)} slug=${c.slug}`);
  }
  if (configs.data[0]) {
    const detail = await gw.configs.get(configs.data[0].id); // detail read
    const routing = JSON.parse(detail.config) as Record<string, unknown>; // string -> object
    console.log(`  routing for "${detail.name}": ${JSON.stringify(routing)}`);
  }

  const guardrails = await gw.guardrails.list({ workspaceId });
  const providers = await gw.providers.list({ workspaceId });
  const svcKeys = await gw.apiKeys.listService({ workspaceId });
  console.log(
    `  guardrails=${guardrails.total}  providers=${providers.total}  serviceKeys=${svcKeys.total}`,
  );

  // ── 8. Admin plane. Same client, same credentials, different role scope.
  //      delete() is a SOFT delete — records persist as status:'archived'.
  const deployments = await gw.deployments.list();
  const active = deployments.data.filter((d) => d.status === 'active');
  console.log(`\ndeployments: ${deployments.data.length} total, ${active.length} active`);
  for (const d of active) console.log(`  ${d.name.padEnd(14)} ${d.type.padEnd(16)} ${d.slug}`);

  const integrations = await gw.integrations.list();
  console.log('\nprovider integrations');
  for (const i of integrations.data) console.log(`  ${i.name.padEnd(22)} ${i.status}`);

  if (integrations.data[0]) {
    const id = integrations.data[0].id;
    const models = await gw.integrations.getModels(id);
    const enabled = models.models.filter((m) => m.enabled).length;
    const bound = await gw.integrations.getWorkspaces(id);
    console.log(
      `  -> ${enabled}/${models.models.length} models enabled, allow_all=${models.allow_all_models}`,
    );
    console.log(
      `  -> bound to ${bound.workspaces.length} workspace(s), global access enabled=${bound.global_workspace_access.enabled}`,
    );
  }

  const mcp = await gw.mcpIntegrations.list();
  console.log(`\nMCP servers: ${mcp.total}`);
  for (const m of mcp.data) console.log(`  ${m.name.padEnd(14)} ${m.transport.padEnd(6)} ${m.url}`);

  // ── 9. Audit logs. SECURITY: request_body is returned UNREDACTED upstream
  //      and can contain live credentials. The SDK returns wire data faithfully
  //      rather than altering it. Project to safe fields; never log wholesale.
  const audit = await gw.auditLogs.list({
    start: new Date(Date.now() - 7 * 86_400_000),
    end: new Date(),
  });
  console.log('\naudit trail (safe projection)');
  for (const r of audit.records.slice(0, 4)) {
    console.log(`  ${r.timestamp.slice(0, 19)}  ${r.method.padEnd(6)} ${r.uri.split('?')[0]}`);
  }

  // ── 10. Errors. The two 403s mean opposite things; the SDK surfaces the code
  console.log('\nerror handling');
  try {
    await gw.configs.get('00000000-0000-4000-8000-000000000000');
  } catch (e) {
    if (e instanceof AISecSDKException) {
      console.log(`  ${e.errorType} status=${e.statusCode}`);
      console.log(`  "${e.message}"`);
      console.log('    AB03 -> missing view_only_admin on main_airs_workspace_<TSG>');
      console.log('    "Access denied" (OPA) -> missing admin role at tenant-root scope');
      console.log('    AB02 -> real collection, wrong read form (usually a missing workspace_id)');
    }
  }
  try {
    await gw.configs.get('not-a-uuid'); // fails locally, before any network call
  } catch (e) {
    if (e instanceof AISecSDKException) console.log(`  local guard: ${e.errorType}`);
  }

  // ── Writes (NOT executed here) ──────────────────────────────────────────
  //
  // create() returns a 5-field RECEIPT, not a deployment record — and it is the
  // only time credentials.password and client_auth are ever readable:
  //   const receipt = await gw.deployments.create({
  //     name: 'prod-us', type: 'production',
  //     organisation_id: '1852583913',            // the TSG, NOT the org UUID
  //     auth_settings: { allow_all_workspaces: true },
  //   });
  //   // receipt.credentials.password — capture now; the detail read masks it
  //   const full = await gw.deployments.get(receipt.id);
  //
  // config is sent as an OBJECT but read back as a JSON string:
  //   await gw.configs.create({
  //     name: 'vertex-airs', workspace_id: workspaceId,
  //     config: { retry: { attempts: 3 }, cache: { mode: 'simple' } },
  //   });
  //
  //   await gw.guardrails.create({
  //     workspace_id: workspaceId, name: 'PrismaAIRS',
  //     checks: [{ id: 'panw.prisma-airs.intercept',
  //                parameters: { profile_name: 'AI Gateway - Strict' }, is_enabled: true }],
  //     actions: { deny: false, async: false, sequential: false },
  //   });
  //
  //   await gw.deployments.delete(id, '1852583913');  // archives, does not remove
}

main().catch((e: unknown) => {
  console.error('FAILED:', e instanceof Error ? e.message : e);
  process.exit(1);
});
