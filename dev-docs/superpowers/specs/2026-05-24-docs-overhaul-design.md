# Developer Documentation Overhaul — Design

**Date:** 2026-05-24
**Status:** Approved (design); pending implementation plan

## Problem

The docs site (mkdocs-material, https://cdot65.github.io/prisma-airs-sdk/) cannot meet the target audience's needs:

- **Audience:** a non-active-developer who must succeed using the SDK frequently, wants every SDK method captured with input + output examples, wants to understand how the product works and how to get the most out of each functional category, plus a separate developer-focused section.
- **Current gaps:**
  - API reference is a hand-typed 1,299-line `docs/reference/api-reference.md` — signature-only, covers a fraction of the surface, drifts the moment a method changes.
  - SDK surface is **32 client classes, ~236 public methods**, with **808 JSDoc blocks** (188 `@param`, 140 `@returns`) already authored in source — but **only 1 `@example` tag**, and none of the JSDoc is surfaced on the site.
  - Only **one** example page exists (API key rotation).
  - No dedicated developer section.

### Baseline rating (current docs): 6/10

| Dimension | Score |
|---|---|
| Visual polish / theme | 8/10 |
| Information architecture | 7/10 |
| Conceptual "how it works" | 6/10 |
| Every method w/ I/O examples | 3/10 |
| Examples / cookbook | 2/10 |
| Dedicated developer section | 1/10 |
| Maintainability / drift risk | 3/10 |

## Decisions (settled during brainstorming)

1. **Toolchain:** Hybrid — keep mkdocs-material for prose; add TypeDoc to auto-generate the API reference from existing JSDoc.
2. **Examples strategy:** Author `@example` JSDoc tags on **all ~236 public methods**, harvested from the existing test fixtures; TypeDoc renders them. Single source of truth, never drifts. (Highest effort, most faithful to the goal.)
3. **Developer section content:** **Architecture & internals** + **API design & versioning** only (not contributor onboarding / extending — the goal is understanding behavior, not contribution).
4. **Integration:** TypeDoc → Markdown via `typedoc-plugin-markdown` → ingested by mkdocs. One site, one Material theme, unified search + nav.

## Target architecture

### Information architecture (nav)

| Tab | Purpose | Audience |
|---|---|---|
| Home | Pitch + orientation (keep, light edit) | everyone |
| Getting Started | Install, Configure, Authentication, Quick Start | new users |
| Guides | "How it works + get the most out of each category." One hub per domain: Scanning, Management, Model Security, Red Team, DLP — concept-first, task-oriented | power user / operator |
| API Reference | TypeDoc-generated. Every class + every method + `@example` I/O. Auto-built. | power user (lookup) |
| Developer | Architecture & internals; API design & versioning | developer |
| About | Release notes, License | everyone |

Moves:
- `docs/services/*.md` → **Guides** (conceptual, enriched; stop being signature lists).
- `docs/reference/api-reference.md` (hand-written) → **retired**, replaced by generated reference.
- `docs/reference/environment-variables.md` → under Getting Started.
- `docs/reference/error-handling.md` → under Developer (or cross-linked from Guides).

### Toolchain

- Add devDeps: `typedoc`, `typedoc-plugin-markdown`.
- `typedoc.json`: entry point `src/index.ts`; markdown plugin; output `docs/reference/api/`; render `@example`; group by module.
- mkdocs nav: add `mkdocs-literate-nav` (or `awesome-pages`) so generated method pages auto-appear — **no manual nav edits when methods are added**.
- npm scripts: `docs:api` (typedoc), `docs:build` (typedoc → mkdocs build), `docs:serve`.
- `docs/reference/api/` is **git-ignored**; regenerated in CI so it is never stale.
- `mkdocs-deploy.yml`: add Node + `npm ci` + `npm run docs:api` before `mkdocs build`.

### `@example` campaign

- Single source of truth: `@example` JSDoc on every public method (~236, 32 classes).
- Harvest realistic inputs + output shapes from the 61 test files (mock request args + mocked responses).
- Each example: minimal client init → call with realistic inputs → returned output shape/values.
- Batched by domain for review: **scan → management (+DLP) → model-security → red-team**. Regenerate + eyeball after each batch.
- **CI/preflight gate:** count public methods vs `@example` tags; **fail if any method lacks one**. Enforces the "every method" promise permanently (consistent with existing preflight-gate culture).

### Developer section (2 pages)

- **Architecture & internals:** unified `request()` helper, `OAuthAuth`/`ApiKeyAuth` adapters, `Listing` module, Zod + `.passthrough()` strategy, retry/backoff (`http-retry.ts`), error model (`AISecSDKException` + `ErrorType`).
- **API design & versioning:** semver policy, breaking-change rules, `.passthrough()` forward-compat philosophy, relationship to upstream Python `pan-aisecurity` SDK + OpenAPI specs, the `preflight` gate + `audit:live`.

## Phased rollout

0. **Toolchain spike:** wire `typedoc-plugin-markdown`, render one module inside mkdocs, confirm unified theme + search.
1. **IA restructure:** new nav, retire hand-written reference, Services → Guides.
2. **`@example` campaign:** 4 domain batches.
3. **Developer section:** 2 pages.
4. **CI wiring + coverage gate:** generate API in CI; fail build on any method missing `@example`.
5. **Enrich Guides:** concepts + "get the most out of it" per domain.

## Success criteria

- Every one of ~236 public methods appears in the generated reference with at least one input/output `@example`, enforced by a CI gate.
- Hand-written `api-reference.md` removed; reference can no longer drift from source.
- One unified Material-themed site with working search across prose + reference.
- Distinct Guides (operator) and Developer sections exist and are populated.
- `mkdocs build` + `typedoc` run cleanly in CI on push to main.

## Open questions

- Generated API: git-ignore vs commit? (Design assumes **ignore + CI-generate**; confirm acceptable for local `mkdocs serve` ergonomics — `docs:serve` will run typedoc first.)
- `@example` gate severity at first rollout: hard-fail immediately, or warn until campaign completes then flip to fail?
- `literate-nav` vs `awesome-pages` for auto-nav — pick during spike.
- Keep `examples/` cookbook section in addition to Guides + per-method `@example`s, or fold examples into Guides?
