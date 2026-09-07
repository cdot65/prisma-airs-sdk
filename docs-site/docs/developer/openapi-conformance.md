---
title: OpenAPI conformance and live validation
---

# OpenAPI conformance and live validation

The final verification-only checkout passes **11,299 tests in 144 files**, with **99.71% lines/statements, 100% functions and 96.67% branches**. Its 36 additional harness regressions cover versioned package preflight/history and secret-safe subprocess failures; the published 0.25.0 runtime is unchanged. The live inventory preserves **71 timestamped suites**, including separate registry CLI 4.4.0 runs and all previously recorded failures; these are workflow-check counts, not unique covered operations.

SDK **0.25.0 is published and independently installed from npm**. Its release passes **11,263 tests in 142 files**, with **99.71% lines/statements, 100% functions and 96.67% branches**, on the complete Node 18/20/22/24 matrix. The registry package passes **102/102** grouped-filter checks at **2026-09-07T11:52:02.500Z**, **53/53** chart contracts at **2026-09-07T11:52:36.044Z**, and **10/10** inference checks at **2026-09-07T11:51:36.327Z**. Independent retirement confirms **33/33** historical release keys absent at **2026-09-07T11:52:17.226Z**. Package payloads, source maps, strict tracked consumer types and npm integrity match the tested archive. See [registry evidence](../guides/release-verification.md#sdk-0250-registry-verification), [captured group output](../guides/examples.mdx#verified-grouped-analytics-filters) and [typed group options](../guides/ai-gateway-api.mdx#groupby-byuser-bystatuscode). Source fixtures record provider `traceId` as an SCM-only extension because the pinned provider operation omits `trace_id`. Single-read regressions prove chart/group/log serialization uses the validated copy rather than rereading caller-owned getters. CLI **4.4.0 is also published**, pins SDK 0.25.0 exactly and passes registry groups **103/103**, charts **54/54**, inference **8/8**, empty-window output **3/3**, installed-user cross-service checks **12/12**, and native DLP **11/11** in the registry, user prefix and each actual container architecture. All **36/36** historical release keys are independently absent. See [final registry/container evidence](../guides/release-verification.md#cli-440-registry-and-container-verification), including retained failed attempts. Coverage remains **138/242 direct**, and the full-project assessment remains **5/10**. The published 0.24.0/4.3.1 checkpoint below is preserved separately.

SDK **0.24.0** and CLI **4.3.1** are published, independently installed from npm and payload-verified. The SDK release passes **10,931 tests in 136 files**; three subsequent installation-preflight regressions bring the verification checkout to **10,934 tests in 137 files**, with 99.71% lines/statements, 100% functions and 96.55% branches. CLI validation passes **1,173 tests in 91 files**, plus **14 release-policy/diagnostic checks**. Seven additional filters preserve SCM casing, CSV-OR lists, inclusive bounds, zero and fractional cents; the CLI uses the exported SDK schema before client creation or cost workspace resolution. Cost UUID resolution and malformed day parsing are corrected without changing its cents/USD output. CLI 4.3.1 additionally fixes native DLP JSON selection and rejects invalid numeric input before file generation.

Registry SDK query contracts pass **53/53** at **2026-09-07T08:56:03.088Z**; registry CLI query contracts pass **54/54** at **2026-09-07T10:32:02.882Z**. SDK inference passes **10/10**, CLI inference **8/8**, empty-window CLI output **3/3**, and upgraded user-install cross-service reads/scan **12/12**. Independent retirement verifies **30/30** historical release-inference keys absent at **2026-09-07T10:32:02.499Z**. ESM/CommonJS payload, strict-type, OAuth and native WebSocket verification covers all 1,304 SDK runtime exports. See [actual SDK query output](../guides/examples.mdx#verified-chart-query-contracts), [CLI query output](https://cdot65.github.io/prisma-airs-cli/cli/aigateway/telemetry/#verified-chart-filter-output), and [version-specific registry results](../guides/release-verification.md#sdk-0240-and-cli-431-registry-verification), including preserved 4.3.0 history. Direct coverage stays **138/242**, with all 22 analytics operations partial and the full-scope assessment **5/10**.

The SDK production audit is clean. CLI 4.3.1 now also has zero known advisories in both its frozen production tree and fresh npm installation, after updating js-yaml, nanoid and optional sharp; the prior 4.3.0 findings remain historical evidence. Native DLP passes **11/11** registry checks at **2026-09-07T10:29:23.947Z**, covering five formats and 26 file signatures. All three Node consumer matrix jobs pass. The [container workflow](https://github.com/cdot65/prisma-airs-cli/actions/runs/34110815270) executes the same 11 checks on **both amd64 and arm64**, without runtime network or credentials, before guarding and verifying alias promotion. This closes that native-container verification gap; public anonymous pull access remains unverified. Existing service/provider failures, the retained DLP fixture, WAN limitation and SDK documentation development-dependency advisories are unchanged.

The previous SDK 0.23.0 telemetry correction adds 74 regression/source-contract checks: **10,668 tests in 134 files** pass on Node 18/20/22/24, with 99.71% lines/statements, 100% functions and 96.53% branches. Registry SDK analytics passes **13/13** at **2026-09-07T07:28:54.307Z** and inference passes **10/10** at **2026-09-07T07:28:57.826Z**. CLI 4.2.2 pins SDK 0.23.0, passes 1,035 tests, and passes registry inference **8/8**, empty-window JSON/YAML **3/3**, and installed cross-service checks **12/12**. Independent all-history retirement passes **24/24**. Cost, tokens and latency share the verified trace/metadata filters; empty latency mean/percentiles retain actual nulls. All **22 analytics operations remain partial**, and direct coverage stays **138/242**. See [version-specific captures](../guides/release-verification.md#sdk-0230-and-cli-422-registry-verification). The earlier checkpoints below retain their own versions and timestamps.

The earlier checkpoint records the September 6–7, 2026 SDK verification through the 0.22.0 realtime increment, including public pricing, the standalone OAuth deadline correction and experimental runtime observability detail methods. The user authorized shipping the implemented surface with the limitations below; publication does not certify the missing or failed workflows. See the [release notes](../about/release-notes.md) for release scope. The historical assessment is in `SDK-ASSESSMENT.md`; current delivery and full-scope assessment are in `RELEASE-2026-09-07.md`; private machine-readable evidence remains in the local `artifacts/` directory and is not published.

## What the percentages measure

Previous 0.22.0 verification passes **10,594 SDK tests in 133 files** on Node 18/20/22/24. Node 22 coverage is 99.71% lines/statements, 100% functions and 96.53% branches; the new realtime transport has 100% lines/statements/functions. CLI 4.2.1 pins the published SDK and passes 1,033 tests plus its coverage gates. At that checkpoint, registry-installed SDK inference passes 10/10 at 06:30:31 UTC; CLI inference passes 8/8 at 06:38:15 UTC and installed cross-service checks pass 12/12 at 06:38:12 UTC. The independent release-key audit passes 22/22 at 06:39:30 UTC. See the [version-specific captures](../guides/release-verification.md#sdk-0220-and-cli-421-registry-verification). These passing release checks do not replace the failed realtime provider session or earlier service failures.

The [published-package examples](../guides/release-verification.md) separately record the SDK 0.21.0 registry run (10/10 at 02:41:08 UTC), the CLI 4.2.0 registry run (8/8 at 02:52:01 UTC), and independent absence checks for both temporary keys. These supplement the earlier broad conformance checkpoint below; they do not rerun or reclassify every service workflow.

The 0.21.0 release checkpoint: 10,483/10,483 SDK tests in 128 files pass on each of Node 18.20.8, 20.20.2, 22.23.2 and 24.20.0; Node 22 statement/line coverage is 99.71%, function coverage 100%, and branch coverage 96.42%. That 0.21.0 tarball also passes ESM/CommonJS import, payload/source-map integrity and strict consumer-type checks on every major, including the new detail methods, public pricing without credentials, legacy/prompt JSON and SSE, and OAuth deadline recovery. The updated CLI passes 1,033 unit tests. September 7 OAuth-backed service reads retain their 24/24 result at 01:24:01 UTC; current CLI workflows pass 12/12 at 02:02:10 UTC, SDK inference 10/10 at 01:59:08 UTC, and CLI inference 8/8 at 02:01:20 UTC. Public pricing retains its 3/3 result at 00:34:56 UTC. Retained September 6 gateway management reads pass 48/48 and SDK runtime resources 26/26. Native batch completion/output passes 9/9 and terminal cancellation passes 8/8 after the null-field response correction; actual batch JSON is reproduced in the examples page.

All 21 documentation scripts were executed in the September 7 run ending at 02:00:36.853 UTC: 18 pass and 3 fail; three additional live scan-output captures pass (21 pass / 3 fail / 24 total checks). The latest aggregate cleanup audit ends at 02:02:57.662 UTC with **341 pass / 1 fail / 342 total**, with a separate **53/53** runtime cleanup audit retained from September 6, 22:11 UTC. One unbound DLP profile remains active because retirement returns HTTP 500; an advertised DELETE returns 501. The vector-file-batch suite has 12 passing and 3 failing checks: create/completion/listing work after a discriminator correction, but cancel returns HTTP 500 and the two cancelled-state assertions fail. These workflow/code measurements are separate from the API-contract percentages below. See the [timestamped live results](./live-validation-results.md) and [actual example output](../guides/examples.mdx).

The SDK 0.22.0 realtime increment adds an explicit caller-owned Node WebSocket transport with bounded cancellation, queues, validation and no retries. Forty-four safety tests and four independent/native WebSocket contract tests pass. The typed live run at 06:04:42.282 UTC reports 4 passes / 1 failed provider session: HTTP 101 is followed by `invalid_model`. The runnable example separately fails at 06:12:26.528 UTC; an independent read-only audit passes 6/6 key-absence checks at 06:13:23.127 UTC. No model/provider was changed or generation requested. The JSON field audit excludes the HTTP 101 upgrade, which declares no JSON body; a dedicated frozen fixture and native loopback tests cover that transport separately. See the [experimental guide](../guides/ai-gateway-inference.md#experimental-realtime-websocket).

September 7 live runs use a test-process-only DNS accommodation: absolute IPv4 lookups for an explicit service allowlist, and a gateway LAN address verified against the configured DNS resolver and exact ingress route. TLS verification and the original `airs.cdot.io` hostname remain enabled. The read-only network preflight confirms unchanged infrastructure and credential-file hashes. No DNS, ingress or production configuration was changed, and public/WAN gateway reachability is **not certified** by these LAN-path runs. Earlier failed DNS attempts remain in report history.

The original pre-release CLI checks used the packed SDK through a development dependency link. SDK 0.21.0 was subsequently published; CLI 4.2.0 pinned that registry version in its manifest and lockfile. A separate fresh checkout passes all 1,033 CLI tests, coverage gates, typechecking and build without the development link. This release-integration evidence does not change the missing-operation denominator or failed service results.

The September 7 authoring-boundary recheck ends at 00:58:15.702 UTC with 2 passing controls and 13 failed collection/label/prompt/partial requests. Nine without a provider header return the exact missing-provider/config 400; four with the prescribed `@openai` header return 404. Both hash-pinned gateway replicas register a generic provider-proxy GET fallback and no explicit GET handlers for these four collections. A synthetic replay of header validation reproduces the 400 without calling live clients. This identifies the runtime boundary, not a usable authoring control plane or proof of universal feature absence. No speculative SDK authoring methods were added by that diagnostic increment. The OAuth correction and current detail-method additions change source/package content and have refreshed unit, package and live evidence.

| Contract dimension                                             |                   Result |
| -------------------------------------------------------------- | -----------------------: |
| AIRS operation implementations                                 |                149 / 149 |
| AIRS serialized query parameters                               |                184 / 184 |
| AIRS typed request property occurrences                        |                791 / 791 |
| AIRS typed response property occurrences                       |            3,242 / 3,242 |
| Valid AIRS request variants accepted                           |                965 / 965 |
| Valid AIRS response variants accepted                          |            3,369 / 3,369 |
| Independently invalid AIRS request mutations rejected          |            1,031 / 1,031 |
| Directly matched Portkey operations                            |       138 / 242 (57.02%) |
| Typed JSON request / response properties for direct matches | 1,358 / 1,358; 2,329 / 2,329 |

Property counts are operation-level occurrences, including nested objects, arrays and union branches; they are not counts of unique component names. `unknown`, `any`, and pass-through properties do not count as modeled declared fields. Positive cases exercise required-only and full bodies, enum alternatives, nullable branches and selected boundaries. Ajv independently proves negative request cases invalid before the SDK is expected to reject them. This is a deterministic contract suite, not a mathematical proof covering every possible input or every textual constraint in an OpenAPI description.

Query checks compare exact wire values, not merely parameter names. All 12 array-valued AIRS query parameters use multi-item specimens, so single-value ambiguity cannot hide a comma-versus-repeated-key mismatch. Scan ID queries use their explicit `explode: false`; other form arrays retain the specification's default `explode: true`. These expectations follow the [OpenAPI Parameter Object](https://spec.openapis.org/oas/v3.0.3.html#parameter-object) and are frozen independently of SDK serialization for offline CI.

Code coverage, OpenAPI coverage, and successful live execution are separate measures. In particular, **this SDK does not implement 99% of all Portkey product APIs**. The September 6 design update authorizes a separate runtime client, now implemented for chat, embeddings, Responses, files, models, vector stores, batches, fine-tuning, provider HTTP, legacy/prompt REST methods and experimental realtime transport. Public model pricing uses a separate no-auth client. The 23 upstream-retired Assistants/Threads operations, 48 tenant-unverified operations, 11 SCM adaptations and 22 partial analytics adaptations stay in the denominator. See the [complete 242-operation gateway ledger](./gateway-coverage.md) and [runtime guide](../guides/ai-gateway-inference.md). The JSON field audit excludes multipart/binary media; file multipart and binary download behavior have separate transport and live tests.

Secret-reference CRUD passes 7/7 live SDK checks on the admin plane using an owned, unbound fixture with invalid synthetic credentials. The [examples page](../guides/examples.mdx#secret-reference-management-lifecycle) reproduces its sanitized output. Input schemas preserve authentication discriminators and reject manager/configuration mismatches and contradictory workspace access before network I/O. External secret resolution was not exercised.

The upstream-retired classification follows [OpenAI’s August 26, 2026 Assistants shutdown](https://developers.openai.com/api/docs/assistants/migration), not a guessed explanation for an HTTP 404. These 23 operations remain gaps in the 242-operation denominator. Responses is not counted as equivalent coverage, and other gateway/provider compatibility modes are not established.

## Source inventory

The standalone OAuth correction reuses one disposable 30-second deadline for token headers and success/error JSON bodies. Sixteen failing-first regressions now pass, including concurrent timeout release, pending-state recovery, late-response disposal/no caching, and non-blocking cleanup. The packed ESM/CommonJS candidate passes real 30-second synthetic timeout/recovery checks on all four Node majors. Successful live authentication is verified separately: the runnable authentication example proves concurrent refresh deduplication and explicit cache clearing without printing tokens. These changes preserve the existing OAuth API, caching and callback behavior and add no automatic token retry. See [bounded refresh](../guides/oauth-lifecycle.md#bounded-refresh-and-timeout-recovery).

The preceding 0.21.0 increment added experimental `inference.updateFeedback()` and `inference.getLog()`, raising direct implementation from 135 to 137/242. Both runtime handlers are confirmed; typed live calls on owned records still return HTTP 500 at 01:57:45.366 UTC. Three ownership/authentication/key-cleanup controls pass. An independent SCM read audit passes 5/5 at 01:58:59.117 UTC and confirms both retained feedback records remain neutral with zero weight. No new feedback or log is created. Fifty-eight failing-first checks plus five response/debug-safety checks cover strict UUID/score/metadata inputs, exact wire methods, v2 timestamp dependency, encoded log IDs, additive response fields, pre-authentication rejection, cancellation and zero default retries. Forty-four additional source-derived OpenAPI checks cover the new contracts. The storage failure is not fixed by an SDK method; these operations remain outside stability guarantees until live-verified.

The preceding public-pricing increment added `AIGatewayModelPricingClient.get()`, raising direct implementation from 134 to 135/242 at that checkpoint. The pinned path explicitly declares public server `https://api.portkey.ai` (without `/v1`) and `security: []`. It is not a Prisma SCM or runtime route. Both prescribed model catalog lookups pass live without credentials; catalog prices are USD cents per token/unit, not tenant-effective billing. The client requires an explicit endpoint and validates paths/options before network I/O. Responses preserve future fields without evaluating formulas or counting opaque extensions as typed coverage. See the [public-pricing guide](../guides/ai-gateway-model-pricing.md) and its actual examples-page output.

All 1,358 JSON request and 2,329 JSON response property occurrences for exact implemented routes are modeled. There are 59 focused pricing regressions, five independent captured-response/contract checks and two recursive-specimen regressions. A correction changes overlapping calculation-node `oneOf` alternatives to `anyOf`: a shallow formula containing a captured valid leaf is rejected by the original schema, although deeper captured responses can pass through its permissive fallback. The fixture generator terminates optional recursive arrays with `[]`, not invented null children. Final inventory checks also protect the AIRS CSV-upload route from gateway-only multipart exclusions. The complete offline OpenAPI gate contains 7,953 checks.

The preceding increment added three experimental legacy/prompt methods with 67 failing-first method regressions and 797 additional independent contract cases. Root-level prompt parameters follow the pinned descriptions; educational nested `hyperparameters` are rejected. Legacy SSE preserves nullable intermediate fields and usage-only events; prompt completion supports native chat/legacy events.

Raw and SDK legacy calls return 404 for the required model, so streaming is skipped after the failed prerequisite. Raw and SDK prompt calls use random unprovisioned template IDs and return 404; no existing template was executed or changed. Both deployed replicas register these routes and dispatch prompt completion to native handlers. That code evidence does not certify a successful template lifecycle. The [runtime guide](../guides/ai-gateway-inference.md) explains these limitations and the explicit schema corrections.

The preceding provider HTTP increment added nine explicitly experimental image/audio/moderation/rerank/OCR methods. Four multipart request schemas are frozen separately, with independent Ajv-negative mutations, native Blob rejection checks and full-form byte/field assertions. Binary speech, all audio response formats, strict pre-network validation, cancellation and zero default retries are tested.

Raw HTTP and SDK runs with checksum-validated synthetic media both record 2 passing controls and 9 failed operations. The prescribed model is unchanged. These failures are included in the [actual examples-page diagnostic JSON](../guides/examples.mdx#latest-runtime-diagnostics-failures-remain-visible); offline method coverage is not provider certification. The audio compatibility corrections explicitly record overlapping JSON alternatives and the pinned-string/official-numeric duration difference. There are now 29 experimental methods in the ledger.

The latest telemetry increment validates all query windows, grouping dimensions/columns and log filters before authentication. The request-count chart now supports live-verified camel-case `traceId` and string-valued JSON `metadata`: known synthetic records match and nonexistent filters select zero, with actual output on the [examples page](../guides/examples.mdx#verified-request-chart-filters). The raw snake-case `trace_id` probe was ignored by SCM and remains a failed diagnostic. The typed read-only suite passes 3/3, without new fixtures. The 66 new regression cases and packed-consumer wire/type checks pass, but all 22 partial analytics adaptations remain outside the direct-operation numerator.

| Plane                     | Operations | Relative source                                                           |
| ------------------------- | ---------: | ------------------------------------------------------------------------- |
| Scan                      |          4 | `prisma-airs/scan/scan-service_latest.yaml`                               |
| Management                |         21 | `prisma-airs/management/mgmt-service_latest.yaml`                         |
| Model Security data       |         18 | `prisma-airs-model-security/dataplane/data-plane.yml`                     |
| Model Security management |         23 | `prisma-airs-model-security/management/mgmt-plane.yml`                    |
| Red Team data             |         36 | `prisma-airs-redteam/data-plane/dp-openapi.yaml`                          |
| Red Team management       |         42 | `prisma-airs-redteam/management/mp-openapi.yaml`                          |
| Network broker            |          5 | `prisma-airs-redteam/network-broker/AIRS-Red-Teaming-Network-Broker.yaml` |

The supplied `prisma-airs-ai-redteam` directory was not present; the available upstream checkout uses `prisma-airs-redteam`. The fixture files and audit record SHA-256 hashes for every source. Upstream YAML files are never edited.

## Explicit compatibility corrections

The corrected AIRS contract is intentionally not a blind copy of malformed or outdated YAML:

- Async scanning accepts a flat request batch; the source accidentally nests an already-array component.
- A scan needs a profile selector and nonempty contents, as its field descriptions require.
- Management `topic-list` items are nested correctly despite the source indentation error.
- Live management creates and updates accept server-assigned revisions. Topic description/examples and DLP members can be omitted. Topic responses that omit `examples` normalize to `[]`.
- Red Team connection alternatives overlap; treating them as exclusive `oneOf` variants rejects valid native/REST connections. The correction uses `anyOf`.
- Custom prompt template download is CSV, not JSON. Upload includes the required CSV filename.

Each AIRS correction has a pointer and rationale in `scripts/openapi/compatibility.ts`, which also records provider-prefixed Responses model IDs. The audit can inspect raw contracts with the individual tools' `--raw` option. Gateway compatibility is handled separately: SCM timestamps, response envelopes, nullable lifecycle fields and numeric boolean flags take precedence over Portkey examples. Runtime response-only corrections are explicit in `scripts/openapi/generate-inference-models.ts` and the runtime guide, including null intermediate usage, base64 embeddings and zero chunk size during vector indexing. Request constraints are not relaxed merely to accommodate response-only differences. Catalog strings remain open unless a live negative probe establishes a closed enum.

## Reproduce the offline checks

```bash
npm ci
npm run typecheck
npm run typecheck:tooling
npm run lint
npm run test:coverage
npm run openapi:check
npm run build
npm run docs:check
npm run docs:build
```

`preflight` now runs the offline operation-contract gate. The older component-name comparison remains available as `preflight:legacy` for historical troubleshooting; it must not be used to claim specification coverage. Frozen transport fixtures and recursive schema snapshots make CI independent of local upstream checkouts.

For a fresh source audit, supply the upstream checkouts explicitly:

```bash
AIRS_OPENAPI_DIR=/path/to/pan.dev/openapi-specs \
GATEWAY_OPENAPI_FILE=/path/to/ai-gateway-openapi/openapi.yaml \
npm run openapi:audit
```

The audit fails for missing AIRS operations, property coverage below 99%, rejected valid variants, accepted invalid requests, or incorrect query values/serialization. Gateway field checks apply only to exact route matches, not to unimplemented APIs. Review every hash change and compatibility correction before regenerating frozen fixtures with the scripts under `scripts/openapi/`.

## Live validation and safety boundaries

The [validated live results page](./live-validation-results.md) is generated from the retained E2E reports, including failures and skips. It also records CLI write-builder verification and cleanup evidence.

The live harness reads `~/.prisma-airs/config.json` without writing it, checks its hash afterward, disables inherited debug output, and never prints credentials. Reports keep pass/fail/skip status, duration, error category and HTTP status. Response-shape evidence removes every scalar value; it is not presented as a replayable original response body.

Read suites run by default. Mutation suites require explicit `--writes` and only change uniquely named SDK-owned fixtures:

```bash
npm run e2e:scan
npm run e2e:management -- --writes
npm run e2e:model-security -- --writes
npm run e2e:red-team -- --writes --scan
npm run e2e:gateway:read
npm run e2e:gateway:extensions -- --writes
npx tsx scripts/e2e-gateway-owned-writes.ts --writes
CLI_COMPAT_DIR=/path/to/isolated-cli npx tsx scripts/e2e-cli.ts
CLI_COMPAT_DIR=/path/to/isolated-cli npx tsx scripts/e2e-cli-writes.ts --writes
npx tsx scripts/e2e-cleanup-audit.ts
npx tsx scripts/e2e-completion-recheck.ts # read-only authentication control and quota recheck

# Live runtime suites create and retire a temporary key from read-only SCM credentials.
# IPv4 flag is a host-specific workaround, not an SDK or system DNS change.
E2E_GATEWAY_IPV4_ONLY=1 npx tsx scripts/e2e-gateway-inference.ts --writes
E2E_GATEWAY_IPV4_ONLY=1 npx tsx scripts/e2e-gateway-runtime-resources.ts --writes
E2E_GATEWAY_IPV4_ONLY=1 E2E_CLI_ENTRY=/path/to/updated-cli/dist/cli/index.js \
npx tsx scripts/e2e-cli-inference.ts --writes
E2E_GATEWAY_IPV4_ONLY=1 npx tsx scripts/e2e-cleanup-runtime-audit.ts --writes
npx tsx scripts/e2e-cleanup-audit.ts
```

Management validation includes profile/topic/key lifecycles and an actual scan using the created profile. Model Security validation includes custom-rule assignment, version history, and **synthetic scanner-result ingestion**, not execution of the proprietary ML scanning engine. Red Team validation includes completed bounded custom jobs using benign prompts, report retrieval, draft targets/adapters, CSV upload/download, and cleanup. It does not run an unrestricted adversarial campaign.

Live exceptions are not converted into passes: Red Team quota returned 403 and prompt-set version information returned 500. Gateway MCP test/connection revocation returned 403, and export start returned 500. Other intentionally unexecuted actions include accepting legal terms, changing organisation authentication, provisioning instances, interactive Copilot authorization, resetting existing usage counters, and rotating existing credentials. These require a suitable disposable environment or separate user authority.

The separate 07:48 UTC completion recheck confirmed a successful Red Team language read and another quota HTTP 403 with the same credentials. No resources were created. Its retained report is `artifacts/e2e/completion-recheck.json`; it repeats an existing failure rather than counting as new API coverage.

Deleted resources can remain archived, and scan/job/export audit records have no deletion API. Fixture journals record this footprint. Read the final assessment for the latest per-suite counts, cleanup verification and remaining tenant limitations before declaring a production rollout.

## Documentation build security

The SDK dependency audit reports no known vulnerabilities. Docusaurus is a separate build-time dependency tree, not part of the npm SDK payload. Its patched dependency set still inherits the unpatched `image-size` ICNS and JXL/HEIF denial-of-service advisories: [GHSA-w3rx-r6r6-pgpr](https://github.com/advisories/GHSA-w3rx-r6r6-pgpr) and [GHSA-5p2g-fcmc-qvqq](https://github.com/advisories/GHSA-5p2g-fcmc-qvqq).

The docs `prebuild`/`prestart` guard checks repository-site file signatures and rejects these image containers, even with misleading extensions, before invoking Docusaurus. This mitigates the checked source inputs; it does not patch the upstream package or clear its audit warnings. Use reviewed, local PNG/JPEG/WebP/SVG assets, keep builds isolated, and update the dependency when an upstream fix is available. The local preview serves the prebuilt static site on loopback only.
