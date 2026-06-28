# DLP — Dictionaries

Manage Dictionaries on the DLP service (`/v2/api/dictionaries`).

Subclient lives at `client.dlp.dictionaries` (a `DictionariesClient`). **Full CRUD with a multipart twist**: `create` and `replace` take a metadata object + a keyword file (newline-delimited). PATCH uses JSON Merge Patch. PUT can return 200+body **or** 204+empty — `replace()` returns `DictionaryResponse | undefined`.

Accepted file shapes: `Blob`, `ArrayBuffer`, `Uint8Array`, `string`. The SDK builds the multipart boundary; **do not set `Content-Type` manually**.

Spec source: [`specs/dlp/Dictionaries.yaml`](https://github.com/cdot65/prisma-airs-sdk/blob/main/specs/dlp/Dictionaries.yaml)

## How it works

A **dictionary** is a named list of keywords (one term per line) plus metadata. It is the keyword half of detection — where a data pattern matches by shape (regex), a dictionary matches by membership ("is this token in my list of project codenames / banned drug names / internal hostnames?"). A dictionary does nothing by itself; a data profile activates it through a detection rule item set to `detection_technique: 'dictionary'`, referencing the dictionary's `id`.

Where it sits among the four DLP resources:

| Resource                    | Role                                                           |
| --------------------------- | -------------------------------------------------------------- |
| **Data Patterns**           | Shape-based detectors (regex / weighted regex / techniques)    |
| **Dictionaries** (this one) | Keyword lists matched by membership                            |
| **Data Profiles**           | Bundle patterns and dictionaries into one detection policy     |
| **Data Filtering Profiles** | Apply a data profile to actually filter/block matching content |

Flow: **dictionary → referenced by a data profile rule item (`dictionary` technique) → bound to a data filtering profile → enforced on traffic.** Reach for a dictionary instead of a pattern when "sensitive" means "an exact term from a maintained list" rather than "a string with a recognizable structure."

## Get the most out of it

- **One term per line, trailing newline.** The file is newline-delimited; the SDK reports the parsed count back in `dictionary_metadata.number_of_keywords` — assert against it (see Use case 1) to catch a malformed file before it silently under-matches.
- **Use `is_case_sensitive` intentionally.** Codenames and product names usually want case-insensitive matching; source-code identifiers or env-var names may want case-sensitive. It defaults off — set it at create time.
- **Pick the right `category`.** It is an enum used for organization and reporting, not free text. Note the literal space in `'Source Code'`; an invalid value is rejected by Zod before the request leaves the process.
- **Re-fetch after `replace()` to confirm state.** PUT can answer 200+body or 204+empty depending on region — don't branch your logic on which you got; GET with `includeKeywords: true` is the definitive read (see Use case 2).
- **Keep keyword counts manageable.** Dictionaries are loaded and scanned per request; huge lists cost match latency. Split by domain (one dictionary per concern) and OR them in a data profile rather than one mega-list.
- **Gotcha — never set `Content-Type` yourself.** The runtime must write the multipart boundary; overriding it breaks the upload.
- **Gotcha — `keywords` are returned only on request.** `list`/`get` omit the keyword array unless you pass `keywords: true` / `includeKeywords: true`.

## Setup

```ts
import { ManagementClient } from '@cdot65/prisma-airs-sdk';

const client = new ManagementClient();
```

## Required fields

| Field                | Type                       | Required on POST/PUT | Required on PATCH | Notes                                                  |
| -------------------- | -------------------------- | -------------------- | ----------------- | ------------------------------------------------------ |
| `category`           | `DictionaryCategory` enum  | ✅                   | ✅                | `'Academic' \| 'Confidential' \| 'Source Code' \| ...` |
| `name`               | `string`                   | ✅                   | ✅                |                                                        |
| `original_file_name` | `string`                   | ✅                   | ✅                | Used as the multipart filename and the keyword source  |
| `region_name`        | `string`                   | ✅                   | nullable          |                                                        |
| `description`        | `string`                   | —                    | nullable          | Omit to leave unchanged; `null` to clear               |
| `is_case_sensitive`  | `boolean`                  | —                    | nullable          |                                                        |
| `type`               | `'predefined' \| 'custom'` | —                    | —                 | Defaults server-side to `custom` for user uploads      |

Valid `category` values (spec enum, verbatim — note the space in `'Source Code'`): `Academic`, `Confidential`, `Employment`, `Financial`, `Government`, `Healthcare`, `Legal`, `Marketing`, `Source Code`.

Schema source: [`src/models/dlp-dictionary.ts`](https://github.com/cdot65/prisma-airs-sdk/blob/main/src/models/dlp-dictionary.ts).

## API reference

### list

`keywords: true` includes the keyword array in each response entry.

```ts
const page = await client.dlp.dictionaries.list({
  page: 0,
  size: 20,
  keywords: false,
});
for (const d of page.content) console.log(d.id, d.name);
```

### create

Multipart upload — `file` accepts `Blob | ArrayBuffer | Uint8Array | string`. `category`, `name`, `original_file_name`, and `region_name` are required on the metadata.

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

### get

```ts
const dict = await client.dlp.dictionaries.get('dict-1', { includeKeywords: true });
```

### replace

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

### patch

JSON Merge Patch. `category`, `name`, and `original_file_name` are required even on patch. Other fields are nullable — omit to leave unchanged, send `null` to clear.

```ts
const patched = await client.dlp.dictionaries.patch('dict-1', {
  category: 'Confidential',
  name: 'project-codenames-v2',
  original_file_name: 'codenames.txt',
  description: null,
});
```

### delete

```ts
await client.dlp.dictionaries.delete('dict-1');
```

## Use cases

### Use case 1 — Upload a codenames dictionary from a string, then read keywords back

**Scenario.** A new "Confidential" dictionary holds internal project codenames. Build the keyword list as a string in-process, POST as multipart, and immediately GET back with `includeKeywords: true` to confirm the server parsed every line.

**Input.**

```ts
import { ManagementClient } from '@cdot65/prisma-airs-sdk';

const client = new ManagementClient();

const keywords = ['alpha', 'bravo', 'charlie', 'delta', 'echo'];
const file = keywords.join('\n') + '\n'; // newline-delimited, trailing \n

const created = await client.dlp.dictionaries.create({
  metadata: {
    category: 'Confidential',
    name: 'project-codenames',
    original_file_name: 'codenames.txt',
    region_name: 'us-west-2',
    description: 'Internal project codenames — phonetic alphabet',
    is_case_sensitive: false,
    type: 'custom',
  },
  file,
  includeKeywords: true,
});
```

**Expected output.** POST returns `DictionaryResponse`. With `includeKeywords: true`, `keywords[]` is populated:

```json
{
  "id": "dict-7f30c2",
  "name": "project-codenames",
  "description": "Internal project codenames — phonetic alphabet",
  "category": "Confidential",
  "region_name": "us-west-2",
  "type": "custom",
  "is_case_sensitive": false,
  "is_parent_managed": false,
  "detection_technique": "dictionary",
  "dictionary_metadata": {
    "number_of_keywords": 5,
    "original_file_name": "codenames.txt",
    "original_file_size_in_byte": 30
  },
  "keywords": ["alpha", "bravo", "charlie", "delta", "echo"],
  "audit_metadata": {
    "created_at": "2026-05-23T18:20:41Z",
    "created_by": "ops@example.com"
  }
}
```

**Validation.** Make the example self-checking — verify the metadata counter, the keyword round-trip, and the lifecycle stamps:

```ts
if (!created.id) throw new Error('create() did not return an id');
if (created.category !== 'Confidential') {
  throw new Error(`category not preserved: ${created.category}`);
}
if (created.dictionary_metadata?.number_of_keywords !== keywords.length) {
  throw new Error(
    `server counted ${created.dictionary_metadata?.number_of_keywords} keywords, expected ${keywords.length}`,
  );
}
if (created.dictionary_metadata?.original_file_name !== 'codenames.txt') {
  throw new Error(`filename not preserved: ${created.dictionary_metadata?.original_file_name}`);
}

const returned = created.keywords ?? [];
if (returned.length !== keywords.length) {
  throw new Error(`got ${returned.length} keywords back, expected ${keywords.length}`);
}
const missing = keywords.filter((k) => !returned.includes(k));
if (missing.length > 0) {
  throw new Error(`keywords lost in round-trip: ${missing.join(', ')}`);
}

console.log(`ok: dictionary ${created.id} contains ${returned.length} keywords`);
```

### Use case 2 — Replace a dictionary's keyword file and tolerate 200-or-204 response

**Scenario.** Add a new codename ("foxtrot") to an existing dictionary. PUT can answer 200+body (some regions) or 204+empty (others) — handle both. After the replace, re-fetch with `includeKeywords: true` to verify the new keyword stuck.

**Input.**

```ts
const id = 'dict-7f30c2';
const updatedKeywords = ['alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot'];

const result = await client.dlp.dictionaries.replace(id, {
  metadata: {
    category: 'Confidential',
    name: 'project-codenames',
    original_file_name: 'codenames.txt',
    region_name: 'us-west-2',
    type: 'custom',
  },
  file: updatedKeywords.join('\n') + '\n',
  includeKeywords: false, // don't bother with body if region returns 200
});

// Always re-fetch to canonically observe state, regardless of 200/204:
const reread = await client.dlp.dictionaries.get(id, { includeKeywords: true });
```

**Expected output.** Two possibilities for `result`:

- **200 path** — `result` is a full `DictionaryResponse`
- **204 path** — `result` is `undefined`

```json
// reread (always present, definitive)
{
  "id": "dict-7f30c2",
  "name": "project-codenames",
  "category": "Confidential",
  "region_name": "us-west-2",
  "type": "custom",
  "dictionary_metadata": {
    "number_of_keywords": 6,
    "original_file_name": "codenames.txt",
    "original_file_size_in_byte": 38
  },
  "keywords": ["alpha", "bravo", "charlie", "delta", "echo", "foxtrot"],
  "audit_metadata": {
    "created_at": "2026-05-23T18:20:41Z",
    "created_by": "ops@example.com",
    "updated_at": "2026-05-23T18:45:09Z",
    "updated_by": "ops@example.com"
  }
}
```

**Validation.** Branch on 200-vs-204 then assert against the re-read:

```ts
if (result === undefined) {
  console.log('replace() returned 204 — empty body (expected in some regions)');
} else {
  console.log(`replace() returned 200 — body for ${result.id}`);
  if (result.id !== id) throw new Error(`id mismatch in 200 path: ${result.id}`);
}

// Definitive checks against the re-read:
if (reread.dictionary_metadata?.number_of_keywords !== updatedKeywords.length) {
  throw new Error(
    `expected ${updatedKeywords.length} keywords post-replace, got ${reread.dictionary_metadata?.number_of_keywords}`,
  );
}
if (!reread.keywords?.includes('foxtrot')) {
  throw new Error('foxtrot was not added — replace did not persist');
}
if (!reread.audit_metadata?.updated_at) {
  throw new Error('audit_metadata.updated_at missing — replace did not stamp lifecycle');
}
console.log(`ok: dictionary ${id} now holds ${reread.keywords?.length} keywords`);
```

## Notes on the multipart body

The SDK encodes the metadata as a JSON part named `json` (with `Content-Type: application/json` and filename `metadata.json`) and the keyword file as a part named `file` (with the filename you put in `metadata.original_file_name`). Don't try to override the multipart boundary — the runtime needs to write it.

For an `ArrayBuffer` or `Uint8Array` source — e.g. when reading from disk in Node:

```ts
import { readFile } from 'node:fs/promises';

const buf = await readFile('./codenames.txt');
await client.dlp.dictionaries.create({
  metadata: {
    category: 'Confidential',
    name: 'codenames',
    original_file_name: 'codenames.txt',
    region_name: 'us-west-2',
  },
  file: buf,
});
```

## Error handling

```ts
import { AISecSDKException, ErrorType } from '@cdot65/prisma-airs-sdk';

try {
  await client.dlp.dictionaries.create({
    metadata: {
      // Missing required region_name — Zod will catch it before the request.
      category: 'Confidential',
      name: 'broken',
      original_file_name: 'broken.txt',
    } as any,
    file: 'foo\n',
  });
} catch (err) {
  if (err instanceof AISecSDKException) {
    if (err.errorType === ErrorType.USER_REQUEST_PAYLOAD_ERROR) {
      console.error('local validation rejected the metadata:', err.message);
    } else {
      console.error(err.errorType, err.message);
    }
  } else {
    throw err;
  }
}
```

## See also

- [Full API reference](../../reference/api/index.md) — every `DictionariesClient` method with input/output examples
- [DLP — Data Profiles](data-profiles.md) — `DetectionRuleItem` with `detection_technique: 'dictionary'` references dictionary ids
- [DLP — Data Patterns](data-patterns.md) — alternative detection surface (regex / weighted_regex)
- Runnable walkthrough: [`docs-site/examples/mgmt-dlp-dictionaries.ts`](https://github.com/cdot65/prisma-airs-sdk/blob/main/docs-site/examples/mgmt-dlp-dictionaries.ts)
