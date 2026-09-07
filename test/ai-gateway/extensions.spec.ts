import { describe, expect, it } from 'vitest';
import fixtures from '../openapi/fixtures/gateway.json';
import { resolveValidator, requestSchemaName } from '../../scripts/openapi/validators.js';
import {
  GatewayMcpServersClientUpdateCapabilitiesRequestSchema,
  GatewayUsageLimitsClientCreateRequestSchema,
  GatewayLogExportsClientCreateRequestSchema,
} from '../../src/models/ai-gateway-extensions.js';
import { GatewayIntegrationModelsResponseSchema } from '../../src/models/ai-gateway.js';
import { queryParams } from '../../src/http/query.js';
import { GatewayMcpServersClientListOptionsSchema } from '../../src/models/ai-gateway-extensions.js';

describe('gateway extension request boundaries', () => {
  it.each([0, 1, false, true, null])(
    'accepts the live SCM model flag representation: %s',
    (flag) => {
      expect(
        GatewayIntegrationModelsResponseSchema.parse({
          models: [{ slug: 'owned-model', enabled: true, is_custom: flag, is_finetune: flag }],
          allow_all_models: false,
          object: 'list',
        }).models[0].is_custom,
      ).toBe(flag);
    },
  );
  it('rejects arbitrary numeric model flags instead of widening to any number', () => {
    expect(
      GatewayIntegrationModelsResponseSchema.safeParse({
        models: [{ slug: 'owned-model', enabled: true, is_custom: 2 }],
        allow_all_models: false,
        object: 'list',
      }).success,
    ).toBe(false);
  });
  it('validates query keys and preserves zero-valued pagination', () => {
    expect(
      queryParams({ page_size: 1, current_page: 0 }, GatewayMcpServersClientListOptionsSchema),
    ).toEqual({ page_size: '1', current_page: '0' });
    expect(() => queryParams({ pageSize: 1 }, GatewayMcpServersClientListOptionsSchema)).toThrow(
      'unrecognized_keys',
    );
    expect(() => queryParams({ page_size: '1' }, GatewayMcpServersClientListOptionsSchema)).toThrow(
      'invalid_type',
    );
  });
  for (const fixture of fixtures.cases.filter((item) => item.body))
    it(`rejects unknown root fields: ${fixture.call.member} ${fixture.path}`, () => {
      const validator = resolveValidator(requestSchemaName(fixture.call));
      expect(validator).toBeDefined();
      expect(validator!.safeParse(fixture.body).success).toBe(true);
      expect(validator!.safeParse({ ...fixture.body, sdk_accidental_typo: true }).success).toBe(
        false,
      );
    });
  it('does not treat Portkey-only catalog enums as a closed SCM contract', () => {
    const valid = fixtures.cases.find(
      (item) => item.call.member === 'create' && item.path === '/policies/usage-limits',
    )!.body;
    expect(
      GatewayUsageLimitsClientCreateRequestSchema.safeParse({ ...valid, type: 'future-scm-unit' })
        .success,
    ).toBe(true);
  });
  it('requires the live-verified SCM export description and time bounds', () => {
    expect(
      GatewayLogExportsClientCreateRequestSchema.safeParse({
        workspace_id: 'workspace',
        filters: {},
        requested_data: ['id'],
      }).success,
    ).toBe(false);
    expect(
      GatewayLogExportsClientCreateRequestSchema.safeParse({
        workspace_id: 'workspace',
        description: 'owned export',
        filters: { time_of_generation_min: '2026-09-05', time_of_generation_max: '2026-09-06' },
        requested_data: ['id'],
      }).success,
    ).toBe(true);
  });
  it('rejects mistyped stable nested MCP fields', () => {
    expect(
      GatewayMcpServersClientUpdateCapabilitiesRequestSchema.safeParse({
        capabilities: [{ name: 'test', type: 'tool', enabled: 'false' }],
      }).success,
    ).toBe(false);
  });
  it.each([Infinity, NaN, new Date('2026-01-01T00:00:00.000Z'), () => {}, undefined])(
    'rejects non-JSON values in an explicit extension map: %s',
    (value) => {
      expect(
        GatewayLogExportsClientCreateRequestSchema.safeParse({
          description: 'owned export',
          filters: {
            time_of_generation_min: '2026-09-05',
            time_of_generation_max: '2026-09-06',
            metadata: { extra: value },
          },
          requested_data: ['id'],
        }).success,
      ).toBe(false);
    },
  );
});
