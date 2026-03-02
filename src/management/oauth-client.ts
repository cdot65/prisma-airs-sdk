import { DEFAULT_TOKEN_ENDPOINT } from '../constants.js';
import { AISecSDKException, ErrorType } from '../errors.js';
import { OAuthTokenResponseSchema } from '../models/oauth-token.js';

export interface OAuthClientOptions {
  clientId: string;
  clientSecret: string;
  tsgId: string;
  tokenEndpoint?: string;
}

const TOKEN_BUFFER_MS = 30_000; // refresh 30s before expiry

export class OAuthClient {
  public readonly tokenEndpoint: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly tsgId: string;

  private accessToken: string | null = null;
  private expiresAt = 0;
  private pendingFetch: Promise<string> | null = null;

  constructor(opts: OAuthClientOptions) {
    this.clientId = opts.clientId;
    this.clientSecret = opts.clientSecret;
    this.tsgId = opts.tsgId;
    this.tokenEndpoint = opts.tokenEndpoint ?? DEFAULT_TOKEN_ENDPOINT;
  }

  async getToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.expiresAt - TOKEN_BUFFER_MS) {
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

  clearToken(): void {
    this.accessToken = null;
    this.expiresAt = 0;
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
    return this.accessToken;
  }
}
