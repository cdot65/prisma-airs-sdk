---
'@cdot65/prisma-airs-sdk': patch
---

Accept plain-string response bodies on management `.delete()` methods. AIRS API returns `Content-Type: application/json` with a JSON-encoded plain-string body (e.g. `"successfully deleted ..."`) for DELETE on profiles, topics, api-keys, customer-apps; SDK now normalizes that to `{ message: <string> }` instead of throwing `AISEC_RESPONSE_VALIDATION`. `customerApps.delete` return type changes from `CustomerApp` to a new `CustomerAppDeleteResponse` (`{ message: string }`) — the prior signature was a fiction since the server never returned a `CustomerApp` on delete. Closes #164, #165, #166, #167.
