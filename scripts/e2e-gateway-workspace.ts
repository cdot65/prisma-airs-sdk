/** @internal Isolated workspace metadata compatibility probe. */
import { randomUUID } from 'node:crypto';
import { AIGatewayClient } from '../src/index.js';
import { loadLiveCredentials } from './live-credentials.js';
import { LiveHarness } from './e2e/harness.js';
const credentials = loadLiveCredentials();
const h = new LiveHarness();
const gw = new AIGatewayClient({ numRetries: 0 });
const tag = `sdk-e2e-${randomUUID().slice(0, 8)}`;
try {
  if (!process.argv.includes('--writes'))
    throw new Error('Pass --writes for an owned workspace fixture');
  const created = await h.check('workspaces.create.explicit-metadata', () =>
    gw.workspaces.create({
      name: tag,
      scope_name: `ws_sdkprobe_${randomUUID().slice(0, 8)}`,
      defaults: { metadata: {} },
    }),
  );
  if (created) {
    h.own('gateway.workspace', created.id, tag);
    h.defer('workspaces.archive', () => gw.workspaces.delete(created.id));
    await h.check('workspaces.get.admin', () => gw.workspaces.get(created.id, { plane: 'admin' }));
    await h.check('workspaces.update', () =>
      gw.workspaces.update(created.id, {
        description: 'Updated SDK fixture',
        defaults: { metadata: {} },
      }),
    );
  }
} catch (error) {
  await h.check('harness.unexpected', async () => {
    throw error;
  });
} finally {
  await h.cleanup();
  credentials.verifyUnchanged();
  h.finish('gateway-workspace', true);
}
