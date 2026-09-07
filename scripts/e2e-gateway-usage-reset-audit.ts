/** @internal Independent read-only retirement audit for the latest owned usage-reset run. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { AIGatewayClient } from '../src/index.js';
import { loadLiveCredentials } from './live-credentials.js';
import { LiveHarness } from './e2e/harness.js';

const report = JSON.parse(readFileSync('artifacts/e2e/gateway-usage-reset.json', 'utf8')) as {
  fixtures: { resource: string; id: string; name: string }[];
};
assert.equal(report.fixtures.length, 2);
const policy = report.fixtures.find((item) => item.resource === 'gateway.usage-policy');
const key = report.fixtures.find((item) => item.resource === 'gateway.service-api-key');
assert(policy && key);
assert.match(key.name, /^sdk-e2e-inference-[0-9a-f]{8}$/);
assert.equal(policy.name, `${key.name}-usage-reset`);
const credentials = loadLiveCredentials();
const harness = new LiveHarness();
const management = new AIGatewayClient({ numRetries: 0 });
try {
  const workspace = await management.workspaces.get('ws-develo-71f8d8');
  await harness.check('usage-reset-audit.policy-archived', async () => {
    const current = await management.usageLimits.get(policy.id, { status: 'archived' });
    assert.equal(current.id, policy.id);
    assert.equal(current.name, policy.name);
    assert.equal(current.workspace_id, workspace.id);
    assert.equal(current.status, 'archived');
    return { archived: true };
  });
  await harness.check('usage-reset-audit.key-absent', async () => {
    const inventory = await management.apiKeys.listService({ workspaceId: workspace.id });
    harness.protect(inventory);
    assert.equal(inventory.data.length, inventory.total);
    assert(!inventory.data.some((item) => item.id === key.id));
    return { absentFromCompleteInventory: true };
  });
} catch (error) {
  await harness.check('usage-reset-audit.prerequisites', async () => {
    throw error;
  });
} finally {
  credentials.verifyUnchanged();
  harness.finish('gateway-usage-reset-audit', true);
}
