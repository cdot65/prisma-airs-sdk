import { ManagementClient, AISecSDKException } from '@cdot65/prisma-airs-sdk';

async function main() {
  const client = new ManagementClient();

  try {
    console.log('Listing data filtering profiles...');
    const page = await client.dlp.dataFilteringProfiles.list({ size: 5 });
    console.log(`  totalElements=${page.totalElements} returned=${page.content.length}`);
    for (const p of page.content) {
      console.log(`  - ${p.name ?? '(unnamed)'} id=${p.id ?? '?'} direction=${p.direction ?? '?'}`);
    }

    if (page.content.length === 0) {
      console.log('No profiles to inspect — done.');
      return;
    }

    const first = page.content[0];
    const id = first.id;
    if (!id) {
      console.log('First profile has no id — skipping get/replace.');
      return;
    }

    console.log(`\nGetting profile ${id}...`);
    const got = await client.dlp.dataFilteringProfiles.get(id);
    console.log(
      `  name=${got.name ?? '?'} file_based=${got.file_based} non_file_based=${got.non_file_based}`,
    );

    // NOTE: replace is destructive — uncomment + adapt to a profile you own before running.
    // const replaced = await client.dlp.dataFilteringProfiles.replace(id, {
    //   file_based: got.file_based ?? true,
    //   non_file_based: got.non_file_based ?? true,
    //   description: got.description,
    //   data_profile_id: got.data_profile_id,
    // });
    // console.log('Replaced:', replaced.name);
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
