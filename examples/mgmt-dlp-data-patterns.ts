import { ManagementClient, AISecSDKException } from '@cdot65/prisma-airs-sdk';

async function main() {
  const client = new ManagementClient();

  try {
    console.log('Listing data patterns...');
    const page = await client.dlp.dataPatterns.list({ size: 5, sort: ['name,asc'] });
    console.log(`  totalElements=${page.totalElements} returned=${page.content.length}`);
    for (const p of page.content) {
      console.log(`  - ${p.name ?? '(unnamed)'} id=${p.id ?? '?'} type=${p.type ?? '?'}`);
    }

    console.log('\nCreating example custom pattern...');
    const created = await client.dlp.dataPatterns.create({
      name: `sdk-example-${Date.now()}`,
      type: 'custom',
      detection_config: { technique: 'regex' },
      matching_rules: {
        regexes: [{ regex: '\\bexample\\b', weight: 1.0 }],
      },
    });
    console.log(`  created id=${created.id}`);

    const id = created.id;
    if (id) {
      console.log(`\nGetting ${id}...`);
      const got = await client.dlp.dataPatterns.get(id);
      console.log(`  name=${got.name}`);

      console.log('\nPatching description...');
      const patched = await client.dlp.dataPatterns.patch(id, {
        name: got.name ?? 'example',
        type: got.type ?? 'custom',
        detection_config: got.detection_config ?? { technique: 'regex' },
        description: 'Updated by SDK example',
      });
      console.log(`  description=${patched.description}`);

      console.log('\nDeleting...');
      await client.dlp.dataPatterns.delete(id);
      console.log('  deleted (204)');
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
