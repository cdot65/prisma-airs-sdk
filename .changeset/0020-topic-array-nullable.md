---
'@cdot65/prisma-airs-sdk': patch
---

Fix: `TopicArraySchema.topic` now accepts `null` (matches live API behavior).

The AIRS API serializes `"topic": null` when an action bucket (allow or block) within a topic guardrail has no topics — common pattern for empty buckets. Before this fix, 0.8.0's runtime Zod validation rejected any profile-list response that included such a bucket, causing `AISecSDKException` with `RESPONSE_VALIDATION` error type instead of returning the parsed profiles.

Type signature change: `TopicArray.topic: TopicObject[]` → `TopicObject[] | null`. Consumers reading this field should handle the null case.

Verified against a live `/v1/mgmt/profiles/tsg` response containing 4 affected profiles.
