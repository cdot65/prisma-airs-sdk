import { reportExampleError } from './example-support.js';
import { exampleName, recordExampleFixture } from './example-support.js';
import { ManagementClient } from '@cdot65/prisma-airs-sdk';

async function main() {
  const client = new ManagementClient({ numRetries: 0 });
  let ownedId: string | undefined;

  try {
    console.log('Listing data patterns...');
    const page = await client.dlp.dataPatterns.list({ size: 5, sort: ['name,asc'] });
    console.log(`  totalElements=${page.totalElements} returned=${page.content.length}`);
    for (const p of page.content) {
      console.log(`  - ${p.name ?? '(unnamed)'} id=${p.id ?? '?'} type=${p.type ?? '?'}`);
    }

    if (!process.argv.includes('--writes')) {
      console.log('Read-only: pass --writes for an owned pattern lifecycle.');
      return;
    }
    console.log('\nCreating example custom pattern...');
    const created = await client.dlp.dataPatterns.create({
      name: exampleName,
      type: 'custom',
      detection_config: { technique: 'regex' },
      matching_rules: {
        regexes: [{ regex: '\\bexample\\b', weight: 1.0 }],
      },
    });
    console.log(`  created id=${created.id}`);

    const id = created.id;
    if (id) {
      ownedId = id;
      recordExampleFixture('dlp.pattern', id);
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
      ownedId = undefined;
      console.log('  deleted (204)');
    }
  } catch (error) {
    reportExampleError(error);
  } finally {
    if (ownedId) await client.dlp.dataPatterns.delete(ownedId);
  }
}

main().catch(reportExampleError);
