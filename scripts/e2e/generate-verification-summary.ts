/** @internal Reconcile retained reports; stale browser/package evidence is never a current pass. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, realpathSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { emitPatch } from '../openapi/emit-patch.js';
import { liveReportSuites, runtimeDiagnosticSuites } from './report-suites.js';

const root = fileURLToPath(new URL('../../', import.meta.url));
const read = <T>(path: string): T => JSON.parse(readFileSync(resolve(root, path), 'utf8')) as T;
interface UnitReport {
  numTotalTests: number;
  numPassedTests: number;
  numFailedTests: number;
  startTime: number;
  testResults: {
    name: string;
    endTime: number;
    assertionResults: { status: string; fullName: string }[];
  }[];
}
const currentUnit = read<UnitReport>('artifacts/unit-tests.json');
const coverage = read<{
  total: Record<
    'lines' | 'statements' | 'functions' | 'branches',
    { pct: number; covered: number; total: number }
  >;
}>('coverage/coverage-summary.json');
assert.deepEqual(
  coverage.total.statements,
  coverage.total.lines,
  'Combined assessment line/statement counts require identical evidence',
);
const assessment = readFileSync(resolve(root, 'SDK-ASSESSMENT.md'), 'utf8');
for (const [name, key] of [
  ['Statements/lines', 'lines'],
  ['functions', 'functions'],
  ['branches', 'branches'],
] as const) {
  const metric = coverage.total[key];
  const percentage = metric.pct.toFixed(2).replace(/\.00$/, '');
  const fraction = `${metric.covered.toLocaleString('en-US')}/${metric.total.toLocaleString('en-US')}`;
  assert(
    assessment.includes(`${name} ${percentage}% (${fraction})`),
    `Assessment ${key} counts differ from current coverage evidence`,
  );
}
const testIdentity = (report: UnitReport) =>
  JSON.stringify(
    report.testResults
      .flatMap((test) => test.assertionResults.map((result) => `${test.name}:${result.fullName}`))
      .sort(),
  );
const offline = [
  'unit-tests',
  'node18-tests',
  'node20-tests',
  'node24-tests',
  'cli-tests',
  'cli-live-tests',
].map((name) => {
  const report = read<UnitReport>(`artifacts/${name}.json`);
  assert.equal(
    report.numTotalTests,
    report.testResults.reduce((n, test) => n + test.assertionResults.length, 0),
  );
  assert.equal(
    report.numPassedTests,
    report.testResults
      .flatMap((test) => test.assertionResults)
      .filter((result) => result.status === 'passed').length,
  );
  return {
    name,
    startedAt: new Date(report.startTime).toISOString(),
    finishedAt: new Date(Math.max(...report.testResults.map((test) => test.endTime))).toISOString(),
    total: report.numTotalTests,
    passed: report.numPassedTests,
    failed: report.numFailedTests,
    files: report.testResults.length,
    revision:
      name === 'cli-tests' ||
      (testIdentity(report) === testIdentity(currentUnit) &&
        report.startTime >= currentUnit.startTime)
        ? 'current candidate'
        : 'retained earlier revision; not a current-candidate matrix result',
  };
});
interface LiveReport {
  startedAt: string;
  finishedAt: string;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  credentialsUnchanged: boolean;
  results: { status: string }[];
}
const live = liveReportSuites.map((name) => {
  const { results, ...report } = read<LiveReport>(`artifacts/e2e/${name}.json`);
  assert.equal(report.total, results.length, `${name}: inconsistent total`);
  for (const [status, count] of [
    ['PASS', report.passed],
    ['FAIL', report.failed],
    ['SKIP', report.skipped],
  ] as const)
    assert.equal(
      results.filter((result) => result.status === status).length,
      count,
      `${name}: inconsistent ${status}`,
    );
  assert.equal(report.credentialsUnchanged, true, `${name}: credential source changed`);
  return {
    name,
    startedAt: report.startedAt,
    finishedAt: report.finishedAt,
    total: report.total,
    passed: report.passed,
    failed: report.failed,
    skipped: report.skipped,
    credentialsUnchanged: true,
  };
});
const previous = read<{ baselineCommit: string; runtime: object; cliDocs: object }>(
  'artifacts/verification-summary.json',
);
const audit = read<{
  generatedAt: string;
  sources: { operations: number; implemented: number }[];
  airs: {
    requests: { percentage: number };
    responses: { percentage: number };
    positiveRequest: { passed: number; total: number };
    positiveResponse: { passed: number; total: number };
    negativeRequest: { passed: number; total: number };
    query: { passed: number; total: number };
  };
  gateway: {
    directOperations: number;
    total: number;
    operations: { status: string }[];
    requests: object;
    responses: object;
    experimental: object;
    sha256: string;
  };
}>('artifacts/openapi/audit.json');
const candidate = read<{
  checkedAt: string;
  version: string;
  archive: string;
  installed: string;
  sha256: string;
  bytes: number;
  verifiedPayloadFiles: string[];
  installedPayloadIdentical: boolean;
  sourceMapVerifiedSourceFiles: number;
  runtimeExports: number;
  formats: string[];
  strictNodeNextTypesPassed: boolean;
  telemetryFilterWireAndPreAuthValidationPassed: boolean;
  providerHttpFormatsAndMultipartPassed: boolean;
  legacyPromptJsonAndSsePassed: boolean;
  publicPricingNoAuthAndTypesPassed: boolean;
  oauthDeadlineAndRecoveryPassed: boolean;
  observabilityDetailsContractsPassed: boolean;
  passed: boolean;
  nodeVersion: string;
}>('artifacts/package/verification.json');
const cliRoot = process.env.CLI_COMPAT_DIR ?? resolve(root, '../prisma-airs-cli');
const link = realpathSync(resolve(cliRoot, 'node_modules/@cdot65/prisma-airs-sdk'));
assert.equal(link, candidate.installed, 'CLI dependency differs from verified package consumer');
const cliPackage = read<{ dependencies: Record<string, string> }>(resolve(cliRoot, 'package.json'));
const unit = currentUnit;
const packageMatrix = [18, 20, 24].map((major) =>
  read<typeof candidate>(`artifacts/package/verification-node${major}.json`),
);
assert.equal(candidate.telemetryFilterWireAndPreAuthValidationPassed, true);
assert.equal(candidate.providerHttpFormatsAndMultipartPassed, true);
assert.equal(candidate.legacyPromptJsonAndSsePassed, true);
assert.equal(candidate.publicPricingNoAuthAndTypesPassed, true);
assert.equal(candidate.oauthDeadlineAndRecoveryPassed, true);
assert.equal(candidate.observabilityDetailsContractsPassed, true);
for (const entry of packageMatrix) {
  assert(entry.passed && entry.installedPayloadIdentical && entry.strictNodeNextTypesPassed);
  assert.equal(entry.telemetryFilterWireAndPreAuthValidationPassed, true);
  assert.equal(entry.providerHttpFormatsAndMultipartPassed, true);
  assert.equal(entry.legacyPromptJsonAndSsePassed, true);
  assert.equal(entry.publicPricingNoAuthAndTypesPassed, true);
  assert.equal(entry.oauthDeadlineAndRecoveryPassed, true);
  assert.equal(entry.observabilityDetailsContractsPassed, true);
  assert.equal(
    entry.sha256,
    candidate.sha256,
    'Matrix package evidence references another archive',
  );
  assert.equal(entry.installed, candidate.installed, 'Matrix package consumer differs');
}
const contractTests = unit.testResults
  .filter((test) => test.name.includes('/test/openapi/'))
  .flatMap((test) => test.assertionResults);
const examples = read<{ startedAt: string; finishedAt: string; output: { exitCode: number }[] }>(
  'artifacts/examples/latest.json',
);
const preview = read<{
  passed: boolean;
  capturedExampleTimestamp?: string;
  capturedBatchTimestamp?: string;
  capturedSecretReferenceTimestamp?: string;
  capturedObservabilityTimestamp?: string;
  capturedAnalyticsFilterTimestamp?: string;
  liveReportTimestampCount?: number;
  capturedRuntimeDiagnosticTimestamps?: string[];
  capturedDeploymentTimestamp?: string;
  deploymentBundleSha256?: string;
  gatewayDirectOperations?: number;
  cleanupTotal?: number;
  sdkTests?: number;
}>('artifacts/docs/preview.json');
const browser = read<{
  passed: boolean;
  capturedExampleTimestamp: string;
  capturedBatchTimestamp?: string;
  capturedSecretReferenceTimestamp?: string;
  capturedObservabilityTimestamp?: string;
  capturedAnalyticsFilterTimestamp?: string;
  capturedRuntimeDiagnosticTimestamps?: string[];
  capturedDeploymentTimestamp?: string;
  deploymentBundleSha256?: string;
}>('artifacts/docs/browser.json');
const cliBrowser = read<{ passed: boolean; capturedExampleTimestamp: string }>(
  'artifacts/docs/cli-browser.json',
);
const cliExample = read<{ capturedAt: string }>('artifacts/examples/cli-inference.json');
const batchExample = read<{ capturedAt: string; suite: { passed: number; total: number } }>(
  'artifacts/examples/gateway-batch.json',
);
assert.equal(
  batchExample.capturedAt,
  live.find((report) => report.name === 'gateway-batches')?.finishedAt,
);
const cleanup = live.find((report) => report.name === 'cleanup-audit')!;
const secretReferenceExample = read<{
  capturedAt: string;
  suite: { passed: number; total: number; failed: number };
}>('artifacts/examples/gateway-secret-references.json');
assert.equal(
  secretReferenceExample.capturedAt,
  live.find((report) => report.name === 'gateway-secret-references')?.finishedAt,
);
assert.equal(secretReferenceExample.suite.failed, 0);
const observabilityExample = read<{ capturedAt: string }>(
  'artifacts/examples/gateway-observability.json',
);
assert.equal(
  observabilityExample.capturedAt,
  live.find((report) => report.name === 'gateway-observability')?.finishedAt,
);
const analyticsFilterExample = read<{
  capturedAt: string;
  credentialsUnchanged: boolean;
  mutations: boolean;
  suite: { passed: number; failed: number; total: number };
  output: unknown;
}>('artifacts/examples/gateway-analytics-request-filters.json');
const analyticsFilterSuite = live.find(
  (report) => report.name === 'gateway-analytics-request-filters',
)!;
assert.equal(analyticsFilterExample.capturedAt, analyticsFilterSuite.finishedAt);
assert.equal(analyticsFilterExample.credentialsUnchanged, true);
assert.equal(analyticsFilterExample.mutations, false);
assert.deepEqual(analyticsFilterExample.suite, {
  passed: analyticsFilterSuite.passed,
  failed: analyticsFilterSuite.failed,
  total: analyticsFilterSuite.total,
});
assert.equal(analyticsFilterSuite.passed, 3);
assert.equal(analyticsFilterSuite.total, 3);
assert.deepEqual(analyticsFilterExample.output, {
  traceId: { knownTotal: 1, absentTotal: 0 },
  metadata: { knownMatched: true, absentTotal: 0 },
});
const deploymentEvidence = read<{
  startedAt: string;
  checkedAt: string;
  bundleSha256: string;
  credentialsUnchanged: boolean;
  mutations: boolean;
  observations: unknown[];
}>('artifacts/e2e/gateway-deployment-diagnostics-evidence.json');
const deploymentSuite = live.find((report) => report.name === 'gateway-deployment-diagnostics')!;
assert.equal(deploymentEvidence.startedAt, deploymentSuite.startedAt);
assert.equal(deploymentEvidence.credentialsUnchanged, true);
assert.equal(deploymentEvidence.mutations, false);
assert.equal(deploymentSuite.passed, 5);
assert.equal(deploymentSuite.total, 5);
assert.equal(deploymentEvidence.observations.length, 2);
assert.deepEqual(deploymentEvidence.observations[0], deploymentEvidence.observations[1]);
const docsCurrent =
  preview.passed &&
  preview.liveReportTimestampCount === live.length &&
  browser.passed &&
  preview.capturedExampleTimestamp === examples.finishedAt &&
  browser.capturedExampleTimestamp === examples.finishedAt &&
  preview.capturedBatchTimestamp === batchExample.capturedAt &&
  browser.capturedBatchTimestamp === batchExample.capturedAt &&
  preview.capturedSecretReferenceTimestamp === secretReferenceExample.capturedAt &&
  browser.capturedSecretReferenceTimestamp === secretReferenceExample.capturedAt &&
  preview.capturedObservabilityTimestamp === observabilityExample.capturedAt &&
  browser.capturedObservabilityTimestamp === observabilityExample.capturedAt &&
  preview.capturedAnalyticsFilterTimestamp === analyticsFilterExample.capturedAt &&
  browser.capturedAnalyticsFilterTimestamp === analyticsFilterExample.capturedAt &&
  [preview, browser].every(
    (result) =>
      result.capturedDeploymentTimestamp === deploymentEvidence.checkedAt &&
      result.deploymentBundleSha256 === deploymentEvidence.bundleSha256,
  ) &&
  [preview, browser].every(
    (result) =>
      JSON.stringify(result.capturedRuntimeDiagnosticTimestamps) ===
      JSON.stringify(
        runtimeDiagnosticSuites.map(
          (name) => live.find((report) => report.name === name)?.finishedAt,
        ),
      ),
  ) &&
  preview.gatewayDirectOperations === audit.gateway.directOperations &&
  preview.cleanupTotal === cleanup.total &&
  preview.sdkTests === unit.numTotalTests;
const hash = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');
const runtimeDiagnostics = read<
  {
    suite: string;
    finishedAt: string;
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    transport?: Record<string, unknown>;
    results: { name: string; status: string; statusCode?: number }[];
  }[]
>('artifacts/examples/gateway-runtime-diagnostics.json');
assert.deepEqual(
  runtimeDiagnostics.map((report) => report.suite),
  runtimeDiagnosticSuites,
);
const realtimeEvidence = read<Record<string, unknown>>(
  'artifacts/e2e/gateway-realtime-evidence.json',
);
const authoringBoundary = read<{
  checkedAt: string;
  startedAt: string;
  observations: {
    providerHeader: boolean;
    status: number;
    successful: boolean;
    missingProviderOrConfig: boolean;
  }[];
}>('artifacts/e2e/gateway-authoring-boundary.json');
assert.equal(
  authoringBoundary.startedAt,
  live.find((suite) => suite.name === 'gateway-runtime-authoring')?.startedAt,
);
assert(
  authoringBoundary.observations
    .filter((row) => row.providerHeader)
    .every((row) => row.status === 404 && !row.successful && !row.missingProviderOrConfig),
  'Review authoring provider-boundary claims if observations change',
);
for (const diagnostic of runtimeDiagnostics) {
  const original = read<
    Omit<LiveReport, 'results'> & {
      results: { name: string; status: string; statusCode?: number }[];
    }
  >(`artifacts/e2e/${diagnostic.suite}.json`);
  assert.deepEqual(
    diagnostic,
    {
      suite: diagnostic.suite,
      finishedAt: original.finishedAt,
      passed: original.passed,
      failed: original.failed,
      skipped: original.skipped,
      total: original.total,
      ...(diagnostic.suite === 'gateway-realtime'
        ? {
            transport: Object.fromEntries(
              [
                'outcome',
                'upgraded',
                'statusCode',
                'sessionCreated',
                'closed',
                'eventTypes',
                'clientEventsSent',
                'errorCode',
                'modelErrorReported',
              ].map((key) => [key, realtimeEvidence[key]]),
            ),
          }
        : diagnostic.suite === 'gateway-runtime-authoring'
          ? {
              transport: {
                observedAt: authoringBoundary.checkedAt,
                withoutProvider: {
                  requests: authoringBoundary.observations.filter((row) => !row.providerHeader)
                    .length,
                  httpStatus: 400,
                  missingProviderOrConfig: authoringBoundary.observations
                    .filter((row) => !row.providerHeader)
                    .every((row) => row.status === 400 && row.missingProviderOrConfig),
                },
                withPrescribedProvider: {
                  requests: authoringBoundary.observations.filter((row) => row.providerHeader)
                    .length,
                  httpStatus: 404,
                  successful: authoringBoundary.observations.filter(
                    (row) => row.providerHeader && row.successful,
                  ).length,
                },
                authoringAvailabilityEstablished: authoringBoundary.observations.some(
                  (row) => row.successful,
                ),
              },
            }
          : {}),
      results: original.results.map(({ name, status, statusCode }) => ({
        name,
        status,
        ...(statusCode === undefined ? {} : { statusCode }),
      })),
    },
    'Runtime diagnostic example differs from its actual result records',
  );
}
assert.equal(
  hash(candidate.archive),
  candidate.sha256,
  'Candidate archive changed after verification',
);
const currentSourceMatchesPackage = candidate.verifiedPayloadFiles.every((file) => {
  if (!readFileSync(resolve(root, file)).equals(readFileSync(resolve(candidate.installed, file))))
    return false;
  if (!file.endsWith('.map')) return true;
  const map = read<{ sources: string[]; sourcesContent: string[] }>(
    resolve(candidate.installed, file),
  );
  return (
    map.sources.length === map.sourcesContent.length &&
    map.sources.every((source, index) => {
      const path = resolve(dirname(resolve(root, file)), source);
      assert(path.startsWith(resolve(root, 'src') + '/'), 'Unexpected packaged source-map path');
      return readFileSync(path, 'utf8') === map.sourcesContent[index];
    })
  );
});
const dispositions: Record<string, number> = {};
for (const operation of audit.gateway.operations)
  dispositions[operation.status] = (dispositions[operation.status] ?? 0) + 1;
const coreSuites = [
  'gateway-observability-details-sdk',
  'oauth-service-reads',
  'gateway-model-pricing',
  'gateway-realtime',
  'gateway-legacy-completions-sdk',
  'gateway-prompt-runtime-sdk',
  'gateway-provider-http-sdk',
  'gateway-analytics-request-filters',
  'gateway-observability',
  'gateway-secret-references',
  'gateway-batches',
  'gateway-batches-cancel',
  'gateway-vector-batches',
  'scan',
  'management',
  'model-security',
  'red-team',
  'gateway-read',
  'gateway-extensions',
  'gateway-owned-writes',
  'cli',
  'cli-writes',
  'gateway-inference',
  'gateway-runtime-resources',
  'cli-inference',
];
const allPortkeyTargetMet = audit.gateway.directOperations / audit.gateway.total >= 0.99;
const airsTargetMet =
  audit.sources.every((source) => source.implemented === source.operations) &&
  audit.airs.requests.percentage >= 99 &&
  audit.airs.responses.percentage >= 99 &&
  [
    audit.airs.positiveRequest,
    audit.airs.positiveResponse,
    audit.airs.negativeRequest,
    audit.airs.query,
  ].every((check) => check.total > 0 && check.passed === check.total);
const allMainLiveChecksPassed = live
  .filter((report) => coreSuites.includes(report.name))
  .every((report) => report.failed === 0 && report.skipped === 0);
emitPatch(
  'artifacts/verification-summary.json',
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      baselineCommit: previous.baselineCommit,
      candidate: {
        ...candidate,
        currentSourceMatchesPackage,
        published: false,
        cliWorktree: cliRoot,
        cliEntry: 'dist/cli/index.js',
        cliEntrySha256: hash(resolve(cliRoot, 'dist/cli/index.js')),
        cliDevelopmentSdkLink: link,
        cliPublishedSdkPin: cliPackage.dependencies['@cdot65/prisma-airs-sdk'],
        cleanInstallReleaseReady: false,
      },
      offline,
      openapiGate: {
        total: contractTests.length,
        passed: contractTests.filter((test) => test.status === 'passed').length,
      },
      coverage: coverage.total,
      packageConsumption: {
        runtimeExports: candidate.runtimeExports,
        formats: candidate.formats,
        nodeVersions: [candidate.nodeVersion, ...packageMatrix.map((entry) => entry.nodeVersion)],
        strictNodeNextTypesPassed: candidate.strictNodeNextTypesPassed,
        matrix: packageMatrix,
        disclosure:
          'Current package verified on Node 18/20/22/24; non-host runtimes use SHA-256-verified upstream unofficial musl builds.',
      },
      auditGeneratedAt: audit.generatedAt,
      airs: {
        operations: audit.sources.reduce((n, source) => n + source.operations, 0),
        implemented: audit.sources.reduce((n, source) => n + source.implemented, 0),
        ...audit.airs,
      },
      gateway: {
        ...audit.gateway,
        operations: undefined,
        directPercentage: Number(
          ((100 * audit.gateway.directOperations) / audit.gateway.total).toFixed(2),
        ),
        dispositions,
        fieldMeasurement:
          'JSON property occurrences on exact implemented routes only; not multipart/binary or full upstream operation coverage.',
      },
      runtime: previous.runtime,
      networkPreflight: read<object>('artifacts/e2e/network-preflight.json'),
      live,
      examples: {
        capturedAt: examples.finishedAt,
        scripts: examples.output.length,
        passed: examples.output.filter((item) => item.exitCode === 0).length,
        failed: examples.output.filter((item) => item.exitCode !== 0).length,
        additionalBatchCapture: batchExample,
        additionalSecretReferenceCapture: secretReferenceExample,
        additionalObservabilityCapture: observabilityExample,
        additionalAnalyticsFilterCapture: analyticsFilterExample,
      },
      docs: { ...preview, currentEvidenceVerified: docsCurrent, browser },
      cliDocs: {
        ...previous.cliDocs,
        browserInteractionVerified: cliBrowser.passed,
        currentEvidenceVerified:
          cliBrowser.passed && cliBrowser.capturedExampleTimestamp === cliExample.capturedAt,
        browser: cliBrowser,
      },
      secretScan: read<object>('artifacts/security/secret-scan.json'),
      dependencyAudit: Object.fromEntries(
        ['sdk', 'docs'].map((name) => [
          name,
          read<{ metadata: { vulnerabilities: object } }>(`artifacts/security/${name}-audit.json`)
            .metadata.vulnerabilities,
        ]),
      ),
      acceptance: {
        readyForLocalTesting:
          candidate.passed &&
          currentSourceMatchesPackage &&
          unit.numTotalTests === unit.numPassedTests,
        airsMeasuredContractTargetMet: airsTargetMet,
        supportedNodeMatrixPassed: offline
          .filter((report) =>
            ['unit-tests', 'node18-tests', 'node20-tests', 'node24-tests'].includes(report.name),
          )
          .every((report) => report.revision === 'current candidate' && report.failed === 0),
        allPortkey99PercentTargetMet: allPortkeyTargetMet,
        allMainLiveChecksPassed,
        allExamplesPassed: examples.output.every((item) => item.exitCode === 0),
        allOwnedFixturesRetired: cleanup.failed === 0,
        documentationMatchesLatestEvidence: docsCurrent,
        cleanInstallReleaseReady: false,
        fullRequestedScopeComplete: false,
      },
    },
    null,
    2,
  ) + '\n',
);
