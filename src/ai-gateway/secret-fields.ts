/** Stable marker used by SDK and CLI redaction. */
export const AI_GATEWAY_REDACTED = '[REDACTED]' as const;

export type GatewaySecretPathSegment = string | '*';
export type GatewaySecretDirection = 'request' | 'response';

export interface GatewaySecretFieldRule {
  readonly path: readonly GatewaySecretPathSegment[];
  readonly redact: 'value' | 'subtree';
  readonly oneTime?: boolean;
}

export interface GatewaySecretOperationMetadata {
  readonly request: readonly GatewaySecretFieldRule[];
  readonly response: readonly GatewaySecretFieldRule[];
}

const value = (...path: GatewaySecretPathSegment[]): GatewaySecretFieldRule => ({
  path,
  redact: 'value',
});
const subtree = (...path: GatewaySecretPathSegment[]): GatewaySecretFieldRule => ({
  path,
  redact: 'subtree',
});
const oneTime = (...path: GatewaySecretPathSegment[]): GatewaySecretFieldRule => ({
  path,
  redact: 'value',
  oneTime: true,
});

const providerRequestSecrets = [
  value('key'),
  value('configurations', 'azure_entra_client_secret'),
  value('configurations', 'aws_secret_access_key'),
  subtree('configurations', 'vertex_service_account_json'),
  value('configurations', 'custom_headers', '*'),
] as const;

const mcpRequestSecrets = [
  value('configurations', 'custom_headers', '*'),
  value('configurations', 'client_secret'),
  value('configurations', 'oauth_client_secret'),
  subtree('configurations', 'oauth_metadata'),
] as const;

const empty = [] as const;

/**
 * Operation-scoped secret paths shared by SDK debug logging and structured CLI output.
 * A generic field named `key` is not considered secret without an operation context.
 */
export const AI_GATEWAY_SECRET_FIELDS = {
  'secretReferences.list': { request: empty, response: [subtree('data', '*', 'auth_config')] },
  'secretReferences.create': {
    request: [subtree('auth_config')],
    response: [subtree('auth_config')],
  },
  'secretReferences.get': { request: empty, response: [subtree('auth_config')] },
  'secretReferences.update': {
    request: [subtree('auth_config')],
    response: [subtree('auth_config')],
  },
  'secretReferences.delete': { request: empty, response: [subtree('auth_config')] },
  'apiKeys.createService': { request: empty, response: [oneTime('key')] },
  'apiKeys.createUser': { request: empty, response: [oneTime('key')] },
  'apiKeys.rotateService': { request: empty, response: [oneTime('key')] },
  'apiKeys.rotateUser': { request: empty, response: [oneTime('key')] },
  'deployments.create': {
    request: empty,
    response: [oneTime('client_auth'), oneTime('credentials', 'password')],
  },
  'deployments.update': {
    request: empty,
    response: [oneTime('client_auth'), oneTime('credentials', 'password')],
  },
  'integrations.create': { request: providerRequestSecrets, response: empty },
  'integrations.update': { request: providerRequestSecrets, response: empty },
  'mcpIntegrations.create': { request: mcpRequestSecrets, response: empty },
  'mcpIntegrations.update': { request: mcpRequestSecrets, response: empty },
  'organisations.getAuthSettings': {
    request: empty,
    response: [value('scim_token'), value('data', 'scim_token')],
  },
  'organisations.updateAuthSettings': {
    request: [value('scim_token'), value('auth_settings', 'client_secret')],
    response: [value('scim_token'), value('data', 'scim_token')],
  },
  'plugins.create': { request: [value('credentials', '*')], response: empty },
  'providers.get': {
    request: empty,
    response: [
      value('key'),
      subtree('model_config'),
      subtree('credentials'),
      value('configurations', 'azure_entra_client_secret'),
      value('configurations', 'aws_secret_access_key'),
      subtree('configurations', 'vertex_service_account_json'),
      value('configurations', 'custom_headers', '*'),
    ],
  },
} as const satisfies Record<string, GatewaySecretOperationMetadata>;

export type AIGatewaySecretOperation = keyof typeof AI_GATEWAY_SECRET_FIELDS;

function cloneValue<T>(input: T, seen = new WeakMap<object, unknown>()): T {
  if (typeof input !== 'object' || input === null) return input;
  const cached = seen.get(input);
  if (cached !== undefined) return cached as T;

  const output: unknown[] | Record<string, unknown> = Array.isArray(input) ? [] : {};
  seen.set(input, output);
  if (Array.isArray(input)) {
    for (const item of input) (output as unknown[]).push(cloneValue(item, seen));
  } else {
    for (const [key, item] of Object.entries(input)) {
      Object.defineProperty(output, key, {
        value: cloneValue(item, seen),
        enumerable: true,
        configurable: true,
        writable: true,
      });
    }
  }
  return output as T;
}

function applyRule(
  current: unknown,
  path: readonly GatewaySecretPathSegment[],
  index: number,
): unknown {
  if (index === path.length) return AI_GATEWAY_REDACTED;
  if (typeof current !== 'object' || current === null) return current;

  const segment = path[index];
  if (Array.isArray(current)) {
    if (segment !== '*') return current;
    for (let i = 0; i < current.length; i++) current[i] = applyRule(current[i], path, index + 1);
    return current;
  }

  const record = current as Record<string, unknown>;
  if (segment === '*') {
    for (const key of Object.keys(record)) record[key] = applyRule(record[key], path, index + 1);
  } else if (Object.prototype.hasOwnProperty.call(record, segment)) {
    record[segment] = applyRule(record[segment], path, index + 1);
  }
  return record;
}

/**
 * Return a redacted clone for one AI Gateway operation and payload direction.
 *
 * @example
 * ```ts
 * import { redactAIGatewaySecrets } from '@cdot65/prisma-airs-sdk';
 *
 * const safe = redactAIGatewaySecrets('integrations.create', {
 *   key: 'provider-secret',
 *   configurations: { vertex_region: 'us-central1' },
 * });
 * // safe.key === '[REDACTED]'
 * ```
 */
export function redactAIGatewaySecrets<T>(
  operation: AIGatewaySecretOperation,
  input: T,
  direction: GatewaySecretDirection = 'request',
): T {
  const output = cloneValue(input);
  const metadata = AI_GATEWAY_SECRET_FIELDS[operation] as GatewaySecretOperationMetadata;
  for (const rule of metadata[direction]) applyRule(output, rule.path, 0);
  return output;
}
