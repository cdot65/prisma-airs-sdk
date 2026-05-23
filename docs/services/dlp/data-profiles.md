# DLP — Data Profiles

Manage Data Profiles on the DLP service (`/v2/api/data-profiles`).

Subclient lives at `client.dlp.dataProfiles`. CRUD without DELETE — the spec does not expose a DELETE for data profiles. To remove a profile, patch its lifecycle state via the underlying API (typically `profile_status: 'deleted'`).

Spec source: [`specs/dlp/DataProfiles.yaml`](https://github.com/cdot65/prisma-airs-sdk/blob/main/specs/dlp/DataProfiles.yaml)

## Setup

```ts
import { ManagementClient } from '@cdot65/prisma-airs-sdk';

const client = new ManagementClient();
```

## list

```ts
const page = await client.dlp.dataProfiles.list({
  page: 0,
  size: 20,
  sort: ['name,asc'],
});
for (const p of page.content) console.log(p.id, p.name, p.profile_type);
```

## create

Two rule shapes — `expression_tree` (recursive boolean tree of detection rule items) or `multi_profile` (composes other profiles by id).

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

## get

```ts
const profile = await client.dlp.dataProfiles.get('prof-1');
```

## replace

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

## patch

JSON Merge Patch. `name` and `profile_type` are required; other fields use nullable semantics — omit to leave unchanged, send `null` to clear.

```ts
const patched = await client.dlp.dataProfiles.patch('prof-1', {
  name: 'PII Confidential',
  profile_type: 'advanced',
  description: 'Updated description',
  detection_rules: null,
});
```
