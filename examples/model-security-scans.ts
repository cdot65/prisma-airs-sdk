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
    const groups = await client.securityGroups.list({
      limit: 10,
      sort_field: 'created_at',
      sort_dir: 'desc',
    });
    console.log(`Found ${groups.pagination?.total_items ?? 0} security groups:`);
    for (const g of groups.security_groups) {
      console.log(`  - ${g.uuid}: ${g.name} [${g.state}]`);
    }

    // --- LIST GROUPS WITH SOURCE TYPE FILTER ---
    console.log('\nListing Hugging Face security groups...');
    const hfGroups = await client.securityGroups.list({
      source_types: ['HUGGING_FACE'],
    });
    console.log(`Found ${hfGroups.pagination?.total_items ?? 0} HF groups`);

    // --- LIST RULE INSTANCES FOR A GROUP ---
    if (groups.security_groups.length) {
      const groupId = groups.security_groups[0].uuid;
      console.log(`\nListing rule instances for group ${groupId}...`);
      const instances = await client.securityGroups.listRuleInstances(groupId, {
        limit: 20,
      });
      console.log(`  Found ${instances.pagination?.total_items ?? 0} rule instances`);
      for (const ri of instances.rule_instances) {
        console.log(`    - ${ri.uuid}: ${ri.rule.name} [${ri.state}]`);
      }

      // Filter by state
      const blocking = await client.securityGroups.listRuleInstances(groupId, {
        state: 'BLOCKING',
      });
      console.log(`  Blocking instances: ${blocking.rule_instances.length}`);
    }

    // --- LIST SECURITY RULES ---
    console.log('\nListing security rules...');
    const rules = await client.securityRules.list({ limit: 20 });
    console.log(`Found ${rules.pagination?.total_items ?? 0} security rules:`);
    for (const r of rules.rules) {
      console.log(`  - ${r.uuid}: ${r.name} [${r.rule_type}]`);
    }

    // --- LIST RULES WITH SOURCE TYPE FILTER ---
    console.log('\nListing Hugging Face rules...');
    const hfRules = await client.securityRules.list({ source_type: 'HUGGING_FACE' });
    console.log(`Found ${hfRules.pagination?.total_items ?? 0} HF rules`);

    // --- SEARCH RULES ---
    console.log('\nSearching rules for "pickle"...');
    const pickleRules = await client.securityRules.list({ search_query: 'pickle' });
    console.log(`Found ${pickleRules.pagination?.total_items ?? 0} matching rules`);
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
