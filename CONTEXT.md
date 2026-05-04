# CONTEXT.md

Architecture vocabulary for the prisma-airs-sdk codebase. Use these terms exactly when discussing design — they have specific meanings here.

## Domain concepts

Reserved for AIRS domain terms (Scan, Profile, Topic, Job, Target, Custom Attack, EULA, Instance, …). Fill in as decisions crystallize.

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
  responseSchema?: z.ZodType<TResponse>;
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

A paginated, filterable list request. Owns serialization of `skip` / `limit` / `search` / `sort` / typed filter args into URL search params, and exposes an `async *` iterator (`listAll`) that walks pages. Each list endpoint declares its filter shape; the module owns wire-format mechanics. Replaces ad-hoc per-client query-string building.

```ts
interface ListingOptions<TFilters = {}> {
  skip?: number;
  limit?: number;
  search?: string;
  sort?: { field: string; order: 'asc' | 'desc' };
  filters?: TFilters;
}
```

### RESPONSE_VALIDATION error

`AISecSDKException` with `ErrorType.RESPONSE_VALIDATION` is thrown when the backend returns a 2xx with a body that does not match the declared response schema (or is not valid JSON). Distinct from `SERVER_SIDE_ERROR` (5xx) and `CLIENT_SIDE_ERROR` (4xx) so callers can route SDK-bug-vs-backend-bug-vs-client-bug differently.
