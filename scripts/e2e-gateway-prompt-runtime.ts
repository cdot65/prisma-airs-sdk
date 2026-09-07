/** @internal Bounded raw/SDK prompt-route probes; no existing template or authoring setting is changed. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { AIGatewayInferenceClient, AISecSDKException, ErrorType } from '../src/index.js';
import { runtimeSuite } from './e2e/gateway-runtime.js';

const sdkMode = process.argv.includes('--sdk');
await runtimeSuite(
  sdkMode ? 'gateway-prompt-runtime-sdk' : 'gateway-prompt-runtime',
  async ({ harness, endpoint, apiKey }) => {
    assert.equal(endpoint, 'https://airs.cdot.io/v1');
    const sdk = new AIGatewayInferenceClient({ endpoint, apiKey, numRetries: 0 });
    const control = await harness.check('prompt-runtime.model-auth-control', async () => {
      const response = await sdk.retrieveModel('gpt-5.6-terra', {
        headers: { 'x-portkey-provider': '@openai' },
      });
      assert.equal(response.id, 'gpt-5.6-terra');
      return true;
    });
    assert(control, 'Model/authentication control must pass');
    // Authoring discovery could not provision an owned template. Never execute an existing one.
    // A random unprovisioned identifier diagnoses failure behavior, not successful rendering.
    const promptId = randomUUID();
    const body = {
      variables: { user_input: 'Reply with READY.' },
      model: '@openai/gpt-5.6-terra',
      max_completion_tokens: 16,
    };
    for (const suffix of ['render', 'completions'])
      await harness.check(`prompt-runtime.${suffix}.unprovisioned-template`, async () => {
        const options = { signal: AbortSignal.timeout(20_000) };
        if (sdkMode) {
          await (suffix === 'render'
            ? sdk.createPromptRender(promptId, body, options)
            : sdk.createPromptCompletion(promptId, body, options));
        } else {
          const response = await fetch(`${endpoint}/prompts/${promptId}/${suffix}`, {
            method: 'POST',
            headers: { 'x-portkey-api-key': apiKey, 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            redirect: 'error',
            signal: options.signal,
          });
          let value: unknown;
          try {
            value = await response.json();
          } catch {
            /* Do not record upstream scalar values. */
          }
          harness.captureResponseShape(`prompt-runtime.${suffix}`, value);
          if (!response.ok)
            throw new AISecSDKException(
              'Unprovisioned prompt diagnostic failed',
              response.status >= 500 ? ErrorType.SERVER_SIDE_ERROR : ErrorType.CLIENT_SIDE_ERROR,
              { statusCode: response.status },
            );
        }
        throw new Error('An unprovisioned template cannot certify a successful prompt workflow');
      });
  },
);
