/** @internal Generate and reset usage only on a newly owned, uniquely tagged dev policy. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';
import { AIGatewayInferenceClient, AISecSDKException } from '../src/index.js';
import { runtimeSuite } from './e2e/gateway-runtime.js';
import { observeGatewayFixtures } from './e2e/gateway-fixtures.js';
import { writePrivateReport } from './e2e/harness.js';
import { assertOwnedUsageEntity, assertOwnedUsagePolicy } from './e2e/owned-usage-policy.js';

const suite = 'gateway-usage-reset';
assert.equal(process.env.E2E_GATEWAY_WORKSPACE ?? 'ws-develo-71f8d8', 'ws-develo-71f8d8');
assert.equal(
  process.env.E2E_GATEWAY_INFERENCE_ENDPOINT ?? 'https://airs.cdot.io/v1',
  'https://airs.cdot.io/v1',
);
const observations: Record<string, unknown> = {};
const finishFixtures = observeGatewayFixtures(suite);
try {
  await runtimeSuite(suite, async ({ harness, management, endpoint, apiKey, workspaceId, tag }) => {
    const policyTag = `${tag}-usage-reset`;
    const created = await harness.check('usage-policy.create-isolated', () =>
      management.usageLimits.create({
        name: policyTag,
        workspace_id: workspaceId,
        conditions: [{ key: 'metadata.sdk_e2e_tag', value: policyTag }],
        group_by: [{ key: 'metadata.sdk_e2e_tag' }],
        type: 'tokens',
        credit_limit: 1_000_000,
      }),
    );
    assert(created?.id, 'Cannot proceed without an owned policy ID');
    const policyId = created.id;
    harness.own('gateway.usage-policy', policyId, policyTag);
    harness.defer('usage-policy.archived-and-verified', async () => {
      await management.usageLimits.delete(policyId);
      try {
        const current = await management.usageLimits.get(policyId, { status: 'archived' });
        assert.equal(current.id, policyId);
        assert.equal(current.status, 'archived');
      } catch (error) {
        if (!(error instanceof AISecSDKException && error.statusCode === 404)) throw error;
      }
    });
    const owned = { id: policyId, workspaceId, tag: policyTag };
    const verified = await harness.check(
      'usage-policy.verify-scope-and-empty-baseline',
      async () => {
        assertOwnedUsagePolicy(await management.usageLimits.get(policyId), owned);
        const initial = await management.usageLimits.listEntities(policyId, { page_size: 100 });
        assert.deepEqual(initial.data, []);
        assert.equal(initial.total, 0);
        return true;
      },
    );
    if (!verified) return;

    // Allow a short control-plane propagation interval. Only one explicit, bounded
    // inference is sent; no automatic replay or alternate provider/model is used.
    await delay(5000);
    const inference = new AIGatewayInferenceClient({ endpoint, apiKey, numRetries: 0 });
    const completion = await harness.check('usage-policy.tagged-inference', () =>
      inference.createChatCompletion(
        {
          model: '@openai/gpt-5.6-terra',
          messages: [{ role: 'user', content: 'Reply with READY.' }],
          max_completion_tokens: 128,
        },
        {
          timeoutMs: 20_000,
          headers: { 'x-portkey-metadata': JSON.stringify({ sdk_e2e_tag: policyTag }) },
        },
      ),
    );
    if (!completion) return;
    observations.inferenceUsage = completion.usage;

    const entity = await harness.check('usage-policy.discover-owned-positive-counter', async () => {
      for (let attempt = 0; attempt < 30; attempt++) {
        const current = await management.usageLimits.listEntities(policyId, { page_size: 100 });
        observations.lastEntityInventory = current;
        writePrivateReport(`artifacts/e2e/${suite}-observations.json`, observations);
        assert.equal(
          current.data?.length,
          current.total,
          'Owned entity inventory must be complete',
        );
        assert(
          (current.total ?? 0) <= 1,
          'Unexpected additional policy entity; reset is prohibited',
        );
        const result = current.data?.[0];
        if (result) {
          assertOwnedUsageEntity(result, policyTag);
          if ((result.current_usage ?? 0) > 0) return result;
        }
        await delay(2000);
      }
      throw new Error(
        'No positive traffic-derived counter appeared within the bounded polling run',
      );
    });
    if (!entity?.id) return;

    const reset = await harness.check('usage-policy.reset-owned-counter', async () => {
      assertOwnedUsagePolicy(await management.usageLimits.get(policyId), owned);
      assertOwnedUsageEntity(entity, policyTag);
      return management.usageLimits.resetEntity(policyId, entity.id!);
    });
    if (!reset) return;
    await harness.check('usage-policy.verify-counter-zero', async () => {
      for (let attempt = 0; attempt < 10; attempt++) {
        const current = await management.usageLimits.listEntities(policyId, { page_size: 100 });
        assert.equal(current.total, 1);
        assert.equal(current.data?.length, 1);
        const after = current.data[0];
        assertOwnedUsageEntity(after, policyTag);
        assert.equal(after.id, entity.id);
        if (after.current_usage === 0) {
          observations.counterBefore = entity.current_usage;
          observations.counterAfter = after.current_usage;
          return after;
        }
        await delay(2000);
      }
      throw new Error('Owned usage did not reset to zero within the bounded polling run');
    });
  });
} finally {
  finishFixtures();
}
const report = JSON.parse(readFileSync(`artifacts/e2e/${suite}.json`, 'utf8')) as {
  finishedAt: string;
  failed: number;
  credentialsUnchanged: boolean;
};
writePrivateReport(`artifacts/e2e/${suite}-observations.json`, {
  ...observations,
  finishedAt: report.finishedAt,
  passed: report.failed === 0 && report.credentialsUnchanged,
});
