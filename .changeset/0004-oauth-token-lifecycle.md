---
'@cdot65/prisma-airs-sdk': minor
---

Add OAuth token lifecycle management: `isTokenExpired()`, `isTokenExpiringSoon()`, `getTokenInfo()` methods on `OAuthClient`. Configurable pre-expiry buffer via `tokenBufferMs` option. `onTokenRefresh` callback for monitoring. Auto-retry on 403 (expired token) in addition to 401. `OAuthClient`, `OAuthClientOptions`, and `TokenInfo` now exported from public API.
