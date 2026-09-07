# SCM dashboard extensions — local implementation and E2E assessment

> Historical feasibility phase below. The subsequent authorized release is SDK 0.26.0,
> consumed by CLI 5.0.0. See the release follow-up at the end; local-only statements describe
> the earlier phase, not an ongoing prohibition on publishing.

Scope: all eleven user-supplied routes, implemented in the actual SDK checkout for a future CLI
consumer. Work remains local, uncommitted and unpublished. No CLI installation or behavior change,
version bump, tenant mutation, key rotation, or browser-token reuse is included.

## Live results

Fresh OAuth client-credentials authentication succeeded on `api.apps.paloaltonetworks.com`.
Every supplied route returned populated JSON using the configured tenant header. Responses were
retrieved unstructured first, then parsed losslessly with Zod and fetched again through typed methods.
No browser cookies, Origin, Referer or pasted token was used. Credential-file bytes stayed unchanged.

| Route                                | Observed result                                                                        |
| ------------------------------------ | -------------------------------------------------------------------------------------- |
| `apps/applicationsoverview`          | 7 application buckets for one day; pagination verified in the earlier phase            |
| `apps/application`                   | Academy, 30 days: 174 sessions, 34 violating, webhook signature false                  |
| `apps/applicationviolationbreakdown` | Academy, 30 days: 40 detector violations (DLP 7, prompt injection 26, URL filtering 7) |
| `apps/topapplicationsviolations`     | One day: four rankings, with totals 65, 52, 17, and 2                                  |
| `apps/applicationsviolationstrend`   | One day: ten buckets, violation sum 136                                                |
| `apps/appslist`                      | 25 application identity pairs; no pagination metadata, completeness not inferred       |
| `sessions/sessionschart`             | Ten buckets, 8,640-second bucket size; 706 sessions, 92 violating                      |
| `sessions/sessionsoverview`          | All 705 observed entries retrieved across 29 pages of at most 25                       |
| `sessions/session`                   | Terminal session: one action; limit-one action query verified                          |
| `sessions/sessiontransaction`        | Matching transaction: passed, 13 tokens, 192 ms latency                                |
| `/v1/mgmt/reports/scancontent`       | Stored text retrieved and validated; text never printed or saved                       |

Application/detail/ranking/trend verification completed at **16:14:41 UTC** with one fresh OAuth
token and ten reads. Session drill-down verification completed at **16:25:12 UTC** with one
fresh token and **41 successful reads**, including raw/typed calls, full inventory pagination,
and the action-limit check. Live UUIDs, user attributes, full payloads and scan content are not
stored in this report or test fixtures.

## Implementation and safety

- Retained the dashboard-only endpoint override and shared OAuth manager; other management
  resources retain their original base URL. Explicit SDK methods map all eleven routes.
- Each route has typed and raw methods. Raw empty bodies stay undefined, malformed typed
  envelopes fail validation, and legitimate empty collections/null content remain explicit.
- Added typed `has_webhook_sig`, ranking/trend models, application identities, chart buckets,
  session inventories/actions, transaction attributes, and scan-content reports. Unknown fields
  and future detector/status strings are preserved. No unverified filters or paging contracts
  were invented for routes that did not supply them.
- Request validation runs before OAuth/network I/O for new queries. Session IDs need not be UUIDs;
  names are URL-encoded. Zero sub-request indices survive serialization. The query uses
  `scan_sub_req_id`, while the scan-content response preserves `sub_scan_req_id`.
- All raw bodies and all typed session/transaction/content bodies are suppressed in SDK debug
  logging. Content retrieval is explicit, never an implicit side effect of session reads.
- Tests use synthetic identities/text, not pasted tokens or customer logs. E2E output contains
  only operation metadata and safe aggregate counters. All remote operations are authentication
  or read-only GETs.

## Interpretation and remaining limits

Violating sessions are not detector violations: the Academy counters are 34 versus 40.
One-day and 30-day windows are deliberately separate. Timestamp precision, server ordering,
nullable fields and literal `None` strings are retained. Names/IDs alone are not unique.

The chart showed 706 sessions while inventory pagination retrieved 705. These were independent
rolling-window queries; the difference is recorded without assigning an unverified cause or
altering either value. A ranking or an unpaginated apps-list response is not assumed to be a
complete tenant inventory. The legacy `/v1/mgmt/scanlogs` route and installed CLI command remain
unchanged; the new session workflow is the verified alternative, not proof the old route is fixed.

Final-review rerun at **16:39:04 UTC** additionally required a stable reported inventory total,
no duplicates and an exact terminal item count across every page. It passed with **698 sessions**
across 28 pages, one fresh OAuth token and 40 HTTP 200 reads. The independently fetched chart
reported **699 sessions, 90 violating**. The same transaction/content chain passed again.
These later results supersede neither the earlier capture nor the distinction between metrics;
they demonstrate the stricter pagination check without claiming snapshot consistency.

## Reproduce

```sh
npm run build
npx tsx scripts/e2e-dashboard-overview.ts
npx tsx scripts/e2e-dashboard-details.ts
npx tsx scripts/e2e-dashboard-sessions.ts
```

The scripts use `~/.prisma-airs/config.json` read-only. The local Docusaurus guide is
`docs-site/docs/guides/scm-dashboard.mdx`; the consumer example is
`docs-site/examples/mgmt-dashboard-sessions.ts`. Stored content in the consumer example requires
explicit `--include-content`, and only availability is printed.

## Final validation and self-assessment

- Full SDK regression and coverage runs: **11,541 tests passed in 148 files**; the four
  dashboard/management-client files account for 219 focused tests.
- Overall coverage: **99.72% statements/lines, 100% functions, 96.72% branches**. The dashboard
  client and both dashboard model files have 100% coverage. These are code-test metrics,
  not an assertion of OpenAPI conformance for undocumented endpoints.
- Source/tooling/documentation typechecks, lint, formatting, public-example coverage,
  ESM/CommonJS builds and declaration generation passed. Both compiled entry points export
  all eleven typed/raw method pairs and the new schemas.
- Runnable documentation example passed at **16:33:27 UTC**, reporting four ranked apps,
  ten trend/chart buckets, 25 returned app identities, and a 25-entry page with total 705;
  its explicit content option returned availability without printing text. This example uses
  the repository's source alias, not a registry-installed release.
- A separate **plain-Node compiled ESM** consumer verified resolution to `dist/index.js`
  and passed the full chain at **16:36:20 UTC**. It reported three ranked apps and inventory
  total 699 at that later query time; the Terminal transaction still had 13 tokens and
  accessible stored content. Earlier measurements remain timestamped, not overwritten.
- Credential scan: **12,356 files checked, zero configured-secret matches**, and config bytes
  unchanged. Source, tests, scripts, docs, generated reference, distribution and artifacts were
  included; live content was never written. This checks known configured secrets, not a general
  guarantee that arbitrary downstream application logging is safe.
- Docusaurus static build passed. The new guide, navigation, executable example and examples-page
  output distinguish local/unreleased functionality from historical published-release results.

**Self-assessment: 9/10 for this local feasibility/SDK scope.** The supplied read routes work with
fresh OAuth, lossless models, negative-path/privacy tests and a real compiled-package consumer.
The remaining uncertainty is the undocumented upstream contract: window/filter support beyond
observed examples, apps-list completeness and cross-endpoint snapshot consistency are not proven.
No unsupported claims are hidden behind the score. Wiring this into CLI reports and shipping it
are separate follow-on work; neither was performed or represented as complete here.

## Authorized release follow-up — SDK 0.26.0 / CLI 5.0.0

The user subsequently authorized publishing this Runtime milestone and explicitly requested
that documentation identify legacy scan logs as broken and under refactor. The SDK class and
method now carry deprecation guidance without changing their runtime behavior. SDK release
metadata and User-Agent agree on 0.26.0; the release identity test caught and prevented an
initial mismatch before publication.

Final SDK regression: **11,541/11,541 tests**, 148 files; 99.72% statements/lines, 100% functions,
96.72% branches. Lint, format, source/tooling typechecks, example coverage, TypeDoc, Docusaurus
build/typecheck and credential scan pass. Packed ESM/CommonJS consumers verify all nine payload
files, 127 source-map files, 1,329 exports, strict NodeNext types, all eleven raw/typed dashboard
method exports, lossless content, zero sub-request serialization and pre-authentication rejection.

CLI candidate live tests at **17:39 UTC** pass all seven daily-report workflows, collecting all
seven sources (677 session entries, 28 pages). At **17:47 UTC**, the built CLI passes all thirteen
workflow checks across the eleven supplied routes, including full pagination, explicit content
access without persistence, and the disabled legacy command. Offline browser and Docusaurus
download checks pass 9/9. The CLI candidate requires its final registry-SDK pin and publication.

Later SDK verification exposed a feasibility-script assumption: the Academy application aged
out of the one-day discovery window even though its detail query spans 30 days. Discovery now
uses the matching 30-day window. Subsequent fresh authentication attempts encountered connection
timeouts before an HTTP response; an unauthenticated curl request reproduced the timeout, while
the SCM dashboard host still returned HTTP 401. These attempts are not counted as passing E2E.
The earlier successful captures remain dated, and release follow-up must verify fresh installed
packages separately. No credential, DNS, tenant or service configuration was changed.
