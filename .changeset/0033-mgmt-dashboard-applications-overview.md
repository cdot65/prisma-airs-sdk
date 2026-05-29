---
'@cdot65/prisma-airs-sdk': minor
---

Add `mgmt.dashboard.applicationsOverview(opts?)` covering the dashboard's apps enumeration endpoint at `/v1/mgmt/dashboard/v2/apps/applicationsoverview`. This is the canonical apps-list source for dashboard reporting and is what the SCM UI's "AI Security > Runtime > API Applications" view uses to populate its list.

The dashboard buckets traffic by the literal `metadata.app_name` value scan payloads sent. A single registered customer-app (`customer_apps.customer_appId`) can therefore appear here as multiple items, one per distinct scan-payload name, when integrations override `app_name` in scan metadata (LiteLLM's `panw_prisma_airs` guardrail does this by default, for example). Enumerating from `applicationsOverview` rather than `customerApps.list` is necessary to see every dashboard bucket - the `id` field is the registered `customer_appId` UUID, and the `name` field is the scan-payload value. Pair this with `dashboard.application(...)` and `dashboard.applicationViolationBreakdown(...)` to drill into specific buckets.

API behavior verified live on 2026-05-29 and reflected in the type signature:

- `timeInterval` is narrowed to `1 | 7 | 30 | 60`; other values return HTTP 400.
- `timeUnit` accepts `'days'`, `'day'`, and `'hour'` (note the singular forms - this endpoint accepts wider values than the per-app `application` endpoint, which only accepts `'days'`).
- Valid combinations live-tested: `(7, days)`, `(30, days)`, `(60, days)`, `(1, day)`, `(1, hour)`. The SCM UI uses `(1, day)` by default; the SDK defaults to `(30, days)` to match the existing dashboard methods.
- `limit` and `offset` provide offset-based pagination; the SCM UI uses `limit=25`.

Response shape uses `z.passthrough()` and `nullable().optional()` for forward compatibility with future API fields. New exports: `DashboardApplicationsOverviewQuery`, `DashboardApplicationsOverview`, `DashboardApplicationsOverviewItem`, `DashboardApplicationSessionsBucket`, `DashboardPagination`, and their schemas.

Also clarifies the `DashboardAppQuery.appName` JSDoc to reference `applicationsOverview` as the canonical enumeration source, so callers know where to obtain valid `(appId, appName)` pairs when integration-supplied scan-payload names diverge from SCM-registered customer-app names.
