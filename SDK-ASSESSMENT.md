# SDK/CLI review, OpenAPI conformance and live assessment

> Historical pre-release assessment. The user subsequently authorized publishing the implemented scope despite the documented gaps. See [RELEASE-2026-09-07.md](RELEASE-2026-09-07.md) for delivery status; the version, package hashes, local-only status and acceptance findings below describe the original verification checkpoint, not the later release.

Review checkpoint: September 7, 2026 UTC. Supersedes the [archived OAuth checkpoint](artifacts/assessments/2026-09-07T01-43-oauth.md); earlier findings and reports remain retained. Baseline SDK commit: `ecd87f265e6261dea01b675af3da7850c39d6235`.

## Outcome and acceptance

**The entire requested scope is not complete.** AIRS contract coverage is 149/149 operations with 100% of measured request/response properties. Direct full-spec Portkey coverage is **137/242 (56.61%)**, not 99%. Passing source tests do not turn failed or unexecuted service workflows into certified integrations.

The SDK and built CLI are available for local candidate testing. SDK version remains `0.20.1`, CLI `4.1.2`, and the CLI's published SDK pin remains `0.20.0`. New changesets are unreleased. No version bump, commit, push, release, production deployment or global CLI installation was performed.

| Acceptance item                                   | Result                                                                                                       |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| SDK/CLI-foundation review and improvements        | Implemented and regression-tested; findings below                                                            |
| At least 99% supplied AIRS contracts              | Achieved on explicitly corrected contracts: 149/149 operations and measured fields                           |
| At least 99% complete Portkey spec                | Not achieved: 137/242 direct operations                                                                      |
| Prescribed gateway inference and embedding models | SDK 10/10 and built CLI 8/8 live checks pass                                                                 |
| Public model-pricing catalog                      | Both prescribed model lookups and no-auth safety check pass, 3/3                                             |
| Complete supported Node matrix                    | 10,483/10,483 SDK tests in 128 files on each major                                                           |
| CLI local integration                             | 1,033/1,033 tests in 87 files against the packed SDK                                                         |
| All documentation examples successful             | Not achieved: all 21 scripts executed, 18 pass / 3 fail; three additional scan captures pass                 |
| Cleanup                                           | 341/342 aggregate checks pass; one unbound DLP profile remains active; retained runtime audit 53/53          |
| All service workflows successful                  | Not achieved; exact failed/skipped checks remain in the live reports                                         |
| Clean-install/release integration                 | Pending matching SDK release, CLI dependency pin/lockfile update, clean-install verification and CLI release |

The SDK is `/home/cdot/development/cdot65/prisma-airs-sdk`; the CLI is `/home/cdot/development/cdot65/prisma-airs-cli`. The initially supplied working directory contains project notes. The CLI source includes inference commands and its local dependency link points to the unpacked candidate. This link does not certify the published dependency.

## Mandatory runtime criteria and safety

- Workspace `dev`, slug `ws-develo-71f8d8`; runtime endpoint `https://airs.cdot.io/v1`.
- Inference `@openai/gpt-5.6-terra`; embeddings `@openai/text-embedding-3-small`.
- SCM credentials loaded read-only from `~/.prisma-airs/config.json`; before/after integrity checks pass.
- Runtime keys are separate from SCM OAuth/TSG headers. Owned short-lived keys are created, held in memory, journaled and retired. The existing user-provided key is not copied into source, docs or commands.
- No alternate model/provider, legal-term acceptance, IAM grants, existing credential rotation, or production storage/configuration changes were used to make tests pass.

September 7 unqualified service DNS lookups failed in this environment. The test-only DNS bootstrap uses absolute IPv4 names for six explicit service hosts. Its optional gateway address was verified against the configured working DNS resolver and exact gateway ingress, with normal TLS certificate verification and the original hostname. The configured first resolver refused connections; the second returned the gateway LAN address. Public-address connectivity did not succeed from this workspace, so **WAN/public gateway reachability is not certified**.

The [read-only network preflight](artifacts/e2e/network-preflight.json), captured at 2026-09-07T01:57:33.484Z, confirms successful OAuth, an expected keyless HTTPS 401, unchanged credential/infrastructure hashes and enabled TLS validation. No CoreDNS, resolver, ingress, service or SDK networking default was changed. Earlier DNS-failed attempts remain in report history; only the latest complete example capture is reproduced on the examples pages. Seven isolated DNS-bootstrap regressions cover scope, callback shapes and invalid overrides.

## Review findings and implemented changes

| Priority | Finding                                                                             | Implemented improvement / evidence                                                                                                                                                                                   |
| -------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| High     | Component-name preflight concealed missing operations and opaque fields             | Source-hashed operation inventory, recursive JSON property checks, exact transport/query assertions, valid variants and independently invalid Ajv mutations; offline contract gate in CI                             |
| High     | Auth, response reads, retries and streams could wait indefinitely                   | Disposable deadlines, shared-request OAuth deadlines, caller cancellation, abortable body reads and capped Retry-After; regressions include implementations that ignore AbortSignal                                  |
| High     | Redundant refresh/retries could replay writes or billable generations               | Serialize once, fresh per-attempt auth/URL, one special auth retry, no refresh on explicit OPA denial, preserve 429 policy, no replay after successful headers/body-read failure; inference defaults to zero retries |
| High     | Invalid requests reached auth/network or serialized non-finite JSON                 | Request validation before authentication; finite/prototype-safe extension maps; strict stable writes and additive response compatibility                                                                             |
| High     | Existing CLI topic force-delete used an obsolete SDK URL                            | Live CLI lifecycle found the defect; `topics.forceDelete()` now delegates to `/topic/{id}/force`; the same lifecycle passes                                                                                          |
| High     | Runtime SSE handling needed complete lifecycle and error semantics                  | Incremental fatal UTF-8 decoding, CR/LF variants, multiline SSE data, bounded frames, strict typed events, mandatory completion markers, concurrent-read serialization, eager cancellation and stream cleanup        |
| High     | Debugging could expose bodies/keys or consume a stream before its caller            | Sensitive header redaction; runtime bodies always omitted; no debug stream clone; CLI files created mode 0600/directories 0700; no runtime key flag                                                                  |
| High     | CLI stream output needed pipe/cancellation discipline                               | Awaited stdout writes, JSONL events, SIGINT/SIGTERM cancellation, clean EPIPE handling, cleanup before process exit; usage errors exit 2, runtime failures exit 1                                                    |
| Medium   | Pagination fetched unnecessary pages                                                | Stop at requested caps, validate limits and reject stalled traversal while preserving endpoint semantics                                                                                                             |
| Medium   | Upstream schemas differed from live AIRS/Prisma                                     | Explicit corrections for async batches, revisions, optional topic fields, CSV, overlapping alternatives, SCM envelopes, nullable lifecycle values and numeric booleans; upstream YAML unchanged                      |
| Medium   | Runtime resources needed correct wire formats                                       | Typed routes, encoded single-segment IDs, validated native multipart uploads, exact binary downloads, query serialization and provider routing                                                                       |
| Medium   | Complex schema declarations and ineffective tooling checks                          | Explicit type/schema boundaries and lazy recursive schemas; compact declaration generation; strict checks for tooling and runnable docs examples; no production OpenAPI parser dependency                            |
| Medium   | Cleanup could miss implicit revisions or resources created before validation failed | Immediate ownership journaling, raw create-ID registration before response validation, reverse-order cleanup, complete active inventories and independent runtime absence checks                                     |
| Medium   | Packaging/dependency evidence was incomplete                                        | MIT license packaged; exact tarball/installed/source-map checks; ESM/CJS and strict consumer types; SDK dependency audit clean; docs-only advisories disclosed                                                       |

These changes remove avoidable work and bound waits; **no throughput benchmark is claimed**. Native fetch/crypto remain in use; Zod is the only production dependency.

## Runtime observability detail contracts — current implementation

The confirmed runtime routes now have typed SDK methods: `inference.updateFeedback()` uses the declared PUT operation, and `inference.getLog()` retrieves the declared log-detail shape. Both are explicitly experimental and outside stability guarantees until live-verified. The initial 58 focused checks failed because these methods were absent; all now pass, with five additional response/debug-safety tests bringing the focused set to **63**. An additional **44 independently generated OpenAPI checks** cover their contracts. The complete matrix is **10,483/10,483**, not just the narrow tests.

Feedback updates validate UUID identifiers, integer scores from -10 through 10, optional weights from 0 through 1, strict stable fields and finite/prototype-safe JSON metadata. They do not inject optional defaults. Log queries accept only documented fields; the v2 creation-timestamp dependency is enforced in TypeScript and Zod, including calendar-valid ISO timestamps with a timezone. Omitted path format preserves the server's v1 default. Opaque log IDs are encoded as one path segment. Declared response fields are typed and validated while additive fields survive. Both methods reuse the existing explicit runtime endpoint/key, cancellation/deadline transport, zero default retries and unconditional body-debug omission.

The [typed live run](artifacts/e2e/gateway-observability-details-sdk.json) finishes at **01:57:45.366 UTC: 3 pass / 2 fail / 5 total**. Owned-log and runtime-model authentication controls pass; both detail/update requests still return HTTP 500, and the temporary key is retired. It reuses the original synthetic log and neutral zero-weight feedback UUID without creating new audit records. The independent [SCM visibility audit](artifacts/e2e/gateway-observability-audit.json) passes **5/5 at 01:58:59.117 UTC**, confirming both retained feedback records remain neutral and both journaled log traces remain visible.

These additions increase exact route implementation from **135 to 137/242 (56.61%)**, with **1,358/1,358 request and 2,329/2,329 response property occurrences** modeled. They do not fix the deployed storage handlers or turn failed workflows into passes. The current ledger contains **28 experimental methods**. No infrastructure/storage mode, existing user trace, provider or model was changed.

The packed candidate exposes **1,301 runtime exports** in both module formats, with all nine payload files and 124 source-map files matched. Node 18/20/22/24 consumer checks independently exercise both new methods, exact methods/query/body/header behavior, malformed input rejection and strict v2 query types; the prior real 30-second OAuth checks still pass. The CLI is rebuilt and tested against this installed archive. The [previous package](artifacts/package/cdot65-prisma-airs-sdk-0.20.1-before-observability-details.tgz) is retained.

The CLI read harness now selects the prescribed dev slug explicitly instead of the first workspace returned. One invocation stopped before any commands because its explicit checkout environment variable was omitted; the corrected invocation passes all 12 checks. The initial concurrent Node runs all passed, but the evidence reconciler conservatively requires non-host runs to start after the host coverage run. All three non-host majors were rerun successfully to satisfy that provenance gate. No failing integration was reclassified.

## Retained OAuth deadline correction

The [synthetic reproduction](artifacts/oauth-deadline-reproduction.json) showed that standalone OAuth callers remained pending after an ignored abort, and a late response could populate the cache. All **16 new tests failed against the old implementation** before the correction. The focused OAuth/auth/transport run then passed 101/101 checks; the complete final four-major matrix passes 10,483/10,483 after resolving an intermediate TypeScript inference error caught by TypeDoc.

The fix reuses the internal disposable deadline and abortable-wait helpers. One 30-second budget covers token headers and both success/error JSON bodies. All concurrent waiters reject with `OAUTH_ERROR` on timeout, the pending refresh is released, and a subsequent call can authenticate again. Late responses are discarded without caching or refresh callbacks; synchronous, rejected or stalled body cancellation cannot mask or delay the timeout. Successful/failing attempts dispose their timer. Public API signatures, nominal caching and callback behavior remain unchanged; no automatic token replay or production dependency was added.

The packed ESM and CommonJS builds pass **real 30-second synthetic** header/body timeout, concurrent deduplication, fresh-refresh recovery and late-token rejection checks on Node 18/20/22/24. These checks use no live credentials and do not shorten the production timer. All nine package payload files and 124 unique source-map files match the current source; the archive has 1,301 runtime exports. The prior candidate is preserved in [the pre-OAuth archive](artifacts/package/cdot65-prisma-airs-sdk-0.20.1-before-oauth-deadline.tgz).

Live verification is separate: 24/24 read-only service checks pass across Management, Model Security, Red Team and both SCM gateway planes at 01:24:01.749 UTC. CLI read/scan workflows pass 12/12 at 02:02:10.481 UTC; SDK inference passes 10/10 and CLI inference 8/8 with the prescribed models. The runnable authentication example passes concurrent refresh deduplication and explicit cache clearing, reporting two refresh callbacks and a valid token without printing its value. The full 21-script capture finishes at 02:00:36.853 UTC with 18 passing scripts and the same three known service failures.

The [OAuth guide](docs-site/docs/guides/oauth-lifecycle.md), [actual examples](docs-site/docs/guides/examples.mdx), architecture, environment-variable guide and generated API reference explain the fixed budget and separate it from `tokenBufferMs` and the service-request deadline. Request-validation error documentation was also corrected to match the implementation's omission of rejected values/unknown-key names. This closes a code-level resilience defect; the OAuth correction itself did not improve Portkey coverage or resolve backend failures. The subsequent detail-method increment described above is separately counted as implementation, not service recovery.

## Previous API implementation and self-review iteration

`AIGatewayModelPricingClient.get(provider, model)` implements the pinned public catalog route `GET /model-configs/pricing/{provider}/{model}`. Its path-level server is explicitly `https://api.portkey.ai` (without `/v1`) and its operation declares `security: []`. Prior SCM-plane probes were not evidence of public-route unavailability. The new client is separate from both SCM management and gateway inference, requires an explicit endpoint, and sends no credentials.

Stable constructor/request options reject typos before I/O; endpoints reject embedded credentials/query/fragment and require HTTPS except loopback development URLs. IDs are independently encoded as safe path segments. Timeouts are bounded to the Node timer range, cancellation covers stalled transports/body reads, redirects are rejected and retries default to zero. The shared native-fetch transport is reused; no production dependency was added.

Seven schemas model token, image, pay-as-you-go, calculation and fine-tuning pricing. Rates remain USD **cents** per token/unit, not converted dollars or Prisma tenant-effective billing. Calculation trees are data only, never evaluated. Future fields are preserved without counting opaque `batch_config` or custom extensions as typed coverage.

The original 57 focused tests failed before implementation; all now pass, with two additional timer-overflow cases bringing the focused set to 59. Five independent captured-response/contract tests compare both public responses against corrected source schemas and SDK parsing. The precise compatibility correction changes overlapping calculation-node alternatives from `oneOf` to `anyOf`: a shallow formula containing a captured valid leaf fails the original exclusive alternatives; deeper complete responses can pass through the permissive fallback. Upstream YAML is unchanged.

Two failing-first recursive-fixture regressions now pass. Optional recursive arrays terminate with `[]`, not invented null children; irreducible required recursion fails explicitly. Final fixture reconciliation exposed an overly broad multipart exclusion that removed the AIRS CSV-upload transport case. The generator now limits that exclusion to gateway fixtures, and the restored Red Team contract checks filename, exact CSV bytes and form fields. All 149 AIRS operations and the complete four-major matrix pass after that correction.

The current live public-pricing suite passes 3/3 at 2026-09-07T00:34:56.061Z. Both prescribed model responses are frozen independently for offline validation. Actual sanitized pricing output is included in the runnable [SDK examples](docs-site/docs/guides/examples.mdx) and explained in the [pricing guide](docs-site/docs/guides/ai-gateway-model-pricing.md). Catalog lookup does not certify inference or customer billing.

Earlier iterations added verified secret-reference CRUD, native batch completion/output/cancellation, telemetry filter validation, provider HTTP and legacy/prompt methods, and bounded realtime diagnostics. The archived assessment preserves those details. Realtime remains an unimplemented gap after HTTP 101 followed by `invalid_model`; 28 methods now remain explicitly experimental. No throughput benchmark is claimed.

## Authoring boundary investigation — September 7

A read-only check of both exact Deployment-owned gateway replicas verified the same pinned bundle and a generic GET provider-proxy fallback. The inspected registrations contain no explicit GET handlers for collections, labels, prompts or prompt partials, while prompt rendering/completion remain registered. A synthetic replay of the reviewed header-validation function returns HTTP 400 with the exact missing-provider/config message before continuation. Supplying a valid provider reaches only a synthetic continuation; no network/database client or server bundle was executed by that reproduction.

The fresh live probe at 2026-09-07T00:58:15.702Z then confirmed the distinction: nine requests without a provider/config header return the exact missing-header 400, and four requests with the prescribed `@openai` header return 404. Model/authentication and key retirement pass; **2 pass / 13 fail / 15 total** remains a failed authoring workflow. It does not establish a control-plane authoring API, prove every authoring route absent elsewhere, or justify mapping template management onto provider proxying. The next prerequisite is a verified Prisma-compatible authoring endpoint and authorization, not more header variants on the inference endpoint.

The sanitized [boundary evidence](artifacts/e2e/gateway-authoring-boundary.json) records allowlisted predicates without raw error messages, credentials or tenant IDs. Generated examples reproduce its aggregate observation with the actual failed result records. That authoring diagnostic did not change SDK source/package. The subsequent OAuth correction described above changes the candidate and has its own refreshed package/matrix verification. The five deployed-code diagnostics pass at 00:57:51.238 UTC and configuration hashes remain unchanged. The current independent cleanup at 02:02:57.662 UTC passes **341/342**, confirms all new short-lived keys absent and retains the same active DLP-profile failure.

## OpenAPI evidence and denominator

| AIRS dimension                                   |        Result |
| ------------------------------------------------ | ------------: |
| Implemented operations                           |     149 / 149 |
| Exact serialized query parameters                |     184 / 184 |
| Typed request property occurrences               |     791 / 791 |
| Typed response property occurrences              | 3,242 / 3,242 |
| Valid request variants accepted                  |     965 / 965 |
| Valid response variants accepted                 | 3,369 / 3,369 |
| Independently invalid request mutations rejected | 1,031 / 1,031 |

Operations comprise Scan 4, Management 21, Model Security data 18/management 23, Red Team data 36/management 42 and network broker 5. The supplied `prisma-airs-ai-redteam` directory was absent; the upstream checkout is `prisma-airs-redteam`. [The source audit](artifacts/openapi/audit.json) records all hashes and explicit corrections.

Property occurrences are counted per operation recursively through objects, arrays and unions. Unknown/any and undeclared passthrough fields do not count. All 12 array-valued AIRS queries use multi-item specimens and exact form/explode expectations. Ajv proves invalid mutations independently before SDK rejection checks. This is deterministic contract evidence, not a proof over every possible input or prose-only constraint.

| Full Portkey disposition                        | Operations |
| ----------------------------------------------- | ---------: |
| Direct contract                                 |        137 |
| SCM adapted, not wire-equivalent                |         11 |
| SCM partially adapted analytics                 |         22 |
| Runtime unimplemented                           |          1 |
| Upstream-retired Assistants/Threads, still gaps |         23 |
| Tenant-unverified, still gaps                   |         48 |
| Total                                           |        242 |

The direct matches model 1,358/1,358 JSON request and 2,329/2,329 JSON response property occurrences. Multipart/binary media have separate transport tests and are excluded from that JSON field count. Responses is not substituted for retired Assistants/Threads. See the [complete gateway ledger](docs-site/docs/developer/gateway-coverage.md).

## Verification

| Check                | Result                                                                                           |
| -------------------- | ------------------------------------------------------------------------------------------------ |
| SDK matrix           | 10,483/10,483 tests in 128 files on Node 18.20.8, 20.20.2, 22.23.2 and 24.20.0                   |
| Offline OpenAPI gate | 7,953 checks                                                                                     |
| Coverage             | Statements/lines 99.71% (19,707/19,764), functions 100% (663/663), branches 96.42% (2,214/2,296) |
| CLI                  | 1,033/1,033 tests in 87 files; strict typecheck/build against packed SDK                         |
| Package              | 1,301 runtime exports; all 9 payload files and 124 unique source-map files match                 |
| Consumer checks      | ESM/CJS and strict NodeNext types pass on Node 18/20/22/24, including no-auth pricing            |
| SDK live inference   | 10/10; finished 2026-09-07T01:59:08.352Z                                                         |
| CLI live inference   | 8/8; finished 2026-09-07T02:01:20.260Z                                                           |
| Public pricing       | 3/3; finished 2026-09-07T00:34:56.061Z                                                           |
| Primary docs run     | 21 scripts: 18 pass / 3 fail; with three scan captures, 21 pass / 3 fail / 24 checks             |
| Cleanup              | 341 pass / 1 fail / 342; finished 2026-09-07T02:02:57.662Z                                       |

The four matrix reports have matching test identities. Non-host Node runtimes are SHA-256-verified upstream unofficial musl builds. No remote CI execution is claimed. Package verification includes payload/source maps, public pricing, telemetry, provider formats/multipart, legacy/prompt JSON/SSE and strict consumer types. The candidate archive is not a published package.

### Live suites

The 46 retained suites below are workflow checks, not operation coverage. Older suites retain their actual timestamps. A diagnostic pass verifies an observation, not successful execution of the failed service operation.

| Suite                              | Pass | Fail | Skip | Total | Finished (UTC)           |
| ---------------------------------- | ---: | ---: | ---: | ----: | ------------------------ |
| oauth-service-reads                |   24 |    0 |    0 |    24 | 2026-09-07T01:24:01.749Z |
| scan                               |    7 |    0 |    0 |     7 | 2026-09-06T13:56:43.475Z |
| management                         |   22 |    0 |    1 |    23 | 2026-09-06T13:56:32.403Z |
| model-security                     |   44 |    0 |    0 |    44 | 2026-09-06T13:56:03.577Z |
| red-team                           |   68 |    2 |    0 |    70 | 2026-09-06T16:39:44.071Z |
| gateway-read                       |   48 |    0 |    0 |    48 | 2026-09-06T21:24:25.428Z |
| gateway-analytics-filters          |    4 |    1 |    0 |     5 | 2026-09-06T21:09:03.183Z |
| gateway-analytics-request-filters  |    3 |    0 |    0 |     3 | 2026-09-06T21:21:10.314Z |
| gateway-extensions                 |   42 |    3 |    2 |    47 | 2026-09-06T16:40:33.284Z |
| gateway-owned-writes               |   26 |    1 |    0 |    27 | 2026-09-06T13:58:07.890Z |
| gateway-secret-references          |    7 |    0 |    0 |     7 | 2026-09-06T19:40:18.695Z |
| gateway-model-pricing              |    3 |    0 |    0 |     3 | 2026-09-07T00:34:56.061Z |
| gateway-authoring-discovery        |    2 |    0 |    0 |     2 | 2026-09-06T19:13:10.764Z |
| gateway-secret-reference-discovery |    6 |    0 |    0 |     6 | 2026-09-06T19:18:59.892Z |
| gateway-runtime-authoring          |    2 |   13 |    0 |    15 | 2026-09-07T00:58:15.702Z |
| gateway-provider-http              |    2 |    9 |    0 |    11 | 2026-09-06T22:06:39.937Z |
| gateway-provider-http-sdk          |    2 |    9 |    0 |    11 | 2026-09-06T22:07:31.983Z |
| gateway-deployment-diagnostics     |    5 |    0 |    0 |     5 | 2026-09-07T00:57:51.238Z |
| cli                                |   12 |    0 |    0 |    12 | 2026-09-07T02:02:10.481Z |
| cli-writes                         |   12 |    0 |    0 |    12 | 2026-09-06T13:57:20.819Z |
| gateway-inference                  |   10 |    0 |    0 |    10 | 2026-09-07T01:59:08.352Z |
| gateway-observability              |    5 |    0 |    0 |     5 | 2026-09-06T19:59:34.826Z |
| gateway-runtime-observability      |    4 |    1 |    0 |     5 | 2026-09-06T19:55:37.502Z |
| gateway-observability-audit        |    5 |    0 |    0 |     5 | 2026-09-07T01:58:59.117Z |
| gateway-observability-details      |    2 |    4 |    0 |     6 | 2026-09-06T20:07:01.543Z |
| gateway-observability-details-sdk  |    3 |    2 |    0 |     5 | 2026-09-07T01:57:45.366Z |
| gateway-feedback-scores            |    2 |    3 |    0 |     5 | 2026-09-06T20:24:57.217Z |
| gateway-legacy-completions         |    2 |    1 |    1 |     4 | 2026-09-06T20:32:34.213Z |
| gateway-legacy-completions-sdk     |    2 |    1 |    1 |     4 | 2026-09-06T22:37:14.653Z |
| gateway-prompt-runtime             |    2 |    2 |    0 |     4 | 2026-09-06T22:37:15.237Z |
| gateway-prompt-runtime-sdk         |    2 |    2 |    0 |     4 | 2026-09-06T22:38:18.128Z |
| gateway-realtime                   |    3 |    1 |    0 |     4 | 2026-09-06T23:47:14.326Z |
| gateway-runtime-resources          |   26 |    0 |    0 |    26 | 2026-09-06T22:09:40.667Z |
| gateway-batches                    |    9 |    0 |    0 |     9 | 2026-09-06T18:51:22.545Z |
| gateway-batches-cancel             |    8 |    0 |    0 |     8 | 2026-09-06T18:55:59.118Z |
| gateway-vector-batches             |   12 |    3 |    0 |    15 | 2026-09-06T18:08:18.294Z |
| gateway-vector-batches-json        |   12 |    3 |    0 |    15 | 2026-09-06T18:17:23.385Z |
| gateway-vector-batches-beta        |   12 |    3 |    0 |    15 | 2026-09-06T18:18:30.106Z |
| cli-inference                      |    8 |    0 |    0 |     8 | 2026-09-07T02:01:20.260Z |
| doc-examples                       |   21 |    3 |    0 |    24 | 2026-09-07T02:00:36.853Z |
| doc-gateway-key                    |    1 |    0 |    0 |     1 | 2026-09-07T02:00:35.691Z |
| recover-interrupted                |   11 |    0 |    0 |    11 | 2026-09-06T16:37:05.866Z |
| dlp-recovery                       |    1 |    2 |    0 |     3 | 2026-09-06T17:13:56.675Z |
| dlp-dictionary-wire                |    0 |    4 |    0 |     4 | 2026-09-06T17:02:36.364Z |
| cleanup-runtime-audit              |   53 |    0 |    0 |    53 | 2026-09-06T22:11:51.994Z |
| cleanup-audit                      |  341 |    1 |    0 |   342 | 2026-09-07T02:02:57.662Z |

The latest 21-script primary run finished at 2026-09-07T02:00:36.853Z, with 18 passing and three failing scripts: DLP profile update, dictionary creation and network-broker update. Four primary scripts are explicitly mock-backed. Three additional live scan captures pass; batch/secret-reference/observability/analytics and ten runtime-diagnostic captures are separate. Model Security ingestion is synthetic, not execution of the proprietary scanner. Red Team jobs are bounded and benign.

All new runtime keys are retired. The single active DLP fixture is a failure, not accepted cleanup. The separate retained 53/53 runtime audit verifies absence of uploaded files, vector stores and stored Responses, and acknowledges four terminal batch audit records without deletion APIs. No new runtime upload/store/batch fixtures were created by the pricing increment. Three disconnected broker drafts, two neutral feedback records and three synthetic log records remain journaled where no supported deletion is available.

## Remaining work and limitations

The previously recorded standalone OAuth timeout defect is now fixed and verified above. Its failing reproduction remains historical evidence, not a statement that the current candidate still contains the defect.

Read-only deployment investigation established concrete causes for two gateway failures. Both exact gateway replicas use image `gateway_enterprise:2.20.0`, bundle SHA-256 `b2710c4f6a580a5a1bb525695f942175e4698d61a0c90ba066c48f93490f6331`, with effective `ANALYTICS_STORE=control_plane` and `LOG_STORE=control_plane`. Feedback lookup unconditionally needs ClickHouse, whose client is initialized only in clickhouse mode. Log-detail retrieval has no control-plane branch. Hash-pinned pure-function reproductions return `ClickHouse client not initialized` and `Invalid Log Storage`; the inspected handlers map these paths to 500. This matches the valid owned-record failures and distinguishes them from SDK payload bugs. Five diagnostic checks pass across both replicas, with no database/network calls from the reproductions and unchanged deployment configuration. These passes do not add operation coverage. Switching storage backends would alter production data handling; it was not done.

The diagnostic resolves Deployment/ReplicaSet/Pod ownership and container identity explicitly, because this installation's broad labels also match Redis. Initial generic-selector checks executed only harmless read-only metadata/runtime commands; no Redis data was read or changed. The reusable diagnostic rejects that ambiguous targeting. The latest runtime-authoring boundary probe has nine missing-provider/config 400 responses and four prescribed-provider 404 responses, with passing authentication and key-cleanup controls; no authoring method was justified. Report and diagnostic-suite inventories are now shared by the generators and verifier to prevent count/name drift.

| Issue                             | Evidence / next step                                                                                                                                                                                                                           |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Full Portkey target               | Implement and validate remaining runtime families; establish Prisma equivalents/availability for tenant-unverified families and partial adaptations. Keep all 242 operations visible. This is unfinished work, not merely missing credentials. |
| Red Team quota                    | HTTP 403 persists, with successful authenticated language discovery as control; investigate entitlement/service authorization                                                                                                                  |
| Prompt-set version info           | HTTP 500, including explicit-version checks; service-side investigation using retained timestamps/IDs                                                                                                                                          |
| MCP test/revocation               | HTTP 403 on an owned server; verify service authorization and reachable disposable MCP setup                                                                                                                                                   |
| Export execution                  | Start returns HTTP 500 AB04; unblock successful owned export before start/cancel/download certification                                                                                                                                        |
| Workspace creation                | HTTP 400 AB01 with synthetic scope variants; use a known-good unused SCM-provisioned scope/request to distinguish provisioning from contract drift                                                                                             |
| Log detail and feedback update    | Both SCM and runtime log-detail reads return 500 with real storage metadata. Runtime feedback PUT returns 500; the curl sample POST variant returns 400. Creation and log ingestion are implemented and live-verified separately.              |
| Customer-app writes               | Key creation did not register an owned app; need its documented provisioning flow                                                                                                                                                              |
| Runtime-only experimental methods | Resolve vector-file-batch cancellation HTTP 500; fine-tuned model deletion needs an owned model without changing the designated inference model. Native batch inference/output/cancellation are now live-verified.                             |
| Release integration               | Publish the matching SDK through the release process, update/lock CLI dependency, then repeat clean-install CI and release CLI. Local dependency linking is not a substitute.                                                                  |
| DLP profile writes/retirement     | A valid advanced-profile create succeeds; PATCH/PUT return 500. OPTIONS advertises DELETE but executing it returns 501. One unbound owned profile remains active; re-runs reuse it rather than create more.                                    |
| Dictionary upload                 | JSON Blob multipart variants return 400, while text JSON parts return 415. No dictionary was created by these probes.                                                                                                                          |
| Network-broker update             | Draft creation/get succeed; update returns 403 with description alone or name plus description. Three disconnected DRAFT records remain journaled; repeated runs reuse one.                                                                    |

Legal-term acceptance, organisation authentication changes, instance provisioning, and interactive Copilot authorization were not executed. Network-broker writes were attempted under the explicit write-enabled example workflow, with the retained draft footprint disclosed. No existing production resource was modified merely to make a failed test green.

### Cleanup and dependency risk

Ownership is journaled immediately; cleanup reverses dependencies. New/replaced harness reports use atomic same-directory rename and POSIX owner-only modes (0600), with regression tests for legacy-file replacement and complete journals. Windows requires an appropriately protected directory ACL. The stronger audit found and removed two additional test-owned profile revisions, for which the API documents no restore operation. New temporary runtime keys, uploaded files, vector stores and stored Responses were also deleted and verified absent. Existing user resources were preserved. Archived/tombstoned records and undeletable synthetic scan, completed job and export audit records remain as disclosed historical test footprints.

The latest cleanup additionally records three unused network-broker drafts and the single unbound DLP profile whose cleanup failed. The profile is a FAIL, not an accepted retired audit record. Its identifier remains in the private fixture journal. Four terminal native batch audit records remain because the API has no deletion operation; all six batch input/output files and the short-lived keys were removed. Config-source integrity and credential-leak scans pass; live transcripts redact credentials and identifiers, and private artifacts are gitignored.

The root SDK dependency audit has no known findings in the retained audit. The separate docs tree has 18 high findings cascading from two unpatched image-size advisories. A prebuild/prestart signature guard and 13 tests reject affected ICNS/JXL/HEIF inputs, including misleading extensions and symlinks. The unit tests now use bounded temporary fixtures instead of walking the entire generated site under parallel coverage load; the prebuild guard still checks the real site. This mitigates reviewed inputs; it does not patch the dependency or clear its warnings. See [documentation security details](docs-site/docs/developer/openapi-conformance.md#documentation-build-security).

## Self-review, remaining improvements and handoff

The full-project score remains **5/10**, not 9/10. The current increment closes two implementation gaps with explicit experimental contracts. The prior OAuth correction resolves a real SDK/CLI-foundation defect. Neither resolves the large remaining Portkey surface or known service failures. Further work must implement/verify remaining Prisma-compatible routes, establish an owned-template lifecycle, resolve service/authorization/storage failures in isolated fixtures, retire the DLP fixture, and keep package/matrix/live/docs evidence synchronized. Only then should the matching SDK and CLI dependency releases be certified. Do not reduce the 242-operation denominator or change the prescribed provider/model to inflate the score.

Both Docusaurus sites are rebuilt and browser-verified against the current detail/inference/example captures. SDK HTTP verification passes **17 pages and 4 assets at 02:10:35.164 UTC**, including all **46 live-suite timestamps**, the 137-operation ledger, current test counts and detail-method guidance. Chromium passes **6/6 SDK checks at 02:10:40.839 UTC** and **8/8 CLI checks at 02:08:10.371 UTC**, including exact captured JSON/OAuth text, desktop/mobile navigation, and no uncaught JavaScript errors or unexpected external requests. The primary transcript was captured at **02:00:36.854 UTC**, one millisecond after its suite finished. Source/tooling typecheck, lint, formatting, public-example coverage and Docusaurus's own typecheck pass. The [verification summary](artifacts/verification-summary.json) reconciles these results with the final credential scan.

- [Exact candidate archive](artifacts/package/cdot65-prisma-airs-sdk-0.20.1.tgz): SHA-256 `989fd5fd44ab56cb93d72a66d698d2e02100b75393c5e003b52e5b9913469ea8`, 1,258,746 bytes.
- [Prior archive](artifacts/package/cdot65-prisma-airs-sdk-0.20.1-before-public-pricing.tgz) preserves the superseded candidate.
- [Live evidence](docs-site/docs/developer/live-validation-results.md), [conformance](docs-site/docs/developer/openapi-conformance.md), [runtime guide](docs-site/docs/guides/ai-gateway-inference.md).
- Local CLI dependency: `artifacts/package-consumer-secret-references/node_modules/@cdot65/prisma-airs-sdk` in the SDK checkout.
- Built CLI: `/home/cdot/development/cdot65/prisma-airs-cli/dist/cli/index.js`.
- Loopback previews: [SDK examples](http://127.0.0.1:4173/prisma-airs-sdk/guides/examples), [CLI inference](http://127.0.0.1:4174/prisma-airs-cli/cli/aigateway/inference).

This is local candidate evidence, not a published release, production certification or completion of the requested scope.
