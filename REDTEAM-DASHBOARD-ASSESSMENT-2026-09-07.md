# Red Team dashboard feed feasibility

Release update: the user subsequently authorized SDK 0.27.0 and CLI 5.1.0 publication.
The SDK release candidate passes 11,565 tests, 99.72% line/statement coverage, 100% function
coverage and 96.72% branch coverage. Fresh read-only verification again passes 9/9 at
2026-09-07T23:00:50.167Z. The exported SDK version and User-Agent now match the package version;
the release consistency test caught and prevented an initial mismatch. The CLI dashboard has
since been implemented and tested separately. The sections below preserve the earlier feasibility
phase and its scope, not a claim that the later release is still unauthorized.

Source: user-provided `/var/tmp/t1.txt`, read without executing its curl commands or copying
authorization headers. Input and `~/.prisma-airs/config.json` remain unchanged. No remote push,
publication, tenant mutation, new scan, credential rotation or production configuration change
is part of this iteration.

## Findings

Seven GET requests and seven response examples were supplied. All response examples pass the
existing Zod schemas. Six SDK requests already match the supplied method, path and query;
adding duplicate clients or new unstructured models is unnecessary.

Quota is the exception: the SDK's `getQuota()` intentionally models POST from the upstream
OpenAPI document, while the supplied dashboard uses GET. Fresh OAuth verifies the GET route.
The additive `RedTeamClient.getQuotaSummary()` reuses `QuotaSummarySchema`, configured data-plane
routing, OAuth, request deadlines and retry/error handling. The original POST method and frozen
OpenAPI fixtures are unchanged. An explicit OPA denial never triggers a GET-to-POST fallback.

## Live evidence

Initial feasibility: all seven supplied reads succeed through the existing SDK transport with
fresh OAuth. The new typed method then passes the tracked runner
`scripts/e2e-redteam-dashboard.ts`: **9/9 at 2026-09-07T22:10:53.786Z**, comprising the seven
feeds, quota GET on the default SASE host, and all 23 scan records across two 15-item pages.
Only aggregate allowlisted output is retained, never raw scan/configuration payloads.

Evidence: `artifacts/redteam-curl-feasibility.json`, `artifacts/e2e/redteam-dashboard.json`,
and `artifacts/examples/redteam-dashboard.json`; the tracked Docusaurus Red Team guide contains
the exact projected output, distinguished from CLI stdout and synthetic samples.

Observed counts: 8 targets, 19 scans in dashboard statistics, 23 in the complete scan inventory,
3 adapters, and 1 online network channel out of 7 configured. Static quota is unlimited despite
zero allocation; dynamic is 0/50 consumed and custom is 5/50. These are dated observations, not
fixed expectations or daily metrics. The statistics/inventory discrepancy has no established cause.

Four failing-first regressions cover GET/OAuth/body routing, additive fields and unlimited zero
allocation, malformed quota responses, and explicit 403 without method fallback or token refresh.
All 35 RedTeamClient tests pass after implementation; the existing POST contract test still passes.
The full SDK suite passes all 11,565 tests. Initial tooling type checks identified optional list
fields in the verification runner; explicit assertions now reject missing inventory rather than
silently reporting zero. Tooling type checks and the live runner pass after this correction.

Source, tooling and Docusaurus type checks, lint, formatting, public example coverage, and the
ESM/CJS/declaration build pass. The Docusaurus production build also passes. The built ESM
export exposes `getQuotaSummary`. Chromium at
22:16:21 UTC verifies that the rendered guide contains the exact captured JSON and timestamp,
the local/unreleased label, and generated reference documentation distinguishing GET from POST;
there are no page errors. The final post-build credential scan checks 17,640 files with zero matching leaked files
and unchanged credential bytes. `git diff --check` passes.

## Scope and next integration

The SDK data prerequisites are feasible. This is a local, unreleased additive SDK change; SDK
0.26.0 and CLI 5.0.1 remain published. A dedicated CLI Red Team environment dashboard/report,
HTML/Markdown rendering and actual CLI command-output documentation are not implemented by this
feed-validation iteration. They should reuse these seven feeds, preserve independent measurement
windows, paginate explicitly, surface partial sources and avoid treating unknown activity as zero.
No full-project 99% coverage or 9/10 readiness claim is made.
