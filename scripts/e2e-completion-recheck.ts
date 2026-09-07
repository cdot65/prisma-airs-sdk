/** @internal Read-only completion control: confirm authentication works and recheck the denied quota API. */
import { RedTeamClient } from '../src/index.js';
import { loadLiveCredentials } from './live-credentials.js';
import { LiveHarness } from './e2e/harness.js';

const credentials = loadLiveCredentials();
const harness = new LiveHarness();
const client = new RedTeamClient({ numRetries: 0 });
try {
  await harness.check('redTeam.languages.authenticationControl', () => client.getLanguages());
  await harness.check('redTeam.quota.authorizationRecheck', () => client.getQuota());
} finally {
  credentials.verifyUnchanged();
  harness.finish('completion-recheck', true);
}
