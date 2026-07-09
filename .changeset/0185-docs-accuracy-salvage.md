---
'@cdot65/prisma-airs-sdk': patch
---

Docs accuracy fixes: correct the Scan API auth description (API key HMAC and/or bearer token; lowercase `x-pan-token` / `x-payload-hash` headers), fill in the OAuth `TOKEN_ENDPOINT` defaults and EU regional endpoint overrides, replace the fictional `ListingOptions` (`sort`/`filters`) with the real per-service pagination contracts (Management `offset/limit`, Model Security / Red Team `skip/limit/search`, DLP `page/size`), fix Red Team examples (enum casing, `updatePrompt` uses `prompt` not `content`, valid `goal_type`), flesh out the developer vocabulary, and add a Runnable Examples guide page.
