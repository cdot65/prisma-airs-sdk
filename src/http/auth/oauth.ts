import type { OAuthClient } from '../../management/oauth-client.js';
import type { AuthAdapter, PreparedRequest } from '../types.js';

/**
 * @internal
 * Auth adapter that attaches an OAuth2 bearer token via {@link OAuthClient} and clears the cached
 * token on 401/403 to force a refresh on the free-retry attempt.
 */
export class OAuthAuth implements AuthAdapter {
  constructor(private readonly oauthClient: OAuthClient) {}

  async prepare(req: PreparedRequest): Promise<PreparedRequest> {
    const token = await this.oauthClient.getToken();
    return {
      ...req,
      headers: { ...req.headers, Authorization: `Bearer ${token}` },
    };
  }

  async onUnauthorized(res: Response): Promise<boolean> {
    // A verified policy denial will not be repaired by refreshing the same identity.
    // Preserve legacy 403 refresh behavior where the server does not identify the cause.
    if (res.status === 403 && res.headers.get('x-opa-decision') === 'false') return false;
    if (res.status === 401 || res.status === 403) {
      this.oauthClient.clearToken();
      return true;
    }
    return false;
  }
}
