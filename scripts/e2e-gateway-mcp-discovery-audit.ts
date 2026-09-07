/** @internal Read-only retirement audit for every journaled MCP discovery attempt. */
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { AIGatewayClient, AISecSDKException } from '../src/index.js';
import { loadLiveCredentials } from './live-credentials.js';
import { LiveHarness } from './e2e/harness.js';

const directory = 'artifacts/e2e/history';
const reports = readdirSync(directory).filter((name) =>
  /^gateway-mcp-discovery-\d{4}-.*\.json$/.test(name),
);
assert(reports.length > 0, 'At least one completed discovery attempt is required');
const fixtures = new Map<string, { resource: string; id: string; name: string }>();
for (const file of reports) {
  const report = JSON.parse(readFileSync(`${directory}/${file}`, 'utf8')) as {
    fixtures: { resource: string; id: string; name: string }[];
  };
  const key = report.fixtures.find((item) => item.resource === 'gateway.service-api-key');
  assert(key && /^sdk-e2e-inference-[0-9a-f]{8}$/.test(key.name));
  for (const item of report.fixtures) {
    assert(
      ['gateway.service-api-key', 'gateway.mcp-integration', 'gateway.mcp-server'].includes(
        item.resource,
      ),
    );
    assert([key.name, `${key.name}-mcp`, `${key.name}-integration`].includes(item.name));
    fixtures.set(`${item.resource}:${item.id}`, item);
  }
}
const credentials = loadLiveCredentials();
const harness = new LiveHarness();
const management = new AIGatewayClient({ numRetries: 0 });
try {
  const workspace = await management.workspaces.get('ws-develo-71f8d8');
  const keys = await management.apiKeys.listService({ workspaceId: workspace.id });
  harness.protect(keys);
  assert.equal(keys.data.length, keys.total);
  const integrations = await management.mcpIntegrations.list();
  assert.equal(integrations.data.length, integrations.total);
  let index = 0;
  for (const fixture of fixtures.values()) {
    await harness.check(`mcp-audit.${++index}.${fixture.resource}.absent`, async () => {
      if (fixture.resource === 'gateway.service-api-key')
        assert(!keys.data.some((item) => item.id === fixture.id));
      else if (fixture.resource === 'gateway.mcp-integration')
        assert(!integrations.data.some((item) => item.id === fixture.id));
      else
        await assert.rejects(
          () => management.mcpServers.get(fixture.id),
          (error: unknown) => error instanceof AISecSDKException && error.statusCode === 404,
        );
      return { absent: true };
    });
  }
  await harness.check('mcp-audit.implicit-owned-servers-absent', async () => {
    const ownedIntegrations = new Set(
      [...fixtures.values()]
        .filter((item) => item.resource === 'gateway.mcp-integration')
        .map((item) => item.id),
    );
    const servers = await management.mcpServers.list({
      workspace_id: workspace.id,
      page_size: 100,
      current_page: 0,
    });
    assert.equal(
      servers.data?.length,
      servers.total,
      'Complete workspace server inventory is required',
    );
    assert(
      servers.data?.every((item) => !ownedIntegrations.has(item.mcp_integration_id ?? '')),
      'An implicitly created owned server remains',
    );
    return { absentFromCompleteInventory: true };
  });
} catch (error) {
  await harness.check('mcp-audit.prerequisites', async () => {
    throw error;
  });
} finally {
  credentials.verifyUnchanged();
  harness.finish('gateway-mcp-discovery-audit', true);
}
