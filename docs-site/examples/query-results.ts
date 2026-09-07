import { reportExampleError } from './example-support.js';
import { init, Scanner } from '@cdot65/prisma-airs-sdk';

// Pass real IDs from an earlier scan (e.g. the output of basic-scan.ts or async-scan.ts):
//   SCAN_IDS='uuid-1,uuid-2' REPORT_IDS='Ruuid-1' npx tsx docs-site/examples/query-results.ts
const scanIds = process.env.SCAN_IDS?.split(',')
  .map((id) => id.trim())
  .filter(Boolean);
const reportIds = process.env.REPORT_IDS?.split(',')
  .map((id) => id.trim())
  .filter(Boolean);

async function main() {
  if (!scanIds?.length || !reportIds?.length)
    throw new Error('Set SCAN_IDS and REPORT_IDS to real IDs from an earlier scan');
  init();

  const scanner = new Scanner();

  try {
    // Query results by scan IDs (up to 5)
    const results = await scanner.queryByScanIds(scanIds);

    // One scan ID can produce multiple unordered rows. Never key only by scan_id or array index.
    for (const r of results) {
      console.log(`Scan ${r.scan_id}, request ${r.req_id}: status=${r.status}`);
      if (r.result) {
        console.log(`  category=${r.result.category} action=${r.result.action}`);
      }
    }

    // Query threat reports by report IDs (up to 5)
    const reports = await scanner.queryByReportIds(reportIds);

    // Report IDs can fan out too; correlate each row with (report_id, req_id).
    for (const report of reports) {
      console.log(`Report ${report.report_id}, request ${report.req_id}:`);
      for (const det of report.detection_results ?? []) {
        console.log(`  ${det.detection_service}: ${det.verdict} -> ${det.action}`);
      }
    }
  } catch (error) {
    reportExampleError(error);
  }
}

main().catch(reportExampleError);
