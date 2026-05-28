---
'@cdot65/prisma-airs-sdk': minor
---

Add `ManagementClient.dashboard` (new `DashboardClient`) covering the SCM "AI Security > Runtime > API Applications" detail panel:

- `mgmt.dashboard.application({ appId, appName })` returns the per-app overview - `token_stats` (average daily + monthly total, paired with K/M scale qualifiers), `session_stats`, attached `profiles[]`, `cloud`/`source`/`created_at`. Together these power per-app token consumption / chargeback reporting that previously required the SCM UI.
- `mgmt.dashboard.applicationViolationBreakdown({ appId, appName })` returns per-detector severity counts (one entry per `detection_type`: `agent_security`, `dlp`, `malicious_code`, `pi`, `tc`, `topic_guardrails`, `uf`) plus `total_violating`.

Both endpoints require `appId` AND `appName` - omitting `appname` returns an all-null body (silent failure mode), so the parameter is non-optional in the TypeScript signature. History window max is 30 days (the API's hard cap); `timeInterval`/`timeUnit` default to `30`/`days`. Response schemas use `.passthrough()` + `nullable().optional()` for forward compatibility with future API fields.
