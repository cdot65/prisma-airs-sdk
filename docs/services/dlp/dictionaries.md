# DLP — Dictionaries

Manage Dictionaries on the DLP service (`/v2/api/dictionaries`).

Subclient lives at `client.dlp.dictionaries`. Full CRUD with a multipart upload twist: `create` and `replace` take a metadata object + keyword file. PATCH uses JSON Merge Patch. PUT can return 200+body or 204+empty — `replace()` returns `DictionaryResponse | undefined`.

Spec source: [`specs/dlp/Dictionaries.yaml`](https://github.com/cdot65/prisma-airs-sdk/blob/main/specs/dlp/Dictionaries.yaml)

## Setup

```ts
import { ManagementClient } from '@cdot65/prisma-airs-sdk';

const client = new ManagementClient();
```

## list

`keywords: true` includes the keyword array in each response entry.

```ts
const page = await client.dlp.dictionaries.list({
  page: 0,
  size: 20,
  keywords: false,
});
for (const d of page.content) console.log(d.id, d.name);
```

## create

Multipart upload — `file` accepts `Blob | ArrayBuffer | Uint8Array | string`. The SDK builds the multipart boundary; do not set Content-Type manually. `category`, `name`, `original_file_name`, and `region_name` are required on the metadata.

```ts
const created = await client.dlp.dictionaries.create({
  metadata: {
    category: 'Confidential',
    name: 'project-codenames',
    original_file_name: 'codenames.txt',
    region_name: 'us-west-2',
    type: 'custom',
  },
  file: 'alpha\nbravo\ncharlie\n',
  includeKeywords: true,
});
console.log(created.id);
```

## get

```ts
const dict = await client.dlp.dictionaries.get('dict-1', { includeKeywords: true });
```

## replace

Full multipart replace. Returns `DictionaryResponse | undefined` since the API may answer 200 with body or 204 with no body.

```ts
const replaced = await client.dlp.dictionaries.replace('dict-1', {
  metadata: {
    category: 'Confidential',
    name: 'project-codenames',
    original_file_name: 'codenames.txt',
    region_name: 'us-west-2',
    type: 'custom',
  },
  file: 'alpha\nbravo\ncharlie\ndelta\n',
});
if (replaced) console.log('200:', replaced.id);
else console.log('204 — empty body');
```

## patch

JSON Merge Patch. `category`, `name`, and `original_file_name` are required even on patch. Other fields are nullable — omit to leave unchanged, send `null` to clear.

```ts
const patched = await client.dlp.dictionaries.patch('dict-1', {
  category: 'Confidential',
  name: 'project-codenames-v2',
  original_file_name: 'codenames.txt',
  description: null,
});
```

## delete

```ts
await client.dlp.dictionaries.delete('dict-1');
```
