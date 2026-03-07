import { ModelSecurityClient, AISecSDKException } from '@cdot65/prisma-airs-sdk';

async function main() {
  // Uses PANW_MGMT_* env vars as fallback for auth
  const client = new ModelSecurityClient();

  try {
    // --- LIST SCANS ---
    console.log('Listing model security scans...');
    const scans = await client.scans.list({ limit: 5 });
    console.log(`Found ${scans.pagination?.total_items ?? 0} total scans:`);
    for (const scan of scans.scans) {
      console.log(`  - ${scan.uuid}: ${scan.name ?? 'unnamed'} [${scan.eval_outcome}]`);
    }

    // --- GET SCAN DETAILS ---
    if (scans.scans.length) {
      const scanId = scans.scans[0].uuid;
      console.log(`\nGetting scan details for ${scanId}...`);
      const detail = await client.scans.get(scanId);
      console.log('  Name:', detail.name);
      console.log('  Outcome:', detail.eval_outcome);
      console.log('  Created:', detail.created_at);

      // --- LIST EVALUATIONS ---
      console.log(`\nListing evaluations for scan ${scanId}...`);
      const evals = await client.scans.getEvaluations(scanId);
      console.log(`  Found ${evals.pagination?.total_items ?? 0} evaluations`);
      for (const ev of evals.evaluations) {
        console.log(`    - ${ev.uuid}: ${ev.rule_name} [${ev.result}]`);
      }

      // --- LIST FILES ---
      console.log(`\nListing files for scan ${scanId}...`);
      const files = await client.scans.getFiles(scanId);
      console.log(`  Found ${files.pagination?.total_items ?? 0} files`);
      for (const f of files.files) {
        console.log(`    - ${f.path} [${f.type}]`);
      }
    }

    // --- LIST SECURITY GROUPS ---
    console.log('\nListing security groups...');
    const groups = await client.securityGroups.list();
    console.log(`Found ${groups.pagination?.total_items ?? 0} security groups:`);
    for (const g of groups.security_groups) {
      console.log(`  - ${g.uuid}: ${g.name} [${g.state}]`);
    }

    // --- LIST SECURITY RULES ---
    console.log('\nListing security rules...');
    const rules = await client.securityRules.list();
    console.log(`Found ${rules.pagination?.total_items ?? 0} security rules:`);
    for (const r of rules.rules) {
      console.log(`  - ${r.uuid}: ${r.name} [${r.type}]`);
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
