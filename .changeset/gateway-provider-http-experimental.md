---
'@cdot65/prisma-airs-sdk': minor
---

Add nine explicitly experimental gateway runtime HTTP methods for images, audio, moderation, reranking and OCR. Validate strict request contracts, preserve binary speech and text/JSON audio response formats, and encode multipart arrays without duplicating existing brackets. Cover the pinned JSON and multipart schemas independently with frozen positive and negative fixtures.

These methods have offline contract coverage, not successful provider certification with the prescribed deployment/model. Live failures remain in the E2E report and do not satisfy the full Portkey acceptance gate. No inference model is selected or substituted by the SDK.
