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
   * @example
   * ```ts
   * import { ManagementClient } from '@cdot65/prisma-airs-sdk';
   * const mgmt = new ManagementClient(); // reads PANW_MGMT_* env vars
   *
   * const key = await mgmt.apiKeys.create({
   *   auth_code: 'ac',
   *   cust_app: 'app1',
   *   revoked: false,
   *   created_by: 'user@example.com',
   *   api_key_name: 'key1',
   *   rotation_time_interval: 90,
   *   rotation_time_unit: 'days',
   * });
   * // key =>
   * // { api_key_id: 'k1', api_key_last8: '12345678', auth_code: 'ac',
   * //   expiration: '2025-12-31', revoked: false }
   * ```
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
   * @example
   * ```ts
   * import { ManagementClient } from '@cdot65/prisma-airs-sdk';
   * const mgmt = new ManagementClient(); // reads PANW_MGMT_* env vars
   *
   * const page = await mgmt.apiKeys.list({ offset: 0, limit: 5 });
   * // page =>
   * // { api_keys: [ { api_key_id: 'k1', api_key_last8: '12345678',
   * //     auth_code: 'ac', expiration: '2025-12-31', revoked: false } ], next_offset: 10 }
   * ```
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
   * @example
   * ```ts
   * import { ManagementClient } from '@cdot65/prisma-airs-sdk';
   * const mgmt = new ManagementClient(); // reads PANW_MGMT_* env vars
   *
   * const result = await mgmt.apiKeys.delete('key1', 'user@example.com');
   * // result => { message: 'deleted' }
   * ```
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
   * @example
   * ```ts
   * import { ManagementClient } from '@cdot65/prisma-airs-sdk';
   * const mgmt = new ManagementClient(); // reads PANW_MGMT_* env vars
   *
   * const key = await mgmt.apiKeys.regenerate('k1', {
   *   rotation_time_interval: 30,
   *   rotation_time_unit: 'days',
   * });
   * // key =>
   * // { api_key_id: 'k1', api_key_last8: '87654321', auth_code: 'ac',
   * //   expiration: '2026-06-30', revoked: false }
   * ```
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
