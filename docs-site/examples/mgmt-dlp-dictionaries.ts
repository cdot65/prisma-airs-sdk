import { reportExampleError } from './example-support.js';
import { exampleName, recordExampleFixture } from './example-support.js';
import { ManagementClient } from '@cdot65/prisma-airs-sdk';

async function main() {
  const client = new ManagementClient({ numRetries: 0 });
  let ownedId: string | undefined;

  try {
    console.log('Listing dictionaries...');
    const page = await client.dlp.dictionaries.list({ size: 5 });
    console.log(`  totalElements=${page.totalElements} returned=${page.content.length}`);
    for (const d of page.content) {
      console.log(`  - ${d.name ?? '(unnamed)'} id=${d.id ?? '?'}`);
    }

    if (!process.argv.includes('--writes')) {
      console.log('Read-only: pass --writes for an owned dictionary lifecycle.');
      return;
    }
    // Use the tenant's display name (live-verified: United States), not an AWS region code.
    const region =
      process.env.PANW_DLP_DICTIONARY_REGION ??
      page.content.find((d) => d.region_name)?.region_name;
    if (!region) throw new Error('Set PANW_DLP_DICTIONARY_REGION to the tenant dictionary region');
    console.log('\nCreating example dictionary (multipart upload)...');
    const created = await client.dlp.dictionaries.create({
      metadata: {
        category: 'Confidential',
        name: exampleName,
        original_file_name: 'keywords.txt',
        region_name: region,
        type: 'custom',
      },
      file: 'alpha\nbravo\ncharlie\n',
      includeKeywords: true,
    });
    console.log(`  created id=${created.id}`);

    const id = created.id;
    if (id) {
      ownedId = id;
      recordExampleFixture('dlp.dictionary', id);
      console.log(`\nGetting ${id} with keywords...`);
      const got = await client.dlp.dictionaries.get(id, { includeKeywords: true });
      console.log(`  name=${got.name} keywords=${got.keywords?.length ?? 0}`);

      console.log('\nReplacing with extra keyword (PUT may return 200+body or 204+empty)...');
      const replaced = await client.dlp.dictionaries.replace(id, {
        metadata: {
          category: 'Confidential',
          name: got.name ?? 'example',
          original_file_name: 'keywords.txt',
          region_name: got.region_name ?? region,
          type: 'custom',
        },
        file: 'alpha\nbravo\ncharlie\ndelta\n',
      });
      if (replaced) console.log(`  200 — id=${replaced.id ?? '?'}`);
      else console.log('  204 — empty body');

      console.log('\nDeleting...');
      await client.dlp.dictionaries.delete(id);
      ownedId = undefined;
      console.log('  deleted (204)');
    }
  } catch (error) {
    reportExampleError(error);
  } finally {
    if (ownedId) await client.dlp.dictionaries.delete(ownedId);
  }
}

main().catch(reportExampleError);
