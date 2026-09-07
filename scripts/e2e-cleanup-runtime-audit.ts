/** @internal Verify every journaled runtime fixture is gone, using a fresh disposable key. */
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { AIGatewayInferenceClient, AISecSDKException } from '../src/index.js';
import { runtimeSuite } from './e2e/gateway-runtime.js';

await runtimeSuite('cleanup-runtime-audit', async ({ harness, endpoint, apiKey }) => {
  const client = new AIGatewayInferenceClient({ endpoint, apiKey, numRetries: 0 });
  const options = { headers: { 'x-portkey-provider': '@openai' } };
  await harness.check('runtime.auth-positive-control', () =>
    client.retrieveModel('gpt-5.6-terra', options),
  );
  type Fixture = { resource: string; id: string };
  const fixtures = readdirSync('artifacts/e2e')
    .filter((name) => name.startsWith('fixtures-') && name.endsWith('.json'))
    .flatMap((name) => JSON.parse(readFileSync(`artifacts/e2e/${name}`, 'utf8')) as Fixture[]);
  const owned = [
    ...new Map(
      fixtures
        .filter((fixture) => fixture.resource.startsWith('gateway.runtime.'))
        .map((fixture) => [`${fixture.resource}:${fixture.id}`, fixture]),
    ).values(),
  ];
  for (const fixture of owned)
    await harness.check(`${fixture.resource}:${fixture.id}`, async () => {
      if (fixture.resource === 'gateway.runtime.batch-audit-record') {
        const batch = await client.retrieveBatch(fixture.id, options);
        assert(['completed', 'failed', 'expired', 'cancelled'].includes(batch.status));
        return {
          state: 'retained-terminal-batch-audit-record',
          verifiedWithFreshRuntimeCredential: true,
        };
      }
      const read =
        fixture.resource === 'gateway.runtime.files'
          ? () => client.retrieveFile(fixture.id, options)
          : fixture.resource === 'gateway.runtime.vector_stores'
            ? () => client.getVectorStore(fixture.id, options)
            : fixture.resource === 'gateway.runtime.responses'
              ? () => client.getResponse(fixture.id, {}, options)
              : undefined;
      assert(read, 'Unknown owned runtime fixture type');
      await assert.rejects(
        read,
        (error: unknown) => error instanceof AISecSDKException && error.statusCode === 404,
      );
      return { state: 'not-found', verifiedWithFreshRuntimeCredential: true };
    });
});
