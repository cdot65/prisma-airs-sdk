---
'@cdot65/prisma-airs-sdk': patch
---

Documentation and release polish for the DLP API coverage milestone. Adds `docs/services/dlp/` with one mkdocs page per subclient (data filtering profiles, data patterns, data profiles, dictionaries), runnable `examples/mgmt-dlp-*.ts` walkthroughs with matching `example:dlp-*` npm scripts, recursive `specs/` traversal in the preflight script (with a whitelist limiting DLP loading to implemented specs), and read-only DLP list probes in `scripts/live-audit.ts`.
