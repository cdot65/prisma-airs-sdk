import { ManagementClient, AISecSDKException } from '@cdot65/prisma-airs-sdk';

async function main() {
  const client = new ManagementClient();

  try {
    console.log('Listing data profiles...');
    const page = await client.dlp.dataProfiles.list({ size: 5, sort: ['name,asc'] });
    console.log(`  totalElements=${page.totalElements} returned=${page.content.length}`);
    for (const p of page.content) {
      console.log(`  - ${p.name ?? '(unnamed)'} id=${p.id ?? '?'} type=${p.profile_type ?? '?'}`);
    }

    console.log('\nCreating example data profile...');
    const created = await client.dlp.dataProfiles.create({
      name: `sdk-example-${Date.now()}`,
      detection_rules: [
        {
          rule_type: 'expression_tree',
          expression_tree: {
            operator_type: 'and',
            rule_item: {
              detection_technique: 'regex',
              match_type: 'include',
            },
          },
        },
      ],
    });
    console.log(`  created id=${created.id}`);

    const id = created.id;
    if (id) {
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

      // Data profiles have no DELETE — lifecycle removal is patch-driven.
      console.log('\nNo DELETE endpoint for data profiles — done.');
    }
  } catch (error) {
    if (error instanceof AISecSDKException) {
      console.error('Error:', error.message);
      console.error('Type:', error.errorType);
    } else {
      throw error;
    }
  }
}

main().catch(console.error);
