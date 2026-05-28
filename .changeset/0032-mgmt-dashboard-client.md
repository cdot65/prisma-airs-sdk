---
'@cdot65/prisma-airs-sdk': minor
---

Add `ManagementClient.dashboard` (new `DashboardClient`) covering the SCM "AI Security > Runtime > API Applications" detail panel:

- `mgmt.dashboard.application({ appId, appName })` returns the per-app overview - `token_stats` (average daily + monthly total, paired with K/M scale qualifiers), `session_stats`, attached `profiles[]`, `cloud`/`source`/`created_at`. Together these power per-app token consumption / chargeback reporting that previously required the SCM UI.
- `mgmt.dashboard.applicationViolationBreakdown({ appId, appName })` returns per-detector severity counts (one entry per `detection_type`; 10 observed live as of 2026-05-28: `agent_security`, `contextual_grounding`, `dbs` (database security), `dlp`, `malicious_code`, `pi`, `source_code`, `tc`, `topic_guardrails`, `uf`) plus `total_violating`.

Both endpoints require `appId` and a non-empty `appName`. Empty `appname` returns HTTP 400; omitting it entirely (different code path) returns an all-null body. The SDK requires both, keeping both failure modes off the happy path.

API behavior verified live on 2026-05-28 and reflected in the type signature:

- `timeUnit` is narrowed to `'days'` only - `'hours'` / `'minutes'` return HTTP 400.
- `timeInterval` is narrowed to `7 | 30 | 60` (the only values that returned 200; `1, 3, 14, 21, 28, 90` all returned 400).
- Default is `30` / `'days'` to match the SCM UI's "30 days" claim.

Response schemas use `.passthrough()` + `nullable().optional()` for forward compatibility with future API fields and detector types.
