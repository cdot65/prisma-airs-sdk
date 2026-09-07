import assert from 'node:assert/strict';
import { ManagementClient } from '@cdot65/prisma-airs-sdk';
import { exampleName, recordExampleFixture, reportExampleError } from './example-support.js';

async function main() {
  const client = new ManagementClient({ numRetries: 0 });
  const page = await client.profiles.list({ limit: 5 });
  console.log('Profiles returned:', page.ai_profiles.length);
  if (!process.argv.includes('--writes')) {
    console.log('Read-only: pass --writes for an owned profile lifecycle.');
    return;
  }
  const actor = 'sdk-example@example.invalid';
  const policy = page.ai_profiles.find((profile) => profile.active && profile.policy)?.policy;
  assert(policy, 'An active policy is required for the disposable example clone');
  const body = {
    profile_name: exampleName,
    active: true,
    policy,
    created_by: actor,
    updated_by: actor,
  };
  try {
    const created = await client.profiles.create(body);
    assert(created.profile_id);
    recordExampleFixture('management.profile', created.profile_id);
    console.log('Created owned profile');
    assert.equal((await client.profiles.get(created.profile_id)).profile_name, exampleName);
    const updated = await client.profiles.update(created.profile_id, {
      ...body,
      revision: created.revision,
    });
    if (updated.profile_id) recordExampleFixture('management.profile', updated.profile_id);
    console.log('Updated owned profile');
  } finally {
    // Updates can assign new UUIDs. Discover every revision of this run's unique name,
    // including a successful write whose response could not be validated.
    const owned = (await client.profiles.listAll({ latest: false })).filter(
      (profile) => profile.profile_name === exampleName && profile.active !== false,
    );
    const failures: unknown[] = [];
    for (const profile of owned) {
      if (!profile.profile_id) continue;
      recordExampleFixture('management.profile', profile.profile_id);
      try {
        await client.profiles.delete(profile.profile_id);
      } catch (error) {
        failures.push(error);
      }
    }
    if (failures.length) throw new AggregateError(failures, 'Owned profile cleanup failed');
    console.log('Deleted owned profile revisions:', owned.length);
  }
}
main().catch(reportExampleError);
