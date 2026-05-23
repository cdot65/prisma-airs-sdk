# DLP — Data Patterns

Manage Data Patterns on the DLP service (`/v2/api/data-patterns`).

Subclient lives at `client.dlp.dataPatterns`. Full CRUD: list, create, get, replace (PUT), patch (RFC 7396 JSON Merge Patch), delete. DELETE soft-deletes (archives) server-side.

Spec source: [`specs/dlp/DataPatterns.yaml`](https://github.com/cdot65/prisma-airs-sdk/blob/main/specs/dlp/DataPatterns.yaml)

## Setup

```ts
import { ManagementClient } from '@cdot65/prisma-airs-sdk';

const client = new ManagementClient();
```

## list

```ts
const page = await client.dlp.dataPatterns.list({
  page: 0,
  size: 20,
  sort: ['name,asc', 'id,desc'],
});
for (const p of page.content) console.log(p.id, p.name);
```

## create

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

## get

```ts
const pattern = await client.dlp.dataPatterns.get('pat-001');
```

## replace

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

## patch

JSON Merge Patch. `name`, `type`, and `detection_config` are required even on patch. Other fields use nullable semantics — omit to leave unchanged, send `null` to clear.

```ts
const patched = await client.dlp.dataPatterns.patch('pat-001', {
  name: 'cc-numbers-strict-v2',
  type: 'custom',
  detection_config: { technique: 'regex' },
  description: null,
});
```

## delete

204 No Content. Returns `void`.

```ts
await client.dlp.dataPatterns.delete('pat-001');
```
