---
'@cdot65/prisma-airs-sdk': minor
---

Foundation for DLP (Data Loss Prevention) management APIs: new `management.dlp` namespace targeting `https://api.dlp.paloaltonetworks.com` (overridable via `dlpEndpoint` constructor option; reuses `PANW_MGMT_*` OAuth credentials). Add shared model primitives `AuditResponseSchema`, `pageSchema<T>` (Spring `Page<T>` envelope), and `jsonNullable<T>` (JSON Merge Patch fields). Extend the request pipeline to support `application/merge-patch+json` content-type override and multipart `FormData` bodies. Subclients (DataFilteringProfiles, DataPatterns, Dictionaries, DataProfiles) ship in follow-up releases.
