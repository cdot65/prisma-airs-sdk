/** @internal Read-only audit of journaled release SDK/CLI inference keys, never mutate credentials. */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { AIGatewayClient } from '../src/index.js';
import { loadLiveCredentials } from './live-credentials.js';
import { LiveHarness } from './e2e/harness.js';
import { isReleaseInferenceHistoryFile } from './e2e/release-history.js';

const credentials = loadLiveCredentials();
const harness = new LiveHarness();
try {
  const fixtures = new Map<string, { id: string; name: string }>();
  for (const file of readdirSync('artifacts/e2e/history').filter(isReleaseInferenceHistoryFile)) {
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
  assert(fixtures.size > 0, 'No owned release inference keys found');
  const management = new AIGatewayClient({ numRetries: 0 });
  const workspace = await management.workspaces.get('ws-develo-71f8d8');
  const inventory = await management.apiKeys.listService({ workspaceId: workspace.id });
  harness.protect(inventory);
  assert.equal(
    inventory.data.length,
    inventory.total,
    'Key retirement requires a complete inventory',
  );
  let index = 0;
  for (const fixture of fixtures.values()) {
    await harness.check(`release-key-audit.key-${++index}-absent`, async () => {
      assert(!inventory.data.some((item) => item.id === fixture.id));
      return { absentFromCompleteInventory: true };
    });
  }
} catch (error) {
  await harness.check('release-key-audit.prerequisites', async () => {
    throw error;
  });
} finally {
  credentials.verifyUnchanged();
  harness.finish('release-key-audit', true);
}
