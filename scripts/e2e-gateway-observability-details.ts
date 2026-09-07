/** @internal Bounded runtime detail/update diagnostics on previously journaled synthetic records. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { AISecSDKException, ErrorType } from '../src/index.js';
import { runtimeSuite } from './e2e/gateway-runtime.js';

const scores = process.argv.includes('--scores');
await runtimeSuite(
  scores ? 'gateway-feedback-scores' : 'gateway-observability-details',
  async ({ harness, endpoint, apiKey, management }) => {
    assert.equal(endpoint, 'https://airs.cdot.io/v1');
    const prior = JSON.parse(readFileSync('artifacts/e2e/gateway-observability.json', 'utf8')) as {
      failed: number;
      credentialsUnchanged: boolean;
      fixtures: { resource: string; id: string; name: string }[];
    };
    assert.equal(prior.failed, 0);
    assert.equal(prior.credentialsUnchanged, true);
    const log = prior.fixtures.find((f) => f.resource === 'gateway.log-audit-record');
    const feedback = prior.fixtures.find((f) => f.resource === 'gateway.feedback-audit-record');
    assert(log && feedback);
    assert(log?.name.startsWith('sdk-e2e-inference-') && feedback?.name === log.name);
    const list = await management.telemetry.logs({
      workspaceSlug: 'ws-develo-71f8d8',
      traceId: log.id,
    });
    const row = list.data.records.find((r) => r.trace_id === log.id);
    assert(row);
    await harness.check('observability-details.owned-log-control', async () => ({ found: true }));
    for (const variant of scores ? [] : (['native', 'iso'] as const)) {
      await harness.check(`observability-details.log.${variant}`, async () => {
        const url = new URL(`${endpoint}/logs/${encodeURIComponent(row.id)}`);
        url.searchParams.set('path_format', row.log_store_file_path_format);
        url.searchParams.set(
          'created_at',
          variant === 'native'
            ? row.created_at
            : new Date(
                row.created_at.endsWith('Z')
                  ? row.created_at
                  : row.created_at.replace(' ', 'T') + 'Z',
              ).toISOString(),
        );
        const response = await fetch(url, {
          headers: { 'x-portkey-api-key': apiKey },
          redirect: 'error',
          signal: AbortSignal.timeout(15_000),
        });
        const raw = await response.text();
        let value: unknown = raw;
        try {
          value = JSON.parse(raw);
        } catch {
          /* Status still identifies the response. */
        }
        harness.captureResponseShape(`log-detail.${variant}`, value);
        if (!response.ok)
          throw new AISecSDKException(
            'Owned runtime log detail failed',
            response.status >= 500 ? ErrorType.SERVER_SIDE_ERROR : ErrorType.CLIENT_SIDE_ERROR,
            { statusCode: response.status, failureKind: 'http' },
          );
        return value;
      });
    }
    const attempts = scores
      ? [
          {
            name: 'positive-score-zero-weight',
            method: 'PUT',
            body: { value: 1, weight: 0, metadata: { sdk_e2e: feedback.name } },
          },
          { name: 'positive-score-minimal-metadata', method: 'PUT', body: { value: 1, weight: 0 } },
          {
            name: 'restore-neutral',
            method: 'PUT',
            body: { value: 0, weight: 0, metadata: { sdk_e2e: feedback.name } },
          },
        ]
      : ['PUT', 'POST'].map((method) => ({
          name: method,
          method,
          body: { value: 0, weight: 0, metadata: { sdk_e2e: feedback.name } },
        }));
    for (const { name, method, body } of attempts) {
      await harness.check(`observability-details.feedback.${name}`, async () => {
        // PUT is the declared operation; POST appears in the pinned curl sample. Neither is
        // counted as implementation merely because the probe runs or returns an error.
        const response = await fetch(`${endpoint}/feedback/${encodeURIComponent(feedback.id)}`, {
          method,
          headers: { 'x-portkey-api-key': apiKey, 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          redirect: 'error',
          signal: AbortSignal.timeout(15_000),
        });
        const raw = await response.text();
        console.log(
          JSON.stringify({
            diagnostic: 'owned-feedback-update',
            method,
            status: response.status,
            missingBody: /JSON|Unexpected end|body/i.test(raw),
            missingRoute: /not found|route|URL/i.test(raw),
            authorization: /unauthorized|api.key|credential|permission/i.test(raw),
          }),
        );
        let value: unknown = raw;
        try {
          value = JSON.parse(raw);
        } catch {
          /* Retain only response shape. */
        }
        harness.captureResponseShape(`feedback-update.${name}`, value);
        if (!response.ok)
          throw new AISecSDKException(
            'Owned feedback update failed',
            response.status >= 500 ? ErrorType.SERVER_SIDE_ERROR : ErrorType.CLIENT_SIDE_ERROR,
            { statusCode: response.status, failureKind: 'http' },
          );
        return value;
      });
    }
  },
);
