/** @internal Exercise typed detail/update methods on already journaled synthetic records only. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { AIGatewayInferenceClient } from '../src/index.js';
import { runtimeSuite } from './e2e/gateway-runtime.js';

await runtimeSuite(
  'gateway-observability-details-sdk',
  async ({ harness, endpoint, apiKey, management }) => {
    assert.equal(endpoint, 'https://airs.cdot.io/v1');
    const prior = JSON.parse(readFileSync('artifacts/e2e/gateway-observability.json', 'utf8')) as {
      failed: number;
      credentialsUnchanged: boolean;
      fixtures: { resource: string; id: string; name: string }[];
    };
    assert.equal(prior.failed, 0);
    assert.equal(prior.credentialsUnchanged, true);
    const log = prior.fixtures.find((item) => item.resource === 'gateway.log-audit-record');
    const feedback = prior.fixtures.find(
      (item) => item.resource === 'gateway.feedback-audit-record',
    );
    assert(log && feedback);
    assert(log.name.startsWith('sdk-e2e-inference-') && feedback.name === log.name);
    harness.protect(log);
    harness.protect(feedback);
    const page = await management.telemetry.logs({
      workspaceSlug: 'ws-develo-71f8d8',
      traceId: log.id,
      days: 1,
    });
    const row = page.data.records.find((item) => item.trace_id === log.id);
    assert(row, 'The exact owned log must remain visible in SCM');
    harness.protect(row);
    const tagIndex = row.metadataKey.indexOf('sdk_e2e');
    assert(tagIndex >= 0 && row.metadataValue[tagIndex] === log.name);
    await harness.check('observability-sdk.owned-log-control', async () => ({ found: true }));
    const inference = new AIGatewayInferenceClient({ endpoint, apiKey, numRetries: 0 });
    await harness.check('observability-sdk.runtime-model-auth-control', () =>
      inference.retrieveModel('gpt-5.6-terra', { headers: { 'x-portkey-provider': '@openai' } }),
    );
    const pathFormat = row.log_store_file_path_format;
    assert(pathFormat === 'v1' || pathFormat === 'v2');
    const createdAt = new Date(
      row.created_at.endsWith('Z') ? row.created_at : row.created_at.replace(' ', 'T') + 'Z',
    ).toISOString();
    await harness.check('observability-sdk.log-detail', async () => {
      const result = await inference.getLog(row.id, {
        path_format: pathFormat,
        created_at: createdAt,
      });
      harness.captureResponseShape('sdk.getLog', result);
      return { responseValidated: true };
    });
    await harness.check('observability-sdk.feedback-update-neutral', async () => {
      const result = await inference.updateFeedback(feedback.id, {
        value: 0,
        weight: 0,
        metadata: { sdk_e2e: feedback.name },
      });
      harness.captureResponseShape('sdk.updateFeedback', result);
      return { responseValidated: true };
    });
    // No log or feedback is created. Existing neutral synthetic audit records remain owned
    // by the original journal; runtimeSuite retires only this run's temporary runtime key.
  },
);
