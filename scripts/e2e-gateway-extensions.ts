/** @internal SCM extension workflows. Only SDK-owned fixtures are mutated.
 * Limit policies match a unique, synthetic metadata value, never ordinary traffic.
 * Export fixtures select a unique nonexistent trace and request no prompt/response bodies.
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { loadLiveCredentials } from './live-credentials.js';
import { LiveHarness } from './e2e/harness.js';
import { observeGatewayFixtures } from './e2e/gateway-fixtures.js';
import { AIGatewayClient, ManagementClient } from '../src/index.js';

const credentials = loadLiveCredentials();
const h = new LiveHarness();
const finishFixtures = observeGatewayFixtures('gateway-extensions');
const gw = new AIGatewayClient({ numRetries: 0 });
const tag = `sdk-e2e-${randomUUID().slice(0, 8)}`;
try {
  const workspaces = await h.check('workspaces.list', () => gw.workspaces.list());
  const workspace = workspaces?.data[0];
  assert(workspace, 'An accessible gateway workspace is required');
  const workspace_id = workspace.id;
  const integrations = await h.check('mcpIntegrations.list', () => gw.mcpIntegrations.list());
  const integration = integrations?.data[0];
  if (integration) {
    await h.check('mcpIntegrations.getWorkspaces.legacy', () =>
      gw.mcpIntegrations.getWorkspaces(integration.id),
    );
    await h.check('mcpIntegrations.getWorkspaces.v2', () =>
      gw.mcpIntegrations.getWorkspaces(integration.id, { version: '2' }),
    );
  }
  await h.check('mcpServers.list', () =>
    gw.mcpServers.list({ workspace_id, page_size: 1, current_page: 0 }),
  );
  await h.check('usageLimits.list', () =>
    gw.usageLimits.list({ workspace_id, page_size: 1, current_page: 0 }),
  );
  await h.check('rateLimits.list', () =>
    gw.rateLimits.list({ workspace_id, page_size: 1, current_page: 0 }),
  );
  await h.check('logExports.list', () => gw.logExports.list({ workspace_id }));
  if (process.argv.includes('--writes')) {
    const conditions = [{ key: 'metadata.sdk_e2e_tag', value: tag }];
    const group_by = [{ key: 'metadata.sdk_e2e_tag' }];
    const usage = await h.check('usageLimits.create.isolated', () =>
      gw.usageLimits.create({
        name: tag,
        workspace_id,
        conditions,
        group_by,
        type: 'tokens',
        credit_limit: 1_000_000,
      }),
    );
    if (usage?.id) {
      h.own('gateway.usage-policy', usage.id, tag);
      h.defer('usageLimits.archive', () => gw.usageLimits.delete(usage.id!));
      await h.check('usageLimits.get', () =>
        gw.usageLimits.get(usage.id!, { include_usage: true }),
      );
      await h.check('usageLimits.update', () =>
        gw.usageLimits.update(usage.id!, { name: `${tag}-updated`, credit_limit: 2_000_000 }),
      );
      await h.check('usageLimits.listEntities', () =>
        gw.usageLimits.listEntities(usage.id!, { page_size: 1, current_page: 0 }),
      );
      h.skip(
        'usageLimits.resetEntity',
        'Isolated policy has no traffic-derived entities; existing usage counters are never reset.',
      );
    }
    const rate = await h.check('rateLimits.create.isolated', () =>
      gw.rateLimits.create({
        name: tag,
        workspace_id,
        conditions,
        group_by,
        type: 'requests',
        unit: 'rpm',
        value: 1000,
      }),
    );
    if (rate?.id) {
      h.own('gateway.rate-policy', rate.id, tag);
      h.defer('rateLimits.delete', () => gw.rateLimits.delete(rate.id!));
      await h.check('rateLimits.get', () => gw.rateLimits.get(rate.id!));
      await h.check('rateLimits.update', () =>
        gw.rateLimits.update(rate.id!, { name: `${tag}-updated`, value: 2000 }),
      );
    }
    const publicIntegration = integrations?.data.find((item) => item.auth_type === 'none');
    const ownIntegration = publicIntegration
      ? await h.check('mcpIntegrations.create.isolated', () =>
          gw.mcpIntegrations.create({
            name: tag,
            slug: tag,
            organisation_id: process.env.PANW_MGMT_TSG_ID!,
            url: publicIntegration.url,
            auth_type: 'none',
            transport: publicIntegration.transport,
          }),
        )
      : undefined;
    if (ownIntegration && typeof ownIntegration.id === 'string') {
      const integrationId = ownIntegration.id;
      h.own('gateway.mcp-integration', integrationId, tag);
      h.defer('mcpIntegrations.delete', () => gw.mcpIntegrations.delete(integrationId));
      await h.check('mcpIntegrations.get.owned', () => gw.mcpIntegrations.get(integrationId));
      await h.check('mcpIntegrations.update.owned', () =>
        gw.mcpIntegrations.update(integrationId, {
          description: 'Disposable SDK conformance fixture',
        }),
      );
      await h.check('mcpIntegrations.setWorkspaces.owned', () =>
        gw.mcpIntegrations.setWorkspaces(integrationId, {
          workspaces: [{ id: workspace_id, enabled: true }],
          global_workspace_access: { enabled: false },
        }),
      );
      const server = await h.check('mcpServers.create', () =>
        gw.mcpServers.create({
          name: `${tag}-server`,
          slug: `${tag}-server`,
          workspace_id,
          mcp_integration_id: integrationId,
        }),
      );
      if (server?.id) {
        const id = server.id;
        h.own('gateway.mcp-server', id, tag);
        h.defer('mcpServers.delete', () => gw.mcpServers.delete(id));
        await h.check('mcpServers.get', () => gw.mcpServers.get(id));
        await h.check('mcpServers.update', () =>
          gw.mcpServers.update(id, { name: `${tag}-updated` }),
        );
        await h.check('mcpServers.test', () => gw.mcpServers.test(id));
        const capabilities = await h.check('mcpServers.getCapabilities', () =>
          gw.mcpServers.getCapabilities(id, { page: 1, page_size: 1, type: 'tool' }),
        );
        const capability = capabilities?.data?.[0];
        if (capability?.name)
          await h.check('mcpServers.updateCapabilities', () =>
            gw.mcpServers.updateCapabilities(id, {
              capabilities: [{ name: capability.name!, type: 'tool', enabled: false }],
            }),
          );
        else h.skip('mcpServers.updateCapabilities', 'No discovered tool on the owned server.');
        await h.check('mcpServers.getUserAccess', () =>
          gw.mcpServers.getUserAccess(id, { page: 1, page_size: 1 }),
        );
        await h.check('mcpServers.updateUserAccess', () =>
          gw.mcpServers.updateUserAccess(id, { default_user_access: 'deny', user_access: [] }),
        );
        await h.check('mcpServers.getConnections', () =>
          gw.mcpServers.getConnections(id, { workspace_id, page_size: 1, current_page: 0 }),
        );
        await h.check('mcpServers.deleteConnections', () =>
          gw.mcpServers.deleteConnections(id, { workspace_id }),
        );
        const profile = (
          await new ManagementClient({ numRetries: 0 }).profiles.listForToken()
        ).ai_profiles.find((p) => p.active);
        assert(profile, 'A profile is needed for the disabled guardrail fixture');
        const guardrail = await h.check('guardrails.create', () =>
          gw.guardrails.create({
            name: tag,
            target: 'mcp_tools',
            workspace_id,
            checks: [
              {
                id: 'panw-prisma-airs.intercept',
                parameters: { profile_name: profile.profile_name },
                is_enabled: false,
              },
            ],
            actions: { deny: false, async: false, sequential: false },
          }),
        );
        if (guardrail) {
          h.own('gateway.guardrail', guardrail.id, tag);
          h.defer('guardrails.delete', () => gw.guardrails.delete(guardrail.id));
          await h.check('guardrails.get', () => gw.guardrails.get(guardrail.id));
          await h.check('guardrails.update', () =>
            gw.guardrails.update(guardrail.id, { name: `${tag}-updated` }),
          );
          await h.check('guardrails.getMcpServers', () =>
            gw.guardrails.getMcpServers(guardrail.id),
          );
          await h.check('guardrails.syncMcpServers', () =>
            gw.guardrails.syncMcpServers(guardrail.id, {
              mcp_servers: { [id]: { run_on: ['input'] } },
            }),
          );
          await h.check('guardrails.upsertMcpServer', () =>
            gw.guardrails.upsertMcpServer(guardrail.id, id, { run_on: ['output'] }),
          );
          await h.check('guardrails.clearMcpServers', () =>
            gw.guardrails.syncMcpServers(guardrail.id, { mcp_servers: {} }),
          );
        }
      }
    }
    const filters = {
      trace_id: randomUUID(),
      time_of_generation_min: new Date(Date.now() - 86_400_000).toISOString(),
      time_of_generation_max: new Date().toISOString(),
      page_size: 1,
    };
    const exported = await h.check('logExports.create.empty-fixture', () =>
      gw.logExports.create({
        workspace_id,
        description: tag,
        filters,
        requested_data: ['id', 'created_at'],
      }),
    );
    if (exported) {
      h.own('gateway.log-export-audit-record', exported.id, tag);
      let finished = false;
      h.defer('logExports.cancel-if-running', async () => {
        const current = await gw.logExports.get(exported.id);
        if (current.status === 'in_progress') await gw.logExports.cancel(exported.id);
      });
      await h.check('logExports.get', () => gw.logExports.get(exported.id));
      await h.check('logExports.update', () =>
        gw.logExports.update(exported.id, {
          workspace_id,
          description: `${tag}-updated`,
          filters,
          requested_data: ['id'],
        }),
      );
      let started = false;
      await h.check('logExports.start', async () => {
        const result = await gw.logExports.start(exported.id);
        started = true;
        return result;
      });
      if (started)
        await h.check('logExports.complete', async () => {
          for (let i = 0; i < 30; i++) {
            const current = await gw.logExports.get(exported.id);
            if (current.status === 'success') {
              finished = true;
              return;
            }
            if (current.status === 'failed' || current.status === 'stopped')
              throw new Error('Export did not succeed');
            await delay(2000);
          }
          throw new Error('Empty export exceeded one-minute polling budget');
        });
      if (finished)
        await h.check('logExports.download.signed-url', async () => {
          h.protect(await gw.logExports.download(exported.id));
        });
    }
  } else h.skip('gateway.write-workflows', 'Pass --writes for isolated fixture workflows.');
} catch (error) {
  await h.check('harness.unexpected', async () => {
    throw error;
  });
} finally {
  await h.cleanup();
  credentials.verifyUnchanged();
  h.finish('gateway-extensions', true);
  finishFixtures();
}
