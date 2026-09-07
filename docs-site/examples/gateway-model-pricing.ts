/** Public catalog read; no environment variables or credentials are needed. */
import { AIGatewayModelPricingClient } from '@cdot65/prisma-airs-sdk';
import { reportExampleError } from './example-support.js';

async function main() {
  const pricing = new AIGatewayModelPricingClient({
    endpoint: 'https://api.portkey.ai', // Public catalog: no /v1, SCM OAuth or gateway key.
    timeoutMs: 15_000,
  });
  const output = [];
  for (const model of ['gpt-5.6-terra', 'text-embedding-3-small']) {
    const result = await pricing.get('openai', model);
    output.push({
      provider: 'openai',
      model,
      currency: result.currency,
      units: 'USD cents per token',
      request_token: result.pay_as_you_go?.request_token,
      response_token: result.pay_as_you_go?.response_token,
    });
  }
  console.log(JSON.stringify(output, null, 2));
}

main().catch(reportExampleError);
