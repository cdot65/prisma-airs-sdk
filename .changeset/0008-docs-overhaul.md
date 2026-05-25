---
'@cdot65/prisma-airs-sdk': minor
---

Export every client constructor option type (e.g. `ProfilesClientOptions`, `RedTeamScansClientOptions`, `ModelSecurityScansClientOptions`) and `ListingOptions` from the package root, so consumers can fully type custom client construction.

Documentation overhaul: the API reference is now auto-generated with TypeDoc and embedded in the docs site, covering every public method with input/output examples (enforced by a CI coverage gate). Service pages are reworked into concept-first Guides ("how it works" + "get the most out of it"), and a new Developer section documents the architecture, request pipeline, and API-design/versioning policy.
