// src/models/iam.ts — Zod schemas + types for the SCM IAM scopes API (`/iam/v1/scopes`)
//
// Derived from live traffic, not from an OpenAPI spec (none is published for this API):
//   - GET /iam/v1/scopes and GET /iam/v1/scopes/{name}: verified 2026-09-11 against TSG 1852583913.
//   - POST /iam/v1/scopes and PUT /iam/v1/scopes/{name}: captured from Strata Cloud Manager's own
//     workspace-creation flow on 2026-09-11 (TSG 1001464285).
//
// A scope is keyed by `name`; `id` is `${name}:${tsg_id}` and is not accepted as a path key.

import { z } from 'zod';

const nonEmptyString = z.string().min(1);

/**
 * A resource bound to an IAM scope. For AI Gateway workspaces `resource_type` is `'workspace'`
 * and `resource_id` is the workspace **slug** (`ws-produc-985697`), not its UUID.
 */
export const IamScopeResourceSchema = z
  .object({
    resource_type: z.string(),
    resource_id: z.string(),
    /** Always `[]` in observed traffic; kept as unknown[] so a future shape still parses. */
    metadata: z.array(z.unknown()).optional(),
  })
  .passthrough();
export type IamScopeResource = z.infer<typeof IamScopeResourceSchema>;

/** An SCM IAM scope as returned by list, get, create and update. */
export const IamScopeSchema = z
  .object({
    name: z.string(),
    /** Empty string, not null, when unset. */
    description: z.string(),
    resources: z.array(IamScopeResourceSchema),
    tsg_id: z.string(),
    /** `${name}:${tsg_id}`. Display only — the path key is `name`. */
    id: z.string(),
  })
  .passthrough();
export type IamScope = z.infer<typeof IamScopeSchema>;

/** `GET /iam/v1/scopes` response. Not paginated in observed traffic. */
export const IamScopeListResponseSchema = z
  .object({
    count: z.number(),
    items: z.array(IamScopeSchema),
  })
  .passthrough();
export type IamScopeListResponse = z.infer<typeof IamScopeListResponseSchema>;

/** Resource binding as sent on writes. `metadata` defaults to `[]` on the wire. */
export const IamScopeResourceInputSchema = z
  .object({
    resource_type: nonEmptyString,
    resource_id: nonEmptyString,
    metadata: z.array(z.unknown()).optional(),
  })
  .strict();
export type IamScopeResourceInput = z.infer<typeof IamScopeResourceInputSchema>;

/**
 * `POST /iam/v1/scopes` body. SCM's UI sends `description` and `resources: []` even when empty;
 * the client fills both defaults so callers can pass just `{ name }`.
 */
export const IamScopeCreateRequestSchema = z
  .object({
    name: nonEmptyString,
    description: z.string(),
    resources: z.array(IamScopeResourceInputSchema),
  })
  .strict();
export type IamScopeCreateRequest = z.infer<typeof IamScopeCreateRequestSchema>;

/**
 * `PUT /iam/v1/scopes/{name}` body — a **full replacement**, not a patch. The wire body repeats
 * `name`; the client copies it from the path so callers supply only the mutable fields.
 */
export const IamScopeUpdateRequestSchema = z
  .object({
    name: nonEmptyString,
    description: z.string(),
    resources: z.array(IamScopeResourceInputSchema),
  })
  .strict();
export type IamScopeUpdateRequest = z.infer<typeof IamScopeUpdateRequestSchema>;
