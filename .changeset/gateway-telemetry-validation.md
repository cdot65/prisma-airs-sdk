---
'@cdot65/prisma-airs-sdk': minor
---

Add semantically verified `traceId` and string-valued `metadata` filters to the SCM request-count chart. Reject invalid telemetry windows, unsupported query options, grouping dimensions/columns and malformed log filters before authentication or network I/O, without including rejected values in errors. Preserve fractional rolling windows and numeric UTC-offset serialization. Other analytics operations remain separately assessed; the upstream snake-case `trace_id` query is not supported because SCM ignores it.
