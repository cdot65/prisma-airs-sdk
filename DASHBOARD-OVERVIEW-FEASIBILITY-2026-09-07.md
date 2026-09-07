# SCM dashboard applications overview — local feasibility

Scope: implement and test the supplied undocumented applications-overview endpoint in the SDK
without committing, pushing, publishing, or changing the installed CLI.

## Result

Successful live verification at **2026-09-07 15:58:08 UTC**:

- Fresh OAuth `client_credentials` authentication: HTTP 200, tenant-scoped token.
- Host: `https://api.apps.paloaltonetworks.com/aisec`.
- GET `/v1/mgmt/dashboard/v2/apps/applicationsoverview` with
  `time_interval=1&time_unit=day&limit=25&offset=0`.
- Raw, unstructured JSON: HTTP 200, populated `items` and `pagination`.
- Existing Zod model parsed the raw response without changing or losing any field.
- Typed SDK fetch: HTTP 200; four additional pagination reads at limit 2 retrieved all 7 buckets.
- One freshly acquired token was reused across all six dashboard requests. Every dashboard
  request carried OAuth Bearer authentication and the configured `x-tsg-id`.
- No browser cookies/headers or the user-pasted bearer token were used.

The one-day response contained **7 application buckets, 705 sessions, and 91 violating sessions**.
`Portkey-openai` contained **557 sessions and 62 violating sessions**. These are observed aggregate
counters, not reconstructed time-series sums, deduplicated tenant-wide session counts, or promises
about future rolling windows. Application identifiers, credentials, and full live payloads are
not stored in this report or test fixtures.

## Local SDK changes

- Reuse `ManagementClient.dashboard.applicationsOverview()`; this route/model already existed.
- Add a constructor-only `dashboardEndpoint` override. Other management routes retain their
  existing endpoint. Dashboard methods share the original OAuth manager and send `x-tsg-id`.
- Add `applicationsOverviewRaw(): Promise<unknown>` for undocumented deployment feasibility.
  An empty body remains `undefined`; invalid JSON and HTTP errors fail. Raw response debug bodies
  are suppressed even if global body debugging is enabled.
- Keep the existing forward-compatible Zod model; require `items` so malformed/missing payloads
  fail validation instead of looking like a successful empty inventory. Legitimate `items: []`
  remains valid. Null optional item fields and unknown extensions remain supported.
- Preserve nanosecond timestamp strings and time-series bucket values exactly. The observed
  series may show zero totals with nonzero violations, and does not reliably reconstruct the
  top-level counters. Distinct names sharing an application ID remain distinct buckets.
- Add mocked regression coverage, a repeatable read-only E2E script, and local documentation.

## Reproduce

```sh
npm run build
npx tsx scripts/e2e-dashboard-overview.ts
npx vitest run test/management/dashboard.spec.ts test/management/client.spec.ts
```

The E2E reads `~/.prisma-airs/config.json` without writing it, disables body debugging, and checks
that the file's bytes are unchanged. It obtains a fresh token rather than reusing a browser login.
The only remote actions are OAuth authentication and GET dashboard queries. Credentials exist
only in process memory; no credential, environment, profile, key, or gateway mutation occurs.

## Limits

Follow-up local verification of the additional supplied dashboard and session routes is recorded
in [the cumulative assessment](SCM-DASHBOARD-ASSESSMENT-2026-09-07.md). The limits below describe
this initial overview-only phase.

This is a successful application-overview integration, not a fix for `/v1/mgmt/scanlogs`.
Only applications overview was live-tested on the alternate host; the existing per-app dashboard
routes inherit the configured dashboard base URL but are not claimed live-verified there.
The host and endpoint are undocumented extensions, not additional OpenAPI-conformance coverage.
The SDK version remains 0.25.0 and these changes are local/unreleased.

## Regression verification

- Full SDK suite: **11,367 tests pass in 146 files**, including 45 management-client/dashboard tests.
- Source and tooling typechecks, ESLint, ESM/CJS/declaration builds, public API example coverage,
  and Docusaurus/example typechecking pass.
- Repeated the complete live workflow after strengthening the typed response schema at
  **16:01:57 UTC**: fresh OAuth plus six dashboard reads passed, with the same observed counters
  and complete seven-item pagination. Credential-file bytes remained unchanged in both runs.
- The runnable documentation example also passed against the **built package**, returning seven
  items through both raw-plus-Zod and typed methods. Formatting and `git diff --check` pass.
- Credential scan at **16:03:27 UTC** checked 12,302 SDK/source/docs/build/evidence files with zero
  leaked credentials and an unchanged credential source.
- No git commit, push, version bump, publication, CLI installation, or tenant mutation performed.
