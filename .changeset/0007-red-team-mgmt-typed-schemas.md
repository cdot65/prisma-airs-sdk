---
'@cdot65/prisma-airs-sdk': minor
---

Add typed Zod schemas for Red Team management API: multi-turn configs (stateful/stateless), provider-specific connection params (OpenAI, HuggingFace, Databricks, Bedrock), REST/Streaming connection params, typed TargetBackground/AdditionalContext/Metadata fields. Add `validate` query param to targets.create() and targets.update(). Add customAttacks.uploadPromptsCsv() for CSV prompt uploads. Fix CustomPromptSetVersionInfo.stats to use typed PromptSetStatsSchema.
