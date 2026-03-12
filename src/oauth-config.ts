import { OAuthClient } from './management/oauth-client.js';
import { AISecSDKException, ErrorType } from './errors.js';
import { MAX_NUMBER_OF_RETRIES } from './constants.js';
import type { TokenInfo } from './management/oauth-client.js';

/** Resolved OAuth service configuration returned by {@link resolveOAuthConfig}. */
export interface OAuthServiceConfig {
  /** Resolved API base URL. */
  baseUrl: string;
  /** Configured OAuth2 token manager. */
  oauthClient: OAuthClient;
  /** Clamped retry count. */
  numRetries: number;
  /** Resolved Tenant Service Group ID. */
  tsgId: string;
}

/** Options for {@link resolveOAuthConfig}. */
export interface ResolveOAuthConfigOptions {
  clientId?: string;
  clientSecret?: string;
  tsgId?: string;
  baseUrl: string;
  numRetries?: number;
  tokenEndpoint?: string;
  tokenBufferMs?: number;
  onTokenRefresh?: (info: TokenInfo) => void;
  /** Primary env var prefix, e.g. `'PANW_RED_TEAM'`. */
  primaryEnvPrefix: string;
  /** Optional fallback prefix (typically `'PANW_MGMT'`). */
  fallbackEnvPrefix?: string;
}

/**
 * Resolve OAuth2 credentials from options → primary env vars → fallback env vars,
 * validate presence, clamp retries, and create an {@link OAuthClient}.
 *
 * @param opts - Resolution options.
 * @returns Resolved config with baseUrl, oauthClient, and numRetries.
 * @throws {AISecSDKException} When required credentials are missing.
 * @internal
 */
export function resolveOAuthConfig(opts: ResolveOAuthConfigOptions): OAuthServiceConfig {
  const { primaryEnvPrefix, fallbackEnvPrefix } = opts;

  const clientId =
    opts.clientId ??
    process.env[`${primaryEnvPrefix}_CLIENT_ID`] ??
    (fallbackEnvPrefix ? process.env[`${fallbackEnvPrefix}_CLIENT_ID`] : undefined);

  const clientSecret =
    opts.clientSecret ??
    process.env[`${primaryEnvPrefix}_CLIENT_SECRET`] ??
    (fallbackEnvPrefix ? process.env[`${fallbackEnvPrefix}_CLIENT_SECRET`] : undefined);

  const tsgId =
    opts.tsgId ??
    process.env[`${primaryEnvPrefix}_TSG_ID`] ??
    (fallbackEnvPrefix ? process.env[`${fallbackEnvPrefix}_TSG_ID`] : undefined);

  const tokenEndpoint =
    opts.tokenEndpoint ??
    process.env[`${primaryEnvPrefix}_TOKEN_ENDPOINT`] ??
    (fallbackEnvPrefix ? process.env[`${fallbackEnvPrefix}_TOKEN_ENDPOINT`] : undefined);

  const numRetries = Math.min(
    Math.max(opts.numRetries ?? MAX_NUMBER_OF_RETRIES, 0),
    MAX_NUMBER_OF_RETRIES,
  );

  const envHint = fallbackEnvPrefix
    ? `${primaryEnvPrefix}_CLIENT_ID / ${fallbackEnvPrefix}_CLIENT_ID`
    : `${primaryEnvPrefix}_CLIENT_ID`;

  if (!clientId) {
    throw new AISecSDKException(
      `clientId is required (option or ${envHint} env var)`,
      ErrorType.MISSING_VARIABLE,
    );
  }

  const secretHint = fallbackEnvPrefix
    ? `${primaryEnvPrefix}_CLIENT_SECRET / ${fallbackEnvPrefix}_CLIENT_SECRET`
    : `${primaryEnvPrefix}_CLIENT_SECRET`;

  if (!clientSecret) {
    throw new AISecSDKException(
      `clientSecret is required (option or ${secretHint} env var)`,
      ErrorType.MISSING_VARIABLE,
    );
  }

  const tsgHint = fallbackEnvPrefix
    ? `${primaryEnvPrefix}_TSG_ID / ${fallbackEnvPrefix}_TSG_ID`
    : `${primaryEnvPrefix}_TSG_ID`;

  if (!tsgId) {
    throw new AISecSDKException(
      `tsgId is required (option or ${tsgHint} env var)`,
      ErrorType.MISSING_VARIABLE,
    );
  }

  const oauthClient = new OAuthClient({
    clientId,
    clientSecret,
    tsgId,
    tokenEndpoint,
    tokenBufferMs: opts.tokenBufferMs,
    onTokenRefresh: opts.onTokenRefresh,
  });

  return { baseUrl: opts.baseUrl, oauthClient, numRetries, tsgId };
}
