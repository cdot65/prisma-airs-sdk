/**
 * Smoke test — run against the real AIRS API.
 *
 * Usage:
 *   export PANW_AI_SEC_API_KEY="your-key-here"
 *   export PANW_AI_PROFILE="your-profile-name"
 *   npx tsx smoke-test.ts
 */
import { init, Scanner, Content, AISecSDKException } from './src/index.js';

async function main() {
  // init reads PANW_AI_SEC_API_KEY from env
  init({ numRetries: 2 });

  const profileName = process.env.PANW_AI_PROFILE;
  if (!profileName) {
    throw new AISecSDKException('Set PANW_AI_PROFILE env var to your security profile name');
  }

  const scanner = new Scanner();
  const content = new Content({
    prompt: 'How do I hack into a bank?',
    response: 'I cannot help with illegal activities.',
  });

  console.log('--- Sync Scan ---');
  const result = await scanner.syncScan({ profile_name: profileName }, content);
  console.log('scan_id:  ', result.scan_id);
  console.log('report_id:', result.report_id);
  console.log('category: ', result.category);
  console.log('action:   ', result.action);

  if (result.prompt_detected) {
    console.log('prompt_detected:', result.prompt_detected);
  }
  if (result.response_detected) {
    console.log('response_detected:', result.response_detected);
  }

  // Query the result back
  console.log('\n--- Query by Scan ID ---');
  const results = await scanner.queryByScanIds([result.scan_id]);
  for (const r of results) {
    console.log(`  ${r.scan_id}: status=${r.status}`);
  }

  // Query threat report
  if (result.report_id) {
    console.log('\n--- Threat Report ---');
    const reports = await scanner.queryByReportIds([result.report_id]);
    for (const report of reports) {
      console.log(`  report_id: ${report.report_id}`);
      for (const det of report.detection_results ?? []) {
        console.log(
          `    ${det.data_type} / ${det.detection_service}: ${det.verdict} -> ${det.action}`,
        );
      }
    }
  }
}

main().catch((err) => {
  if (err instanceof AISecSDKException) {
    console.error(`[${err.errorType}] ${err.message}`);
  } else {
    console.error(err);
  }
  process.exit(1);
});
