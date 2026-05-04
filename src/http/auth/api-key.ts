import { BEARER, HEADER_API_KEY, HEADER_AUTH_TOKEN, PAYLOAD_HASH } from '../../constants.js';
import { AISecSDKException, ErrorType } from '../../errors.js';
import { generatePayloadHash } from '../../utils.js';
import type { AuthAdapter, PreparedRequest } from '../types.js';

/** Options for {@link ApiKeyAuth}. At least one of `apiKey` / `apiToken` is required. */
export interface ApiKeyAuthOptions {
  apiKey?: string;
  apiToken?: string;
}

/**
 * @internal
 * Auth adapter for the AIRS scan service. Adds the API-key header, the bearer token header
 * (if configured), and an HMAC-SHA256 payload hash over `bodyText` when both an apiKey and a
 * body are present. Mirrors the behavior of the legacy `src/http-client.ts`.
 */
export class ApiKeyAuth implements AuthAdapter {
  private readonly apiKey?: string;
  private readonly apiToken?: string;

  constructor(opts: ApiKeyAuthOptions) {
    if (!opts.apiKey && !opts.apiToken) {
      throw new AISecSDKException(
        'ApiKeyAuth requires either apiKey or apiToken',
        ErrorType.MISSING_VARIABLE,
      );
    }
    this.apiKey = opts.apiKey;
    this.apiToken = opts.apiToken;
  }

  async prepare(req: PreparedRequest): Promise<PreparedRequest> {
    const headers = { ...req.headers };
    if (this.apiToken) {
      headers[HEADER_AUTH_TOKEN] = `${BEARER}${this.apiToken}`;
    }
    if (this.apiKey) {
      headers[HEADER_API_KEY] = this.apiKey;
      if (req.bodyText !== undefined) {
        headers[PAYLOAD_HASH] = generatePayloadHash(req.bodyText, this.apiKey);
      }
    }
    return { ...req, headers };
  }
}
