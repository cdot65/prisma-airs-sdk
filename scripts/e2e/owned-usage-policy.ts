/** @internal Fail-closed ownership checks before resetting a live policy counter. */
import assert from 'node:assert/strict';
import type { GatewayUsageLimitsPolicy, GatewayUsageLimitsPolicyEntity } from '../../src/index.js';

export interface OwnedUsagePolicy {
  id: string;
  workspaceId: string;
  tag: string;
}

export function assertOwnedUsagePolicy(policy: GatewayUsageLimitsPolicy, owned: OwnedUsagePolicy) {
  assert.match(owned.tag, /^sdk-e2e-inference-[0-9a-f]{8}-usage-reset$/);
  assert.equal(policy.id, owned.id);
  assert.equal(policy.workspace_id, owned.workspaceId);
  assert.equal(policy.name, owned.tag);
  assert.equal(policy.status, 'active');
  assert.equal(policy.type, 'tokens');
  assert.equal(policy.credit_limit, 1_000_000);
  assert.equal(policy.conditions?.length, 1);
  assert.equal(policy.conditions[0].key, 'metadata.sdk_e2e_tag');
  assert.equal(policy.conditions[0].value, owned.tag);
  assert.equal(policy.conditions[0].excludes, undefined);
  assert.deepEqual(
    policy.group_by?.map(({ key }) => key),
    ['metadata.sdk_e2e_tag'],
  );
}

export function assertOwnedUsageEntity(
  entity: GatewayUsageLimitsPolicyEntity,
  tag: string,
): asserts entity is GatewayUsageLimitsPolicyEntity & { id: string; current_usage: number } {
  assert(typeof entity.id === 'string');
  assert(entity.id.length > 0 && entity.id.length <= 512);
  assert.equal(entity.value_key, `metadata.sdk_e2e_tag:${tag}`);
  assert(typeof entity.current_usage === 'number');
  assert(Number.isFinite(entity.current_usage) && entity.current_usage >= 0);
}
