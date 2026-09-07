# Original SDK goal: resumed completion audit

Audit date: 2026-09-07 UTC. Baseline source commit `6ad605a`; SDK 0.26.0,
CLI 5.0.1. This does not supersede the original scope with the smaller Runtime dashboard milestone.

## Result

**Not complete. Full-project assessment remains 5/10, not 9/10.** The successful Runtime
milestone does not establish 99% coverage of the supplied Gateway document or successful
execution of all service workflows. No package version or production configuration is changed
by this tooling/documentation iteration.

| Original requirement                              | Current evidence                                                                                                                                                                                                                          | Decision                                                                    |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Review SDK architecture and CLI-facing practices  | Prior assessment records bounded OAuth/request/stream lifecycles, pre-network validation, separate auth planes, pagination and secret-safe output. Current CLI release adds argument validation before hooks.                             | Improvements implemented; no throughput benchmark claimed.                  |
| At least 99% supplied AIRS contracts              | Fresh source audit: 149/149 operations across seven files, 791/791 measured request and 3,242/3,242 response properties; positive, negative and query checks pass.                                                                        | Measured corrected contracts pass, not proof every live workflow works.     |
| At least 99% entire Gateway specification         | Fresh audit: 138/242 direct matches (57.02%); complete denominator retained. At least 240 matches required.                                                                                                                               | Fails; 102 additional direct matches required.                              |
| Respect Prisma routing/authentication differences | Design precedence requires verified Prisma behavior. Both SCM workspace controls pass; all 24 bounded authoring/administration hypotheses still receive OPA-denied 403.                                                                   | Do not fabricate methods, route aliases or IAM fixes from denied responses. |
| Complete appropriate E2E                          | CLI 5.0.1 final installed run passes 8/8 with 822 sessions/33 pages. Fresh dashboard executable examples run separately. Existing Gateway, Red Team, DLP and provider-specific failures remain documented.                                | Full scope is not certified; no failed check is replaced by a narrow pass.  |
| Read-only credential source and cleanup           | Current availability run confirms unchanged config bytes, no mutations, no retained response bodies and no fixtures. Example runner does not request scan content. Prior unretired DLP fixture remains unresolved.                        | Current runs preserve credentials; historical cleanup gap remains.          |
| Assessment and Docusaurus with actual output      | Current SDK conformance/dashboard pages distinguish published milestones from unfinished scope; administration output is regenerated from fresh status records. New dashboard example output is separately source-hashed and timestamped. | Updated for this iteration; historical results retained.                    |
| Self-review and iteration until at least 9/10     | The acceptance audit cannot honestly pass while full coverage and service workflows fail.                                                                                                                                                 | 5/10 overall; no score inflation or completion claim.                       |

## Fresh source and live evidence

`artifacts/openapi/audit.json`, generated at **20:37:38.366 UTC**, reads the actual supplied
checkouts and records all eight SHA-256 source hashes. The user-supplied Red Team directory
spelling does not exist here; the matching upstream files are in `prisma-airs-redteam`.
No upstream specification or frozen contract fixture was edited.

The existing offline preflight passed **7,966 checks** before this iteration. The new
`openapi:acceptance` command runs the same fresh source audit plus a per-source 99% operation
threshold. Its real invocation exited **1** with Gateway `passed: false`, while the seven AIRS
sources passed. Unlike the regular implemented-subset audit, it cannot report successful exit
status for the original full-source operation target. A future successful exit would still
require separate live, cleanup and documentation evidence to satisfy the entire goal.

The GET-only availability run finished at **20:34:56.105 UTC**:

- Two SCM workspace authentication controls passed.
- All 24 route hypotheses returned HTTP 403 and `x-opa-decision: false`.
- Correct pagination and both applicable workspace-member prefixes were used.
- No identities, memberships, invitations, SCIM settings, keys, gateway storage or model were changed.
- Current report: `artifacts/e2e/gateway-administration-availability.json`; the earlier
  13:09 run remains in the history directory, not silently erased.

## Tooling improvements and review

Eight failing-first operation-acceptance tests verify the complete 242-operation denominator,
the 239/240/242 threshold boundary, source completeness, empty-source failure and rejection of
cross-source averaging. Retired/unverified/adapted operations stay counted as gaps.
The initial test run failed because the acceptance module did not exist; it passes after implementation.

Refreshing the examples page then exposed a genuine inventory mismatch: its historical primary
batch omitted the two dashboard scripts added in SDK 0.26.0. The completeness assertion was not
relaxed. A new bounded, read-only runner executes those actual source examples, records each
source hash and validates only count/status output. Failures retain no arbitrary child stdout.
The generator reconciles both executions separately from the earlier batch and realtime run.
Output validation and receipt tests reject unknown fields, stale hashes, missing/duplicate scripts,
credential changes, content reads, mutations and mismatched counters. A first live run passed
2/2 at 20:41:12.887 UTC; later formatting requires a fresh source-bound capture rather than reusing
the old hashes. Counts are query-time observations, not an exhaustive daily inventory.

## Remaining prerequisites

The unmatched Gateway surface consists of 48 tenant-unverified operations, 23 upstream-retired
Assistants/Threads operations, 11 SCM adaptations and 22 partial analytics adaptations. These
categories sum to the 104 unmatched operations; classification is not coverage. The prescribed
models, verified Prisma auth planes and design constraints remain unchanged.

Next implementation requires authoritative usable Prisma routes/responses for the denied families,
or an explicit product decision about a separate upstream compatibility surface. Existing storage,
provider, entitlement, export, broker and DLP failures require their specific service prerequisites;
blind SDK wrappers or repeated unchanged requests cannot establish successful integrations.
Any production storage/IAM/model changes require a deliberate decision, not an assumption made
to improve the score. Legacy `scanLogs.query()` remains deprecated and broken under refactor;
the new session API is a different verified contract, not falsely counted as its repair.

## Final local verification

- Full SDK tests: **11,561/11,561**, 151 files, including 20 new acceptance/output/receipt checks.
- Coverage: **99.72%** statements/lines, **100%** functions, **96.72%** branches; existing gates unchanged.
- Source/tooling and runnable-documentation typechecks, lint, formatting and production Docusaurus build pass.
- Chromium verifies the rendered conformance, dashboard and examples pages, plus mobile visibility,
  with zero uncaught page errors. Exact current timestamps and actual numeric output are visible.
- Final source-bound dashboard example run: **2/2** at **20:44:15.796 UTC**; both sources reflect
  final formatting. Overview reports six buckets. Session example reports 25 first-page entries,
  API total 892, and a passed transaction with two actions and 72 tokens. Content is not requested.
- Credential scan at **20:47:51.179 UTC**: 12,374 files, zero configured-secret matches,
  credential-source bytes unchanged.
- The real full-contract acceptance command remains an expected **exit 1**, not a passing gate.

The full objective stays active; no completed-goal claim is made by this audit. This follow-up
updates tooling and documentation, not SDK/CLI runtime packages. Remote CI and public deployment
must be checked separately after the commit is pushed.

## Authorization diagnostic correction — 21:16 UTC

The earlier tooling/example commit `c7d48d3` subsequently passed CI, the complete Node
18/20/22/24 matrix and documentation deployment. Its public conformance, dashboard and
examples pages were independently verified. The next two goal turns only revalidated
unchanged prerequisites and are classified as no progress toward the original full objective.

The third revalidation found a documentation inconsistency that changes an actionable
recommendation: the older API guide and client JSDoc attributed every OPA-denied 403 to a
missing tenant-root grant. This is not established by the available evidence. Fresh read-only
checks finish at **21:16:26.357 UTC**, with successful workspace controls on both planes and
OPA-denied, correctly paginated virtual-key GETs on both. All eight source hashes and credential
bytes remain unchanged; no response bodies, tenant settings or IAM grants are modified.
Private evidence is `artifacts/resumed-goal-authorization-audit-3.json`.

The guide, client reference and historical release-note correction now distinguish policy
denial from a proven missing grant; AB03/AB02 are diagnostic hints rather than universal
permission/route diagnoses. They recommend checking the same-plane control and supported
route/query before considering IAM changes, preserve least privilege, and distinguish SCM
OAuth from runtime gateway keys. This is a concrete documentation safety correction, not new
operation coverage or a backend fix. The complete acceptance target remains unmet and the
full-project assessment remains **5/10**. SDK and CLI package versions remain unchanged.

Verification of the correction: all **11,561 tests** pass, as do source/tooling/documentation
typechecks, lint, formatting, public-example coverage and the production documentation build.
Comparing the client's transpiled JavaScript with comments removed proves runtime output is
unchanged. Local Chromium passes **4/4** checks across the guide, annotated release note,
generated client reference and mobile evidence link, with no page errors. Initial browser
launch attempts used unavailable system/glibc executables; the existing verified local Chromium
wrapper runs successfully without changing system packages. The credential scan checks
**17,628 files**, including built documentation, with zero matches and unchanged config bytes.
Public deployment is a separate post-push verification, not inferred from this local result.
