---
'@cdot65/prisma-airs-sdk': minor
---

Type fix: `CustomTopic.revision`, `CustomTopic.description`, and `CustomTopic.examples` are now typed as required (the API always returns them per the OpenAPI contract).

Before: `revision?: number; description?: string; examples?: string[]`
After: `revision: number; description: string; examples: string[]`

The request body type (`CreateCustomTopicRequest`) is unchanged — these fields remain optional on input.

Also documents two known schema divergences in `DataProtectionSchema` that the pre-flight will continue to flag:

- `data-leak-detection.member` is marked nullable/optional in Zod even though the OpenAPI marks it required, because the API returns `null` for it on some profiles.
- `database-security` is on Zod but not in the OpenAPI; the API does return it.

Pre-flight drift: 39 → 36 (-3).
