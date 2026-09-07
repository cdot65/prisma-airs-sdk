/** @internal Retire two SDK-owned revisions discovered by the all-revision cleanup audit. */
import assert from 'node:assert/strict';
import { ManagementClient } from '../src/index.js';
import { loadLiveCredentials } from './live-credentials.js';
import { LiveHarness } from './e2e/harness.js';
const credentials = loadLiveCredentials();
const h = new LiveHarness();
const mgmt = new ManagementClient({ numRetries: 0 });
const expectedName = 'sdk-e2e-revision-0da9520d';
const targets = ['9be71c6b-4457-4325-bff6-76f9afb46bab', 'cde286dd-0731-4055-aae2-e660e4e1fc0b'];
try {
  assert(process.argv.includes('--writes'), 'Pass --writes to retire the exact owned revisions');
  const profiles = await mgmt.profiles.listAll({ latest: false });
  for (const id of targets)
    await h.check(`owned-profile-revision:${id}`, async () => {
      const record = profiles.find((p) => p.profile_id === id);
      if (!record) return { state: 'already-absent' };
      assert.equal(record.profile_name, expectedName, 'Owned revision identity changed');
      h.own('management.profile', id, expectedName);
      await mgmt.profiles.delete(id);
      return { state: 'deleted' };
    });
} catch (error) {
  await h.check('harness.unexpected', async () => {
    throw error;
  });
} finally {
  credentials.verifyUnchanged();
  h.finish('cleanup-revisions', true);
}
