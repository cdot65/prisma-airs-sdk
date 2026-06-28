import { RedTeamClient, AISecSDKException } from '@cdot65/prisma-airs-sdk';

async function main() {
  // Uses PANW_MGMT_* env vars as fallback for auth
  const client = new RedTeamClient();

  try {
    // --- LIST SCANS ---
    console.log('Listing red team scans...');
    const scans = await client.scans.list({ limit: 5 });
    console.log(`Found ${scans.pagination?.total_items ?? 0} total scans:`);
    for (const job of scans.data ?? []) {
      console.log(`  - ${job.uuid}: ${job.name ?? 'unnamed'} [${job.status}] (${job.job_type})`);
    }

    // --- GET SCAN DETAILS ---
    if (scans.data?.length) {
      const jobId = scans.data[0].uuid;
      console.log(`\nGetting scan details for ${jobId}...`);
      const detail = await client.scans.get(jobId);
      console.log('  Name:', detail.name);
      console.log('  Status:', detail.status);
      console.log('  Type:', detail.job_type);
    }

    // --- LIST CATEGORIES ---
    console.log('\nListing attack categories...');
    const categories = await client.scans.getCategories();
    for (const cat of categories) {
      console.log(`  - ${cat.display_name}: ${cat.sub_categories?.length ?? 0} subcategories`);
    }

    // --- LIST TARGETS ---
    console.log('\nListing targets...');
    const targets = await client.targets.list({ limit: 5 });
    console.log(`Found ${targets.pagination?.total_items ?? 0} total targets:`);
    for (const t of targets.data ?? []) {
      console.log(`  - ${t.uuid}: ${t.name} [${t.status}] (${t.target_type})`);
    }

    // --- QUOTA (may require additional permissions) ---
    try {
      console.log('\nChecking quota...');
      const quota = await client.getQuota();
      console.log('  Quota:', JSON.stringify(quota, null, 2));
    } catch {
      console.log('  Quota not available (may require elevated permissions)');
    }

    // --- DASHBOARD (may require additional permissions) ---
    try {
      console.log('\nGetting scan statistics...');
      const stats = await client.getScanStatistics();
      console.log('  Stats:', JSON.stringify(stats, null, 2));
    } catch {
      console.log('  Statistics not available (may require elevated permissions)');
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
