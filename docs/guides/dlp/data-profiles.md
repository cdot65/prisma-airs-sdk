# DLP — Data Profiles

Manage Data Profiles on the DLP service (`/v2/api/data-profiles`).

Subclient lives at `client.dlp.dataProfiles`. **CRUD without DELETE** — the spec does not expose a DELETE for data profiles. To remove a profile, patch its lifecycle state via the underlying API (typically `profile_status: 'deleted'`).

Two distinct rule shapes live under `detection_rules[].rule_type`:

- `expression_tree` — recursive boolean tree of `DetectionRuleItem` leaves (the leaf carries the detection technique + thresholds)
- `multi_profile` — composes other data profiles by id, joined by an operator (build "this OR that OR the other")

Spec source: [`specs/dlp/DataProfiles.yaml`](https://github.com/cdot65/prisma-airs-sdk/blob/main/specs/dlp/DataProfiles.yaml)

## Setup

```ts
import { ManagementClient } from '@cdot65/prisma-airs-sdk';

const client = new ManagementClient();
```

## Required fields

| Field             | Type                    | Required on POST | Required on PATCH | Notes                                             |
| ----------------- | ----------------------- | ---------------- | ----------------- | ------------------------------------------------- |
| `name`            | `string` (1..64)        | ✅               | ✅                |                                                   |
| `detection_rules` | `DetectionRule[]`       | ✅               | nullable          | Either `expression_tree` or `multi_profile` shape |
| `profile_type`    | `'basic' \| 'advanced'` | —                | ✅                | PATCH requires it even when unchanged             |
| `description`     | `string`                | —                | nullable          | Omit to leave unchanged on patch; `null` to clear |

Schema source: [`src/models/dlp-data-profile.ts`](https://github.com/cdot65/prisma-airs-sdk/blob/main/src/models/dlp-data-profile.ts).

### DetectionRuleItem (the leaf)

Required: `detection_technique` (same vocabulary as data-patterns). Common optional fields per technique family:

| Technique family           | Typical fields                                                       |
| -------------------------- | -------------------------------------------------------------------- |
| `regex`, `weighted_regex`  | `confidence_level`, `occurrence_operator_type`, `occurrence_count`   |
| `dictionary`, `document_*` | `score`, `score_low`, `score_high`                                   |
| `edm`                      | `edm_dataset_id`, `primary_fields`, `secondary_fields`, `*_criteria` |

All combinations are valid Zod — set whatever the chosen technique requires.

## API reference

### list

```ts
const page = await client.dlp.dataProfiles.list({
  page: 0,
  size: 20,
  sort: ['name,asc'],
});
for (const p of page.content) console.log(p.id, p.name, p.profile_type);
```

### create

```ts
const created = await client.dlp.dataProfiles.create({
  name: 'PII Confidential',
  detection_rules: [
    {
      rule_type: 'expression_tree',
      expression_tree: {
        operator_type: 'and',
        rule_item: {
          detection_technique: 'regex',
          match_type: 'include',
        },
      },
    },
  ],
});
console.log(created.id);
```

### get

```ts
const profile = await client.dlp.dataProfiles.get('prof-1');
```

### replace

Full PUT.

```ts
const replaced = await client.dlp.dataProfiles.replace('prof-1', {
  name: 'PII Confidential v2',
  detection_rules: [
    {
      rule_type: 'multi_profile',
      multi_profile: {
        operator_type: 'or',
        data_profile_ids: [1001, 1002],
      },
    },
  ],
});
```

### patch

JSON Merge Patch. `name` and `profile_type` are required; other fields use nullable semantics — omit to leave unchanged, send `null` to clear.

```ts
const patched = await client.dlp.dataProfiles.patch('prof-1', {
  name: 'PII Confidential',
  profile_type: 'advanced',
  description: 'Updated description',
  detection_rules: null,
});
```

## Use cases

### Use case 1 — Build an `expression_tree` profile that requires SSN AND credit-card pattern hits

**Scenario.** A "high-risk PII" profile should fire only when both an SSN-pattern leaf AND a credit-card-pattern leaf match (logical AND). Use an `expression_tree` rule with `operator_type: 'and'` joining two sub-expressions, each carrying a `rule_item` leaf.

**Input.**

```ts
import { ManagementClient } from '@cdot65/prisma-airs-sdk';

const client = new ManagementClient();

const created = await client.dlp.dataProfiles.create({
  name: 'High-risk PII (SSN AND CC)',
  description: 'Fires only when both SSN and CC pattern leaves match',
  detection_rules: [
    {
      rule_type: 'expression_tree',
      expression_tree: {
        operator_type: 'and',
        sub_expressions: [
          {
            rule_item: {
              detection_technique: 'regex',
              match_type: 'include',
              confidence_level: 'high',
              occurrence_operator_type: 'more_than_equal_to',
              occurrence_count: 1,
            },
          },
          {
            rule_item: {
              detection_technique: 'weighted_regex',
              match_type: 'include',
              confidence_level: 'high',
              occurrence_operator_type: 'more_than_equal_to',
              occurrence_count: 1,
            },
          },
        ],
      },
    },
  ],
});
```

**Expected output.**

```json
{
  "id": "prof-3a91",
  "name": "High-risk PII (SSN AND CC)",
  "description": "Fires only when both SSN and CC pattern leaves match",
  "tenant_id": "tnt-001",
  "type": "custom",
  "profile_status": "active",
  "profile_type": "basic",
  "version": 1,
  "detection_rules": [
    {
      "rule_type": "expression_tree",
      "expression_tree": {
        "operator_type": "and",
        "sub_expressions": [
          {
            "rule_item": {
              "detection_technique": "regex",
              "match_type": "include",
              "confidence_level": "high",
              "occurrence_operator_type": "more_than_equal_to",
              "occurrence_count": 1
            }
          },
          {
            "rule_item": {
              "detection_technique": "weighted_regex",
              "match_type": "include",
              "confidence_level": "high",
              "occurrence_operator_type": "more_than_equal_to",
              "occurrence_count": 1
            }
          }
        ]
      }
    }
  ],
  "audit_metadata": {
    "created_at": "2026-05-23T17:55:14Z",
    "created_by": "ops@example.com"
  }
}
```

**Validation.** Walk into the tree and assert structure:

```ts
if (!created.id) throw new Error('create() did not return an id');
if (created.profile_status !== 'active') {
  throw new Error(`new profile not active: ${created.profile_status}`);
}

const rule = created.detection_rules?.[0];
if (!rule || rule.rule_type !== 'expression_tree') {
  throw new Error(`expected expression_tree rule, got ${rule?.rule_type}`);
}

const tree = rule.expression_tree;
if (tree?.operator_type !== 'and') {
  throw new Error(`root operator not 'and': ${tree?.operator_type}`);
}

const leaves = tree?.sub_expressions ?? [];
if (leaves.length !== 2) {
  throw new Error(`expected 2 sub-expressions, got ${leaves.length}`);
}

const techniques = leaves.map((s) => s.rule_item?.detection_technique);
if (!techniques.includes('regex') || !techniques.includes('weighted_regex')) {
  throw new Error(`leaves missing expected techniques: ${techniques.join(',')}`);
}

console.log(`ok: ${created.id} created (v${created.version}) with ${leaves.length} leaves`);
```

### Use case 2 — Compose a `multi_profile` umbrella profile that ORs two existing profiles

**Scenario.** Compliance wants a single "EU-Regulated" profile that fires when **either** an existing `GDPR-PII` (id `1001`) **or** `EU-Healthcare` (id `1002`) profile matches. Use `multi_profile` to OR them together; the new profile becomes the single binding target for filtering profiles.

**Input.**

```ts
const created = await client.dlp.dataProfiles.create({
  name: 'EU-Regulated (umbrella)',
  description: 'GDPR-PII OR EU-Healthcare',
  detection_rules: [
    {
      rule_type: 'multi_profile',
      multi_profile: {
        operator_type: 'or',
        data_profile_ids: [1001, 1002],
      },
    },
  ],
});
```

**Expected output.**

```json
{
  "id": "prof-eu-001",
  "name": "EU-Regulated (umbrella)",
  "description": "GDPR-PII OR EU-Healthcare",
  "tenant_id": "tnt-001",
  "type": "custom",
  "profile_status": "active",
  "profile_type": "advanced",
  "version": 1,
  "detection_rules": [
    {
      "rule_type": "multi_profile",
      "multi_profile": {
        "operator_type": "or",
        "data_profile_ids": [1001, 1002]
      }
    }
  ],
  "audit_metadata": {
    "created_at": "2026-05-23T18:02:08Z",
    "created_by": "ops@example.com"
  }
}
```

Note: composing other profiles auto-promotes `profile_type` to `'advanced'` server-side — even though we didn't ask for it.

**Validation.** Confirm the discriminator survived round-trip, the ids landed in order, and the server upgraded the profile_type:

```ts
if (created.profile_type !== 'advanced') {
  throw new Error(
    `multi_profile composition should auto-promote to advanced, got ${created.profile_type}`,
  );
}

const rule = created.detection_rules?.[0];
if (rule?.rule_type !== 'multi_profile') {
  throw new Error(`expected multi_profile rule, got ${rule?.rule_type}`);
}

const ids = rule.multi_profile?.data_profile_ids ?? [];
if (ids.length !== 2 || ids[0] !== 1001 || ids[1] !== 1002) {
  throw new Error(`data_profile_ids did not round-trip: ${JSON.stringify(ids)}`);
}

if (rule.multi_profile?.operator_type !== 'or') {
  throw new Error(`operator not 'or': ${rule.multi_profile?.operator_type}`);
}

console.log(`ok: umbrella ${created.id} bundles ${ids.length} child profiles`);
```

## Error handling

```ts
import { AISecSDKException, ErrorType } from '@cdot65/prisma-airs-sdk';

try {
  await client.dlp.dataProfiles.create({
    name: 'bad',
    detection_rules: [
      // discriminator missing the matching payload key
      { rule_type: 'expression_tree' },
    ],
  });
} catch (err) {
  if (err instanceof AISecSDKException) {
    if (err.errorType === ErrorType.CLIENT_SIDE_ERROR) {
      console.error('400 — likely a malformed detection rule:', err.message);
    } else {
      console.error(err.errorType, err.message);
    }
  } else {
    throw err;
  }
}
```

## See also

- [DLP — Data Filtering Profiles](data-filtering-profiles.md) — binds a data profile via `data_profile_id`
- [DLP — Data Patterns](data-patterns.md) — pattern ids referenced inside `DetectionRuleItem` leaves
- [DLP — Dictionaries](dictionaries.md) — `detection_technique: 'dictionary'` references dictionary ids
- Runnable walkthrough: [`examples/mgmt-dlp-data-profiles.ts`](https://github.com/cdot65/prisma-airs-sdk/blob/main/examples/mgmt-dlp-data-profiles.ts)
