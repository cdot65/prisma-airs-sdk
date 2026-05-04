import { MGMT_API_KEY_PATH, MGMT_API_KEYS_TSG_PATH } from '../constants.js';
import { request } from '../http/request.js';
import type { AuthAdapter } from '../http/types.js';
import type { PaginationOptions } from './profiles.js';
import {
  ApiKeySchema,
  ApiKeyListResponseSchema,
  ApiKeyDeleteResponseSchema,
  type ApiKey,
  type ApiKeyCreateRequest,
  type ApiKeyRegenerateRequest,
  type ApiKeyListResponse,
  type ApiKeyDeleteResponse,
} from '../models/mgmt-api-key.js';

/** @internal */
export interface ApiKeysClientOptions {
  baseUrl: string;
  auth: AuthAdapter;
  tsgId: string;
  numRetries: number;
}

/** Client for AIRS API key management operations. */
export class ApiKeysClient {
  private readonly baseUrl: string;
  private readonly auth: AuthAdapter;
  private readonly tsgId: string;
  private readonly numRetries: number;

  constructor(opts: ApiKeysClientOptions) {
    this.baseUrl = opts.baseUrl;
    this.auth = opts.auth;
    this.tsgId = opts.tsgId;
    this.numRetries = opts.numRetries;
  }

  /**
   * Create a new API key.
   * @param body - API key creation request.
   * @returns The created API key.
   */
  async create(body: ApiKeyCreateRequest): Promise<ApiKey> {
    return request({
      method: 'POST',
      baseUrl: this.baseUrl,
      path: MGMT_API_KEY_PATH,
      body,
      responseSchema: ApiKeySchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
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

    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${MGMT_API_KEYS_TSG_PATH}/${this.tsgId}`,
      params,
      responseSchema: ApiKeyListResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Delete an API key by name.
   * @param apiKeyName - Name of the API key to delete.
   * @param updatedBy - Email of user performing the deletion.
   * @returns Deletion confirmation.
   */
  async delete(apiKeyName: string, updatedBy: string): Promise<ApiKeyDeleteResponse> {
    return request({
      method: 'DELETE',
      baseUrl: this.baseUrl,
      path: `${MGMT_API_KEY_PATH}/delete/${encodeURIComponent(apiKeyName)}`,
      params: { updated_by: updatedBy },
      responseSchema: ApiKeyDeleteResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Regenerate an API key.
   * @param apiKeyId - UUID of the API key to regenerate.
   * @param body - Regeneration request with rotation config.
   * @returns The regenerated API key.
   */
  async regenerate(apiKeyId: string, body: ApiKeyRegenerateRequest): Promise<ApiKey> {
    return request({
      method: 'POST',
      baseUrl: this.baseUrl,
      path: `${MGMT_API_KEY_PATH}/regenerate/${encodeURIComponent(apiKeyId)}`,
      body,
      responseSchema: ApiKeySchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }
}
