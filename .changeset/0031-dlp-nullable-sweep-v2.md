---
'@cdot65/prisma-airs-sdk': patch
---

Extend nullable sweep to nested DLP helper schemas. v0.9.1 covered top-level Response fields but missed inner helpers — live API still returned `null` on nested fields and failed Zod. Now `.nullish()` across `DataPatternMatchingRulesSchema`, `ExpressionTreeNodeSchema` (recursive), `DetectionRuleItemSchema`, exclusion/exception helpers on `DataFilteringProfileResponseSchema`, and dictionary metadata/tags/extension helpers.
