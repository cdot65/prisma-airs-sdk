# DLP — Data Filtering Profiles

Manage Data Filtering Profiles on the DLP service (`/v2/api/data-filtering-profiles`).

Subclient lives at `client.dlp.dataFilteringProfiles` (a `DataFilteringProfilesClient`). Surface is **read + full-replace only** — the underlying API does not expose create or delete. To onboard a brand-new profile, provision it via the Strata Cloud Manager UI first, then manage it through this SDK.

Spec source: [`specs/dlp/DataFilteringProfiles.yaml`](https://github.com/cdot65/prisma-airs-sdk/blob/main/specs/dlp/DataFilteringProfiles.yaml)

## How it works

A **data filtering profile** is the enforcement layer — the resource that actually _acts_. It points at a data profile through `data_profile_id` and decides what to do when that profile matches: which directions to inspect (`direction`), whether to scan files (`file_based`) and/or chat/prompt content (`non_file_based`), at what `log_severity`, and any per-group `exception_rules` or `exclusions`. The detection logic lives in the data profile; the _policy_ (where, when, how loud) lives here.

Where it sits among the four DLP resources:

| Resource                               | Role                                                       |
| -------------------------------------- | ---------------------------------------------------------- |
| **Data Patterns**                      | Shape-based detectors                                      |
| **Dictionaries**                       | Keyword-list detectors                                     |
| **Data Profiles**                      | Compose detectors into a detection policy (the "what")     |
| **Data Filtering Profiles** (this one) | Apply a data profile to filter content (the "where / how") |

Flow: **patterns + dictionaries → data profile → data filtering profile → enforced on traffic.** This is the top of the stack: it's the only DLP resource that affects live content, and it does so entirely by reference to a data profile.

## Get the most out of it

- **An unlinked profile is a silent hole.** A filtering profile with no `data_profile_id` has nothing to match on, so it lets everything through. Audit for this regularly (Use case 1 does exactly that and fails CI if any enabled profile is unbound).
- **`replace()` is a full PUT — read before you write.** Omitted fields are dropped, not preserved. Always `get()` the current state, merge your change in, then `replace()` so you don't accidentally disable `file_based` or wipe existing exception rules (Use case 2).
- **Match `file_based` / `non_file_based` to the threat.** For LLM prompt/response inspection you want `non_file_based: true`; for upload scanning you want `file_based: true`. Leaving one off skips that whole content class.
- **Use `direction` to scope cost and intent.** `UPLOAD` catches exfiltration to a model; `DOWNLOAD` catches sensitive data coming back; `BOTH` is thorough but inspects twice the traffic.
- **Layer with `exception_rules` instead of forking profiles.** A per-group BLOCK/ALERT/ALLOW override keeps one profile authoritative rather than maintaining near-duplicate profiles per team.
- **Gotcha — no create/delete here.** New profiles are born in the Strata Cloud Manager UI; this SDK only reads and replaces existing ones.
- **Gotcha — confirm the `version` advanced** after a replace to be sure the write landed (Use case 2 asserts this).

## Setup

Same OAuth2 credentials as the rest of the Management API — reuses `PANW_MGMT_CLIENT_ID`, `PANW_MGMT_CLIENT_SECRET`, `PANW_MGMT_TSG_ID`. The DLP base URL defaults to `https://api.dlp.paloaltonetworks.com`; override via the `dlpEndpoint` constructor option (no env var).

```ts
import { ManagementClient } from '@cdot65/prisma-airs-sdk';

const client = new ManagementClient();
```

## Required fields (PUT body)

| Field             | Type                                                           | Required | Notes                                   |
| ----------------- | -------------------------------------------------------------- | -------- | --------------------------------------- |
| `file_based`      | `boolean`                                                      | ✅       | Enables file-content scanning           |
| `non_file_based`  | `boolean`                                                      | ✅       | Enables non-file (chat/prompt) scanning |
| `direction`       | `'BOTH' \| 'UPLOAD' \| 'DOWNLOAD'`                             | —        | Defaults server-side                    |
| `log_severity`    | `'CRITICAL' \| 'HIGH' \| 'MEDIUM' \| 'LOW' \| 'INFORMATIONAL'` | —        | Log severity for matched events         |
| `data_profile_id` | `number` (int64)                                               | —        | Links to the `dataProfiles` resource    |
| `exception_rules` | `ExceptionRuleDTO[]`                                           | —        | Pre-filter ALLOW/ALERT/BLOCK overrides  |
| `exclusions`      | `Exclusions`                                                   | —        | App / URL / keyword exclusion lists     |

The full `DataFilteringProfileRequest` shape lives in [`src/models/dlp-data-filtering-profile.ts`](https://github.com/cdot65/prisma-airs-sdk/blob/main/src/models/dlp-data-filtering-profile.ts).

## API reference

### list

Paginated `Page<DataFilteringProfileResponse>`. Optional filters: `status` (`enabled`/`disabled`), `name` (partial match). Sort entries emit one `sort=` query param each.

```ts
const page = await client.dlp.dataFilteringProfiles.list({
  page: 0,
  size: 20,
  sort: ['name,asc'],
  status: 'enabled',
});
console.log(page.totalElements, page.content.length);
```

### get

```ts
const profile = await client.dlp.dataFilteringProfiles.get('dfp-123');
console.log(profile.name, profile.direction);
```

### replace

Full PUT — body must satisfy `DataFilteringProfileRequest`. `file_based` and `non_file_based` are required. Returns the updated resource.

```ts
const updated = await client.dlp.dataFilteringProfiles.replace('dfp-123', {
  file_based: true,
  non_file_based: true,
  description: 'Outbound HR block',
  direction: 'UPLOAD',
  log_severity: 'HIGH',
  data_profile_id: 1001,
});
```

## Use cases

### Use case 1 — Inspect every enabled profile and surface ones missing a data profile binding

**Scenario.** Security ops wants a one-shot audit: list all `enabled` filtering profiles, then flag any that don't have a `data_profile_id` linked (these are misconfigured — they'd allow everything through). The output is a list of profile IDs to fix.

**Input.**

```ts
import { ManagementClient, AISecSDKException } from '@cdot65/prisma-airs-sdk';

const client = new ManagementClient();

const page = await client.dlp.dataFilteringProfiles.list({
  page: 0,
  size: 100,
  sort: ['name,asc'],
  status: 'enabled',
});
```

**Expected output** — `page` is a Spring `Page<>` envelope. A representative shape:

```json
{
  "content": [
    {
      "id": "dfp-001",
      "name": "Outbound-HR",
      "direction": "UPLOAD",
      "log_severity": "HIGH",
      "file_based": true,
      "non_file_based": true,
      "data_profile_id": 1001,
      "audit_metadata": {
        "created_by": "ops@example.com",
        "created_at": "2026-04-12T09:15:00Z",
        "updated_at": "2026-05-01T14:22:00Z"
      }
    },
    {
      "id": "dfp-002",
      "name": "Outbound-Eng",
      "direction": "UPLOAD",
      "log_severity": "MEDIUM",
      "file_based": true,
      "non_file_based": false
    }
  ],
  "totalElements": 2,
  "totalPages": 1,
  "first": true,
  "last": true,
  "size": 100,
  "number": 0,
  "numberOfElements": 2
}
```

**Validation.** Self-checking pattern — fails loudly if shape drifts or any enabled profile lacks a data profile binding:

```ts
const unlinked: string[] = [];

if (!Array.isArray(page.content)) {
  throw new Error(`list() did not return a Page<> envelope: ${JSON.stringify(page)}`);
}

for (const p of page.content) {
  if (!p.id) throw new Error(`profile missing id: ${JSON.stringify(p)}`);
  if (p.data_profile_id === undefined || p.data_profile_id === null) {
    unlinked.push(p.id);
  }
}

console.log(`enabled profiles: ${page.totalElements}`);
console.log(`unlinked (need data_profile_id): ${unlinked.length}`, unlinked);

if (unlinked.length > 0) {
  process.exitCode = 1; // fail the audit job in CI
}
```

### Use case 2 — Replace a profile to add a per-group exception rule

**Scenario.** The "Outbound-HR" profile currently blocks all uploads. Legal needs the `legal-review` user group to BLOCK with elevated severity while everyone else stays on the current behavior. Use `replace()` to PUT the new shape — `replace` is a full PUT, so existing fields must be re-sent verbatim.

**Input.**

```ts
const id = 'dfp-001';

// 1. Fetch current state so we don't drop existing fields on the PUT.
const current = await client.dlp.dataFilteringProfiles.get(id);

// 2. Merge in the new exception rule.
const updated = await client.dlp.dataFilteringProfiles.replace(id, {
  file_based: current.file_based ?? true,
  non_file_based: current.non_file_based ?? true,
  description: current.description,
  direction: current.direction as 'BOTH' | 'UPLOAD' | 'DOWNLOAD' | undefined,
  log_severity: 'HIGH',
  data_profile_id: current.data_profile_id,
  exception_rules: [
    {
      action: 'BLOCK',
      log_severity: 'CRITICAL',
      data_profile_ids: current.data_profile_id ? [current.data_profile_id] : undefined,
      source_attributes: {
        match_any: false,
        user_group_ids: ['legal-review'],
      },
    },
  ],
});
```

**Expected output.** PUT returns the updated `DataFilteringProfileResponse` — same shape as `get()`, with `version` bumped and `audit_metadata.updated_at` refreshed:

```json
{
  "id": "dfp-001",
  "name": "Outbound-HR",
  "direction": "UPLOAD",
  "log_severity": "HIGH",
  "file_based": true,
  "non_file_based": true,
  "data_profile_id": 1001,
  "version": 4,
  "exception_rules": [
    {
      "id": "er-9c1a",
      "action": "BLOCK",
      "log_severity": "CRITICAL",
      "data_profile_ids": [1001],
      "source_attributes": {
        "match_any": false,
        "user_group_ids": ["legal-review"]
      }
    }
  ],
  "audit_metadata": {
    "updated_at": "2026-05-23T17:04:11Z",
    "updated_by": "ops@example.com"
  }
}
```

**Validation.** Confirm the new rule landed and the version advanced:

```ts
if (updated.id !== id) {
  throw new Error(`returned id ${updated.id} does not match requested ${id}`);
}
if (current.version !== undefined && updated.version !== undefined) {
  if (updated.version <= current.version) {
    throw new Error(`version did not advance: ${current.version} → ${updated.version}`);
  }
}
const rules = updated.exception_rules ?? [];
const added = rules.find((r) => r.source_attributes?.user_group_ids?.includes('legal-review'));
if (!added) {
  throw new Error('legal-review exception rule was not persisted');
}
if (added.action !== 'BLOCK' || added.log_severity !== 'CRITICAL') {
  throw new Error(`unexpected exception rule shape: ${JSON.stringify(added)}`);
}
console.log(`ok: rule ${added.id} active, version ${updated.version}`);
```

## Error handling

Every method throws `AISecSDKException` on transport failure, OAuth issues, or response-validation errors. Classify with `errorType`:

```ts
import { AISecSDKException, ErrorType } from '@cdot65/prisma-airs-sdk';

try {
  await client.dlp.dataFilteringProfiles.replace('dfp-001', {
    file_based: true,
    non_file_based: true,
  });
} catch (err) {
  if (err instanceof AISecSDKException) {
    switch (err.errorType) {
      case ErrorType.OAUTH_ERROR:
        console.error('check PANW_MGMT_* env vars');
        break;
      case ErrorType.CLIENT_SIDE_ERROR:
        console.error('4xx — id likely does not exist or body invalid:', err.message);
        break;
      case ErrorType.SERVER_SIDE_ERROR:
        console.error('5xx — retried with backoff already:', err.message);
        break;
      default:
        console.error('unexpected:', err.errorType, err.message);
    }
  } else {
    throw err;
  }
}
```

## See also

- [Full API reference](../../reference/api/index.md) — every `DataFilteringProfilesClient` method with input/output examples
- [DLP — Data Profiles](data-profiles.md) — `data_profile_id` references resolve here
- [DLP — Data Patterns](data-patterns.md) — patterns referenced inside detection rules on the linked data profile
- Runnable walkthrough: [`docs-site/examples/mgmt-dlp-data-filtering-profiles.ts`](https://github.com/cdot65/prisma-airs-sdk/blob/main/docs-site/examples/mgmt-dlp-data-filtering-profiles.ts)
