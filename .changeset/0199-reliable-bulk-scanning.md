---
'@cdot65/prisma-airs-sdk': patch
---

Make AIRS bulk scanning safer and easier to correlate. Every `Scanner` operation now accepts an
optional per-call `numRetries` override, while omitted options retain the global retry behavior.
`AISecSDKException` exposes HTTP-versus-network failure metadata, the transport status, and
normalized `Retry-After` guidance. Prompt detection explicitly types `source_code`, and the async
documentation now describes scan/report fan-out and `(scan_id, req_id)` / `(report_id, req_id)`
correlation. Existing calls and exception message formatting remain unchanged.
