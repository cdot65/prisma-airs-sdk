---
'@cdot65/prisma-airs-sdk': minor
---

Add opt-in debug logging of API calls. Set `PANW_AI_SEC_DEBUG=1` (or `true`/`yes`/`on`) to log every HTTP request (method, URL, headers, body) and response (status, duration, body) to `stderr`, across every domain (scan, management, model security, red teaming). Logs once per attempt, so retries and token refreshes are visible.

Access-token header values (`Authorization`, `x-pan-token`) are replaced with a non-reversible `sha256:<prefix>` hash — the raw token is never written, so logs are safe to share while still revealing token rotation. Zero output and zero overhead when the variable is unset.
