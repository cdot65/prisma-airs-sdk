import Ajv from 'ajv';
import { describe, expect, it } from 'vitest';
import { GatewayModelPricingConfigSchema } from '../../src/index.js';
import fixture from '../ai-gateway/fixtures/model-pricing-live.json';
import contracts from './validation/gateway-6.json';
import type { Schema } from '../../scripts/openapi/conformance.js';

const contract = contracts.contracts.find(
  (item) => item.validator === 'GatewayModelPricingConfigSchema',
)!;
const ajv = new Ajv({
  allErrors: true,
  nullable: true,
  unknownFormats: 'ignore',
  logger: false,
  validateSchema: false,
});
const corrected = ajv.compile(contract.schema);
const raw = structuredClone(contract.schema) as Schema;
const operands = raw.properties!.calculate.properties!.request.properties!.operands.items!;
operands.oneOf = operands.anyOf;
delete operands.anyOf;
const original = ajv.compile(raw);

describe('independent public-pricing live fixtures', () => {
  it('retains both prescribed models from the public no-authentication service', () => {
    expect(Object.keys(fixture.raw).sort()).toEqual(['gpt-5.6-terra', 'text-embedding-3-small']);
    expect(fixture.credentialsSent).toBe(false);
    expect(fixture.source).toBe('https://api.portkey.ai/model-configs/pricing/{provider}/{model}');
  });

  for (const [model, payload] of Object.entries(fixture.raw)) {
    it(`validates the actual ${model} response independently and preserves all fields`, () => {
      expect(corrected(payload), ajv.errorsText(corrected.errors)).toBe(true);
      expect(GatewayModelPricingConfigSchema.parse(payload)).toEqual(payload);
    });
    it(`demonstrates the pinned oneOf rejecting a shallow formula using ${model}'s captured leaf`, () => {
      const leaf = payload.calculate.request.operands[0].operands[0];
      const shallow = { calculate: { request: { operation: 'sum', operands: [leaf] } } };
      expect(corrected(shallow), ajv.errorsText(corrected.errors)).toBe(true);
      expect(original(shallow)).toBe(false);
      expect(original.errors?.some((error) => error.keyword === 'oneOf')).toBe(true);
    });
  }
});
