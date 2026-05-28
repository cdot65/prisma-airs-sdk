# Architecture & Internals

This page explains **how** the Prisma AIRS TypeScript SDK works under the hood: the service
domains it covers, the two authentication strategies, the single request pipeline every client
shares, and the validation and error models that hold it all together.

!!! tip "Looking for the symbol-level docs?"
    The TypeDoc-generated [Full API reference](../reference/api/index.md) documents every exported
    class, function, type, and Zod schema. This page covers the design _behind_ those symbols.

The SDK has **zero external HTTP dependencies** — it is built on the runtime's native `fetch` and
`crypto`, with `zod` as the only production dependency.

## Service domains and auth methods

The SDK covers four service domains. They split across exactly two authentication methods:

| Domain         | Entry point           | Auth                      | Base URL constant               |
| -------------- | --------------------- | ------------------------- | ------------------------------- |
| Scan API       | `init()` + `Scanner`  | API key (HMAC-SHA256)     | `DEFAULT_ENDPOINT`              |
| Management API | `ManagementClient`    | OAuth2 client_credentials | `DEFAULT_MGMT_ENDPOINT` (+ DLP) |
| Model Security | `ModelSecurityClient` | OAuth2 client_credentials | `DEFAULT_MODEL_SEC_*_ENDPOINT`  |
| Red Team       | `RedTeamClient`       | OAuth2 client_credentials | `DEFAULT_RED_TEAM_*_ENDPOINT`   |

Only the scan service uses the API key. Everything else (management CRUD, DLP, model security, red
teaming) authenticates with OAuth2 client_credentials. The Management client additionally talks to a
separate DLP base URL (`DEFAULT_DLP_ENDPOINT`) reusing the same OAuth credentials.

All endpoint paths, base URLs, content/batch limits, header names, and retry config live in one
place: [`src/constants.ts`](../reference/api/index.md). A few load-bearing values:

```ts
export const MAX_NUMBER_OF_RETRIES = 5;
export const HTTP_FORCE_RETRY_STATUS_CODES = [500, 502, 503, 504];
export const MAX_NUMBER_OF_BATCH_SCAN_OBJECTS = 5; // batch ops cap at 5 items
export const MAX_CONTENT_PROMPT_LENGTH = 2 * 1024 * 1024; // 2 MB
```

## The unified `request()` pipeline

Every client in every domain — regardless of auth method — ultimately calls one internal helper,
`request()` in `src/http/request.ts`. Sub-clients never touch `fetch` directly. They build a
declarative `RequestSpec` and hand it off:

```ts
// src/management/profiles.ts (representative)
async create(body: CreateSecurityProfileRequest): Promise<SecurityProfile> {
  return request({
    method: 'POST',
    baseUrl: this.baseUrl,
    path: MGMT_PROFILE_PATH,
    body,
    responseSchema: SecurityProfileSchema,
    auth: this.auth,        // ApiKeyAuth or OAuthAuth
    numRetries: this.numRetries,
  });
}
```

A `RequestSpec` (see `src/http/types.ts`) is a plain description of one call: `method`, `baseUrl`,
`path`, optional `params` / `body` / `formData` / `contentType`, an optional `responseSchema`, the
`numRetries` budget, and an `auth` adapter. The pipeline does the rest.

### The stages

```mermaid
flowchart TD
    A[RequestSpec] --> B[Strip trailing slash;<br/>build URL + query params]
    B --> C[Set User-Agent;<br/>serialize body to JSON or FormData]
    C --> D[auth.prepare:<br/>inject auth headers]
    D --> E[fetch]
    E --> F{response.ok?}
    F -- yes --> G[read body text]
    F -- "401/403" --> H[auth.onUnauthorized?]
    H -- true --> I[free retry<br/>does NOT consume budget]
    I --> D
    H -- false --> K[throw CLIENT_SIDE_ERROR]
    F -- "5xx, retryable" --> J[backoff + jitter sleep,<br/>retry within budget]
    J --> D
    F -- "4xx non-retryable" --> K
    G --> L{responseSchema set?}
    L -- no --> M[return undefined]
    L -- yes --> N[hydrate empty body to {}]
    N --> O[safeParse with Zod]
    O -- fail --> P[throw RESPONSE_VALIDATION]
    O -- ok --> Q[return typed data]
```

Walking it explicitly:

1. **Build URL.** The base URL is right-trimmed of trailing slashes, then joined with `path`. Query
   `params` are appended; array values append once per element (`?id=a&id=b`).
2. **Build headers + body.** A `User-Agent` of `PAN-AIRS/<version>-typescript-sdk` is always set,
   along with `service-name: api` on every outgoing request — the header is optional in the AIRS
   spec but required by some tenants' downstream services (notably DLP `GET /v2/api/data-patterns/{id}`
   and `/v2/api/data-profiles/{id}`, which 400 without it). Sending it unconditionally avoids a
   per-endpoint workaround. If `formData` is present it is sent as-is (the runtime writes the
   multipart boundary). Otherwise a `body` is JSON-stringified with `Content-Type: application/json`
   — overridable via `contentType` (DLP endpoints use `application/merge-patch+json`).
3. **Auth.** The `auth.prepare()` adapter mutates the prepared headers (see below).
4. **Fetch with retry.** The whole attempt runs inside `executeWithRetry` (`src/http-retry.ts`).
5. **Validate.** On success, the body text is read once. If no `responseSchema` was declared,
   `request()` returns `undefined`. Otherwise the body is parsed and validated (next section).

!!! note "Empty bodies are hydrated to `{}`"
    The AIRS API sometimes returns an empty 2xx body when an endpoint has zero results (e.g.
    `/v1/mgmt/scanlogs` with no logs in range). `request()` hydrates an empty body to `{}` before
    validation, so all-optional schemas parse cleanly and required-field failures surface on a
    specific path rather than a cryptic root error. Endpoints that legitimately return 200+body or
    204+no-body (e.g. DLP dictionaries `PUT`) set `allowEmptyBody`, which resolves an empty body to
    `undefined` and skips validation entirely.

## The AuthAdapter abstraction

Authentication is a single plug-point. Both strategies implement the `AuthAdapter` interface from
`src/http/types.ts`:

```ts
interface AuthAdapter {
  prepare(req: PreparedRequest): Promise<PreparedRequest>;
  onUnauthorized?(res: Response): Promise<boolean>;
}
```

`prepare()` augments outgoing requests — by convention it mutates headers, not the body.
`onUnauthorized()` is optional and is called **at most once per request** after a retryable auth
failure; returning `true` triggers a free retry that does not consume the retry budget.

### `ApiKeyAuth` — scan service (HMAC-SHA256)

`src/http/auth/api-key.ts` adds the `x-pan-token` API key header and, optionally, the bearer
`Authorization` header. Its distinguishing behavior: when **both** an `apiKey` and a request body
are present, it computes an HMAC-SHA256 payload hash over `bodyText` (keyed with the API key) and
sets it as the `x-payload-hash` header. This is why the body is serialized to `bodyText` _before_
the adapter runs. `ApiKeyAuth` has no `onUnauthorized` — API key auth has nothing to refresh.

### `OAuthAuth` — everything else (bearer)

`src/http/auth/oauth.ts` wraps an `OAuthClient`. Its `prepare()` calls `oauthClient.getToken()` and
sets `Authorization: Bearer <token>`. Its `onUnauthorized()` clears the cached token on a 401/403
and returns `true`, so the free retry fetches a fresh token. This means an expired-token round trip
self-heals in a single transparent retry.

## OAuth2 token lifecycle

`OAuthClient` (`src/management/oauth-client.ts`) is the OAuth2 client_credentials token manager. It
is responsible for three things:

- **Caching.** A token is reused while `Date.now() < expiresAt - tokenBufferMs`. The default buffer
  is 30s, so the client refreshes ~30 seconds before actual expiry rather than racing it.
- **Refresh.** When the token is missing or within the buffer window, it fetches a new one by
  POSTing `grant_type=client_credentials&scope=tsg_id:<tsgId>` with HTTP Basic credentials
  (`btoa(clientId:clientSecret)`) to the token endpoint. The response is validated by
  `OAuthTokenResponseSchema`.
- **Deduplication.** Concurrent `getToken()` calls share a single in-flight `pendingFetch` promise,
  so a burst of parallel requests triggers exactly one token fetch, not N.

It never exposes the raw token through its inspection API. `getTokenInfo()` returns a `TokenInfo`
snapshot (`hasToken`, `isValid`, `isExpired`, `isExpiringSoon`, `expiresInMs`, `expiresAt`), and an
optional `onTokenRefresh` callback fires after each successful refresh. Token-fetch failures throw
`AISecSDKException` with `ErrorType.OAUTH_ERROR`.

## Shared listing / pagination

Every list endpoint across the OAuth domains accepts the same base options, defined once in
`src/listing.ts`:

```ts
interface ListingOptions {
  skip?: number;
  limit?: number;
  search?: string;
}
```

The internal `serializeListing()` helper turns those into a string-keyed params record. Sub-clients
extend `ListingOptions` with endpoint-specific filters and merge their own params on top of the
serialized base — keeping pagination semantics uniform while allowing per-endpoint filtering.

## Validation strategy: Zod with `.passthrough()`

Validation happens at three distinct boundaries:

- **Content / setters** validate user-supplied values eagerly (e.g. content length, ID length).
- **Scanner / client methods** validate arguments before building a request.
- **Zod response schemas** validate every API response inside `request()`.

The models in `src/models/*.ts` are Zod schemas with inferred TypeScript types. Nearly every object
schema ends in `.passthrough()`:

```ts
export const ApiKeySchema = z
  .object({
    api_key_id: z.string(),
    api_key_name: z.string().optional(),
    // ...many more fields
  })
  .passthrough(); // unknown fields pass through instead of being stripped
```

`.passthrough()` is the SDK's forward-compatibility lever: when the API adds a new field, the
response still validates and the new field is preserved on the returned object rather than being
stripped or rejected. The SDK can model the fields it knows about strictly while tolerating server
additions — so an API-side feature rollout does not break installed SDK versions. The trade-offs and
the tooling that keeps these schemas honest (the preflight gate and `audit:live`) are covered in
[API Design & Versioning](api-design-versioning.md).

## Retry and backoff

`executeWithRetry` (`src/http-retry.ts`) is the shared retry engine for the entire pipeline.

- **Retryable statuses:** only `500, 502, 503, 504` (`HTTP_FORCE_RETRY_STATUS_CODES`). Network
  errors (thrown `fetch`) are also retried.
- **Backoff:** full jitter — `Math.floor(Math.random() * (2^attempt * 1000 + 1))` ms. This spreads
  retries from concurrent clients instead of synchronizing them into a thundering herd.
- **Budget:** `numRetries` attempts, configurable `0–5`, default `5`.
- **Auth retries are free.** When `onRetryableFailure` (wired to `auth.onUnauthorized`) handles a
  401/403, the attempt counter is decremented so the token refresh does not consume the retry
  budget. The pipeline guards against loops by retrying auth at most once per request.

Exhausting the budget on a 5xx throws `SERVER_SIDE_ERROR`; a non-retryable 4xx throws
`CLIENT_SIDE_ERROR` immediately, with a human-readable message extracted from the response body
(`error_message` → `message` → `error.message` → fallback).

## The error model

All SDK errors are instances of `AISecSDKException` (`src/errors.ts`), carrying a typed `errorType`
from the `ErrorType` enum:

| `ErrorType`                  | Raised when                                                        |
| ---------------------------- | ------------------------------------------------------------------ |
| `SERVER_SIDE_ERROR`          | 5xx after retries are exhausted                                    |
| `CLIENT_SIDE_ERROR`          | 4xx response, or a network failure                                 |
| `USER_REQUEST_PAYLOAD_ERROR` | Invalid user input (bad UUID, oversized content, bad `numRetries`) |
| `MISSING_VARIABLE`           | A required config value (API key, client ID, …) is absent          |
| `AISEC_SDK_ERROR`            | Internal SDK error                                                 |
| `OAUTH_ERROR`                | OAuth2 token fetch failure                                         |
| `RESPONSE_VALIDATION`        | A 2xx body was invalid JSON or failed its Zod `responseSchema`     |

`RESPONSE_VALIDATION` is the signal that the live API diverged from the SDK's schema — exactly the
class of drift the `audit:live` script is built to catch. See
[Error Handling](error-handling.md) for usage patterns.

## The scan singleton

The scan service is the one exception to the "construct a client" pattern. It uses a global
singleton, `globalConfiguration` in `src/configuration.ts`, configured by the public `init()`
function. `init()` resolves the API key / token / endpoint / retries from explicit options, falling
back to `PANW_AI_SEC_*` environment variables, validates them, and stores them. `Scanner` then reads
this singleton, so `init()` must run before any scan. This singleton is reset between tests; for the
OAuth domains each client owns its own `OAuthClient` instance instead.
