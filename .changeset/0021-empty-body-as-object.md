---
'@cdot65/prisma-airs-sdk': patch
---

Fix: empty 2xx response bodies now hydrate as `{}` (not `undefined`) before schema validation.

The AIRS API returns no body on some endpoints when there are no results — observed on `/v1/mgmt/scanlogs` queries with zero matches in the requested time range. Before this fix, v0.8.0/v0.8.1 threw `AISecSDKException(RESPONSE_VALIDATION)` with the cryptic `"path": [], "expected": "object", "received": "undefined"` message because `JSON.parse('')` produced `undefined`, which no object schema accepts.

Now `request()` treats an empty body as `{}`. Schemas with all-optional fields (e.g. `PaginatedScanResultsSchema`) parse cleanly to `{}`. Schemas with required fields still fail validation, but on the specific missing-field path rather than the root.

Same class of bug as #134 (`TopicArray.topic` accepting `null`) — both are "API leaves it off" patterns surfaced when v0.8.0 turned runtime `.parse()` on.
