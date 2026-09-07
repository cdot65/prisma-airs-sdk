---
'@cdot65/prisma-airs-sdk': minor
---

- Complete the 149-operation AIRS contract inventory with typed nested schemas, strict request validation, missing Model Security custom-rule and Red Team capabilities, and documented live compatibility corrections.
- Add SCM gateway MCP server, usage/rate policy and log-export clients; maintain a complete Portkey compatibility ledger and explicitly mark unverified operations.
- Bound authentication, transport and response reads with disposable deadlines; preserve cancellation, prevent duplicate authentication retries on OPA denials, reject non-finite JSON numbers, redact credentials and make debug bodies opt-in.
- Add frozen OpenAPI transport/validation gates, live-response regressions, CLI compatibility checks, and reproducible E2E reports. Keep the existing CLI's public request-builder types compatible while validating completed wire requests.
- Fix the existing topic force-delete entry point used by the CLI to use the documented `/topic/{id}/force` route. An acting user is required at runtime; the optional legacy TypeScript argument remains source-compatible.

Behavior changes: requests with invalid declared enums, bounds, required fields or non-finite numbers now fail locally before authentication; default per-attempt timeout is 60 seconds; body logging requires a second explicit opt-in. Runtime inference is described in the separate gateway-runtime-inference changeset; no CLI dependency update is included in this SDK changeset.
