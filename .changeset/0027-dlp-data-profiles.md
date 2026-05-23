---
'@cdot65/prisma-airs-sdk': minor
---

Add DLP Data Profiles subclient (`management.dlp.dataProfiles`) covering list, create, get, replace (PUT), and patch (JSON Merge Patch). No DELETE — the DLP spec does not expose one for data profiles. Adds discriminated `DetectionRule` (`expression_tree` | `multi_profile`), recursive `ExpressionTreeNode`, and a combined `DetectionRuleItem` schema covering all four OpenAPI subtypes.
