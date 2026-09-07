/** @internal Render captured executable-example evidence, never invent expected output. */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { emitPatch } from '../openapi/emit-patch.js';
import { runtimeDiagnosticSuites } from './report-suites.js';

interface ExampleResult {
  script: string;
  mode: 'live' | 'mock';
  exitCode: number;
  stdout?: string;
  errorType?: string;
  statusCode?: number;
}
interface Report {
  startedAt: string;
  finishedAt: string;
  credentialsUnchanged: boolean;
  output: ExampleResult[];
  scanResponses: Record<string, unknown>;
}
const root = new URL('../../', import.meta.url);
const report = JSON.parse(
  readFileSync(new URL('artifacts/examples/latest.json', root), 'utf8'),
) as Report;
assert.equal(report.credentialsUnchanged, true);
const executableExamples = readdirSync(new URL('docs-site/examples/', root))
  .filter((name) => name.endsWith('.ts') && name !== 'example-support.ts')
  .map((name) => name.slice(0, -3))
  .sort();
assert.deepEqual(
  report.output.map((item) => item.script).sort(),
  executableExamples,
  'Every executable documentation script must run exactly once',
);
const live = JSON.parse(readFileSync(new URL('artifacts/e2e/doc-examples.json', root), 'utf8'));
assert.equal(live.startedAt, report.startedAt, 'Example transcripts and suite counters differ');
assert.equal(live.total, executableExamples.length + 3);
const uuid = /(?:R|pan_)?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
function fence(text: string, language = 'text'): string {
  const safe = text.replace(uuid, '<resource-id>').trimEnd();
  // A transcript is data, including when it contains Markdown or model-generated text.
  const longest = Math.max(2, ...Array.from(safe.matchAll(/`+/g), (m) => m[0].length));
  const delimiter = '`'.repeat(longest + 1);
  return `${delimiter}${language}\n${safe}\n${delimiter}`;
}
const capturedAt = report.finishedAt;
const disclosure = `Captured **${capturedAt}**, from the actual runnable files against the local SDK candidate. Credential values and resource identifiers are redacted. Tenant inventories are intentionally not published. These results are not a claim that every service operation or the complete Portkey API passes. See [published-package examples](./release-verification.md) for subsequent registry-install verification.`;
function transcript(script: string): string {
  const result = report.output.find((item) => item.script === script);
  assert(result, `Missing example: ${script}`);
  if (result.exitCode !== 0)
    return `This execution failed: \`${result.errorType ?? 'ExampleError'}\`${result.statusCode ? ` (HTTP ${result.statusCode})` : ''}. No successful transcript is substituted.`;
  assert(result.stdout, `No reviewed transcript for ${script}`);
  return fence(result.stdout);
}
const descriptions: Record<string, string> = {
  'basic-scan': 'Synchronous scan',
  'async-scan': 'Two-item asynchronous batch with bounded polling',
  'query-results': 'Real scan IDs and report IDs from the preceding scan',
  'mgmt-auth': 'OAuth authentication, profile list and standalone refresh/cache lifecycle',
  'mgmt-profiles': 'Owned profile lifecycle, including revision cleanup',
  'mgmt-topics': 'Owned custom-topic lifecycle, including revision cleanup',
  'mgmt-dashboard': 'Application and violation dashboard reads',
  'mgmt-dlp-data-filtering-profiles': 'Data filtering profile reads',
  'mgmt-dlp-data-patterns': 'Owned pattern create/get/patch/delete',
  'mgmt-dlp-data-profiles': 'Advanced data profile lifecycle attempt',
  'mgmt-dlp-dictionaries': 'Multipart dictionary lifecycle attempt',
  'model-security-scans': 'Existing ML scan evaluations/files and policy reads',
  'red-team-scans': 'Job/category/target reads; quota and statistics are optional',
  'red-team-targets': 'Target details and custom prompt-set reads',
  'red-team-network-broker': 'Channel reads and owned draft create/update attempt',
  'gateway-inference':
    'Real gateway chat, 32-dimensional embeddings and read-only fine-tuning job listing',
  'gateway-model-pricing': 'Unauthenticated public catalog rates for the two required models',
  'profiles-get-validation': 'Mock profile lookup and pagination',
  'profiles-crud-validation': 'Mock profile CRUD and force-delete behavior',
  'oauth-lifecycle-validation': 'Mock token timing, refresh, callbacks and auth retry',
  'red-team-mgmt-validation': 'Mock/schema target and custom-attack validation',
};
const table = report.output
  .map(
    (item) =>
      `| \`${item.script}.ts\` | ${item.mode} | ${item.exitCode === 0 ? 'PASS' : `FAIL: ${item.statusCode ? `HTTP ${item.statusCode}` : item.errorType}`} | ${descriptions[item.script]} |`,
  )
  .join('\n');
const page = process.argv.find((arg) => arg.startsWith('--page='))?.slice(7);
if (page === 'examples') {
  const batch = JSON.parse(
    readFileSync(new URL('artifacts/examples/gateway-batch.json', root), 'utf8'),
  ) as {
    capturedAt: string;
    disclosure: string;
    suite: { passed: number; total: number };
    output: unknown;
  };
  const batchSuite = JSON.parse(
    readFileSync(new URL('artifacts/e2e/gateway-batches.json', root), 'utf8'),
  );
  assert.equal(batch.capturedAt, batchSuite.finishedAt);
  assert.equal(batchSuite.credentialsUnchanged, true);
  assert.equal(batchSuite.passed, 9);
  assert.equal(batchSuite.total, 9);
  const secretReferences = JSON.parse(
    readFileSync(new URL('artifacts/examples/gateway-secret-references.json', root), 'utf8'),
  );
  const secretReferenceSuite = JSON.parse(
    readFileSync(new URL('artifacts/e2e/gateway-secret-references.json', root), 'utf8'),
  );
  assert.equal(secretReferences.capturedAt, secretReferenceSuite.finishedAt);
  assert.equal(secretReferenceSuite.credentialsUnchanged, true);
  assert.equal(secretReferenceSuite.failed, 0);
  assert.equal(secretReferenceSuite.passed, 7);
  assert.equal(secretReferenceSuite.total, 7);
  const observability = JSON.parse(
    readFileSync(new URL('artifacts/examples/gateway-observability.json', root), 'utf8'),
  );
  const observabilitySuite = JSON.parse(
    readFileSync(new URL('artifacts/e2e/gateway-observability.json', root), 'utf8'),
  );
  assert.equal(observability.capturedAt, observabilitySuite.finishedAt);
  assert.equal(observabilitySuite.credentialsUnchanged, true);
  assert.equal(observabilitySuite.passed, 5);
  assert.equal(observabilitySuite.total, 5);
  const analyticsFilters = JSON.parse(
    readFileSync(
      new URL('artifacts/examples/gateway-analytics-request-filters.json', root),
      'utf8',
    ),
  );
  const analyticsSuite = JSON.parse(
    readFileSync(new URL('artifacts/e2e/gateway-analytics-request-filters.json', root), 'utf8'),
  );
  assert.equal(analyticsFilters.capturedAt, analyticsSuite.finishedAt);
  assert.equal(analyticsSuite.credentialsUnchanged, true);
  assert.equal(analyticsFilters.mutations, false);
  assert.equal(analyticsSuite.passed, 3);
  assert.equal(analyticsSuite.total, 3);
  assert.deepEqual(analyticsFilters.output, {
    traceId: { knownTotal: 1, absentTotal: 0 },
    metadata: { knownMatched: true, absentTotal: 0 },
  });
  const runtimeDiagnostics = JSON.parse(
    readFileSync(new URL('artifacts/examples/gateway-runtime-diagnostics.json', root), 'utf8'),
  ) as { suite: string; finishedAt: string; passed: number; failed: number; total: number }[];
  const detailDiagnostics = runtimeDiagnostics.find(
    (row) => row.suite === 'gateway-observability-details-sdk',
  );
  assert(detailDiagnostics, 'Missing typed observability detail evidence');
  assert.deepEqual(
    runtimeDiagnostics.map((report) => report.suite),
    runtimeDiagnosticSuites,
  );
  for (const diagnostic of runtimeDiagnostics) {
    const original = JSON.parse(
      readFileSync(new URL(`artifacts/e2e/${diagnostic.suite}.json`, root), 'utf8'),
    );
    assert.equal(original.credentialsUnchanged, true);
    assert.equal(diagnostic.finishedAt, original.finishedAt);
  }
  const deploymentEvidence = JSON.parse(
    readFileSync(
      new URL('artifacts/e2e/gateway-deployment-diagnostics-evidence.json', root),
      'utf8',
    ),
  ) as {
    startedAt: string;
    checkedAt: string;
    image: string;
    bundleSha256: string;
    mutations: boolean;
    credentialsUnchanged: boolean;
    observations: {
      bundleSha256: string;
      analyticsStore: string;
      logStore: string;
      feedbackReadError: string;
      logReadError: string;
      networkOrDatabaseCalls: number;
      promptRuntimeRoutesRegistered: boolean;
      promptCompletionUsesNativeHandlers: boolean;
      realtimeRouteRegistered: boolean;
      realtimeProviderPrefixRemoved: boolean;
      realtimeWaitOnlyResolvesOnOpen: boolean;
      runtimeAuthoringExplicitReadRoutes: string[];
      runtimeProviderProxyFallbackRegistered: boolean;
      runtimeAuthoringMissingProviderStatus: number;
      runtimeAuthoringMissingProviderMessage: string;
      runtimeAuthoringProviderPreflightContinues: boolean;
    }[];
  };
  assert.equal(deploymentEvidence.mutations, false);
  assert(
    deploymentEvidence.observations.every(
      (row) =>
        row.promptRuntimeRoutesRegistered &&
        row.promptCompletionUsesNativeHandlers &&
        row.realtimeRouteRegistered &&
        row.realtimeProviderPrefixRemoved &&
        row.realtimeWaitOnlyResolvesOnOpen,
    ),
  );
  const deploymentSuite = JSON.parse(
    readFileSync(new URL('artifacts/e2e/gateway-deployment-diagnostics.json', root), 'utf8'),
  );
  assert.equal(deploymentEvidence.startedAt, deploymentSuite.startedAt);
  assert.equal(deploymentSuite.passed, 5);
  assert.equal(deploymentSuite.total, 5);
  assert.equal(deploymentEvidence.credentialsUnchanged, true);
  assert.equal(deploymentEvidence.observations.length, 2);
  assert.deepEqual(deploymentEvidence.observations[0], deploymentEvidence.observations[1]);
  const storage = deploymentEvidence.observations[0];
  assert.equal(storage.bundleSha256, deploymentEvidence.bundleSha256);
  assert.equal(storage.analyticsStore, 'control_plane');
  assert.equal(storage.logStore, 'control_plane');
  assert.equal(storage.networkOrDatabaseCalls, 0);
  assert.deepEqual(storage.runtimeAuthoringExplicitReadRoutes, []);
  assert.equal(storage.runtimeProviderProxyFallbackRegistered, true);
  assert.equal(storage.runtimeAuthoringMissingProviderStatus, 400);
  assert.equal(
    storage.runtimeAuthoringMissingProviderMessage,
    'Either x-portkey-config or x-portkey-provider header is required',
  );
  assert.equal(storage.runtimeAuthoringProviderPreflightContinues, true);
  emitPatch(
    'docs-site/docs/guides/examples.mdx',
    `---
id: examples
title: Runnable Examples
description: Executable SDK examples with fresh live and mock output, explicit failures, and cleanup requirements.
---

# Runnable Examples

${disclosure}

## Latest execution results

All ${executableExamples.length} documentation scripts were executed: ${report.output.filter((r) => r.exitCode === 0).length} passed and ${report.output.filter((r) => r.exitCode !== 0).length} failed. Three additional real scan-response captures bring the example suite to ${live.passed}/${live.total} passing checks. A successful walkthrough is not an operation-level guarantee: Red Team's optional quota/statistics calls may report unavailability; their independent checks remain visible in the [complete live results](../developer/live-validation-results.md).

| Script | Backend | Result | Workflow |
| --- | --- | --- | --- |
${table}

## Setup

Run from the repository root. The root TypeScript configuration resolves the package import to this checkout's source; examples do not silently exercise a globally installed SDK.

${fence('npm ci\ncp .env.example .env\nnpx tsx --env-file=.env docs-site/examples/basic-scan.ts', 'bash')}

Scan examples need \`PANW_AI_SEC_API_KEY\` and \`PANW_AI_SEC_PROFILE_NAME\`. Management and DLP use \`PANW_MGMT_CLIENT_ID\`, \`PANW_MGMT_CLIENT_SECRET\`, and \`PANW_MGMT_TSG_ID\`; Model Security and Red Team support the documented service-specific overrides with management fallback. Runtime gateway inference instead requires an explicit \`PANW_AI_GW_INFERENCE_ENDPOINT\` and \`PANW_AI_GW_INFERENCE_API_KEY\`; it never derives a runtime key from OAuth credentials.

Node's \`--env-file\` flag requires Node 20.6+ and an existing file. On Node 18, export variables in the shell. Never commit credential files. Mock scripts need neither a credential file nor live credentials.

The September 7 live rerun uses a disclosed test-workspace DNS accommodation: fully qualified service-host lookups and the gateway's existing LAN ingress address verified through its configured secondary resolver. Original HTTPS URLs/SNI, certificate verification and gateway authentication remain intact; no system DNS or infrastructure was changed. Earlier DNS-failed attempts are retained, and the public WAN path is not certified. See the [network verification details](../developer/live-validation-results.md).

## Public model pricing

This example calls the spec-declared public Portkey catalog, not the Prisma runtime or SCM. No credentials or workspace settings are read or sent. The endpoint is explicit and has no /v1 prefix. Prices below are actual catalog values captured at the page timestamp, in USD cents per token; they are not a price quote, effective tenant billing or the result of executing a formula. Unknown catalog fields are preserved by the SDK but are outside this small output projection.

${fence('npx tsx docs-site/examples/gateway-model-pricing.ts', 'bash')}

${transcript('gateway-model-pricing')}

## Live scan output

The security profile's actual decisions are shown below; another profile may produce different decisions. The three full sanitized response bodies are on the [Scan API page](./scan-api.md#example-output).

### Synchronous scan

${transcript('basic-scan')}

### Asynchronous scan

The script submits once and polls at most 20 times, 1.5 seconds apart. It fails if both submitted request IDs do not complete. A caller can query the returned batch ID again later without resubmitting the batch.

${transcript('async-scan')}

### Query results and detector reports

Set \`SCAN_IDS\` and \`REPORT_IDS\` to real IDs from your own scan. Placeholders below are redactions, not runnable identifiers.

${transcript('query-results')}

## Management and DLP

Mutation examples default to read-only. Pass \`--writes\` deliberately for unique \`sdk-example-*\` fixtures. Profile/topic cleanup includes revisions created by updates; pattern/dictionary cleanup runs in \`finally\`. DLP advanced profiles have no DELETE operation in the supplied contract: the example attempts status-based retirement, and any retirement failure remains a failure in the [cleanup audit](../developer/live-validation-results.md#cleanup-and-retained-footprint). Do not run repeated DLP profile creation while that cleanup path is failing.

${fence('npx tsx --env-file=.env docs-site/examples/mgmt-auth.ts\nnpx tsx --env-file=.env docs-site/examples/mgmt-profiles.ts --writes\nnpx tsx --env-file=.env docs-site/examples/mgmt-topics.ts --writes\nnpx tsx --env-file=.env docs-site/examples/mgmt-dlp-data-patterns.ts --writes', 'bash')}

Dictionaries use \`PANW_DLP_DICTIONARY_REGION\` when set, otherwise a region observed in the tenant dictionary inventory. Do not substitute an AWS region without checking the service's region vocabulary. Advanced profiles reference a real basic-profile ID; a regex leaf without a pattern ID is not an executable policy.

### OAuth authentication

${transcript('mgmt-auth')}

The standalone checks above exercise successful live refresh deduplication, explicit local-cache clearing and refresh callbacks; no token is printed. Separately, the SDK's 16 failing-first timeout regressions and packed ESM/CommonJS fault-injection checks prove that a stalled token fetch/body cannot hold callers indefinitely or cache a late token. The fixed 30-second token deadline is independent of the pre-expiry buffer and service-request timeout. See [bounded OAuth refresh](./oauth-lifecycle.md#bounded-refresh-and-timeout-recovery).

### Profile lifecycle

${transcript('mgmt-profiles')}

### Custom-topic lifecycle

${transcript('mgmt-topics')}

## Model Security and Red Team

${fence('npx tsx --env-file=.env docs-site/examples/model-security-scans.ts\nnpx tsx --env-file=.env docs-site/examples/red-team-scans.ts\nnpx tsx --env-file=.env docs-site/examples/red-team-targets.ts\nnpx tsx --env-file=.env docs-site/examples/red-team-network-broker.ts', 'bash')}

The Model Security walkthrough uses an existing scan, not a new proprietary-engine scan. Set \`MODEL_SECURITY_SCAN_ID\` to choose one explicitly. Its default selection excludes synthetic SDK/CLI test groups. Network-broker reads are non-mutating; \`--writes\` requests a draft create/update and leaves an auditable draft because the API has no delete operation. The live draft creates succeeded; their subsequent updates returned HTTP 403. Three disconnected drafts are journaled, and repeat validation reuses one rather than creating more. A failed update is not a completed lifecycle.

## Secret-reference management lifecycle

The separate repository E2E example passed **7/7** at **${secretReferences.capturedAt}**. This admin-plane CRUD workflow uses SCM OAuth, not a runtime gateway key. It creates an unbound reference with invalid synthetic AWS credentials, limits its allowed workspace to dev, exercises filtered listing and slug retrieval, then deletes it and confirms HTTP 404. It does not test secret resolution or a live AWS/Azure/Vault integration. It is additional lifecycle evidence, not another script in the ${executableExamples.length}-script table.

${fence('npx tsx scripts/e2e-gateway-secret-references.ts --writes', 'bash')}

${secretReferences.disclosure}

${fence(JSON.stringify(secretReferences.output, null, 2), 'json')}

Use \`gw.secretReferences.list({ current_page: 0, page_size: 20 })\` for read-only listing. Do not add \`workspace_id\`: that unsupported filter caused HTTP 403 during discovery and is rejected locally. All \`auth_config\` subtrees are secret-bearing and omitted from SDK debug bodies. See [secret-reference management](./ai-gateway-api.mdx#secret-references).

## Verified request-chart filters

The read-only typed SDK check passed **3/3** at **${analyticsFilters.capturedAt}**. It reused already journaled synthetic records: the exact known trace selects one request, and a nonexistent trace selects none. Known metadata matches and nonexistent metadata selects none. An earlier raw diagnostic found that upstream snake-case \`trace_id\` is ignored by SCM; that check remains a failure in the live-results table. An HTTP 200 alone is not filter verification.

${fence('npx tsx scripts/e2e-gateway-analytics-request-filters.ts', 'bash')}

${fence("const selected = await gw.telemetry.requests({\n  workspaceSlug: 'ws-develo-71f8d8',\n  days: 1,\n  traceId: ownedTraceId, // a trace your application already recorded\n});\nconst tagged = await gw.telemetry.requests({\n  workspaceSlug: 'ws-develo-71f8d8',\n  days: 1,\n  metadata: { sdk_e2e: ownedTestTag },\n});", 'ts')}

${analyticsFilters.disclosure}

${fence(JSON.stringify(analyticsFilters.output, null, 2), 'json')}

Use camel-case \`traceId\` and string-valued metadata on \`telemetry.requests\` only. Invalid dates, non-finite/reversed windows, unknown query fields, unsupported grouping dimensions/columns and malformed log filters fail locally before authentication. These two verified filters do not establish equivalence for all 22 partially adapted analytics operations. See [telemetry contracts](./ai-gateway-api.mdx#telemetry).

## AI Gateway inference output

### Runtime feedback and log ingestion

The additional typed SDK observability example passed **5/5** at **${observability.capturedAt}**. It uses the explicit runtime endpoint and a short-lived runtime key, not SCM OAuth. The designated inference model generates one owned trace; feedback has zero value/weight and logs contain synthetic data only. Single and array log submissions preserve the gateway's plain-text acknowledgement. An independent SCM read audit confirms the retained records; the pinned API has no deletion operation. This is separate from the ${executableExamples.length} primary scripts above. Feedback update and log-detail retrieval are now experimental typed methods; their live storage failures remain visible below and are not passing workflows.

${fence('E2E_GATEWAY_IPV4_ONLY=1 npx tsx scripts/e2e-gateway-runtime-observability.ts --writes --sdk\nnpx tsx scripts/e2e-gateway-observability-audit.ts', 'bash')}

${fence(JSON.stringify(observability.outputs, null, 2), 'json')}

### Latest runtime diagnostics: failures remain visible

The following JSON is a sanitized projection of the actual result records, not successful model output. Positive-score feedback updates, an omitted-metadata variant and restoration to zero all returned HTTP 500 on the same synthetic record. A subsequent read-only SCM audit confirmed its value and weight remain zero. Legacy completion returned HTTP 404 for the prescribed \`@openai/gpt-5.6-terra\` model, while model lookup/authentication passed; streaming was skipped after that prerequisite failure. No alternate model was used. Temporary runtime-key deletion passed in every suite that created a key and was checked independently in the aggregate audit.

${fence(JSON.stringify(runtimeDiagnostics, null, 2), 'json')}

The typed observability-detail run finished at **${detailDiagnostics.finishedAt}** with **${detailDiagnostics.passed} pass / ${detailDiagnostics.failed} fail / ${detailDiagnostics.total} total**. It calls \`inference.getLog()\` with the owned log's real path format and ISO creation timestamp, and \`inference.updateFeedback()\` with the exact neutral synthetic feedback UUID. Both return HTTP 500; ownership, same-key model lookup and key retirement pass. No new log or feedback is created. These are experimental direct contracts backed by 63 focused tests and independently generated OpenAPI fixtures, not successful detail/update certification. TypeScript and pre-authentication validation enforce the v2 timestamp requirement; debug logs omit sensitive bodies.

${fence('E2E_GATEWAY_IPV4_ONLY=1 npx tsx scripts/e2e-gateway-observability-details-sdk.ts --writes', 'bash')}

The runtime-authoring recheck finished at **${runtimeDiagnostics.find((row) => row.suite === 'gateway-runtime-authoring')!.finishedAt}**. Nine read-only list requests for collections, labels, prompts and partials returned HTTP 400 with the exact missing-provider/config message. Four additional requests with the prescribed \`@openai\` provider header passed that boundary but returned HTTP 404. Model/authentication and key retirement pass; all 13 authoring checks fail. The JSON projection above records the observed header/error distinction without raw error bodies or credentials. No authoring or IAM resource was changed.

Both hash-pinned deployed replicas register a generic GET provider-proxy fallback and no explicit GET handlers for these four authoring collections. A synthetic replay of the reviewed header-validation function returns the same missing-header 400 before invoking its continuation; adding a valid provider reaches only the synthetic continuation, never a network client. This explains the missing-header responses and does **not** establish a usable authoring API. Sending a provider header is not a replacement for a verified SCM/Portkey control-plane authoring endpoint. Prompt rendering/completion remain separately registered routes.

The new typed legacy-completion suite reproduces the prescribed model's 404; streaming remains skipped after that prerequisite fails. The raw and typed prompt-runtime runs use random **unprovisioned** template IDs, required variables and root-level parameter overrides. Both rendering and completion return 404 in both runs. These failures diagnose an unavailable owned-template workflow; they are not successful prompt examples and do not establish that the registered routes are absent. No existing template was executed or changed, and no alternative model was selected.

Both exact deployed replicas register legacy completion, prompt completion and prompt rendering. Their prompt-completion route dispatches to the ordinary chat/legacy handlers. The SDK now models all three as experimental, including strict flattened inputs, native/wrapped JSON results and bounded native SSE. Deployed-code route evidence and passing offline fixtures are not live template certification.

${fence('E2E_GATEWAY_IPV4_ONLY=1 npx tsx scripts/e2e-gateway-legacy-completions.ts --writes --sdk\nE2E_GATEWAY_IPV4_ONLY=1 npx tsx scripts/e2e-gateway-prompt-runtime.ts --writes\nE2E_GATEWAY_IPV4_ONLY=1 npx tsx scripts/e2e-gateway-prompt-runtime.ts --writes --sdk', 'bash')}

The realtime diagnostic completed a valid HTTP 101 WebSocket upgrade, then received an \`error\` event with allowlisted code \`invalid_model\` before any session was created. The JSON below includes the actual sanitized transport observation. Same-key model lookup, socket closure and temporary-key retirement pass; the session workflow fails. No audio or client/generation event was sent, and no alternate model was selected. The probe uses isolated \`ws@8.21.3\` with TLS verification, no redirects/compression/retries, a 15-second deadline and bounded payload/event counts. This test-only dependency is not added to the SDK package. Realtime remains an unimplemented operation, not a successful integration.

${fence('E2E_GATEWAY_IPV4_ONLY=1 npx tsx scripts/e2e-gateway-realtime.ts --writes', 'bash')}

The provider HTTP runs below use the same synthetic inputs through raw HTTP and the nine new experimental SDK methods: image generation/edit/variation, speech, transcription/translation, moderation, rerank and OCR. Both runs use only \`@openai/gpt-5.6-terra\`. Model lookup and key cleanup pass; all nine provider operations fail with the same HTTP statuses in both runs. These are failed live integrations, not successful examples. The corrected one-pixel PNG is checksum/decompression-tested and the 0.1-second silent WAV has validated PCM headers. Earlier probes with an invalid image checksum, and attempts stopped by this host's DNS issue, are retained as historical diagnostics; they are not used to certify media compatibility. No specialized model or alternate provider was substituted.

${fence('E2E_GATEWAY_IPV4_ONLY=1 npx tsx scripts/e2e-gateway-provider-http.ts --writes\nE2E_GATEWAY_IPV4_ONLY=1 npx tsx scripts/e2e-gateway-provider-http.ts --writes --sdk', 'bash')}

The deployment diagnostic's five passing checks reproduce service limitations; they are not five successful SDK operations. At **${deploymentEvidence.checkedAt}**, both exact Deployment-owned gateway replicas ran **${deploymentEvidence.image.split('/').at(-1)}**, bundle SHA-256 **${deploymentEvidence.bundleSha256}**. Their configured log and analytics stores are \`${storage.logStore}\`. Evaluating two reviewed, hash-pinned pure functions with synthetic dependencies reproduced \`${storage.feedbackReadError}\` for feedback lookup and \`${storage.logReadError}\` for log detail. The deployed handlers map these paths to HTTP 500. A separate synthetic reproduction verifies that the realtime upstream-open wait has no rejection handler; this is a potential stalled-handshake path, **not the cause of the observed run**, which upgraded successfully and received \`invalid_model\`. No server bundle was started, no database/network client was called by the reproductions, and deployment configuration was unchanged. Switching storage backends would alter production data handling and is not an SDK fix.

See [all timestamped results and deployment findings](../developer/live-validation-results.md). Diagnostics alone do not add implemented or live-verified operations; the two new detail methods count as experimental implementations because their typed clients and independent contracts now exist, not because an HTTP error passed a diagnostic.

### Inference walkthrough

The executable example used the dev workspace (\`ws-develo-71f8d8\`), \`https://airs.cdot.io/v1\`, \`@openai/gpt-5.6-terra\`, and \`@openai/text-embedding-3-small\`. The E2E runner creates and deletes its own short-lived SCM service key; secrets never appear in transcripts.

${fence('npx tsx --env-file=.env docs-site/examples/gateway-inference.ts', 'bash')}

${transcript('gateway-inference')}

For JSON/SSE Responses and CLI commands, see [gateway inference](./ai-gateway-inference.md). The separate repo-root \`examples/ai-gateway.ts\` is a management-plane walkthrough; its methods are covered by the canonical gateway read suite and it is outside the documentation-script denominator here.

## Validated batch inference output

Captured **${batch.capturedAt}** by the separate batch E2E workflow, which passed ${batch.suite.passed}/${batch.suite.total} checks. This is additional runtime evidence, not an extra script in the ${executableExamples.length}-script table above.

${batch.disclosure}

${fence(JSON.stringify(batch.output, null, 2), 'json')}

The workflow validates creation, retrieval, terminal completion, the gateway output endpoint, native file download and cleanup. It sends one synthetic request capped at 128 completion tokens using the designated model. The separate cancellation suite verifies the terminal cancelled state. [Native batch completion has a 24-hour SLA](https://developers.openai.com/api/docs/guides/batch); this test waits at most 30 minutes before requesting cancellation, then allows up to 11 minutes for cancellation cleanup. A local test deadline is not an upstream SLA violation.

${fence('E2E_GATEWAY_IPV4_ONLY=1 npx tsx scripts/e2e-gateway-batches.ts --writes\nE2E_GATEWAY_IPV4_ONLY=1 npx tsx scripts/e2e-gateway-batches.ts --writes --cancel', 'bash')}

The sanitized capture is \`artifacts/examples/gateway-batch.json\`; counters are checked against \`artifacts/e2e/gateway-batches.json\` before this page is generated.

## Mock-backed validation output

These transcripts come from local synthetic servers and schema checks, not the AIRS tenant. The final eight nonempty lines of each captured run are reproduced below; the complete OAuth transcript is on the [token lifecycle page](./oauth-lifecycle.md#validation-output).

${report.output
  .filter((r) => r.mode === 'mock')
  .map(
    (r) =>
      `### ${r.script}\n\n${fence('npx tsx docs-site/examples/' + r.script + '.ts', 'bash')}\n\n${
        r.stdout
          ? fence(
              r.stdout
                .split('\n')
                .filter((line) => line.trim())
                .slice(-8)
                .join('\n'),
            )
          : transcript(r.script)
      }`,
  )
  .join('\n\n')}

## Reproduce this evidence

The internal runner reads \`~/.prisma-airs/config.json\` without modifying it, requires \`--writes\`, keeps fixture journals, and records actual script exit codes. It intentionally exits nonzero if any example fails.

${fence('E2E_GATEWAY_IPV4_ONLY=1 npx tsx scripts/e2e-doc-examples.ts --writes', 'bash')}

The IPv4 override is a disclosed, process-only workaround for this test host's gateway DNS lookup; it does not disable TLS verification or change SDK defaults. The source reports are \`artifacts/examples/latest.json\` and \`artifacts/e2e/doc-examples.json\`; public pages are generated with \`scripts/e2e/generate-example-docs.ts\`. See [live results](../developer/live-validation-results.md), [contract coverage](../developer/openapi-conformance.md), and the [gateway gap ledger](../developer/gateway-coverage.md).
`,
  );
} else if (page === 'scan') {
  const destination = 'docs-site/docs/guides/scan-api.md';
  const original = readFileSync(new URL(destination, root), 'utf8');
  const start = original.indexOf('## Example output');
  const end = original.indexOf('## Get the most out of it', start);
  assert(start >= 0 && end > start);
  for (const key of ['benign', 'injection', 'dlp']) assert(report.scanResponses[key]);
  const replacement = `## Example output\n\n${disclosure}\n\nThese are actual validated \`Scanner.syncScan()\` results from three synthetic inputs, not hand-written expected responses. The inputs were a capital-of-France question, an instruction to reveal the system prompt, and synthetic SSN/card strings. Redacted identifiers and profile names are not usable API arguments. Detection categories and masking depend on the chosen policy.\n\n${Object.entries(
    report.scanResponses,
  )
    .map(([name, result]) => `### ${name}\n\n${fence(JSON.stringify(result, null, 2), 'json')}`)
    .join(
      '\n\n',
    )}\n\n### Executed asynchronous example\n\n${transcript('async-scan')}\n\n### Executed report lookup\n\n${transcript('query-results')}\n\nThe [runnable examples page](./examples.mdx) records every script result, including failures. Scalar identifiers are redacted consistently; detector names, booleans, decisions, offsets, and synthetic masked text are preserved.\n\n`;
  emitPatch(destination, original.slice(0, start) + replacement + original.slice(end));
} else if (page === 'oauth') {
  const destination = 'docs-site/docs/guides/oauth-lifecycle.md';
  const original = readFileSync(new URL(destination, root), 'utf8');
  const start = original.indexOf('## Validation Output');
  const end = original.indexOf('### What the validation proves', start);
  assert(start >= 0 && end > start);
  emitPatch(
    destination,
    original.slice(0, start) +
      `## Validation Output\n\nCaptured **${capturedAt}** by executing \`docs-site/examples/oauth-lifecycle-validation.ts\` against local mock servers. Tokens and credentials in this script are synthetic. This proves local timing and retry behavior, not external OAuth availability; the live OAuth result is listed on the [examples page](./examples.mdx).\n\n<details>\n<summary>Full captured mock validation output</summary>\n\n${transcript('oauth-lifecycle-validation')}\n\n</details>\n\n` +
      original.slice(end),
  );
} else {
  throw new Error('Select --page=examples, --page=scan, or --page=oauth');
}
