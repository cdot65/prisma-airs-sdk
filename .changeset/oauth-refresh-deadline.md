---
'@cdot65/prisma-airs-sdk': patch
---

Bound standalone OAuth refreshes with one disposable 30-second deadline across token headers and JSON bodies. Release concurrent waiters and pending-refresh state on timeout even when a transport ignores cancellation; discard late responses without caching tokens or firing refresh callbacks. Preserve successful caching, refresh deduplication and existing HTTP/validation errors.
