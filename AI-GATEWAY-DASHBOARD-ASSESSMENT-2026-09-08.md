# AI Gateway dashboard feeds — September 8, 2026

Scope: incorporate the 25 read-only SCM calls supplied in `/var/tmp/t2.txt` into the SDK for
CLI dashboards. The initial local validation was based on SDK 0.27.0; these additions
are now prepared as SDK 0.28.0. The historical results below describe the SDK phase,
not CLI stdout. The CLI dashboard has its own release assessment and live workflow.

## Outcome

Twenty calls already matched existing SDK methods and schemas. Five new typed methods cover
the remaining routes:

| Method                                  | Purpose                                                             |
| --------------------------------------- | ------------------------------------------------------------------- |
| `telemetry.errorCategoryTrends(window)` | Aggregate error counts by HTTP status                               |
| `telemetry.groupedErrors(window)`       | Status-code error counts inside time buckets                        |
| `telemetry.filterBoundaries(window)`    | Available analytics filters and numerical bounds                    |
| `organisations.getInfo(tsgId)`          | Organisation settings, limits and capabilities                      |
| `guardrails.getCatalog()`               | Available evaluators and parameter schemas, not configured policies |

`telemetry.logs()` now supports validated, zero-based `currentPage`. Contrary to the earlier
general pagination warning, this wire parameter works. A fixed supplied window returned
174 distinct row IDs across four 50-row-budget pages, then an empty past-end page; server
totals stayed stable. The unsupported `skip`, `offset` and `page` aliases remain rejected.
The response's `capturedTotal` was zero, so it is not used for pagination termination.

Optional LLM/MCP/A2A request, error and token breakdown fields are now typed in existing
chart schemas. Responses omitting those optional additions still pass. New response schemas
preserve unknown object fields. Empty grouped-error arrays and nullable numerical filter
bounds are retained rather than converted to false zero-valued observations.

## Verification

- Initial raw feasibility: all five new routes plus raw logs returned HTTP 200 using fresh
  OAuth client credentials, not browser bearer tokens. Page indices 1 and 2 returned rows
  distinct from page zero.
- All 25 user-supplied JSON responses passed SDK schemas. The parser reads capture data only;
  it never executes curl commands or uses captured authorization headers.
- Source SDK live check: 27/27 passed at `2026-09-08T00:38:31.023Z`.
- Built ESM SDK live check: 27/27 passed at `2026-09-08T00:44:12.217Z`, including all 25 reads,
  complete pagination with duplicate/total/empty-page guards, and an empty boundary window.
- Built CommonJS exports expose all five added methods.
- Full suite: 11,619/11,619 tests passed, including 54 new regression tests covering routes,
  OAuth/TSG headers, malformed responses, HTTP 400/401/403/429/500, strict query validation,
  page zero, invalid pages, response extensions, debug redaction and legacy compatibility.
- Coverage: lines/statements 99.72%, functions 100%, branches 96.74%. These figures are code
  coverage, not full OpenAPI coverage or certification of every gateway deployment.
- Source/tooling/docs type checks, lint, formatting, public example coverage, dual-format
  package build and Docusaurus production build pass.
- Chromium verifies the locally served guide's HTTP response, exact live aggregate JSON,
  capture timestamp, unreleased notice, catalog reference and pagination reference, with
  zero page errors. The scoped loopback preview is stopped after verification.
- Runnable `docs-site/examples/gateway-dashboard-feeds.ts` also succeeds against the `dev`
  workspace with a rolling 24-hour window. Its counts differ from the fixed captured window;
  this is not evidence of a broken aggregate or a single combined daily report.
- Credential scan: 15,534 files, zero leaks, unchanged config. A separate scan of 3,116
  source/test/script/doc/distribution files finds none of the three distinct unmasked secrets
  extracted in memory from the user's capture.

Evidence remains private in ignored paths:

- `artifacts/e2e/gateway-dashboard-inputs.json` — aggregate-only built SDK observations.
- `artifacts/e2e/gateway-dashboard-inputs-checks.json` — live checks and counts.
- `artifacts/e2e/gateway-dashboard-inputs-fixtures-checks.json` — capture validation.
- `artifacts/gateway-dashboard-unit-tests.json` — complete unit/integration result.
- `coverage/coverage-summary.json` — coverage totals.

## Security and reporting limits

The capture and `~/.prisma-airs/config.json` remain byte-for-byte unchanged. No inference,
scan submission, configuration mutation or resource creation was performed. OAuth scopes
were not expanded. API-key inventories, log records and arbitrary metadata were never
retained in documentation or verification output. New organisation-settings and filter-boundary
payloads have operation-specific redaction. Guardrail catalog descriptions and parameter
schemas are untrusted display data, not executable instructions.

The supplied calls span different windows; align them before building a human-facing daily
dashboard. A server total is not a snapshot guarantee. The verified full traversal is the
unfiltered captured window; do not claim filtered or concurrent-write traversals are complete
without checking unique IDs and totals. Retention, quota flags and partial inventories need
explicit representation in the future CLI collector. Limit sentinel values (such as -1)
should not be labeled exhausted or unlimited without establishing their semantics.

The guide `docs-site/docs/guides/ai-gateway-api.mdx` contains actual sanitized aggregate
output, an unreleased notice, corrected pagination guidance and SDK examples. It explicitly
does not present SDK projections as CLI stdout. The historical whole-project API-availability
gaps remain out of scope and are not reclassified as resolved.

Bounded assessment: **9/10** for these supplied SDK reads. They are implemented and live-verified;
the next independent step is a privacy-preserving CLI AI Gateway dashboard and its report E2E.

## Published release follow-through

The subsequent delivery phase is complete: SDK **0.28.0** is published with npm's `latest`
tag at source commit `5f7aafa` / release `v0.28.0`. SDK CI, npm publication and Docusaurus
deployment all succeed. A fresh built-package run passes 27/27 checks at
2026-09-08T01:10:17.506Z, with the credential file unchanged.

CLI **5.2.0** pins registry SDK 0.28.0 and is published as npm `latest`, pushed to both CLI
remotes, and installed globally. Its AI Gateway dashboard consumes all 25 supplied read feeds;
the npm-installed CLI passes 5/5 live workflows, including 1,431 unique transactions across
29 pages in the separate September 7 UTC window. Docusaurus examples now contain exact CLI
stdout, not the SDK projections above. Both container architectures and alias promotion pass.

The CLI checkout's `AI-GATEWAY-DASHBOARD-ASSESSMENT-2026-09-08.md` records release evidence,
privacy/compatibility gates and the independent agent's **9.1/10** bounded-feature assessment.
Historical whole-product OpenAPI availability limitations remain outside this release claim.
