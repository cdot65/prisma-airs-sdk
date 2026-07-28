import { TSG_ID_HEADER } from '../../constants.js';
import type { AuthAdapter, PreparedRequest } from '../types.js';

/**
 * @internal
 * Wraps another {@link AuthAdapter} and adds the `x-tsg-id` header that every AI Gateway
 * endpoint requires. Composes over {@link OAuthAuth} so the existing token-refresh
 * free-retry behaviour is preserved unchanged.
 */
export class TsgHeaderAuth implements AuthAdapter {
  constructor(
    private readonly inner: AuthAdapter,
    private readonly tsgId: string,
  ) {}

  async prepare(req: PreparedRequest): Promise<PreparedRequest> {
    const prepared = await this.inner.prepare(req);
    return {
      ...prepared,
      headers: { ...prepared.headers, [TSG_ID_HEADER]: this.tsgId },
    };
  }

  async onUnauthorized(res: Response): Promise<boolean> {
    return (await this.inner.onUnauthorized?.(res)) ?? false;
  }
}
