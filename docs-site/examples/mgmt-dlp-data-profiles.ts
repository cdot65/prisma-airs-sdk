import { reportExampleError } from './example-support.js';
import { exampleName, recordExampleFixture } from './example-support.js';
import { ManagementClient } from '@cdot65/prisma-airs-sdk';

async function main() {
  const client = new ManagementClient({ numRetries: 0 });
  let ownedId: string | undefined;
  let ownedName = exampleName;

  try {
    console.log('Listing data profiles...');
    const page = await client.dlp.dataProfiles.list({ size: 5, sort: ['name,asc'] });
    console.log(`  totalElements=${page.totalElements} returned=${page.content.length}`);
    for (const p of page.content) {
      console.log(`  - ${p.name ?? '(unnamed)'} id=${p.id ?? '?'} type=${p.profile_type ?? '?'}`);
    }

    if (!process.argv.includes('--writes')) {
      console.log('Read-only: pass --writes for an owned advanced-profile lifecycle.');
      return;
    }
    // Advanced profiles reference real basic profiles; a bare regex rule without an
    // existing pattern ID is structurally valid JSON but is not an executable policy.
    const basic = page.content.find((profile) => profile.profile_type === 'basic' && profile.id);
    if (!basic?.id || !Number.isSafeInteger(Number(basic.id)))
      throw new Error('An existing basic data profile with a safe numeric ID is required');
    // The internal E2E runner can resume a journaled owned fixture after a failed
    // retirement, avoiding another create while the service cleanup path is broken.
    let created;
    if (process.env.E2E_DLP_PROFILE_ID && process.env.E2E_DLP_PROFILE_NAME) {
      ownedName = process.env.E2E_DLP_PROFILE_NAME;
      if (!/^sdk-example-[a-f0-9]{8}$/.test(ownedName)) throw new Error('Invalid fixture owner');
      created = await client.dlp.dataProfiles.get(process.env.E2E_DLP_PROFILE_ID);
      if (created.name !== ownedName) throw new Error('Fixture ownership does not match');
      console.log('Resuming a journaled owned profile');
    } else {
      console.log('\nCreating example data profile...');
      created = await client.dlp.dataProfiles.create({
        name: exampleName,
        profile_type: 'advanced',
        detection_rules: [
          {
            rule_type: 'multi_profile',
            multi_profile: {
              operator_type: 'or',
              data_profile_ids: [Number(basic.id)],
            },
          },
        ],
      });
    }
    console.log(`  created id=${created.id}`);

    const id = created.id;
    if (id) {
      ownedId = id;
      recordExampleFixture('dlp.profile', id, ownedName);
      console.log(`\nGetting ${id}...`);
      const got = await client.dlp.dataProfiles.get(id);
      console.log(`  name=${got.name} profile_type=${got.profile_type}`);

      console.log('\nPatching description...');
      const patched = await client.dlp.dataProfiles.patch(id, {
        name: got.name ?? 'example',
        profile_type: got.profile_type ?? 'advanced',
        description: 'Updated by SDK example',
      });
      console.log(`  description=${patched.description}`);

      console.log('\nNo DELETE endpoint: the finally block retires this owned profile.');
    }
  } catch (error) {
    reportExampleError(error);
  } finally {
    if (ownedId) {
      const owned = await client.dlp.dataProfiles.get(ownedId);
      const retired = await client.dlp.dataProfiles.patch(ownedId, {
        name: ownedName,
        profile_type: owned.profile_type ?? 'advanced',
        profile_status: 'deleted',
      });
      if (retired.profile_status !== 'deleted')
        throw new Error('Owned data profile was not retired');
      console.log('Owned data profile retired');
    }
  }
}

main().catch(reportExampleError);
