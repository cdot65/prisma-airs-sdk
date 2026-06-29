---
title: Architecture Vocabulary
description: Shared vocabulary for the prisma-airs-sdk codebase — request specs, auth adapters, listings, and the validation error model.
---

# Architecture Vocabulary

Use these terms exactly when discussing the SDK's design — they have specific meanings here.

## Domain concepts

- **Scan** — an AI Runtime Security inspection request. Synchronous scans return a verdict inline;
  asynchronous scans return a receipt and are later queried by scan or report ID.
- **Security profile** — the named or UUID-addressed AIRS runtime policy referenced by scan calls
  and managed through `ManagementClient.profiles`.
- **Custom topic** — a reusable topic guardrails definition managed through `ManagementClient.topics`.
- **DLP resource** — data filtering profiles, data patterns, data profiles, and dictionaries exposed
  under `ManagementClient.dlp`.
- **Model Security scan** — a Model Security data-plane scan for model artifacts and related
  evaluation, file, label, and violation data.
- **Security group / rule instance** — Model Security management objects that configure which
  platform-provided security rules run. Security rules themselves are read-only in the SDK.
- **Target** — an AI Red Teaming management-plane object describing how the service calls the model,
  API, or application under test.
- **Scan job** — an AI Red Teaming data-plane run against a target. Jobs are asynchronous and expose
  statuses such as `QUEUED`, `RUNNING`, `COMPLETED`, and `FAILED`.
- **Custom attack** — a Red Teaming prompt-set workflow for user-authored prompts, CSV uploads, and
  prompt properties.
- **EULA / instance** — Red Teaming management-plane resources for tenant EULA acceptance and
  instance, device, and registry-credential management.

## Architecture concepts

### Request spec

A plain data object describing a single endpoint call: HTTP method, base URL, path, query params, request body, expected response schema, retry budget, and auth adapter. Sub-client methods construct a Request spec and hand it to `request()`.

```ts
interface RequestSpec<TResponse> {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  baseUrl: string;
  path: string;
  params?: Record<string, string | string[]>;
  body?: unknown;
  contentType?: string;
  formData?: FormData;
  responseSchema?: z.ZodType<TResponse, any, any>;
  allowEmptyBody?: boolean;
  numRetries: number;
  auth: AuthAdapter;
}
```

### Auth adapter

The single seam where authentication strategy plugs into the request pipeline. Two implementations exist:

- `OAuthAuth` — fetches OAuth2 bearer tokens, owns 401/403 refresh.
- `ApiKeyAuth` — adds API-key headers and computes HMAC over the request body for the scan service.

```ts
interface AuthAdapter {
  prepare(req: PreparedRequest): Promise<PreparedRequest>;
  onUnauthorized?(res: Response): Promise<boolean>;
}
```

`prepare()` returns the augmented request — typically with auth headers added. Body is read-only by convention; adapters mutate headers, not body. `onUnauthorized()` is called at most once per request after a retryable auth failure; returning `true` triggers a free retry that does not count against the retry budget.

### PreparedRequest

The in-flight request as the auth adapter sees it. The request helper has already serialized the body to JSON and assembled the URL.

```ts
interface PreparedRequest {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: URL;
  headers: Record<string, string>;
  bodyText?: string;
}
```

### Pre-flight check

A build-time script that diffs Zod schemas in `src/models/` against the authoritative OpenAPI specs in `specs/`. Catches schema drift before it reaches the production parsing path. Runs in CI; failures block merge.

### Listing

A paginated, filterable list request for Model Security and Red Team endpoints that use
`skip` / `limit` / `search`. The internal `serializeListing()` helper turns those fields into URL
search params; individual sub-clients add endpoint-specific filters such as `status`,
`target_type`, or `job_type`.

```ts
interface ListingOptions {
  skip?: number;
  limit?: number;
  search?: string;
}
```

Management API list endpoints use `offset` / `limit`, and DLP endpoints use `page` / `size`, so the
SDK documents those separately instead of forcing every service through `ListingOptions`.

### RESPONSE_VALIDATION error

`AISecSDKException` with `ErrorType.RESPONSE_VALIDATION` is thrown when the backend returns a 2xx with a body that does not match the declared response schema (or is not valid JSON). Distinct from `SERVER_SIDE_ERROR` (5xx) and `CLIENT_SIDE_ERROR` (4xx) so callers can route SDK-bug-vs-backend-bug-vs-client-bug differently.
