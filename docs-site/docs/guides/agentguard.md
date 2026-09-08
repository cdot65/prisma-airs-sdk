---
title: AI Supply Chain — AgentGuard
---

# AgentGuard: agent and skill scan telemetry

:::warning Experimental browser APIs — SDK 0.29.0
These read-only browser APIs are not part of the published OpenAPI contract. AgentGuard is introduced in SDK 0.29.0. Response schemas are based on supplied captures and live OAuth validation on September 8, 2026. No scan submission, upload, policy update or remediation operation is inferred from these GET endpoints.
:::

`AgentGuardClient` shares the Management OAuth client-credentials workflow. It reads `PANW_AGENT_GUARD_CLIENT_ID`, `PANW_AGENT_GUARD_CLIENT_SECRET`, and `PANW_AGENT_GUARD_TSG_ID`, falling back to `PANW_MGMT_*`. Tokens are obtained fresh; browser bearer tokens are not required. Both planes send `x-tsg-id` and share a cached OAuth token.

Default endpoints:

- Data: `https://api.apps.paloaltonetworks.com/aiag/data`
- Management: `https://api.apps.paloaltonetworks.com/aiag/mgmt`

Override with `dataEndpoint`, `mgmtEndpoint`, `tokenEndpoint`, or corresponding `PANW_AGENT_GUARD_DATA_ENDPOINT`, `PANW_AGENT_GUARD_MGMT_ENDPOINT`, and `PANW_AGENT_GUARD_TOKEN_ENDPOINT` variables. Token endpoint configuration falls back to `PANW_MGMT_TOKEN_ENDPOINT`.

## Supported reads

| SDK method | GET path | Verified options |
| --- | --- | --- |
| `listScans()` | `/v1/scans` | `skip`, `limit`, `isBackgroundRefresh`, `start_time`, `end_time` |
| `getScanStats()` | `/v1/stats/scans` | `time_period: '30_DAYS'` (default) |
| `listScanVulnerabilities(uuid)` | `/v1/scans/{uuid}/vulnerabilities` | Scan UUID; no unverified pagination parameters |
| `listRules()` | `/v1/rules` | `skip`, `limit` |

Queries are strict and validated before OAuth/network access. Unknown response fields and new status values are preserved. Failed scans can have null summaries and durations; historical scans can have null evaluation outcomes. These mean unavailable, not zero or passed. Nanosecond timestamps remain unchanged strings.

```typescript
import { AgentGuardClient } from '@cdot65/prisma-airs-sdk';

const client = new AgentGuardClient();
const scans = await client.listScans({ skip: 0, limit: 10, isBackgroundRefresh: false });
const stats = await client.getScanStats({ time_period: '30_DAYS' });
const catalog = await client.listRules({ skip: 0, limit: 100 });
const selected = scans.scans.find(scan => (scan.summary?.vulnerability_count ?? 0) > 0);
if (selected) {
  const findings = await client.listScanVulnerabilities(selected.uuid);
  // Treat findings as sensitive: they may contain source code, paths and secrets.
  console.log({ returnedFindings: findings.vulnerabilities.length });
}
console.log({ scans: scans.scans.length, uniqueSkills: stats.unique_skills_scanned.count, catalogRules: catalog.rules.length });
```

## Pagination and interpretation

The rules API currently reports **page length**, not catalog size, in `pagination.total_items`. The SDK preserves this wire response. For a complete rules inventory, increase `skip` by the number returned until a short/empty page, with a finite page budget and duplicate-ID guard. Do not stop because accumulated rows equal this field. Scan inventory pagination does report a global total; detect changed totals, repeated identities and premature empty pages.

The CLI implements these distinct pagination rules and a report with explicit source completeness. Batch/parent rows are excluded from report outcome counts. Scan counts, unique skills, findings and attack chains are distinct metrics. Rule defaults are not evidence of effective tenant policy settings.

SDK debug logging omits all AgentGuard response bodies, even with `PANW_AI_SEC_DEBUG_BODY=1`. Applications are still responsible for protecting explicitly retrieved finding content.

## Actual live result

Fresh client-credentials authentication and all nine supplied AI Supply Chain requests passed. The live CLI statistics command produced this response (September 8, 2026; not a synthetic fixture):

```json
{
  "unique_skills_scanned": { "count": 2, "percent_change": null },
  "total_vulnerabilities_found": { "count": 14, "percent_change": null },
  "top_vulnerability": { "vulnerability_type": "SECRET_EXPOSURE", "finding_count": 7 }
}
```

Full CLI pagination retrieved 24 historical scans and 7 catalog rules. A separately bounded 30-day report collected 13 scan rows across two pages; server statistics use their own rolling window. These numbers describe the validation environment at collection time, not expected values for every tenant.

## Existing Model Security coverage

The five Model Security captures reuse `ModelSecurityClient`: `models.listModels()`, `scans.list()` (including `model_version_uuid`), `securityGroups.list()`, and `models.getModelVersion()`. Model and scan listings now accept the browser `isBackgroundRefresh` boolean, preserving explicit `false`; `start_time` and `end_time` already exist. All five captured responses pass the existing schemas. No duplicate model-security client was introduced.
