import { MGMT_API_KEY_PATH, MGMT_API_KEYS_TSG_PATH } from '../constants.js';
import { managementHttpRequest } from './management-http-client.js';
import type { OAuthClient } from './oauth-client.js';
import type { PaginationOptions } from './profiles.js';
import type {
  ApiKey,
  ApiKeyCreateRequest,
  ApiKeyRegenerateRequest,
  ApiKeyListResponse,
  ApiKeyDeleteResponse,
} from '../models/mgmt-api-key.js';

/** @internal */
export interface ApiKeysClientOptions {
  baseUrl: string;
  oauthClient: OAuthClient;
  tsgId: string;
  numRetries: number;
}

/** Client for AIRS API key management operations. */
export class ApiKeysClient {
  private readonly baseUrl: string;
  private readonly oauthClient: OAuthClient;
  private readonly tsgId: string;
  private readonly numRetries: number;

  constructor(opts: ApiKeysClientOptions) {
    this.baseUrl = opts.baseUrl;
    this.oauthClient = opts.oauthClient;
    this.tsgId = opts.tsgId;
    this.numRetries = opts.numRetries;
  }

  /**
   * Create a new API key.
   * @param request - API key creation request.
   * @returns The created API key.
   */
  async create(request: ApiKeyCreateRequest): Promise<ApiKey> {
    const res = await managementHttpRequest<ApiKey>({
      method: 'POST',
      baseUrl: this.baseUrl,
      path: MGMT_API_KEY_PATH,
      body: request,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /**
   * List API keys for the TSG.
   * @param opts - Pagination options.
   * @returns Paginated list of API keys.
   */
  async list(opts?: PaginationOptions): Promise<ApiKeyListResponse> {
    const params: Record<string, string> = {
      offset: String(opts?.offset ?? 0),
      limit: String(opts?.limit ?? 100),
    };

    const res = await managementHttpRequest<ApiKeyListResponse>({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${MGMT_API_KEYS_TSG_PATH}/${this.tsgId}`,
      params,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /**
   * Delete an API key by name.
   * @param apiKeyName - Name of the API key to delete.
   * @param updatedBy - Email of user performing the deletion.
   * @returns Deletion confirmation.
   */
  async delete(apiKeyName: string, updatedBy: string): Promise<ApiKeyDeleteResponse> {
    const res = await managementHttpRequest<ApiKeyDeleteResponse>({
      method: 'DELETE',
      baseUrl: this.baseUrl,
      path: `${MGMT_API_KEY_PATH}/delete/${encodeURIComponent(apiKeyName)}`,
      params: { updated_by: updatedBy },
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /**
   * Regenerate an API key.
   * @param apiKeyId - UUID of the API key to regenerate.
   * @param request - Regeneration request with rotation config.
   * @returns The regenerated API key.
   */
  async regenerate(apiKeyId: string, request: ApiKeyRegenerateRequest): Promise<ApiKey> {
    const res = await managementHttpRequest<ApiKey>({
      method: 'POST',
      baseUrl: this.baseUrl,
      path: `${MGMT_API_KEY_PATH}/regenerate/${encodeURIComponent(apiKeyId)}`,
      body: request,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }
}
