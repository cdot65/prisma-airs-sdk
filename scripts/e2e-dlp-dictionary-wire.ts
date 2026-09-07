/** @internal Compare documented multipart encodings using owned synthetic dictionaries. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { ManagementClient, OAuthClient, AISecSDKException, ErrorType } from '../src/index.js';
import { loadLiveCredentials } from './live-credentials.js';
import { LiveHarness } from './e2e/harness.js';
assert(process.argv.includes('--writes'));
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
  for (const encoding of ['text', 'json-blob'] as const) {
    for (const region of ['GLOBAL', 'us']) {
      const name = `sdk-example-${randomUUID().slice(0, 8)}`;
      const json = JSON.stringify({
        category: 'Confidential',
        name,
        original_file_name: 'keywords.txt',
        region_name: region,
      });
      const form = new FormData();
      if (encoding === 'text') form.append('json', json);
      else form.append('json', new Blob([json], { type: 'application/json' }), 'metadata.json');
      form.append(
        'file',
        new Blob(['alpha\nbravo\ncharlie\n'], { type: 'text/plain' }),
        'keywords.txt',
      );
      const response = await fetch('https://api.dlp.paloaltonetworks.com/v2/api/dictionaries', {
        method: 'POST',
        headers,
        body: form,
        redirect: 'error',
        signal: AbortSignal.timeout(20_000),
      });
      const status = response.status;
      console.log(JSON.stringify({ encoding, region, status }));
      if (!response.ok) {
        await response.body?.cancel();
        await h.check(`dictionary.${encoding}.${region}`, async () => {
          throw new AISecSDKException('Multipart variant rejected', ErrorType.CLIENT_SIDE_ERROR, {
            failureKind: 'http',
            statusCode: status,
          });
        });
        continue;
      }
      const body = (await response.json()) as { id?: string; name?: string };
      assert(body.id, 'A successful creation must expose its cleanup identifier');
      h.own('dlp.dictionary', body.id, name);
      h.defer('dictionary.delete', () => client.dlp.dictionaries.delete(body.id!));
      await h.check(`dictionary.${encoding}.${region}`, async () => {
        assert.equal(body.name, name);
        return { encoding, region, status };
      });
      await h.cleanup();
    }
  }
} finally {
  await h.cleanup();
  source.verifyUnchanged();
  h.finish('dlp-dictionary-wire', true);
}
