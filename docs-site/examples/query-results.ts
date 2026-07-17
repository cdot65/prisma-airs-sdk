import { init, Scanner, AISecSDKException } from '@cdot65/prisma-airs-sdk';

async function main() {
  init();

  const scanner = new Scanner();

  try {
    // Query results by scan IDs (up to 5)
    const results = await scanner.queryByScanIds(['550e8400-e29b-41d4-a716-446655440000']);

    // One scan ID can produce multiple unordered rows. Never key only by scan_id or array index.
    for (const r of results) {
      console.log(`Scan ${r.scan_id}, request ${r.req_id}: status=${r.status}`);
      if (r.result) {
        console.log(`  category=${r.result.category} action=${r.result.action}`);
      }
    }

    // Query threat reports by report IDs (up to 5)
    const reports = await scanner.queryByReportIds(['report-id-here']);

    // Report IDs can fan out too; correlate each row with (report_id, req_id).
    for (const report of reports) {
      console.log(`Report ${report.report_id}, request ${report.req_id}:`);
      for (const det of report.detection_results ?? []) {
        console.log(`  ${det.detection_service}: ${det.verdict} -> ${det.action}`);
      }
    }
  } catch (error) {
    if (error instanceof AISecSDKException) {
      console.error('Error:', error.message);
    }
  }
}

main().catch(console.error);
