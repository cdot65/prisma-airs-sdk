/** @internal Retire an owned fixture only after the live server advertises DELETE. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ManagementClient, OAuthClient, AISecSDKException, ErrorType } from '../src/index.js';
import { loadLiveCredentials } from './live-credentials.js';
import { LiveHarness } from './e2e/harness.js';

assert(process.argv.includes('--writes'));
const journal = process.argv.find((arg) => arg.startsWith('--journal='))?.slice(10);
assert(journal && /^fixtures-[\dTZ.-]+\.json$/.test(journal));
const fixtures = JSON.parse(readFileSync(`artifacts/e2e/${journal}`, 'utf8')) as {
  resource: string;
  id: string;
  name: string;
}[];
const source = loadLiveCredentials();
const h = new LiveHarness();
const client = new ManagementClient({ numRetries: 0 });
const oauth = new OAuthClient({
  clientId: process.env.PANW_MGMT_CLIENT_ID!,
  clientSecret: process.env.PANW_MGMT_CLIENT_SECRET!,
  tsgId: process.env.PANW_MGMT_TSG_ID!,
});
try {
  const headers = { Authorization: `Bearer ${await oauth.getToken()}` };
  for (const fixture of fixtures.filter((item) => item.resource === 'dlp.profile')) {
    assert(/^sdk-example-[0-9a-f]{8}$/.test(fixture.name));
    const existing = await client.dlp.dataProfiles.get(fixture.id);
    assert.equal(existing.name, fixture.name, 'Resolve exact ownership before deletion');
    const endpoint = `https://api.dlp.paloaltonetworks.com/v2/api/data-profiles/${encodeURIComponent(fixture.id)}`;
    await h.check('dataProfiles.live-delete-capability', async () => {
      const response = await fetch(endpoint, {
        method: 'OPTIONS',
        headers,
        redirect: 'error',
        signal: AbortSignal.timeout(15_000),
      });
      await response.body?.cancel();
      assert.equal(response.status, 200);
      const allowed = (response.headers.get('allow') ?? '')
        .split(',')
        .map((method) => method.trim());
      assert(allowed.includes('DELETE'));
      return { allow: allowed };
    });
    assert.equal(h.results.at(-1)?.status, 'PASS', 'Deletion requires capability proof');
    await h.check('dataProfiles.delete-owned', async () => {
      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers,
        redirect: 'error',
        signal: AbortSignal.timeout(15_000),
      });
      await response.body?.cancel();
      if (response.status !== 204)
        throw new AISecSDKException(
          'Advertised DELETE not executable',
          ErrorType.SERVER_SIDE_ERROR,
          { failureKind: 'http', statusCode: response.status },
        );
    });
    await h.check('dataProfiles.independent-retirement-read', async () => {
      try {
        const row = await client.dlp.dataProfiles.get(fixture.id);
        assert.equal(row.profile_status, 'deleted');
        return { state: 'deleted' };
      } catch (error) {
        if (error instanceof AISecSDKException && error.statusCode === 404)
          return { state: 'not-found' };
        throw error;
      }
    });
  }
} finally {
  source.verifyUnchanged();
  h.finish('dlp-recovery', true);
}
