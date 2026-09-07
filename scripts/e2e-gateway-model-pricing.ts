/** @internal Read-only public catalog checks; no gateway key, OAuth or tenant headers. */
import assert from 'node:assert/strict';
import { AIGatewayModelPricingClient, type GatewayModelPricingConfig } from '../src/index.js';
import { loadLiveCredentials } from './live-credentials.js';
import { LiveHarness, writePrivateReport } from './e2e/harness.js';

const source = loadLiveCredentials();
const harness = new LiveHarness();
const endpoint = 'https://api.portkey.ai';
const models = ['gpt-5.6-terra', 'text-embedding-3-small'] as const;
const raw: Record<string, unknown> = {};
const output: {
  provider: string;
  model: string;
  currency: string;
  units: string;
  pay_as_you_go: GatewayModelPricingConfig['pay_as_you_go'];
  completeResponsePreserved: boolean;
}[] = [];
let requests = 0;
const nativeFetch = globalThis.fetch;
const pricing = new AIGatewayModelPricingClient({
  endpoint,
  timeoutMs: 15_000,
  fetch: async (input, init) => {
    const url = new URL(String(input));
    assert.equal(url.origin, endpoint);
    assert.equal(url.search, '');
    assert.equal(init?.method, 'GET');
    assert.equal(init?.redirect, 'error');
    assert.equal(init?.body, undefined);
    const model = url.pathname.split('/').at(-1)!;
    assert(models.some((candidate) => candidate === model));
    assert.equal(url.pathname, `/model-configs/pricing/openai/${model}`);
    const headers = new Headers(init?.headers);
    for (const name of ['authorization', 'x-tsg-id', 'x-portkey-api-key', 'cookie'])
      assert.equal(headers.has(name), false, 'Unexpected authentication on a public lookup');
    requests++;
    const response = await nativeFetch(input, init);
    if (response.ok) raw[model] = await response.clone().json();
    return response;
  },
});
try {
  for (const model of models)
    await harness.check(`model-pricing.${model}`, async () => {
      const result = await pricing.get('openai', model);
      assert.equal(result.currency, 'USD');
      assert.equal(typeof result.pay_as_you_go?.request_token?.price, 'number');
      assert.equal(typeof result.pay_as_you_go?.response_token?.price, 'number');
      assert.deepEqual(result, raw[model], 'The SDK changed public catalog data');
      output.push({
        provider: 'openai',
        model,
        currency: result.currency,
        units: 'USD cents per token/unit',
        pay_as_you_go: result.pay_as_you_go,
        completeResponsePreserved: true,
      });
      return result;
    });
  await harness.check('model-pricing.no-authentication-or-mutations', async () => {
    assert.equal(requests, 2);
    assert.equal(output.length, 2);
    source.verifyUnchanged();
  });
} finally {
  source.verifyUnchanged();
  harness.finish('gateway-model-pricing', true);
  writePrivateReport('artifacts/e2e/gateway-model-pricing-evidence.json', {
    capturedAt: harness.startedAt,
    finishedAt: new Date().toISOString(),
    endpoint,
    credentialsUnchanged: true,
    credentialsSent: false,
    mutations: false,
    disclosure:
      'Public Portkey catalog data, not a Prisma runtime response, effective tenant billing, or a price quote. Requests use the spec-declared public host without /v1 and no authentication. No model was used for inference and no model/provider setting changed. Prices are retained in the documented USD cents units; formulas are data only and not evaluated.',
    output,
    raw,
  });
}
