# DLP — Data Patterns

Manage Data Patterns on the DLP service (`/v2/api/data-patterns`).

Subclient lives at `client.dlp.dataPatterns` (a `DataPatternsClient`). **Full CRUD**: list, create, get, replace (PUT), patch (RFC 7396 JSON Merge Patch), delete. DELETE soft-deletes (archives) server-side — the pattern becomes invisible to list but its `id` still resolves on `get()` with `status: 'deleted'`.

Spec source: [`specs/dlp/DataPatterns.yaml`](https://github.com/cdot65/prisma-airs-sdk/blob/main/specs/dlp/DataPatterns.yaml)

## How it works

A **data pattern** is the lowest-level building block in DLP: a single, reusable **detector**. It says "here is what sensitive data looks like" — a set of regexes, proximity keywords, or another detection technique (`regex`, `weighted_regex`, `dictionary`, `edm`, `ml`, fingerprinting, etc.). A pattern on its own does nothing; it has to be referenced by a data profile to take effect.

Where it sits among the four DLP resources:

| Resource                     | Role                                                                         |
| ---------------------------- | ---------------------------------------------------------------------------- |
| **Data Patterns** (this one) | The detectors — regex / keyword / technique that recognize data              |
| **Dictionaries**             | Keyword lists a pattern can reference via the `dictionary` technique         |
| **Data Profiles**            | Bundle patterns (and dictionaries) into a detection policy with AND/OR logic |
| **Data Filtering Profiles**  | Apply a data profile to actually filter/block matching content               |

Flow: **pattern → referenced by a data profile → bound to a data filtering profile → enforced on traffic.** Patterns are the leaves; everything else composes them upward. Palo Alto ships dozens of `predefined` patterns (SSN, credit cards, AWS keys, …) you can reference without authoring anything — create `custom` patterns only when the built-ins miss your data.

## Get the most out of it

- **Prefer `weighted_regex` with proximity keywords over bare `regex`** for anything that looks like a common number sequence. A raw 16-digit run matches phone systems, order IDs, and SKUs; the same run within `proximity_distance` of "card" / "visa" scores high and stays quiet otherwise. Weighting is how you trade false positives for confidence levels.
- **Set `supported_confidence_levels` deliberately.** Data profiles select a `confidence_level` per rule item; a pattern only offers the levels you list here. If you forget `high`, profiles can't require high-confidence hits from this pattern.
- **Check for a `predefined` pattern first.** Authoring a custom credit-card regex when a maintained predefined one exists means you now own its accuracy forever.
- **Tag for auditability.** `tags.classification` / `compliance` / `geography` are free-text aids for filtering and reporting later — fill them in (`PCI`, `PCI-DSS-3.2.1`, `EU`) so compliance audits can slice by them.
- **Gotcha — escape regexes for JSON.** `\b\d{16}\b` becomes `'\\b\\d{16}\\b'` in a TS/JSON string. A lost backslash silently changes what matches.
- **Gotcha — Merge Patch replaces arrays wholesale.** Patching `matching_rules` does not merge into the existing regex list; re-send the full set (see Use case 2).
- **Gotcha — DELETE is a soft-delete.** The pattern disappears from `list()` but its `id` still resolves on `get()` as `status: 'deleted'`; reusing the name later may collide.

## Setup

```ts
import { ManagementClient } from '@cdot65/prisma-airs-sdk';

const client = new ManagementClient();
```

## Required fields

| Field              | Type                                          | Required on POST | Required on PATCH | Notes                                             |
| ------------------ | --------------------------------------------- | ---------------- | ----------------- | ------------------------------------------------- |
| `name`             | `string` (1..64)                              | ✅               | ✅                | Spec enforces length bounds                       |
| `type`             | `'predefined' \| 'custom' \| 'file_property'` | ✅               | ✅                | `custom` for tenant-authored patterns             |
| `detection_config` | `{ technique, supported_confidence_levels? }` | ✅               | ✅                | Required even on patch                            |
| `matching_rules`   | `DataPatternMatchingRules`                    | —                | nullable          | `regexes`, proximity keywords, metadata criteria  |
| `tags`             | `DataPatternTags`                             | —                | nullable          | `classification`, `compliance`, `geography`       |
| `description`      | `string`                                      | —                | nullable          | Omit to leave unchanged on patch; `null` to clear |

Detection techniques (the `detection_config.technique` enum): `edm`, `document_fingerprint`, `trainable_classifier`, `ml_document`, `regex`, `weighted_regex`, `ml`, `titus_tag`, `wildfire`, `file_property`, `dictionary`, `pab`, `document_classifier`.

Schema source: [`src/models/dlp-data-pattern.ts`](https://github.com/cdot65/prisma-airs-sdk/blob/main/src/models/dlp-data-pattern.ts).

## API reference

### list

```ts
const page = await client.dlp.dataPatterns.list({
  page: 0,
  size: 20,
  sort: ['name,asc', 'id,desc'],
});
for (const p of page.content) console.log(p.id, p.name);
```

### create

`name`, `type`, and `detection_config` are required.

```ts
const created = await client.dlp.dataPatterns.create({
  name: 'cc-numbers-strict',
  type: 'custom',
  detection_config: { technique: 'regex' },
  matching_rules: {
    regexes: [{ regex: '\\b\\d{16}\\b', weight: 1.0 }],
  },
});
console.log(created.id);
```

### get

```ts
const pattern = await client.dlp.dataPatterns.get('pat-001');
```

### replace

Full PUT.

```ts
const replaced = await client.dlp.dataPatterns.replace('pat-001', {
  name: 'cc-numbers-strict',
  type: 'custom',
  detection_config: { technique: 'regex' },
  matching_rules: {
    regexes: [{ regex: '\\b\\d{15,16}\\b', weight: 1.0 }],
  },
});
```

### patch

JSON Merge Patch. `name`, `type`, and `detection_config` are required even on patch. Other fields use nullable semantics — omit to leave unchanged, send `null` to clear.

```ts
const patched = await client.dlp.dataPatterns.patch('pat-001', {
  name: 'cc-numbers-strict-v2',
  type: 'custom',
  detection_config: { technique: 'regex' },
  description: null,
});
```

### delete

204 No Content. Returns `void`. Soft-deletes server-side.

```ts
await client.dlp.dataPatterns.delete('pat-001');
```

## Use cases

### Use case 1 — Create a weighted credit-card detector and validate its post-create state

**Scenario.** Build a custom pattern that detects 15- or 16-digit credit-card-like sequences with proximity to keywords like "card", "visa", "mastercard". Weighted regexes let the engine score matches by confidence — a bare 16-digit run scores low, the same run within 30 chars of "card number" scores high.

**Input.**

```ts
import { ManagementClient } from '@cdot65/prisma-airs-sdk';

const client = new ManagementClient();

const created = await client.dlp.dataPatterns.create({
  name: 'cc-numbers-weighted',
  type: 'custom',
  description: 'Credit-card numbers, weighted by proximity to card-related keywords',
  detection_config: {
    technique: 'weighted_regex',
    supported_confidence_levels: ['low', 'medium', 'high'],
  },
  matching_rules: {
    proximity_distance: 30,
    proximity_keywords: ['card', 'credit', 'visa', 'mastercard', 'amex'],
    regexes: [
      { regex: '\\b\\d{16}\\b', weight: 1.0 },
      { regex: '\\b\\d{15}\\b', weight: 0.8 }, // amex is 15
    ],
  },
  tags: {
    classification: ['PCI'],
    compliance: ['PCI-DSS-3.2.1'],
    geography: ['US', 'EU'],
  },
});
```

**Expected output.** POST returns `DataPatternResponse` — the API generates `id`, `status`, `version`, and `audit_metadata`:

```json
{
  "id": "pat-7c4a91",
  "name": "cc-numbers-weighted",
  "description": "Credit-card numbers, weighted by proximity to card-related keywords",
  "tenant_id": "tnt-001",
  "type": "custom",
  "status": "active",
  "license_type": "standard",
  "version": 1,
  "detection_config": {
    "technique": "weighted_regex",
    "supported_confidence_levels": ["low", "medium", "high"]
  },
  "matching_rules": {
    "proximity_distance": 30,
    "proximity_keywords": ["card", "credit", "visa", "mastercard", "amex"],
    "regexes": [
      { "regex": "\\b\\d{16}\\b", "weight": 1.0 },
      { "regex": "\\b\\d{15}\\b", "weight": 0.8 }
    ]
  },
  "tags": {
    "classification": ["PCI"],
    "compliance": ["PCI-DSS-3.2.1"],
    "geography": ["US", "EU"]
  },
  "audit_metadata": {
    "created_at": "2026-05-23T17:11:02Z",
    "created_by": "ops@example.com"
  }
}
```

**Validation.** Assert the server preserved the input shape and stamped the lifecycle fields:

```ts
if (!created.id) throw new Error('create() did not return an id');
if (created.status !== 'active') {
  throw new Error(`new pattern not active: status=${created.status}`);
}
if (created.version !== 1) {
  throw new Error(`expected version 1 for new pattern, got ${created.version}`);
}
if (created.detection_config?.technique !== 'weighted_regex') {
  throw new Error(
    `detection_config.technique not preserved: ${created.detection_config?.technique}`,
  );
}
const regexCount = created.matching_rules?.regexes?.length ?? 0;
if (regexCount !== 2) {
  throw new Error(`expected 2 regexes round-tripped, got ${regexCount}`);
}
if (!created.tags?.compliance?.includes('PCI-DSS-3.2.1')) {
  throw new Error('compliance tag not persisted');
}
console.log(`ok: pattern ${created.id} created (v${created.version})`);
```

### Use case 2 — Patch an existing pattern to widen its regex and clear its description

**Scenario.** The above `cc-numbers-weighted` is too strict — it misses 13-digit cards. JSON Merge Patch lets us update only `matching_rules` (re-sending it in full, since arrays/objects are replaced not merged in JSON Merge Patch) and simultaneously clear the description by sending `description: null`.

**Input.**

```ts
const id = 'pat-7c4a91';

const patched = await client.dlp.dataPatterns.patch(id, {
  // Required even on patch:
  name: 'cc-numbers-weighted',
  type: 'custom',
  detection_config: {
    technique: 'weighted_regex',
    supported_confidence_levels: ['low', 'medium', 'high'],
  },
  // Replace matching_rules entirely (Merge Patch replaces arrays wholesale):
  matching_rules: {
    proximity_distance: 30,
    proximity_keywords: ['card', 'credit', 'visa', 'mastercard', 'amex'],
    regexes: [
      { regex: '\\b\\d{16}\\b', weight: 1.0 },
      { regex: '\\b\\d{15}\\b', weight: 0.8 },
      { regex: '\\b\\d{13}\\b', weight: 0.6 },
    ],
  },
  // Clear the description:
  description: null,
  // Omit `tags` entirely to leave them unchanged.
});
```

**Expected output.** Same `DataPatternResponse` shape with `version` bumped, `description` absent (cleared), and the third regex present:

```json
{
  "id": "pat-7c4a91",
  "name": "cc-numbers-weighted",
  "tenant_id": "tnt-001",
  "type": "custom",
  "status": "active",
  "version": 2,
  "detection_config": {
    "technique": "weighted_regex",
    "supported_confidence_levels": ["low", "medium", "high"]
  },
  "matching_rules": {
    "proximity_distance": 30,
    "proximity_keywords": ["card", "credit", "visa", "mastercard", "amex"],
    "regexes": [
      { "regex": "\\b\\d{16}\\b", "weight": 1.0 },
      { "regex": "\\b\\d{15}\\b", "weight": 0.8 },
      { "regex": "\\b\\d{13}\\b", "weight": 0.6 }
    ]
  },
  "tags": {
    "classification": ["PCI"],
    "compliance": ["PCI-DSS-3.2.1"],
    "geography": ["US", "EU"]
  },
  "audit_metadata": {
    "created_at": "2026-05-23T17:11:02Z",
    "created_by": "ops@example.com",
    "updated_at": "2026-05-23T17:38:55Z",
    "updated_by": "ops@example.com"
  }
}
```

**Validation.** Assert the new regex landed, description was cleared, tags were left alone:

```ts
if (patched.id !== id) throw new Error(`id changed unexpectedly: ${patched.id}`);
if (patched.version === undefined || patched.version < 2) {
  throw new Error(`version did not advance past 1: ${patched.version}`);
}
const regexes = patched.matching_rules?.regexes ?? [];
const hasThirteen = regexes.some((r) => r.regex.includes('{13}'));
if (!hasThirteen) {
  throw new Error('13-digit regex was not persisted');
}
if (patched.description !== undefined && patched.description !== '') {
  throw new Error(`description not cleared: ${JSON.stringify(patched.description)}`);
}
// Tags were omitted from the PATCH body — server should have left them intact.
if (!patched.tags?.compliance?.includes('PCI-DSS-3.2.1')) {
  throw new Error('tags were dropped — omitted fields should be preserved on Merge Patch');
}
console.log(`ok: patched to v${patched.version}, now matches ${regexes.length} regexes`);
```

## Error handling

```ts
import { AISecSDKException, ErrorType } from '@cdot65/prisma-airs-sdk';

try {
  await client.dlp.dataPatterns.create({
    name: '', // violates min(1)
    type: 'custom',
    detection_config: { technique: 'regex' },
  });
} catch (err) {
  if (err instanceof AISecSDKException) {
    if (err.errorType === ErrorType.USER_REQUEST_PAYLOAD_ERROR) {
      console.error('local validation rejected the body:', err.message);
    } else if (err.errorType === ErrorType.CLIENT_SIDE_ERROR) {
      console.error('API rejected (4xx):', err.message);
    } else {
      console.error(err.errorType, err.message);
    }
  } else {
    throw err;
  }
}
```

## See also

- [Full API reference](../../reference/api/index.md) — every `DataPatternsClient` method with input/output examples
- [DLP — Data Profiles](data-profiles.md) — data profiles compose patterns via detection rule items (use the pattern's `id`)
- [DLP — Dictionaries](dictionaries.md) — keyword-list-driven detection technique
- Runnable walkthrough: [`docs-site/examples/mgmt-dlp-data-patterns.ts`](https://github.com/cdot65/prisma-airs-sdk/blob/main/docs-site/examples/mgmt-dlp-data-patterns.ts)
