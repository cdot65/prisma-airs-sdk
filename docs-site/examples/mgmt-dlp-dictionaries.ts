import { ManagementClient, AISecSDKException } from '@cdot65/prisma-airs-sdk';

async function main() {
  const client = new ManagementClient();

  try {
    console.log('Listing dictionaries...');
    const page = await client.dlp.dictionaries.list({ size: 5 });
    console.log(`  totalElements=${page.totalElements} returned=${page.content.length}`);
    for (const d of page.content) {
      console.log(`  - ${d.name ?? '(unnamed)'} id=${d.id ?? '?'}`);
    }

    console.log('\nCreating example dictionary (multipart upload)...');
    const created = await client.dlp.dictionaries.create({
      metadata: {
        category: 'Confidential',
        name: `sdk-example-${Date.now()}`,
        original_file_name: 'keywords.txt',
        region_name: 'us-west-2',
        type: 'custom',
      },
      file: 'alpha\nbravo\ncharlie\n',
      includeKeywords: true,
    });
    console.log(`  created id=${created.id}`);

    const id = created.id;
    if (id) {
      console.log(`\nGetting ${id} with keywords...`);
      const got = await client.dlp.dictionaries.get(id, { includeKeywords: true });
      console.log(`  name=${got.name} keywords=${got.keywords?.length ?? 0}`);

      console.log('\nReplacing with extra keyword (PUT may return 200+body or 204+empty)...');
      const replaced = await client.dlp.dictionaries.replace(id, {
        metadata: {
          category: 'Confidential',
          name: got.name ?? 'example',
          original_file_name: 'keywords.txt',
          region_name: got.region_name ?? 'us-west-2',
          type: 'custom',
        },
        file: 'alpha\nbravo\ncharlie\ndelta\n',
      });
      if (replaced) console.log(`  200 — id=${replaced.id ?? '?'}`);
      else console.log('  204 — empty body');

      console.log('\nDeleting...');
      await client.dlp.dictionaries.delete(id);
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
