import { describe, expect, it } from 'vitest';
import {
  assertOwnedUsageEntity,
  assertOwnedUsagePolicy,
} from '../../scripts/e2e/owned-usage-policy.js';
import type { GatewayUsageLimitsPolicy } from '../../src/index.js';

const owned = {
  id: 'owned-policy',
  workspaceId: 'owned-workspace',
  tag: 'sdk-e2e-inference-1234abcd-usage-reset',
};
const valueKey = `metadata.sdk_e2e_tag:${owned.tag}`;
const policy: GatewayUsageLimitsPolicy = {
  id: owned.id,
  workspace_id: owned.workspaceId,
  name: owned.tag,
  status: 'active',
  type: 'tokens',
  credit_limit: 1_000_000,
  conditions: [{ key: 'metadata.sdk_e2e_tag', value: owned.tag }],
  group_by: [{ key: 'metadata.sdk_e2e_tag' }],
  organisation_id: 'fixture-organisation',
  created_at: '2026-09-07T00:00:00Z',
  last_updated_at: '2026-09-07T00:00:00Z',
};

describe('owned usage-counter reset safety', () => {
  it('accepts only the exact active isolated policy and a tagged finite counter', () => {
    expect(() => assertOwnedUsagePolicy(policy, owned)).not.toThrow();
    for (const current_usage of [0, 14])
      expect(() =>
        assertOwnedUsageEntity(
          { id: 'owned-entity', value_key: valueKey, current_usage },
          owned.tag,
        ),
      ).not.toThrow();
  });

  it.each([
    { id: 'unowned' },
    { workspace_id: 'unowned' },
    { name: 'unowned' },
    { status: 'archived' },
    { type: 'cost' },
    { credit_limit: 1 },
    { conditions: [] },
    { conditions: [{ key: 'workspace_id', value: owned.workspaceId }] },
    { conditions: [{ key: 'metadata.sdk_e2e_tag', value: 'another-tag' }] },
    { conditions: [{ key: 'metadata.sdk_e2e_tag', value: [owned.tag] }] },
    { conditions: [{ key: 'metadata.sdk_e2e_tag', value: owned.tag, excludes: 'anything' }] },
    { group_by: [{ key: 'api_key' }] },
  ])('rejects a changed policy boundary: %j', (patch) => {
    expect(() => assertOwnedUsagePolicy({ ...policy, ...patch }, owned)).toThrow();
  });

  it('rejects a tag outside the owned test namespace', () => {
    expect(() => assertOwnedUsagePolicy(policy, { ...owned, tag: 'production' })).toThrow();
  });

  it.each([
    { id: '', value_key: valueKey, current_usage: 1 },
    { id: 'entity', value_key: 'unowned', current_usage: 1 },
    { id: 'entity', value_key: valueKey, current_usage: -1 },
    { id: 'entity', value_key: valueKey, current_usage: Number.NaN },
    { id: 'entity', value_key: valueKey, current_usage: Number.POSITIVE_INFINITY },
    { id: 'entity', value_key: valueKey },
  ])('rejects an unowned or invalid counter: %j', (entity) => {
    expect(() => assertOwnedUsageEntity(entity, owned.tag)).toThrow();
  });
});
