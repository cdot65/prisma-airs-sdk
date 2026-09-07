/** @internal Read-only retirement audit of every journaled realtime attempt, including failures. */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { AIGatewayClient } from '../src/index.js';
import { loadLiveCredentials } from './live-credentials.js';
import { LiveHarness } from './e2e/harness.js';

const credentials = loadLiveCredentials();
const harness = new LiveHarness();
const management = new AIGatewayClient({ numRetries: 0 });
try {
  const fixtures = new Map<string, { id: string; name: string }>();
  for (const file of readdirSync('artifacts/e2e/history').filter((name) =>
    /^gateway-realtime(?:-sdk|-example)?-\d{4}-.*\.json$/.test(name),
  )) {
    const report = JSON.parse(readFileSync(`artifacts/e2e/history/${file}`, 'utf8')) as {
      credentialsUnchanged: boolean;
      fixtures: { resource: string; id: string; name: string }[];
    };
    assert.equal(report.credentialsUnchanged, true);
    for (const fixture of report.fixtures) {
      assert.equal(fixture.resource, 'gateway.service-api-key');
      assert.match(fixture.name, /^sdk-e2e-inference-[0-9a-f]{8}$/);
      fixtures.set(fixture.id, fixture);
    }
  }
  assert(fixtures.size > 0, 'No journaled realtime fixtures found');
  const workspace = await management.workspaces.get('ws-develo-71f8d8');
  const inventory = await management.apiKeys.listService({ workspaceId: workspace.id });
  harness.protect(inventory);
  assert.equal(
    inventory.data.length,
    inventory.total,
    'Incomplete key inventory is not retirement proof',
  );
  let index = 0;
  for (const fixture of fixtures.values()) {
    await harness.check(`realtime-audit.key-${++index}-absent`, async () => {
      assert(!inventory.data.some((item) => item.id === fixture.id));
      return { absentFromCompleteInventory: true };
    });
  }
} catch (error) {
  await harness.check('realtime-audit.prerequisites', async () => {
    throw error;
  });
} finally {
  credentials.verifyUnchanged();
  harness.finish('gateway-realtime-audit', true);
}
