import { describe, expect, it } from 'vitest';
import { AIGatewayChartFiltersSchema } from '../../src/index.js';

describe('standalone chart filters for CLI pre-authentication validation', () => {
  it('accepts an omitted filter set without requiring a resolved workspace or credentials', () => {
    expect(AIGatewayChartFiltersSchema.parse({})).toEqual({});
  });
  it('returns a validated snapshot with zero, fractional cents and structured lists preserved', () => {
    const input = {
      statusCodes: [200, 446],
      aiOrgModels: ['openai__gpt-5.6-terra'],
      metadata: { environment: 'dev' },
      totalUnitsMin: 0,
      totalUnitsMax: 42,
      costMin: 0,
      costMax: 0.125,
    };
    const parsed = AIGatewayChartFiltersSchema.parse(input);
    expect(parsed).toEqual(input);
    expect(parsed).not.toBe(input);
    expect(parsed.statusCodes).not.toBe(input.statusCodes);
    expect(parsed.metadata).not.toBe(input.metadata);
  });
  it.each([
    { workspaceSlug: 'ws-dev' },
    { days: 1 },
    { totalUnitsMin: 2, totalUnitsMax: 1 },
    { costMin: 0.2, costMax: 0.1 },
    { statusCodes: [] },
    { statusCodes: ['200'] },
    { apiKeyIds: ['invalid'] },
    { aiOrgModels: ['openai__model,other__model'] },
    { totalUnitsMin: 1.5 },
    { costMin: Infinity },
    { metadata: { count: 1 } },
    { metadata: JSON.parse('{"__proto__":"unsafe"}') },
    { promptTokenMin: 1 },
  ])('rejects invalid or non-filter input %j', (input) => {
    expect(AIGatewayChartFiltersSchema.safeParse(input).success).toBe(false);
  });
});
