/** @internal HTTP verification of the locally served static Docusaurus candidate. */
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const base = new URL('http://127.0.0.1:4173/prisma-airs-sdk/');
const pages = [
  '',
  'developer/openapi-conformance',
  'developer/live-validation-results',
  'developer/gateway-coverage',
  'developer/architecture',
  'developer/error-handling',
  'getting-started/environment-variables',
  'guides/scan-api',
  'guides/management-api',
  'guides/model-security-api',
  'guides/red-team-api',
  'guides/ai-gateway-api',
  'guides/ai-gateway-inference',
  'guides/ai-gateway-model-pricing',
  'guides/examples',
  'guides/oauth-lifecycle',
  'reference/api',
];
const results: { path: string; status: number; kind: 'page' | 'asset' }[] = [];
const assets = new Set<string>();
const cleanup = JSON.parse(
  readFileSync(
    fileURLToPath(new URL('../artifacts/e2e/cleanup-audit.json', import.meta.url)),
    'utf8',
  ),
) as { total: number };
const unit = JSON.parse(
  readFileSync(fileURLToPath(new URL('../artifacts/unit-tests.json', import.meta.url)), 'utf8'),
) as { numTotalTests: number; numPassedTests: number };
assert.equal(unit.numTotalTests, unit.numPassedTests, 'The SDK test evidence contains failures');
const examples = JSON.parse(
  readFileSync(
    fileURLToPath(new URL('../artifacts/examples/latest.json', import.meta.url)),
    'utf8',
  ),
) as { finishedAt: string };
const batch = JSON.parse(
  readFileSync(
    fileURLToPath(new URL('../artifacts/examples/gateway-batch.json', import.meta.url)),
    'utf8',
  ),
) as { capturedAt: string };
const secretReferences = JSON.parse(
  readFileSync(
    fileURLToPath(new URL('../artifacts/examples/gateway-secret-references.json', import.meta.url)),
    'utf8',
  ),
) as { capturedAt: string };
const audit = JSON.parse(
  readFileSync(fileURLToPath(new URL('../artifacts/openapi/audit.json', import.meta.url)), 'utf8'),
) as { gateway: { directOperations: number; total: number } };
const observability = JSON.parse(
  readFileSync(
    fileURLToPath(new URL('../artifacts/examples/gateway-observability.json', import.meta.url)),
    'utf8',
  ),
) as { capturedAt: string };
const analyticsFilters = JSON.parse(
  readFileSync(
    new URL('../artifacts/examples/gateway-analytics-request-filters.json', import.meta.url),
    'utf8',
  ),
) as { capturedAt: string };
const liveReportTimestamps = [
  ...readFileSync(
    fileURLToPath(
      new URL('../docs-site/docs/developer/live-validation-results.md', import.meta.url),
    ),
    'utf8',
  ).matchAll(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}Z/g),
].map((match) => match[0]);
const deploymentEvidence = JSON.parse(
  readFileSync(
    new URL('../artifacts/e2e/gateway-deployment-diagnostics-evidence.json', import.meta.url),
    'utf8',
  ),
) as { checkedAt: string; bundleSha256: string };
assert(liveReportTimestamps.length > 0, 'Live result timestamps are missing');
const runtimeDiagnostics = JSON.parse(
  readFileSync(
    new URL('../artifacts/examples/gateway-runtime-diagnostics.json', import.meta.url),
    'utf8',
  ),
) as { finishedAt: string }[];
for (const page of pages) {
  const response = await fetch(new URL(page, base), { signal: AbortSignal.timeout(10_000) });
  assert.equal(response.status, 200, `Documentation page failed: ${page}`);
  const html = await response.text();
  if (page === 'developer/live-validation-results')
    for (const timestamp of liveReportTimestamps)
      assert(html.includes(timestamp), `Built live results are stale: ${timestamp}`);
  if (page === 'guides/examples') {
    assert(html.includes(batch.capturedAt), 'Batch example output is stale');
    assert(html.includes(secretReferences.capturedAt), 'Secret-reference example output is stale');
    assert(html.includes(observability.capturedAt), 'Runtime observability output is stale');
    assert(html.includes(analyticsFilters.capturedAt), 'Request-chart filter output is stale');
    for (const diagnostic of runtimeDiagnostics)
      assert(html.includes(diagnostic.finishedAt), 'Runtime diagnostic example output is stale');
    assert(html.includes(deploymentEvidence.checkedAt), 'Deployment evidence timestamp is stale');
    assert(
      html.includes(deploymentEvidence.bundleSha256),
      'Deployment source fingerprint is stale',
    );
  }
  if (page === 'developer/gateway-coverage')
    assert(
      html.includes(`${audit.gateway.directOperations}/${audit.gateway.total}`),
      'Gateway operation ledger is stale',
    );
  if (page === 'guides/ai-gateway-inference')
    for (const phrase of [
      'Experimental detail and feedback update',
      'getLog()',
      'updateFeedback()',
      'HTTP 500',
    ])
      assert(html.includes(phrase), `Missing current detail-method guidance: ${phrase}`);
  if (['guides/examples', 'guides/scan-api', 'guides/oauth-lifecycle'].includes(page))
    assert(html.includes(examples.finishedAt), `${page}: captured example output is stale`);
  assert(
    /<html/i.test(html) && /<title\b[^>]*>[^<]+<\/title>/.test(html),
    `Invalid HTML page: ${page}`,
  );
  if (page === 'developer/live-validation-results')
    assert(
      html.includes(String(cleanup.total)) && html.includes('cli-writes'),
      'Live-results page is stale',
    );
  if (page === 'developer/openapi-conformance')
    assert(
      html.includes(unit.numTotalTests.toLocaleString('en-US')) && html.includes('array-valued'),
      'Conformance page is stale',
    );
  results.push({ path: new URL(page, base).pathname, status: response.status, kind: 'page' });
  for (const match of html.matchAll(/(?:src|href)=(?:"([^"]+)"|'([^']+)'|([^\s>]+))/g)) {
    const url = new URL((match[1] ?? match[2] ?? match[3]).replaceAll('&amp;', '&'), response.url);
    if (
      url.origin === base.origin &&
      (url.pathname.startsWith(`${base.pathname}assets/`) ||
        url.pathname.startsWith(`${base.pathname}img/`))
    )
      assets.add(url.href);
  }
}
assert(assets.size >= 3, 'No meaningful static asset inventory was discovered');
for (const asset of assets) {
  const response = await fetch(asset, { signal: AbortSignal.timeout(10_000) });
  assert.equal(response.status, 200, `Documentation asset failed: ${new URL(asset).pathname}`);
  const bytes = await response.arrayBuffer();
  assert(bytes.byteLength > 0, 'Empty documentation asset');
  results.push({ path: new URL(asset).pathname, status: response.status, kind: 'asset' });
}
const report = {
  checkedAt: new Date().toISOString(),
  baseUrl: base.href,
  pages: pages.length,
  assets: assets.size,
  passed: true,
  browserInteractionVerified: false,
  capturedExampleTimestamp: examples.finishedAt,
  capturedBatchTimestamp: batch.capturedAt,
  capturedSecretReferenceTimestamp: secretReferences.capturedAt,
  capturedObservabilityTimestamp: observability.capturedAt,
  capturedAnalyticsFilterTimestamp: analyticsFilters.capturedAt,
  capturedRuntimeDiagnosticTimestamps: runtimeDiagnostics.map((report) => report.finishedAt),
  capturedDeploymentTimestamp: deploymentEvidence.checkedAt,
  deploymentBundleSha256: deploymentEvidence.bundleSha256,
  liveReportTimestampCount: liveReportTimestamps.length,
  gatewayDirectOperations: audit.gateway.directOperations,
  sdkTests: unit.numTotalTests,
  cleanupTotal: cleanup.total,
  results,
};
const directory = fileURLToPath(new URL('../artifacts/docs/', import.meta.url));
mkdirSync(directory, { recursive: true });
writeFileSync(`${directory}preview.json`, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ ...report, results: undefined }));
