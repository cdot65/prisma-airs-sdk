/** @internal Generate Docusaurus results from validated, secret-free E2E report counters. */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { emitPatch } from '../openapi/emit-patch.js';
import type { LiveResult } from './harness.js';
import { liveReportSuites } from './report-suites.js';
const exampleCount = readdirSync(new URL('../../docs-site/examples/', import.meta.url)).filter(
  (name) => name.endsWith('.ts') && name !== 'example-support.ts',
).length;

const reports = liveReportSuites.map((name) => {
  const file = fileURLToPath(new URL(`../../artifacts/e2e/${name}.json`, import.meta.url));
  const report = JSON.parse(readFileSync(file, 'utf8')) as {
    finishedAt: string;
    credentialsUnchanged: boolean;
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    results: LiveResult[];
  };
  assert.equal(report.credentialsUnchanged, true, `${name}: credential source changed`);
  assert.equal(report.total, report.results.length, `${name}: result count mismatch`);
  for (const [status, count] of [
    ['PASS', report.passed],
    ['FAIL', report.failed],
    ['SKIP', report.skipped],
  ] as const)
    assert.equal(
      report.results.filter((r) => r.status === status).length,
      count,
      `${name}: ${status} count mismatch`,
    );
  return { name, ...report };
});
const table = reports
  .map(
    (r) =>
      `| ${r.name} | ${r.passed} | ${r.failed} | ${r.skipped} | ${r.total} | ${r.finishedAt.replace('T', ' ')} |`,
  )
  .join('\n');
const oauthReads = reports.find((report) => report.name === 'oauth-service-reads');
assert(oauthReads, 'Missing cross-service OAuth validation report');
const exceptions = reports
  .flatMap((r) =>
    r.results
      .filter((t) => t.status !== 'PASS')
      .map(
        (t) =>
          `| ${r.name}: \`${r.name.startsWith('cleanup') ? t.name.replace(/:[^\s]+/g, ':<owned-fixture>') : t.name}\` | ${t.status} | ${t.statusCode ? `HTTP ${t.statusCode}` : (t.reason ?? t.errorType ?? 'See report')} |`,
      ),
  )
  .join('\n');
emitPatch(
  'docs-site/docs/developer/live-validation-results.md',
  `---
title: Validated live E2E results
---

# Validated live E2E results

Latest retained checks from the September 6–7, 2026 SDK review, generated directly from \`artifacts/e2e/*.json\` by \`scripts/e2e/generate-doc-report.ts\`. The generator verifies every counter against individual results and requires an unchanged credential-source hash. Failed checks are not converted into passes. Earlier exploratory attempts remain in \`artifacts/e2e/history/\` and other probe reports.

These timestamped reports include pre-release candidate checks and subsequent release verification. The user authorized shipping the implemented SDK/CLI surface with the recorded limitations; publication does not certify failed or missing operations. See the [release notes](../about/release-notes.md) for package scope. These counters measure workflow checks, not unique OpenAPI operations. Diagnostic suites are retained separately and may revisit the same failing operation. See [contract coverage](./openapi-conformance.md), the [242-operation gateway ledger](./gateway-coverage.md), and [actual executable-example output](../guides/examples.mdx).

## Latest results

| Suite | Pass | Fail | Skip | Total | Finished (UTC) |
| --- | ---: | ---: | ---: | ---: | --- |
${table}

## Failures and explicit skips

| Check | Status | Evidence / prerequisite |
| --- | --- | --- |
${exceptions}

Gateway workspace creation was also tested with explicit defaults and a wire-level metadata variant; SCM still returned 400 AB01. The probes used synthetic scope names. An unused SCM-provisioned scope or a known-good creation request is needed to separate missing provisioning from an API contract change. Existing workspace/IAM settings were not changed to bypass the failure.

The authenticated-source MCP discovery attempt retains its HTTP 401 prerequisite. A subsequent owned public-reference upstream passes the complete 16/16 lifecycle, including eventual runtime visibility after capability disable/re-enable. A private synthetic fixture was rejected by unchanged SSRF protection; it is not counted as successful discovery. No tools were invoked. The independent fixture audit includes all synthetic/public attempts and implicit servers. See the [exact positive and negative observations](../guides/release-verification.md#public-upstream-capability-lifecycle), including observed propagation delays. Published experimental stability is retained.

Gateway log-detail reads returned 500 even with an existing log's real storage metadata. SCM denies log ingestion and feedback creation, but the explicit runtime endpoint accepts both with a runtime key. The typed SDK observability suite passes 5/5, including single/batch log ingestion; a separate 5/5 SCM read audit confirms both owned feedback records and both journaled synthetic log traces. Experimental \`getLog\` and \`updateFeedback\` methods now implement both confirmed detail routes. Their typed E2E suite reproduces both HTTP 500 failures with passing ownership/authentication/key-cleanup controls; no new log or feedback is created. These routing differences are not grounds to use runtime credentials on SCM or to classify the entire family as unsupported. Passing offline contracts are not passing live retrieval/update workflows.

The September 6, 19:13 UTC authoring discovery made 58 GET probes with explicit dev workspace ID, slug and omitted optional filters. Its two passing checks are workspace/authentication controls, not 58 covered operations. Only admin-plane secret-reference listing without an unsupported workspace query returned 2xx. A subsequent synthetic, unbound secret-reference discovery passed 6/6; the implemented SDK lifecycle then passed 7/7, including pagination/filtering, create/get/update, slug lookup, deletion and a confirming 404. Neither run resolved an external secret or bound a reference to an integration. Other authoring/user/SCIM families remain unresolved; no broader absence claim follows from denials. Pricing was subsequently verified on its explicitly public unauthenticated server and is no longer an unimplemented gap.

The documentation example run exposed DLP profile update/retirement HTTP 500, dictionary creation HTTP 400, and network-broker update HTTP 403. The profile fixture remains unbound but active and journaled; repeat runs reuse it instead of creating additional fixtures. The live profile endpoint advertises DELETE in OPTIONS but executing DELETE returned HTTP 501. This is not a supported cleanup method and was not added to the SDK. Multipart diagnostics showed that the documented JSON Blob part reached validation (400), whereas a text part returned 415; neither variant is represented as a passing dictionary lifecycle. The latest Model Security example excludes synthetic test groups and successfully reads an existing ML scan's evaluations/files. Earlier failures remain in history.

## What was exercised

The OAuth deadline correction was verified with 16 failing-first regressions and real 30-second
synthetic fault injection against the packed ESM/CommonJS SDK on Node 18/20/22/24. Those checks
are offline, not induced service outages. The fresh \`oauth-service-reads\` suite independently
reports ${oauthReads.passed} passing / ${oauthReads.failed} failing / ${oauthReads.skipped} skipped
read-only checks across Management, Model Security, Red Team and both SCM gateway planes using
the corrected token manager. The runnable \`mgmt-auth.ts\` example additionally
verifies successful standalone concurrent refresh deduplication and explicit cache clearing;
its latest sanitized output is on the examples page. No credentials or token values are logged.

The read-only analytics discovery compared known and nonexistent synthetic trace/metadata filters against the same request-count window. Camel-case \`traceId\` and JSON \`metadata\` were respected; upstream \`trace_id\` was ignored and remains a failed diagnostic check. The typed SDK request-chart suite subsequently passed 3/3 using existing owned records, with no new fixtures or mutations. Invalid telemetry options now fail before authentication or network I/O. Only these request-count filters are implemented; this does not establish equivalence across all 22 partially adapted analytics operations. The [examples page](../guides/examples.mdx#verified-request-chart-filters) includes the captured sanitized output.

The latest runtime-authoring check made nine read-only collection/label/prompt/partial requests without a provider header and four more with the prescribed \`@openai\` provider. The first nine returned 400 with the exact missing-provider/config message; the four header-bearing requests returned 404. Model/authentication and key retirement pass, but all 13 authoring checks fail. Both deployed replicas register a generic provider-proxy GET fallback, not explicit GET handlers for these four collections. A hash-pinned synthetic middleware replay reproduces the missing-header rejection and confirms that a provider reaches its continuation without calling any live client. Adding a provider is not a verified authoring control plane. No authoring/IAM resource was created or changed; the latest sanitized boundary observation is in the examples-page diagnostic JSON.

The raw and typed provider HTTP suites exercise nine experimental image/audio/moderation/rerank/OCR methods with identical synthetic inputs and the prescribed \`@openai/gpt-5.6-terra\` model. Both record 2 passing controls and 9 failures with matching HTTP statuses. The corrected one-pixel PNG has checked chunk checksums and decompression; the silent 0.1-second WAV has checked PCM headers. Earlier invalid-PNG and hostname-resolution attempts remain historical diagnostics, not compatibility evidence. No specialized model or alternate provider was configured. These methods have frozen offline contract coverage but no successful live provider certification; their actual failed result records are reproduced on the examples page.

The read-only Kubernetes diagnostic verifies the Deployment-to-ReplicaSet-to-Pod ownership chain and targets the gateway container explicitly; broad labels also match Redis and are not a safe execution selector. Both gateway replicas run \`gateway_enterprise:2.20.0\`, with bundle SHA-256 \`b2710c4f6a580a5a1bb525695f942175e4698d61a0c90ba066c48f93490f6331\`. Effective \`ANALYTICS_STORE\` and \`LOG_STORE\` are \`control_plane\`. The deployed feedback handler requires a ClickHouse lookup, but initialization is skipped in this mode; log retrieval has no control-plane branch and throws an invalid-storage error. Evaluating only the two reviewed, hash-pinned pure functions with synthetic dependencies reproduces these failures without running the server bundle or calling database/network clients. The deployed handlers return 500 for those paths. The five passing diagnostic checks establish those limitations and unchanged configuration, not successful feedback updates or log reads. Evidence is retained in \`gateway-deployment-diagnostics-evidence.json\`; the reproducible script is \`scripts/e2e-gateway-deployment-diagnostics.ts\`.

No storage mode, production image, IAM policy or existing resource was modified to bypass a failure. [Palo Alto Networks documents the hybrid architecture](https://docs.paloaltonetworks.com/ai-runtime-security/administration/configure-ai-gateway) as a locally hosted data plane managed through SCM, with native log storage. An SDK compatibility fix must not silently redirect that production data handling.

The separate runtime detail diagnostic used an existing owned synthetic log and feedback record. Log reads returned 500 with native and ISO storage timestamps. Feedback PUT returned 500; the POST alternative shown in the pinned curl sample returned 400. Its two passes are an owned-log control and temporary-key cleanup, not verified detail/update operations. No new feedback or log was created by that diagnostic.

The additional score diagnostic tried positive feedback with zero weight, omitted metadata, and restoration to the neutral score on the same owned feedback ID. All three PUTs returned 500; an independent SCM audit then verified the exact record still has value 0 and weight 0. This rules out a zero-score-only failure. Upstream Portkey's [feedback service](https://github.com/Portkey-AI/gateway/blob/8febc1dc1d85053dd374922e547b4db1af0fab79/src/services/feedback/index.ts) and [ClickHouse adapter](https://github.com/Portkey-AI/gateway/blob/8febc1dc1d85053dd374922e547b4db1af0fab79/src/services/feedback/clickhouse.ts) show a read/delete dependency for updates that creation does not exercise. That was the initial hypothesis. Subsequent read-only inspection of the deployed 2.20.0 bundle and effective storage modes, plus pure-function reproductions on both exact gateway replicas, confirmed the missing ClickHouse path described below. No deployment configuration was changed.

The legacy-completion diagnostic used the required \`@openai/gpt-5.6-terra\` model. Model lookup passed with the same temporary runtime key; POST /completions returned 404 with an incompatible-model error. The new typed SDK method reproduces that status. Streaming was explicitly skipped after the non-streaming prerequisite failed. No different model or chat-to-completion substitution was used. The operation is now an experimental direct contract, not a passing live integration. The [official completion reference](https://developers.openai.com/api/reference/resources/completions/methods/create) describes JSON/SSE semantics; it does not establish this deployment's model compatibility. These diagnostics and their actual result projections also appear on the [examples page](../guides/examples.mdx).

Raw and typed prompt-runtime diagnostics use random unprovisioned template IDs; both render and completion return 404. No owned template was available from the authoring workflow, and no existing template was executed or changed. Both deployed replicas register the three legacy/prompt routes, and prompt completion dispatches to ordinary chat/legacy handlers. The three new SDK methods are experimental. Their request models follow the pinned descriptions' explicit root-level parameter instructions, rejecting educational-only nested \`hyperparameters\`. Successful template rendering/completion and live streaming remain unverified; the failed checks are preserved above.

The realtime probe passes same-key model lookup, socket closure and temporary-key retirement, but fails session creation. A valid HTTP 101 upgrade is followed by an \`error\` event with allowlisted code \`invalid_model\`. No client event, audio or generation request was sent; the prescribed model/provider is unchanged. The [official WebSocket guide](https://developers.openai.com/api/docs/guides/realtime-websocket) informed handshake/event validation, not a model-support claim. Both deployed replicas register the route and strip the provider prefix before forwarding. A separate pure-function reproduction confirms the upstream-open promise has no error/close rejection; this is a potential stalled-handshake path, not the observed failure, which upgraded successfully. The full sanitized observation is on the examples page. The typed experimental SDK transport now covers the upgrade contract. Its separate live suite records 4 passes / 1 failed provider session, and the actual runnable example also fails. The independent realtime audit verifies absence of all journaled temporary keys. See the examples page for the separate timestamps and exact sanitized output.

- Scan: benign sync/async requests and result/report retrieval.
- Management: owned profile, topic and API-key lifecycles, plus an actual scan using the created profile.
- Model Security: custom-rule and security-group lifecycles, assignment, version history and synthetic scanner-result ingestion. This does not execute the proprietary ML scanning engine.
- Red Team: completed bounded custom jobs with benign prompts; reports; draft targets/adapters; prompt sets; CSV upload/download; metadata and network-broker reads.
- Gateway management: inventory/telemetry; isolated config, integration/custom-model/provider/service-key, guardrail/MCP, usage/rate policy and log-export draft workflows. Earlier provider-CRUD fixtures used synthetic credentials.
- Gateway runtime: real inference in workspace dev (\`ws-develo-71f8d8\`) through \`https://airs.cdot.io/v1\`, using \`@openai/gpt-5.6-terra\` and \`@openai/text-embedding-3-small\`. SDK and CLI JSON/streaming chat and Responses, float/base64 embeddings, cancellation and invalid-input handling pass. Keys were short-lived owned SCM service keys, not the user-provided persistent key.
- Runtime resources: model and fine-tuning-job listing, multipart file upload/retrieve/download, vector-store CRUD/file indexing and stored Responses retrieval/input-items/deletion. Batch inference now passes creation, retrieval, terminal completion, gateway/native-file output and cleanup (9/9); a separate typed cancellation lifecycle reaches cancelled and passes cleanup (8/8). Live validating batches exposed null output IDs/timestamps, now accepted without relaxing other known fields. Actual sanitized batch JSON is included in the examples page. The separate vector-file-batch suite validates creation, completed retrieval and file listing after correcting its live object discriminator. Vector-file-batch cancellation returned HTTP 500 and its two dependent cancelled-state assertions failed; all owned stores/files were removed. Separate empty-JSON and beta-header diagnostics also returned 500 and did not justify changing the SDK wire contract. Model deletion and fine-tuning job lifecycle remain offline-only. No training job was started, and the designated inference/embedding models were not changed.
- CLI: JSON reads across domains, a benign runtime scan, and separate profile/topic flag-builder lifecycles against the packed SDK. This additional test found and drove the fix to the legacy SDK topic force-delete URL. The separate CLI live Vitest suite also passed 4/4 at 13:57 UTC, recorded in the SDK checkout's artifacts/cli-live-tests.json; it is not folded into the SDK suite counters above.
- Public model pricing: both required models succeed through the explicitly configured, unauthenticated public Portkey host without /v1. The client preserves catalog data and does not select an inference model, evaluate formulas or report effective tenant billing. SCM denial on the same relative path was not evidence about this distinct public service.
- Executable documentation: ${exampleCount} runnable scripts (excluding the shared helper): 21 in the retained primary batch, including 4 explicitly mock-backed scripts, plus the new realtime script executed separately against the built candidate. The primary batch also includes 3 live sanitized scan-response captures. Separate timestamps and the realtime failure are preserved. Real outputs, failures, and mock/live distinctions appear on the examples, Scan API, and OAuth lifecycle pages.

The host's default Node DNS lookup failed for the gateway while IPv4 resolution and curl succeeded. Runtime E2E uses the opt-in \`E2E_GATEWAY_IPV4_ONLY=1\` process-only, gateway-host-only lookup override; it retains native fetch and TLS certificate verification. This is disclosed test-environment accommodation, not a DNS change or SDK default.

On September 7, the workspace resolver additionally failed ordinary service-host lookups and the configured primary split-DNS server refused gateway queries. The secondary split-DNS resolver supplied the existing LAN ingress address; an exact HTTPS route read and a keyless 401 verified the same gateway boundary. Current reruns use the opt-in \`service-dns-bootstrap.mjs\` for fully qualified service lookups and an explicitly verified gateway address. The request URL/SNI and certificate checks remain unchanged; no system DNS, ingress or service configuration is modified. The public WAN address timed out from this workspace, so these LAN-path results are not external-WAN reachability certification. The separate \`artifacts/e2e/network-preflight.json\` records verification and infrastructure hashes.

Some dependent operations have no runnable prerequisite and are not in the executed-check denominator: export cancellation/download after failed export start. MCP capability updates were subsequently verified with an owned public-reference upstream; the earlier missing-tool skip remains historical evidence. Usage-policy reset was subsequently verified with an isolated traffic-derived entity; the earlier extension-suite skip remains historical evidence, while the separate usage-reset and retirement-audit suites record the completed workflow. See [published-package and post-release examples](../guides/release-verification.md). The gateway ledger retains version-specific experimental annotations. No acceptance of legal terms, IAM/organisation-authentication changes, instance provisioning, interactive Copilot authorization, or mutation/rotation of existing credentials was performed. Network-broker draft creation and get succeeded, but update returned HTTP 403, including when both name and description were supplied. Three owned drafts remain disconnected and journaled; repeat runs reuse a draft rather than create additional records.

## Cleanup and retained footprint

The observability checks retain two zero-weight synthetic feedback records and three synthetic ingestion log records because the pinned API declares no deletion method. Two log trace IDs were journaled by the typed run; the earlier raw ingestion acknowledgement was recorded without retaining its generated trace ID. Both feedback IDs and both journaled log traces are independently visible through SCM. These are explicitly retained audit records, not deleted resources. All short-lived keys were deleted and checked separately.

The cleanup audit resolves every journaled fixture and separately checks for implicit MCP servers under owned integrations. A separate runtime audit verifies every historically journaled file, vector store and stored Response is absent, using a successful model read as an authentication control. Native batch jobs have no deletion API: their audit records must be in a confirmed completed, failed, expired or cancelled state; validating, in-progress and cancelling are not accepted as retired. Other resources require an authoritative not-found result, a documented archived/tombstone/inactive state, or absence from a complete active inventory. HTTP 403 alone is never deletion proof.

Deleted records may remain archived. Synthetic Model Security scan records, completed Red Team jobs, four terminal native batch jobs and non-running gateway export audit records have no deletion API and remain as an auditable test footprint. The six files created or produced by the native batch checks were deleted. In addition, the new DLP example fixture could not be retired because the server rejected cleanup; the aggregate audit reports this as FAIL, not an accepted historical record. Fixture journals retain the exact ownership/identifiers. These checks do not claim that the tenant has no historical audit entries.

## Re-run safely

Use the commands on the [conformance page](./openapi-conformance.md) and [runtime guide](../guides/ai-gateway-inference.md). The credential file \`~/.prisma-airs/config.json\` is read only. Mutation suites require \`--writes\`; legacy CLI suites require \`CLI_COMPAT_DIR\`, while the inference CLI suite accepts \`E2E_CLI_ENTRY\` pointing to the updated built entry point. Do not change production settings merely to obtain a passing score.
`,
);
