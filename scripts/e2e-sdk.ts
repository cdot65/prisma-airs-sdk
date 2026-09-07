/** @internal Live SDK checks. Credentials remain in memory; results contain no response bodies. */
import { loadLiveCredentials } from './live-credentials.js';
import {
  ManagementClient,
  ModelSecurityClient,
  RedTeamClient,
  AIGatewayClient,
} from '../src/index.js';
import { LiveHarness } from './e2e/harness.js';

const source = loadLiveCredentials();
const harness = new LiveHarness();
async function check(name: string, action: () => Promise<unknown>) {
  await harness.check(name, async () => {
    await action();
    return { requestSucceeded: true };
  });
}

try {
  const mgmt = new ManagementClient({ numRetries: 0 });
  const ms = new ModelSecurityClient({ numRetries: 0 });
  const rt = new RedTeamClient({ numRetries: 0 });
  const gw = new AIGatewayClient({ numRetries: 0 });
  await check('management.profiles.list', () => mgmt.profiles.list({ limit: 1 }));
  await check('management.topics.list', () => mgmt.topics.list({ limit: 1 }));
  await check('management.apiKeys.list', () => mgmt.apiKeys.list({ limit: 1 }));
  await check('management.profiles.listForToken', () => mgmt.profiles.listForToken({ limit: 1 }));
  await check('management.topics.listForToken', () => mgmt.topics.listForToken({ limit: 1 }));
  await check('management.apiKeys.listForToken', () => mgmt.apiKeys.listForToken({ limit: 1 }));
  await check('management.customerApps.listForToken', () =>
    mgmt.customerApps.listForToken({ limit: 1 }),
  );
  await check('modelSecurity.scans.list', () => ms.scans.list({ limit: 1 }));
  await check('modelSecurity.models.listModels', () => ms.models.listModels({ limit: 1 }));
  await check('modelSecurity.securityGroups.list', () => ms.securityGroups.list({ limit: 1 }));
  await check('modelSecurity.securityRules.list', () => ms.securityRules.list({ limit: 1 }));
  await check('modelSecurity.customRules.list', () => ms.customRules.list({ limit: 1 }));
  await check('modelSecurity.customRules.listVersions', () =>
    ms.customRules.listVersions({ limit: 1 }),
  );
  await check('modelSecurity.securityRules.listVersions', () =>
    ms.securityRules.listVersions({ limit: 1 }),
  );
  await check('redTeam.scans.list', () => rt.scans.list({ limit: 1 }));
  await check('redTeam.targets.list', () => rt.targets.list({ limit: 1 }));
  await check('redTeam.adapters.list', () => rt.adapters.list({ limit: 1 }));
  await check('redTeam.getLanguages', () => rt.getLanguages());
  await check('redTeam.getScanMetadata', () => rt.getScanMetadata());
  await check('redTeam.getGoalCategories', () => rt.getGoalCategories('APPLICATION'));
  await check('redTeam.adapters.getConfig', () => rt.adapters.getConfig());
  await check('aiGateway.workspaces.list', () => gw.workspaces.list());
  await check('aiGateway.workspaces.list.admin', () => gw.workspaces.list({ plane: 'admin' }));
  await check('aiGateway.integrations.list', () => gw.integrations.list());
} catch (error) {
  await harness.check('oauth-service-reads.prerequisites', async () => {
    throw error;
  });
} finally {
  source.verifyUnchanged();
  harness.finish('oauth-service-reads', true);
}
