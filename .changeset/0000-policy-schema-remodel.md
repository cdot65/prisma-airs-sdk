---
'@cdot65/prisma-airs-sdk': patch
---

Fix `PolicySchema` and all sub-schemas to match the actual AIRS Management API structure. The policy object is now properly typed with `ai-security-profiles[]` and `dlp-data-profiles[]` arrays and their full nested hierarchy (model-configuration, data-protection, app-protection, model-protection, agent-protection, latency).
