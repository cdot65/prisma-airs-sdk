---
title: Public model pricing
---

# Public model pricing

`AIGatewayModelPricingClient` reads Portkey's public model catalog. It is independent of SCM
management and your deployed runtime: configure the catalog endpoint explicitly, without `/v1`.
The SDK accepts no authentication options, reads no credential environment variables and sends
neither OAuth, `x-tsg-id` nor `x-portkey-api-key`. HTTPS is required except on loopback.

```ts
import { AIGatewayModelPricingClient } from '@cdot65/prisma-airs-sdk';

const pricing = new AIGatewayModelPricingClient({
  endpoint: 'https://api.portkey.ai',
  timeoutMs: 15_000,
});
const result = await pricing.get('openai', 'text-embedding-3-small');
console.log(result.currency, result.pay_as_you_go?.request_token?.price);
```

Prices retain their documented **USD cents per token/unit** representation. The SDK does not
convert them to dollars, evaluate calculation expressions, cache a quote or calculate effective
tenant billing. Unknown fields such as newer batch and regional pricing data are preserved but
are not counted as typed coverage unless declared by the supplied schema. SCM cost telemetry
and configured custom integration pricing remain separate sources.

The constructor accepts an explicit endpoint, `timeoutMs`, `numRetries` and optional caller-owned
`fetch`. Retries default to zero; the maximum is five. `get(provider, model, { signal, timeoutMs })`
supports cancellation and a per-call deadline, including response reads. Timeouts must be positive
integers no greater than 2,147,483,647 ms (the Node timer limit). Redirects are rejected. Provider
and model names are encoded independently as path segments; no default or alternative model is
selected. A custom transport remains responsible for any headers it independently adds.

Both prescribed models passed the live public lookup, with full raw/parsed equality and no
credentials sent. The separate [runnable example](./examples.mdx#public-model-pricing) includes
actual timestamped output. Its catalog rates are not a price quote. Run it without secrets:

```bash
npx tsx docs-site/examples/gateway-model-pricing.ts
```

The pinned schema's calculation operation/value-reference variants have optional fields and
overlap. Its exclusive `oneOf` rejects a shallow formula containing an otherwise valid value
reference, while some deeper formulas pass through a permissive fallback. The development
contract correction uses `anyOf`; the SDK validates the declared fields on every node and never
executes formula data. Independent source-schema and captured-response tests cover this behavior;
the upstream YAML is unchanged.
