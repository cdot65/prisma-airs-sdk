---
title: Validated live E2E results
---

# Validated live E2E results

Latest retained checks from the September 6–7, 2026 SDK review, generated directly from `artifacts/e2e/*.json` by `scripts/e2e/generate-doc-report.ts`. The generator verifies every counter against individual results and requires an unchanged credential-source hash. Failed checks are not converted into passes. Earlier exploratory attempts remain in `artifacts/e2e/history/` and other probe reports.

These timestamped reports include pre-release candidate checks and subsequent release verification. The user authorized shipping the implemented SDK/CLI surface with the recorded limitations; publication does not certify failed or missing operations. See the [release notes](../about/release-notes.md) for package scope. These counters measure workflow checks, not unique OpenAPI operations. Diagnostic suites are retained separately and may revisit the same failing operation. See [contract coverage](./openapi-conformance.md), the [242-operation gateway ledger](./gateway-coverage.md), and [actual executable-example output](../guides/examples.mdx).

## Latest results

| Suite | Pass | Fail | Skip | Total | Finished (UTC) |
| --- | ---: | ---: | ---: | ---: | --- |
| oauth-service-reads | 24 | 0 | 0 | 24 | 2026-09-07 01:24:01.749Z |
| scan | 7 | 0 | 0 | 7 | 2026-09-06 13:56:43.475Z |
| management | 22 | 0 | 1 | 23 | 2026-09-06 13:56:32.403Z |
| model-security | 44 | 0 | 0 | 44 | 2026-09-06 13:56:03.577Z |
| red-team | 68 | 2 | 0 | 70 | 2026-09-06 16:39:44.071Z |
| gateway-read | 48 | 0 | 0 | 48 | 2026-09-06 21:24:25.428Z |
| gateway-analytics-filters | 4 | 1 | 0 | 5 | 2026-09-06 21:09:03.183Z |
| gateway-analytics-request-filters | 3 | 0 | 0 | 3 | 2026-09-06 21:21:10.314Z |
| gateway-analytics-chart-filters | 13 | 0 | 0 | 13 | 2026-09-07 07:11:38.044Z |
| gateway-analytics-chart-filters-sdk | 13 | 0 | 0 | 13 | 2026-09-07 07:28:54.307Z |
| gateway-analytics-query-contracts | 53 | 0 | 0 | 53 | 2026-09-07 08:12:49.467Z |
| gateway-analytics-query-contracts-sdk | 53 | 0 | 0 | 53 | 2026-09-07 08:56:03.088Z |
| gateway-analytics-query-contracts-cli | 54 | 0 | 0 | 54 | 2026-09-07 10:32:02.882Z |
| gateway-analytics-group-filters | 102 | 0 | 0 | 102 | 2026-09-07 11:10:38.954Z |
| gateway-analytics-group-filters-sdk | 102 | 0 | 0 | 102 | 2026-09-07 11:52:02.500Z |
| gateway-analytics-query-contracts-sdk-v0.25.0 | 53 | 0 | 0 | 53 | 2026-09-07 11:52:36.044Z |
| gateway-analytics-group-filters-cli-v4.4.0 | 103 | 0 | 0 | 103 | 2026-09-07 12:32:16.444Z |
| gateway-analytics-query-contracts-cli-v4.4.0 | 54 | 0 | 0 | 54 | 2026-09-07 12:35:21.598Z |
| gateway-extensions | 42 | 3 | 2 | 47 | 2026-09-06 16:40:33.284Z |
| gateway-usage-reset | 8 | 0 | 0 | 8 | 2026-09-07 03:39:07.317Z |
| gateway-usage-reset-audit | 2 | 0 | 0 | 2 | 2026-09-07 03:39:59.498Z |
| gateway-mcp-discovery | 9 | 1 | 0 | 10 | 2026-09-07 04:15:58.219Z |
| gateway-mcp-discovery-audit | 19 | 0 | 0 | 19 | 2026-09-07 04:16:47.605Z |
| gateway-mcp-synthetic | 15 | 1 | 0 | 16 | 2026-09-07 04:50:42.788Z |
| gateway-mcp-public | 16 | 0 | 0 | 16 | 2026-09-07 05:03:17.184Z |
| gateway-mcp-metadata | 18 | 2 | 0 | 20 | 2026-09-07 13:43:30.660Z |
| gateway-mcp-fixture-audit | 23 | 0 | 0 | 23 | 2026-09-07 13:45:12.107Z |
| gateway-owned-writes | 26 | 1 | 0 | 27 | 2026-09-06 13:58:07.890Z |
| gateway-secret-references | 7 | 0 | 0 | 7 | 2026-09-06 19:40:18.695Z |
| gateway-model-pricing | 3 | 0 | 0 | 3 | 2026-09-07 00:34:56.061Z |
| gateway-authoring-discovery | 2 | 0 | 0 | 2 | 2026-09-06 19:13:10.764Z |
| gateway-administration-availability | 2 | 24 | 0 | 26 | 2026-09-07 13:09:51.744Z |
| gateway-secret-reference-discovery | 6 | 0 | 0 | 6 | 2026-09-06 19:18:59.892Z |
| gateway-runtime-authoring | 2 | 13 | 0 | 15 | 2026-09-07 00:58:15.702Z |
| gateway-provider-http | 2 | 9 | 0 | 11 | 2026-09-06 22:06:39.937Z |
| gateway-provider-http-sdk | 2 | 9 | 0 | 11 | 2026-09-06 22:07:31.983Z |
| gateway-deployment-diagnostics | 5 | 0 | 0 | 5 | 2026-09-07 00:57:51.238Z |
| cli | 12 | 0 | 0 | 12 | 2026-09-07 10:32:01.368Z |
| cli-analytics | 3 | 0 | 0 | 3 | 2026-09-07 10:31:01.470Z |
| cli-writes | 12 | 0 | 0 | 12 | 2026-09-06 13:57:20.819Z |
| gateway-inference | 10 | 0 | 0 | 10 | 2026-09-07 01:59:08.352Z |
| release-sdk-inference-v0.25.0 | 10 | 0 | 0 | 10 | 2026-09-07 11:51:36.327Z |
| gateway-observability | 5 | 0 | 0 | 5 | 2026-09-06 19:59:34.826Z |
| gateway-runtime-observability | 4 | 1 | 0 | 5 | 2026-09-06 19:55:37.502Z |
| gateway-observability-audit | 5 | 0 | 0 | 5 | 2026-09-07 01:58:59.117Z |
| gateway-observability-details | 2 | 4 | 0 | 6 | 2026-09-06 20:07:01.543Z |
| gateway-observability-details-sdk | 3 | 2 | 0 | 5 | 2026-09-07 01:57:45.366Z |
| gateway-feedback-scores | 2 | 3 | 0 | 5 | 2026-09-06 20:24:57.217Z |
| gateway-legacy-completions | 2 | 1 | 1 | 4 | 2026-09-06 20:32:34.213Z |
| gateway-legacy-completions-sdk | 2 | 1 | 1 | 4 | 2026-09-06 22:37:14.653Z |
| gateway-prompt-runtime | 2 | 2 | 0 | 4 | 2026-09-06 22:37:15.237Z |
| gateway-prompt-runtime-sdk | 2 | 2 | 0 | 4 | 2026-09-06 22:38:18.128Z |
| gateway-realtime | 3 | 1 | 0 | 4 | 2026-09-07 05:46:31.074Z |
| gateway-realtime-sdk | 4 | 1 | 0 | 5 | 2026-09-07 06:04:42.282Z |
| gateway-realtime-example | 1 | 1 | 0 | 2 | 2026-09-07 06:12:26.528Z |
| gateway-realtime-audit | 6 | 0 | 0 | 6 | 2026-09-07 06:13:23.127Z |
| gateway-runtime-resources | 26 | 0 | 0 | 26 | 2026-09-06 22:09:40.667Z |
| gateway-batches | 9 | 0 | 0 | 9 | 2026-09-06 18:51:22.545Z |
| gateway-batches-cancel | 8 | 0 | 0 | 8 | 2026-09-06 18:55:59.118Z |
| gateway-vector-batches | 12 | 3 | 0 | 15 | 2026-09-06 18:08:18.294Z |
| gateway-vector-batches-json | 12 | 3 | 0 | 15 | 2026-09-06 18:17:23.385Z |
| gateway-vector-batches-beta | 12 | 3 | 0 | 15 | 2026-09-06 18:18:30.106Z |
| cli-inference | 8 | 0 | 0 | 8 | 2026-09-07 10:30:56.976Z |
| cli-inference-v4.4.0 | 8 | 0 | 0 | 8 | 2026-09-07 12:29:23.185Z |
| cli-analytics-v4.4.0 | 3 | 0 | 0 | 3 | 2026-09-07 12:29:09.610Z |
| cli-v4.4.0 | 12 | 0 | 0 | 12 | 2026-09-07 12:29:31.518Z |
| doc-examples | 21 | 3 | 0 | 24 | 2026-09-07 02:00:36.853Z |
| doc-gateway-key | 1 | 0 | 0 | 1 | 2026-09-07 02:00:35.691Z |
| recover-interrupted | 11 | 0 | 0 | 11 | 2026-09-06 16:37:05.866Z |
| dlp-recovery | 1 | 2 | 0 | 3 | 2026-09-06 17:13:56.675Z |
| dlp-dictionary-wire | 0 | 4 | 0 | 4 | 2026-09-06 17:02:36.364Z |
| cleanup-runtime-audit | 53 | 0 | 0 | 53 | 2026-09-06 22:11:51.994Z |
| cleanup-audit | 341 | 1 | 0 | 342 | 2026-09-07 02:02:57.662Z |

## Native CLI release verification

CLI **4.4.0**, pinning SDK **0.25.0**, passes separate, credential-free native validation: **11/11** independently registry-installed checks at **2026-09-07T12:26:53.881Z**, and **11/11 on each actual container architecture** in the [release workflow](https://github.com/cdot65/prisma-airs-cli/actions/runs/34121350201). Container processes have no runtime network access. The tests validate all five DLP formats, 26 signatures, manifest counts, JSON stdout, output precedence and invalid-input preflight. Temporary fixtures are removed before success is recorded. These are repeated consumer checks, not additional OpenAPI operations or replacements for the failures below.

Container minor/latest aliases are read back at **sha256:6134107b600e76491a70bcbdc261337abe9d53673082c1cc1a058676c87e6b52** only after both architectures pass. Registry and frozen production dependency audits are clean; SDK documentation development-dependency advisories remain open. See [actual native output](https://cdot65.github.io/prisma-airs-cli/cli/runtime/dlp/generate/) and [version-specific registry and container evidence](../guides/release-verification.md#cli-440-registry-and-container-verification), including preserved earlier releases. Public WAN and anonymous container access remain separate limitations.

## Failures and explicit skips

The corrected administration-route check finished at **2026-09-07T13:09:51.744Z** with **2 passing controls and 24 failing probes**. Required virtual-key pagination, user/invitation pagination casing and both upstream/Prisma-neighbor workspace-member prefixes were explicitly tested on both SCM planes. All route probes were OPA-denied HTTP 403, while the designated workspace authentication controls passed. No IAM, invitation, membership, SCIM or key mutation was attempted; response bodies and member identities were not retained. See [all 24 actual status/header projections](../guides/examples.mdx#administration-route-availability). These failures require a verified Prisma route and authorization contract, not speculative SDK methods or a smaller coverage denominator.

| Check | Status | Evidence / prerequisite |
| --- | --- | --- |
| management: `customerApps.write-workflow` | SKIP | API-key creation did not register a customer app; existing apps are not modified. |
| red-team: `quota` | FAIL | HTTP 403 |
| red-team: `promptSets.versionInfo` | FAIL | HTTP 500 |
| gateway-analytics-filters: `analytics-filters.trace_id.respected` | FAIL | AssertionError |
| gateway-extensions: `usageLimits.resetEntity` | SKIP | Isolated policy has no traffic-derived entities; existing usage counters are never reset. |
| gateway-extensions: `mcpServers.test` | FAIL | HTTP 403 |
| gateway-extensions: `mcpServers.updateCapabilities` | SKIP | No discovered tool on the owned server. |
| gateway-extensions: `mcpServers.deleteConnections` | FAIL | HTTP 403 |
| gateway-extensions: `logExports.start` | FAIL | HTTP 500 |
| gateway-mcp-discovery: `mcp.initialize-owned-runtime` | FAIL | Error |
| gateway-mcp-synthetic: `mcp.initialize-owned-runtime` | FAIL | Error |
| gateway-mcp-metadata: `mcp.metadata.resource.list-without-execution` | FAIL | $ZodError |
| gateway-mcp-metadata: `mcp.metadata.resource_template.match-populated-SCM-capability` | FAIL | Error |
| gateway-owned-writes: `workspaces.create` | FAIL | HTTP 400 |
| gateway-administration-availability: `data.collections` | FAIL | HTTP 403 |
| gateway-administration-availability: `data.labels` | FAIL | HTTP 403 |
| gateway-administration-availability: `data.prompts` | FAIL | HTTP 403 |
| gateway-administration-availability: `data.partials` | FAIL | HTTP 403 |
| gateway-administration-availability: `data.virtual-keys` | FAIL | HTTP 403 |
| gateway-administration-availability: `data.users.scm-prefix` | FAIL | HTTP 403 |
| gateway-administration-availability: `data.users.upstream-prefix` | FAIL | HTTP 403 |
| gateway-administration-availability: `data.invites.scm-prefix` | FAIL | HTTP 403 |
| gateway-administration-availability: `data.invites.upstream-prefix` | FAIL | HTTP 403 |
| gateway-administration-availability: `data.members.scm-prefix` | FAIL | HTTP 403 |
| gateway-administration-availability: `data.members.upstream-prefix` | FAIL | HTTP 403 |
| gateway-administration-availability: `data.scim` | FAIL | HTTP 403 |
| gateway-administration-availability: `admin.collections` | FAIL | HTTP 403 |
| gateway-administration-availability: `admin.labels` | FAIL | HTTP 403 |
| gateway-administration-availability: `admin.prompts` | FAIL | HTTP 403 |
| gateway-administration-availability: `admin.partials` | FAIL | HTTP 403 |
| gateway-administration-availability: `admin.virtual-keys` | FAIL | HTTP 403 |
| gateway-administration-availability: `admin.users.scm-prefix` | FAIL | HTTP 403 |
| gateway-administration-availability: `admin.users.upstream-prefix` | FAIL | HTTP 403 |
| gateway-administration-availability: `admin.invites.scm-prefix` | FAIL | HTTP 403 |
| gateway-administration-availability: `admin.invites.upstream-prefix` | FAIL | HTTP 403 |
| gateway-administration-availability: `admin.members.scm-prefix` | FAIL | HTTP 403 |
| gateway-administration-availability: `admin.members.upstream-prefix` | FAIL | HTTP 403 |
| gateway-administration-availability: `admin.scim` | FAIL | HTTP 403 |
| gateway-runtime-authoring: `runtime-authoring.collections.id` | FAIL | HTTP 400 |
| gateway-runtime-authoring: `runtime-authoring.collections.slug` | FAIL | HTTP 400 |
| gateway-runtime-authoring: `runtime-authoring.collections.provider-boundary` | FAIL | HTTP 404 |
| gateway-runtime-authoring: `runtime-authoring.labels.id` | FAIL | HTTP 400 |
| gateway-runtime-authoring: `runtime-authoring.labels.slug` | FAIL | HTTP 400 |
| gateway-runtime-authoring: `runtime-authoring.labels.none` | FAIL | HTTP 400 |
| gateway-runtime-authoring: `runtime-authoring.labels.provider-boundary` | FAIL | HTTP 404 |
| gateway-runtime-authoring: `runtime-authoring.prompts.id` | FAIL | HTTP 400 |
| gateway-runtime-authoring: `runtime-authoring.prompts.slug` | FAIL | HTTP 400 |
| gateway-runtime-authoring: `runtime-authoring.prompts.none` | FAIL | HTTP 400 |
| gateway-runtime-authoring: `runtime-authoring.prompts.provider-boundary` | FAIL | HTTP 404 |
| gateway-runtime-authoring: `runtime-authoring.prompts.partials.none` | FAIL | HTTP 400 |
| gateway-runtime-authoring: `runtime-authoring.prompts.partials.provider-boundary` | FAIL | HTTP 404 |
| gateway-provider-http: `provider-http.images.generations` | FAIL | HTTP 400 |
| gateway-provider-http: `provider-http.images.edits` | FAIL | HTTP 400 |
| gateway-provider-http: `provider-http.images.variations` | FAIL | HTTP 404 |
| gateway-provider-http: `provider-http.audio.speech` | FAIL | HTTP 404 |
| gateway-provider-http: `provider-http.audio.transcriptions` | FAIL | HTTP 400 |
| gateway-provider-http: `provider-http.audio.translations` | FAIL | HTTP 400 |
| gateway-provider-http: `provider-http.moderations` | FAIL | HTTP 400 |
| gateway-provider-http: `provider-http.rerank` | FAIL | HTTP 500 |
| gateway-provider-http: `provider-http.ocr` | FAIL | HTTP 500 |
| gateway-provider-http-sdk: `provider-http.images.generations` | FAIL | HTTP 400 |
| gateway-provider-http-sdk: `provider-http.images.edits` | FAIL | HTTP 400 |
| gateway-provider-http-sdk: `provider-http.images.variations` | FAIL | HTTP 404 |
| gateway-provider-http-sdk: `provider-http.audio.speech` | FAIL | HTTP 404 |
| gateway-provider-http-sdk: `provider-http.audio.transcriptions` | FAIL | HTTP 400 |
| gateway-provider-http-sdk: `provider-http.audio.translations` | FAIL | HTTP 400 |
| gateway-provider-http-sdk: `provider-http.moderations` | FAIL | HTTP 400 |
| gateway-provider-http-sdk: `provider-http.rerank` | FAIL | HTTP 500 |
| gateway-provider-http-sdk: `provider-http.ocr` | FAIL | HTTP 500 |
| gateway-runtime-observability: `runtime-observability.feedback.update-owned` | FAIL | HTTP 500 |
| gateway-observability-details: `observability-details.log.native` | FAIL | HTTP 500 |
| gateway-observability-details: `observability-details.log.iso` | FAIL | HTTP 500 |
| gateway-observability-details: `observability-details.feedback.PUT` | FAIL | HTTP 500 |
| gateway-observability-details: `observability-details.feedback.POST` | FAIL | HTTP 400 |
| gateway-observability-details-sdk: `observability-sdk.log-detail` | FAIL | HTTP 500 |
| gateway-observability-details-sdk: `observability-sdk.feedback-update-neutral` | FAIL | HTTP 500 |
| gateway-feedback-scores: `observability-details.feedback.positive-score-zero-weight` | FAIL | HTTP 500 |
| gateway-feedback-scores: `observability-details.feedback.positive-score-minimal-metadata` | FAIL | HTTP 500 |
| gateway-feedback-scores: `observability-details.feedback.restore-neutral` | FAIL | HTTP 500 |
| gateway-legacy-completions: `legacy-completions.create` | FAIL | HTTP 404 |
| gateway-legacy-completions: `legacy-completions.stream` | SKIP | Non-streaming legacy completion prerequisite failed for the designated model; no alternate model used. |
| gateway-legacy-completions-sdk: `legacy-completions.create` | FAIL | HTTP 404 |
| gateway-legacy-completions-sdk: `legacy-completions.stream` | SKIP | Non-streaming legacy completion prerequisite failed for the designated model; no alternate model used. |
| gateway-prompt-runtime: `prompt-runtime.render.unprovisioned-template` | FAIL | HTTP 404 |
| gateway-prompt-runtime: `prompt-runtime.completions.unprovisioned-template` | FAIL | HTTP 404 |
| gateway-prompt-runtime-sdk: `prompt-runtime.render.unprovisioned-template` | FAIL | HTTP 404 |
| gateway-prompt-runtime-sdk: `prompt-runtime.completions.unprovisioned-template` | FAIL | HTTP 404 |
| gateway-realtime: `realtime.connect-and-session` | FAIL | HTTP 101 |
| gateway-realtime-sdk: `realtime-sdk.provider-session` | FAIL | HTTP 101 |
| gateway-realtime-example: `realtime-example.provider-session` | FAIL | AssertionError |
| gateway-vector-batches: `file-batch.cancel` | FAIL | HTTP 500 |
| gateway-vector-batches: `file-batch.retrieve.cancelled` | FAIL | AssertionError |
| gateway-vector-batches: `file-batch.list-files.cancelled` | FAIL | AssertionError |
| gateway-vector-batches-json: `file-batch.cancel` | FAIL | HTTP 500 |
| gateway-vector-batches-json: `file-batch.retrieve.cancelled` | FAIL | AssertionError |
| gateway-vector-batches-json: `file-batch.list-files.cancelled` | FAIL | AssertionError |
| gateway-vector-batches-beta: `file-batch.cancel` | FAIL | HTTP 500 |
| gateway-vector-batches-beta: `file-batch.retrieve.cancelled` | FAIL | AssertionError |
| gateway-vector-batches-beta: `file-batch.list-files.cancelled` | FAIL | AssertionError |
| doc-examples: `example.mgmt-dlp-data-profiles` | FAIL | HTTP 500 |
| doc-examples: `example.mgmt-dlp-dictionaries` | FAIL | HTTP 400 |
| doc-examples: `example.red-team-network-broker` | FAIL | HTTP 403 |
| dlp-recovery: `dataProfiles.delete-owned` | FAIL | HTTP 501 |
| dlp-recovery: `dataProfiles.independent-retirement-read` | FAIL | AssertionError |
| dlp-dictionary-wire: `dictionary.text.GLOBAL` | FAIL | HTTP 415 |
| dlp-dictionary-wire: `dictionary.text.us` | FAIL | HTTP 415 |
| dlp-dictionary-wire: `dictionary.json-blob.GLOBAL` | FAIL | HTTP 400 |
| dlp-dictionary-wire: `dictionary.json-blob.us` | FAIL | HTTP 400 |
| cleanup-audit: `dlp.profile:<owned-fixture>` | FAIL | AssertionError |

Gateway workspace creation was also tested with explicit defaults and a wire-level metadata variant; SCM still returned 400 AB01. The probes used synthetic scope names. An unused SCM-provisioned scope or a known-good creation request is needed to separate missing provisioning from an API contract change. Existing workspace/IAM settings were not changed to bypass the failure.

The authenticated-source MCP discovery attempt retains its HTTP 401 prerequisite. A subsequent owned public-reference upstream passes the complete 16/16 lifecycle, including eventual runtime visibility after capability disable/re-enable. A private synthetic fixture was rejected by unchanged SSRF protection; it is not counted as successful discovery. No tools were invoked. The independent fixture audit includes all synthetic/public attempts and implicit servers. See the [exact positive and negative observations](../guides/release-verification.md#public-upstream-capability-lifecycle), including observed propagation delays. Published experimental stability is retained.

The later metadata-variant suite retains **18 passes and 2 failures**. Prompt capability disable/re-enable passes in SCM and runtime (6/5/6 visible prompts); resource discovery fails official MCP validation because the deployed filter strips required names, while resource-template discovery is forwarded without SCM synchronization. The independent audit now includes every metadata attempt and confirms all 22 owned resources plus the implicit-server inventory check. No tools, prompts or resource contents were executed/read. See [actual metadata diagnostics](../guides/examples.mdx#mcp-prompt-resource-and-template-verification); these are not new covered operations or a successful resource lifecycle.

Gateway log-detail reads returned 500 even with an existing log's real storage metadata. SCM denies log ingestion and feedback creation, but the explicit runtime endpoint accepts both with a runtime key. The typed SDK observability suite passes 5/5, including single/batch log ingestion; a separate 5/5 SCM read audit confirms both owned feedback records and both journaled synthetic log traces. Experimental `getLog` and `updateFeedback` methods now implement both confirmed detail routes. Their typed E2E suite reproduces both HTTP 500 failures with passing ownership/authentication/key-cleanup controls; no new log or feedback is created. These routing differences are not grounds to use runtime credentials on SCM or to classify the entire family as unsupported. Passing offline contracts are not passing live retrieval/update workflows.

The September 6, 19:13 UTC authoring discovery made 58 GET probes with explicit dev workspace ID, slug and omitted optional filters. Its two passing checks are workspace/authentication controls, not 58 covered operations. Only admin-plane secret-reference listing without an unsupported workspace query returned 2xx. A subsequent synthetic, unbound secret-reference discovery passed 6/6; the implemented SDK lifecycle then passed 7/7, including pagination/filtering, create/get/update, slug lookup, deletion and a confirming 404. Neither run resolved an external secret or bound a reference to an integration. Other authoring/user/SCIM families remain unresolved; no broader absence claim follows from denials. Pricing was subsequently verified on its explicitly public unauthenticated server and is no longer an unimplemented gap.

The documentation example run exposed DLP profile update/retirement HTTP 500, dictionary creation HTTP 400, and network-broker update HTTP 403. The profile fixture remains unbound but active and journaled; repeat runs reuse it instead of creating additional fixtures. The live profile endpoint advertises DELETE in OPTIONS but executing DELETE returned HTTP 501. This is not a supported cleanup method and was not added to the SDK. Multipart diagnostics showed that the documented JSON Blob part reached validation (400), whereas a text part returned 415; neither variant is represented as a passing dictionary lifecycle. The latest Model Security example excludes synthetic test groups and successfully reads an existing ML scan's evaluations/files. Earlier failures remain in history.

## What was exercised

The OAuth deadline correction was verified with 16 failing-first regressions and real 30-second
synthetic fault injection against the packed ESM/CommonJS SDK on Node 18/20/22/24. Those checks
are offline, not induced service outages. The fresh `oauth-service-reads` suite independently
reports 24 passing / 0 failing / 0 skipped
read-only checks across Management, Model Security, Red Team and both SCM gateway planes using
the corrected token manager. The runnable `mgmt-auth.ts` example additionally
verifies successful standalone concurrent refresh deduplication and explicit cache clearing;
its latest sanitized output is on the examples page. No credentials or token values are logged.

The read-only analytics discovery compared known and nonexistent synthetic trace/metadata filters against the same request-count window. Camel-case `traceId` and JSON `metadata` were respected; upstream `trace_id` was ignored and remains a failed diagnostic check. The typed SDK request-chart suite subsequently passed 3/3 using existing owned records, with no new fixtures or mutations. Invalid telemetry options now fail before authentication or network I/O. That initial increment implemented only request-count filters. Subsequent releases extend the shared filters to four charts and six grouped endpoints; all 22 upstream analytics adaptations remain partial. The [examples page](../guides/examples.mdx#verified-request-chart-filters) includes the captured sanitized output.

The latest runtime-authoring check made nine read-only collection/label/prompt/partial requests without a provider header and four more with the prescribed `@openai` provider. The first nine returned 400 with the exact missing-provider/config message; the four header-bearing requests returned 404. Model/authentication and key retirement pass, but all 13 authoring checks fail. Both deployed replicas register a generic provider-proxy GET fallback, not explicit GET handlers for these four collections. A hash-pinned synthetic middleware replay reproduces the missing-header rejection and confirms that a provider reaches its continuation without calling any live client. Adding a provider is not a verified authoring control plane. No authoring/IAM resource was created or changed; the latest sanitized boundary observation is in the examples-page diagnostic JSON.

The raw and typed provider HTTP suites exercise nine experimental image/audio/moderation/rerank/OCR methods with identical synthetic inputs and the prescribed `@openai/gpt-5.6-terra` model. Both record 2 passing controls and 9 failures with matching HTTP statuses. The corrected one-pixel PNG has checked chunk checksums and decompression; the silent 0.1-second WAV has checked PCM headers. Earlier invalid-PNG and hostname-resolution attempts remain historical diagnostics, not compatibility evidence. No specialized model or alternate provider was configured. These methods have frozen offline contract coverage but no successful live provider certification; their actual failed result records are reproduced on the examples page.

The read-only Kubernetes diagnostic verifies the Deployment-to-ReplicaSet-to-Pod ownership chain and targets the gateway container explicitly; broad labels also match Redis and are not a safe execution selector. Both gateway replicas run `gateway_enterprise:2.20.0`, with bundle SHA-256 `b2710c4f6a580a5a1bb525695f942175e4698d61a0c90ba066c48f93490f6331`. Effective `ANALYTICS_STORE` and `LOG_STORE` are `control_plane`. The deployed feedback handler requires a ClickHouse lookup, but initialization is skipped in this mode; log retrieval has no control-plane branch and throws an invalid-storage error. Evaluating only the two reviewed, hash-pinned pure functions with synthetic dependencies reproduces these failures without running the server bundle or calling database/network clients. The deployed handlers return 500 for those paths. The five passing diagnostic checks establish those limitations and unchanged configuration, not successful feedback updates or log reads. Evidence is retained in `gateway-deployment-diagnostics-evidence.json`; the reproducible script is `scripts/e2e-gateway-deployment-diagnostics.ts`.

No storage mode, production image, IAM policy or existing resource was modified to bypass a failure. [Palo Alto Networks documents the hybrid architecture](https://docs.paloaltonetworks.com/ai-runtime-security/administration/configure-ai-gateway) as a locally hosted data plane managed through SCM, with native log storage. An SDK compatibility fix must not silently redirect that production data handling.

The separate runtime detail diagnostic used an existing owned synthetic log and feedback record. Log reads returned 500 with native and ISO storage timestamps. Feedback PUT returned 500; the POST alternative shown in the pinned curl sample returned 400. Its two passes are an owned-log control and temporary-key cleanup, not verified detail/update operations. No new feedback or log was created by that diagnostic.

The additional score diagnostic tried positive feedback with zero weight, omitted metadata, and restoration to the neutral score on the same owned feedback ID. All three PUTs returned 500; an independent SCM audit then verified the exact record still has value 0 and weight 0. This rules out a zero-score-only failure. Upstream Portkey's [feedback service](https://github.com/Portkey-AI/gateway/blob/8febc1dc1d85053dd374922e547b4db1af0fab79/src/services/feedback/index.ts) and [ClickHouse adapter](https://github.com/Portkey-AI/gateway/blob/8febc1dc1d85053dd374922e547b4db1af0fab79/src/services/feedback/clickhouse.ts) show a read/delete dependency for updates that creation does not exercise. That was the initial hypothesis. Subsequent read-only inspection of the deployed 2.20.0 bundle and effective storage modes, plus pure-function reproductions on both exact gateway replicas, confirmed the missing ClickHouse path described below. No deployment configuration was changed.

The legacy-completion diagnostic used the required `@openai/gpt-5.6-terra` model. Model lookup passed with the same temporary runtime key; POST /completions returned 404 with an incompatible-model error. The new typed SDK method reproduces that status. Streaming was explicitly skipped after the non-streaming prerequisite failed. No different model or chat-to-completion substitution was used. The operation is now an experimental direct contract, not a passing live integration. The [official completion reference](https://developers.openai.com/api/reference/resources/completions/methods/create) describes JSON/SSE semantics; it does not establish this deployment's model compatibility. These diagnostics and their actual result projections also appear on the [examples page](../guides/examples.mdx).

Raw and typed prompt-runtime diagnostics use random unprovisioned template IDs; both render and completion return 404. No owned template was available from the authoring workflow, and no existing template was executed or changed. Both deployed replicas register the three legacy/prompt routes, and prompt completion dispatches to ordinary chat/legacy handlers. The three new SDK methods are experimental. Their request models follow the pinned descriptions' explicit root-level parameter instructions, rejecting educational-only nested `hyperparameters`. Successful template rendering/completion and live streaming remain unverified; the failed checks are preserved above.

The realtime probe passes same-key model lookup, socket closure and temporary-key retirement, but fails session creation. A valid HTTP 101 upgrade is followed by an `error` event with allowlisted code `invalid_model`. No client event, audio or generation request was sent; the prescribed model/provider is unchanged. The [official WebSocket guide](https://developers.openai.com/api/docs/guides/realtime-websocket) informed handshake/event validation, not a model-support claim. Both deployed replicas register the route and strip the provider prefix before forwarding. A separate pure-function reproduction confirms the upstream-open promise has no error/close rejection; this is a potential stalled-handshake path, not the observed failure, which upgraded successfully. The full sanitized observation is on the examples page. The typed experimental SDK transport now covers the upgrade contract. Its separate live suite records 4 passes / 1 failed provider session, and the actual runnable example also fails. The independent realtime audit verifies absence of all journaled temporary keys. See the examples page for the separate timestamps and exact sanitized output.

- Scan: benign sync/async requests and result/report retrieval.
- Management: owned profile, topic and API-key lifecycles, plus an actual scan using the created profile.
- Model Security: custom-rule and security-group lifecycles, assignment, version history and synthetic scanner-result ingestion. This does not execute the proprietary ML scanning engine.
- Red Team: completed bounded custom jobs with benign prompts; reports; draft targets/adapters; prompt sets; CSV upload/download; metadata and network-broker reads.
- Gateway management: inventory/telemetry; isolated config, integration/custom-model/provider/service-key, guardrail/MCP, usage/rate policy and log-export draft workflows. Earlier provider-CRUD fixtures used synthetic credentials.
- Gateway runtime: real inference in workspace dev (`ws-develo-71f8d8`) through `https://airs.cdot.io/v1`, using `@openai/gpt-5.6-terra` and `@openai/text-embedding-3-small`. SDK and CLI JSON/streaming chat and Responses, float/base64 embeddings, cancellation and invalid-input handling pass. Keys were short-lived owned SCM service keys, not the user-provided persistent key.
- Runtime resources: model and fine-tuning-job listing, multipart file upload/retrieve/download, vector-store CRUD/file indexing and stored Responses retrieval/input-items/deletion. Batch inference now passes creation, retrieval, terminal completion, gateway/native-file output and cleanup (9/9); a separate typed cancellation lifecycle reaches cancelled and passes cleanup (8/8). Live validating batches exposed null output IDs/timestamps, now accepted without relaxing other known fields. Actual sanitized batch JSON is included in the examples page. The separate vector-file-batch suite validates creation, completed retrieval and file listing after correcting its live object discriminator. Vector-file-batch cancellation returned HTTP 500 and its two dependent cancelled-state assertions failed; all owned stores/files were removed. Separate empty-JSON and beta-header diagnostics also returned 500 and did not justify changing the SDK wire contract. Model deletion and fine-tuning job lifecycle remain offline-only. No training job was started, and the designated inference/embedding models were not changed.
- CLI: JSON reads across domains, a benign runtime scan, and separate profile/topic flag-builder lifecycles against the packed SDK. This additional test found and drove the fix to the legacy SDK topic force-delete URL. The separate CLI live Vitest suite also passed 4/4 at 13:57 UTC, recorded in the SDK checkout's artifacts/cli-live-tests.json; it is not folded into the SDK suite counters above.
- Public model pricing: both required models succeed through the explicitly configured, unauthenticated public Portkey host without /v1. The client preserves catalog data and does not select an inference model, evaluate formulas or report effective tenant billing. SCM denial on the same relative path was not evidence about this distinct public service.
- Executable documentation: 22 runnable scripts (excluding the shared helper): 21 in the retained primary batch, including 4 explicitly mock-backed scripts, plus the new realtime script executed separately against the source checkout. The primary batch also includes 3 live sanitized scan-response captures. Separate timestamps and the realtime failure are preserved. Real outputs, failures, and mock/live distinctions appear on the examples, Scan API, and OAuth lifecycle pages.

The host's default Node DNS lookup failed for the gateway while IPv4 resolution and curl succeeded. Runtime E2E uses the opt-in `E2E_GATEWAY_IPV4_ONLY=1` process-only, gateway-host-only lookup override; it retains native fetch and TLS certificate verification. This is disclosed test-environment accommodation, not a DNS change or SDK default.

On September 7, the workspace resolver additionally failed ordinary service-host lookups and the configured primary split-DNS server refused gateway queries. The secondary split-DNS resolver supplied the existing LAN ingress address; an exact HTTPS route read and a keyless 401 verified the same gateway boundary. Current reruns use the opt-in `service-dns-bootstrap.mjs` for fully qualified service lookups and an explicitly verified gateway address. The request URL/SNI and certificate checks remain unchanged; no system DNS, ingress or service configuration is modified. The public WAN address timed out from this workspace, so these LAN-path results are not external-WAN reachability certification. The separate `artifacts/e2e/network-preflight.json` records verification and infrastructure hashes.

Some dependent operations have no runnable prerequisite and are not in the executed-check denominator: export cancellation/download after failed export start. MCP capability updates were subsequently verified with an owned public-reference upstream; the earlier missing-tool skip remains historical evidence. Usage-policy reset was subsequently verified with an isolated traffic-derived entity; the earlier extension-suite skip remains historical evidence, while the separate usage-reset and retirement-audit suites record the completed workflow. See [published-package and post-release examples](../guides/release-verification.md). The gateway ledger retains version-specific experimental annotations. No acceptance of legal terms, IAM/organisation-authentication changes, instance provisioning, interactive Copilot authorization, or mutation/rotation of existing credentials was performed. Network-broker draft creation and get succeeded, but update returned HTTP 403, including when both name and description were supplied. Three owned drafts remain disconnected and journaled; repeat runs reuse a draft rather than create additional records.

## Cleanup and retained footprint

The observability checks retain two zero-weight synthetic feedback records and three synthetic ingestion log records because the pinned API declares no deletion method. Two log trace IDs were journaled by the typed run; the earlier raw ingestion acknowledgement was recorded without retaining its generated trace ID. Both feedback IDs and both journaled log traces are independently visible through SCM. These are explicitly retained audit records, not deleted resources. All short-lived keys were deleted and checked separately.

The cleanup audit resolves every journaled fixture and separately checks for implicit MCP servers under owned integrations. A separate runtime audit verifies every historically journaled file, vector store and stored Response is absent, using a successful model read as an authentication control. Native batch jobs have no deletion API: their audit records must be in a confirmed completed, failed, expired or cancelled state; validating, in-progress and cancelling are not accepted as retired. Other resources require an authoritative not-found result, a documented archived/tombstone/inactive state, or absence from a complete active inventory. HTTP 403 alone is never deletion proof.

Deleted records may remain archived. Synthetic Model Security scan records, completed Red Team jobs, four terminal native batch jobs and non-running gateway export audit records have no deletion API and remain as an auditable test footprint. The six files created or produced by the native batch checks were deleted. In addition, the new DLP example fixture could not be retired because the server rejected cleanup; the aggregate audit reports this as FAIL, not an accepted historical record. Fixture journals retain the exact ownership/identifiers. These checks do not claim that the tenant has no historical audit entries.

## Re-run safely

Use the commands on the [conformance page](./openapi-conformance.md) and [runtime guide](../guides/ai-gateway-inference.md). The credential file `~/.prisma-airs/config.json` is read only. Mutation suites require `--writes`; legacy CLI suites require `CLI_COMPAT_DIR`, while the inference CLI suite accepts `E2E_CLI_ENTRY` pointing to the updated built entry point. Do not change production settings merely to obtain a passing score.
