import { AISecSDKException, ErrorType } from './errors.js';
import { isValidUuid } from './utils.js';

/**
 * @internal
 * Throw `AISecSDKException(USER_REQUEST_PAYLOAD_ERROR)` if `value` is not a valid RFC 4122 UUID.
 */
export function assertUuid(value: string, fieldName: string): void {
  if (!isValidUuid(value)) {
    throw new AISecSDKException(
      `Invalid ${fieldName}: ${value}`,
      ErrorType.USER_REQUEST_PAYLOAD_ERROR,
    );
  }
}

/**
 * @internal
 * Throw `AISecSDKException(USER_REQUEST_PAYLOAD_ERROR)` if `value.length` is outside `[min, max]`.
 */
export function assertLength(value: string, min: number, max: number, fieldName: string): void {
  const len = value.length;
  if (len < min || len > max) {
    throw new AISecSDKException(
      `Invalid ${fieldName}: length ${len} not in [${min}, ${max}]`,
      ErrorType.USER_REQUEST_PAYLOAD_ERROR,
    );
  }
}

/**
 * @internal
 * Throw `AISecSDKException(USER_REQUEST_PAYLOAD_ERROR)` if `value` is neither a UUID nor a
 * workspace slug.
 *
 * AI Gateway workspace endpoints accept **either** form: upstream documents the path parameter as
 * "Workspace UUID. Workspace slug is also accepted for backward compatibility", and a well-formed
 * but unknown slug returns `404` rather than `400`. `assertUuid` is therefore too strict for these
 * paths — it rejects identifiers the API honours.
 *
 * The slug pattern stays deliberately loose (the server owns the real format) but still rejects
 * anything containing `/` or `..`, so an attacker-supplied value cannot reshape a path built by
 * string interpolation.
 */
export function assertWorkspaceRef(value: string, fieldName: string): void {
  if (!isValidUuid(value) && !/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(value)) {
    throw new AISecSDKException(
      `Invalid ${fieldName}: ${value} (expected a workspace UUID or slug)`,
      ErrorType.USER_REQUEST_PAYLOAD_ERROR,
    );
  }
}

/**
 * @internal
 * Throw `AISecSDKException(USER_REQUEST_PAYLOAD_ERROR)` if `value` is not a plain numeric-string
 * id (`/^\d+$/`). Use for identifiers that are numeric but not UUIDs (e.g. AI Gateway's
 * `tsgId`/`organisationId`) — rejects `/` or `..` so the value can't reshape a path built by
 * string interpolation.
 */
export function assertNumericId(value: string, fieldName: string): void {
  if (!/^\d+$/.test(value)) {
    throw new AISecSDKException(
      `Invalid ${fieldName}: ${value}`,
      ErrorType.USER_REQUEST_PAYLOAD_ERROR,
    );
  }
}

/**
 * @internal
 * Throw `AISecSDKException(USER_REQUEST_PAYLOAD_ERROR)` if `value` is not a plausible SCM IAM
 * scope name (`main_airs_workspace_1852583913`, `ws_production_bx7qw0`, ...).
 *
 * Scope names are the path key on `/iam/v1/scopes/{name}`, so this must reject `/`, `..`, `:`
 * and whitespace. The pattern is otherwise loose: the server owns the real format.
 */
export function assertIamScopeName(value: string, fieldName: string): void {
  if (!/^[A-Za-z0-9_][A-Za-z0-9_.-]*$/.test(value)) {
    throw new AISecSDKException(
      `Invalid ${fieldName}: ${value} (expected an IAM scope name such as ws_production_bx7qw0)`,
      ErrorType.USER_REQUEST_PAYLOAD_ERROR,
    );
  }
}
