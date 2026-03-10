import { DEFAULT_TOKEN_ENDPOINT } from '../constants.js';
import { AISecSDKException, ErrorType } from '../errors.js';
import { OAuthTokenResponseSchema } from '../models/oauth-token.js';

/** Snapshot of the current token state (never exposes the actual token). */
export interface TokenInfo {
  /** Whether a token has been fetched. */
  hasToken: boolean;
  /** Whether the token is valid (not expired and outside the pre-expiry buffer). */
  isValid: boolean;
  /** Whether the token has passed its expiry time. */
  isExpired: boolean;
  /** Whether the token is within the pre-expiry buffer window. */
  isExpiringSoon: boolean;
  /** Milliseconds until the token expires (0 if expired or no token). */
  expiresInMs: number;
  /** Unix timestamp (ms) when the token expires (0 if no token). */
  expiresAt: number;
}

/** Options for constructing an {@link OAuthClient}. */
export interface OAuthClientOptions {
  /** OAuth2 client ID. */
  clientId: string;
  /** OAuth2 client secret. */
  clientSecret: string;
  /** Tenant Service Group ID. */
  tsgId: string;
  /** OAuth2 token endpoint URL. Defaults to Palo Alto Networks auth endpoint. */
  tokenEndpoint?: string;
  /** Pre-expiry buffer in ms. Token refreshes this many ms before expiry. Defaults to 30000 (30s). */
  tokenBufferMs?: number;
  /** Callback invoked after each successful token refresh with current {@link TokenInfo}. */
  onTokenRefresh?: (info: TokenInfo) => void;
}

const DEFAULT_TOKEN_BUFFER_MS = 30_000; // refresh 30s before expiry

/**
 * OAuth2 client_credentials token manager.
 * Caches tokens, refreshes before expiry, and deduplicates concurrent requests.
 */
export class OAuthClient {
  public readonly tokenEndpoint: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly tsgId: string;
  private readonly tokenBufferMs: number;
  private readonly onTokenRefresh?: (info: TokenInfo) => void;

  private accessToken: string | null = null;
  private expiresAt = 0;
  private pendingFetch: Promise<string> | null = null;

  constructor(opts: OAuthClientOptions) {
    this.clientId = opts.clientId;
    this.clientSecret = opts.clientSecret;
    this.tsgId = opts.tsgId;
    this.tokenEndpoint = opts.tokenEndpoint ?? DEFAULT_TOKEN_ENDPOINT;
    this.tokenBufferMs = opts.tokenBufferMs ?? DEFAULT_TOKEN_BUFFER_MS;
    this.onTokenRefresh = opts.onTokenRefresh;
  }

  /**
   * Get a valid access token, refreshing if needed.
   * @returns Bearer access token string.
   */
  async getToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.expiresAt - this.tokenBufferMs) {
      return this.accessToken;
    }

    if (this.pendingFetch) {
      return this.pendingFetch;
    }

    this.pendingFetch = this.fetchToken().finally(() => {
      this.pendingFetch = null;
    });

    return this.pendingFetch;
  }

  /**
   * Clear the cached token, forcing a fresh fetch on next call.
   * @returns Nothing.
   */
  clearToken(): void {
    this.accessToken = null;
    this.expiresAt = 0;
  }

  /**
   * Check if the current token has passed its expiry time. Returns true if no token exists.
   * @returns Whether the token is expired.
   */
  isTokenExpired(): boolean {
    if (!this.accessToken) return true;
    return Date.now() >= this.expiresAt;
  }

  /**
   * Check if the token is within the pre-expiry buffer window.
   * Returns true if no token exists.
   * @param bufferMs - Custom buffer in ms. Defaults to the configured `tokenBufferMs`.
   * @returns Whether the token is expiring soon.
   */
  isTokenExpiringSoon(bufferMs?: number): boolean {
    if (!this.accessToken) return true;
    const buffer = bufferMs ?? this.tokenBufferMs;
    return Date.now() >= this.expiresAt - buffer;
  }

  /**
   * Get a snapshot of the current token state without exposing the actual token value.
   * @returns Current {@link TokenInfo}.
   */
  getTokenInfo(): TokenInfo {
    const now = Date.now();
    const hasToken = this.accessToken !== null;
    const isExpired = !hasToken || now >= this.expiresAt;
    const isExpiringSoon = !hasToken || now >= this.expiresAt - this.tokenBufferMs;
    const expiresInMs = hasToken ? Math.max(0, this.expiresAt - now) : 0;
    return {
      hasToken,
      isValid: hasToken && !isExpiringSoon,
      isExpired,
      isExpiringSoon,
      expiresInMs,
      expiresAt: hasToken ? this.expiresAt : 0,
    };
  }

  private async fetchToken(): Promise<string> {
    const credentials = btoa(`${this.clientId}:${this.clientSecret}`);
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      scope: `tsg_id:${this.tsgId}`,
    });

    let response: Response;
    try {
      response = await fetch(this.tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${credentials}`,
        },
        body: body.toString(),
      });
    } catch (err) {
      throw new AISecSDKException(
        `Token request failed: ${(err as Error).message}`,
        ErrorType.OAUTH_ERROR,
      );
    }

    if (!response.ok) {
      let errorMsg: string;
      try {
        const errorBody = (await response.json()) as Record<string, unknown>;
        errorMsg =
          (errorBody.error_description as string) ??
          (errorBody.error as string) ??
          `Token request failed with status ${response.status}`;
      } catch {
        errorMsg = `Token request failed with status ${response.status}`;
      }
      throw new AISecSDKException(errorMsg, ErrorType.OAUTH_ERROR);
    }

    const data = OAuthTokenResponseSchema.parse(await response.json());
    this.accessToken = data.access_token;
    this.expiresAt = Date.now() + data.expires_in * 1000;

    if (this.onTokenRefresh) {
      try {
        this.onTokenRefresh(this.getTokenInfo());
      } catch {
        // Don't let callback errors block token delivery
      }
    }

    return this.accessToken;
  }
}
