import { AI_GW_API_KEYS_SERVICE_PATH, AI_GW_API_KEYS_USER_PATH } from '../constants.js';
import { request } from '../http/request.js';
import type { AuthAdapter } from '../http/types.js';
import { assertUuid } from '../validators.js';
import {
  ListApiKeysResponseSchema,
  GatewayWriteResponseSchema,
  GatewayApiKeySchema,
  GatewayApiKeyRotateResponseSchema,
  type ListApiKeysResponse,
  type GatewayWriteResponse,
  type GatewayApiKey,
  type GatewayApiKeyRotateResponse,
} from '../models/ai-gateway.js';
import {
  GatewayApiKeyRotateRequestSchema,
  GatewayApiKeyUpdateRequestSchema,
  GatewayServiceApiKeyCreateRequestSchema,
  GatewayUserApiKeyCreateRequestSchema,
  type GatewayApiKeyRotateRequest,
  type GatewayApiKeyUpdateRequest,
  type GatewayServiceApiKeyCreateRequest,
  type GatewayUserApiKeyCreateRequest,
} from '../models/ai-gateway-requests.js';
import type { RequestSpec } from '../http/types.js';
import type { AIGatewaySubClientOptions, AIGatewayWorkspaceScopedListOptions } from './types.js';

/**
 * Client for AI Gateway API-key operations (data plane).
 *
 * Service and user keys are separate sub-collections; there is no combined `api-keys`
 * endpoint (it is OPA-denied).
 */
export class AIGatewayApiKeysClient {
  private readonly baseUrl: string;
  private readonly auth: AuthAdapter;
  private readonly numRetries: number;

  constructor(opts: AIGatewaySubClientOptions) {
    this.baseUrl = opts.baseUrl;
    this.auth = opts.auth;
    this.numRetries = opts.numRetries;
  }

  /** @internal */
  private listAt(
    path: string,
    opts: AIGatewayWorkspaceScopedListOptions,
  ): Promise<ListApiKeysResponse> {
    assertUuid(opts.workspaceId, 'workspaceId');
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path,
      params: { workspace_id: opts.workspaceId },
      responseSchema: ListApiKeysResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /** @internal */
  private writeAt(
    method: 'POST' | 'PUT',
    path: string,
    body:
      | GatewayServiceApiKeyCreateRequest
      | GatewayUserApiKeyCreateRequest
      | GatewayApiKeyUpdateRequest,
    requestSchema: RequestSpec['requestSchema'],
    secretOperation?: RequestSpec['secretOperation'],
  ): Promise<GatewayWriteResponse> {
    return request({
      method,
      baseUrl: this.baseUrl,
      path,
      body,
      requestSchema,
      secretOperation,
      responseSchema: GatewayWriteResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * List service API keys in a workspace.
   * @param opts - Must include the workspace UUID.
   * @returns Service keys; the secret itself is only ever returned at creation.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * const keys = await gw.apiKeys.listService({ workspaceId: '16f7e90d-382a-4e78-b577-1b01eb5f8297' });
   * // keys.total => 1
   * ```
   */
  async listService(opts: AIGatewayWorkspaceScopedListOptions): Promise<ListApiKeysResponse> {
    return this.listAt(AI_GW_API_KEYS_SERVICE_PATH, opts);
  }

  /**
   * List user API keys in a workspace.
   * @param opts - Must include the workspace UUID.
   * @returns User-scoped keys.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * const keys = await gw.apiKeys.listUser({ workspaceId: '16f7e90d-382a-4e78-b577-1b01eb5f8297' });
   * // keys.total => 0
   * ```
   */
  async listUser(opts: AIGatewayWorkspaceScopedListOptions): Promise<ListApiKeysResponse> {
    return this.listAt(AI_GW_API_KEYS_USER_PATH, opts);
  }

  private getAt(path: string, keyId: string): Promise<GatewayApiKey> {
    assertUuid(keyId, 'keyId');
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${path}/${keyId}`,
      responseSchema: GatewayApiKeySchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  private async deleteAt(path: string, keyId: string): Promise<void> {
    assertUuid(keyId, 'keyId');
    await request({
      method: 'DELETE',
      baseUrl: this.baseUrl,
      path: `${path}/${keyId}`,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  private rotateAt(
    path: string,
    keyId: string,
    body: GatewayApiKeyRotateRequest,
    secretOperation: 'apiKeys.rotateService' | 'apiKeys.rotateUser',
  ): Promise<GatewayApiKeyRotateResponse> {
    assertUuid(keyId, 'keyId');
    return request({
      method: 'POST',
      baseUrl: this.baseUrl,
      path: `${path}/${keyId}/rotate`,
      body,
      requestSchema: GatewayApiKeyRotateRequestSchema,
      secretOperation,
      responseSchema: GatewayApiKeyRotateResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /** Get a service key. @example `await gw.apiKeys.getService(keyId);` */
  async getService(keyId: string): Promise<GatewayApiKey> {
    return this.getAt(AI_GW_API_KEYS_SERVICE_PATH, keyId);
  }
  /** Get a user key. @example `await gw.apiKeys.getUser(keyId);` */
  async getUser(keyId: string): Promise<GatewayApiKey> {
    return this.getAt(AI_GW_API_KEYS_USER_PATH, keyId);
  }
  /** Permanently delete a service key. @example `await gw.apiKeys.deleteService(keyId);` */
  async deleteService(keyId: string): Promise<void> {
    return this.deleteAt(AI_GW_API_KEYS_SERVICE_PATH, keyId);
  }
  /** Permanently delete a user key. @example `await gw.apiKeys.deleteUser(keyId);` */
  async deleteUser(keyId: string): Promise<void> {
    return this.deleteAt(AI_GW_API_KEYS_USER_PATH, keyId);
  }
  /** Rotate a service key; capture the returned secret. @example `const rotated = await gw.apiKeys.rotateService(keyId);` */
  async rotateService(
    keyId: string,
    body: GatewayApiKeyRotateRequest = {},
  ): Promise<GatewayApiKeyRotateResponse> {
    return this.rotateAt(AI_GW_API_KEYS_SERVICE_PATH, keyId, body, 'apiKeys.rotateService');
  }
  /** Rotate a user key; capture the returned secret. @example `const rotated = await gw.apiKeys.rotateUser(keyId);` */
  async rotateUser(
    keyId: string,
    body: GatewayApiKeyRotateRequest = {},
  ): Promise<GatewayApiKeyRotateResponse> {
    return this.rotateAt(AI_GW_API_KEYS_USER_PATH, keyId, body, 'apiKeys.rotateUser');
  }

  /**
   * Create a service API key.
   * @param body - Name, scopes, TSG, workspace UUID, and type.
   * @returns The raw create response — the only place the key secret appears. Capture it.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * await gw.apiKeys.createService({
   *   name: 'ci-runner',
   *   scopes: ['completions.write', 'logs.write'],
   *   organisation_id: '1852583913',
   *   workspace_id: '16f7e90d-382a-4e78-b577-1b01eb5f8297',
   *   type: 'workspace',
   * });
   * ```
   */
  async createService(body: GatewayServiceApiKeyCreateRequest): Promise<GatewayWriteResponse> {
    return this.writeAt(
      'POST',
      AI_GW_API_KEYS_SERVICE_PATH,
      body,
      GatewayServiceApiKeyCreateRequestSchema,
      'apiKeys.createService',
    );
  }

  /**
   * Create a user API key.
   * @param body - As {@link createService}, plus `user_id`.
   * @returns The raw create response — the only place the key secret appears. Capture it.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * await gw.apiKeys.createUser({
   *   name: 'calvin-laptop',
   *   scopes: ['completions.write'],
   *   organisation_id: '1852583913',
   *   workspace_id: '16f7e90d-382a-4e78-b577-1b01eb5f8297',
   *   type: 'workspace',
   *   user_id: 'fad91538-65a9-41f7-8b9c-6e4c0e8b9c5f',
   * });
   * ```
   */
  async createUser(body: GatewayUserApiKeyCreateRequest): Promise<GatewayWriteResponse> {
    return this.writeAt(
      'POST',
      AI_GW_API_KEYS_USER_PATH,
      body,
      GatewayUserApiKeyCreateRequestSchema,
      'apiKeys.createUser',
    );
  }

  /**
   * Update a service API key.
   * @param keyId - Key UUID.
   * @param body - One or more fields to update.
   * @returns The raw update response. Shape unverified against a live tenant — see the PRD.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * await gw.apiKeys.updateService('11111111-1111-4111-8111-111111111111', {
   *   name: 'ci-runner',
   *   scopes: ['completions.write'],
   *   organisation_id: '1852583913',
   *   workspace_id: '16f7e90d-382a-4e78-b577-1b01eb5f8297',
   *   type: 'workspace',
   * });
   * ```
   */
  async updateService(
    keyId: string,
    body: GatewayApiKeyUpdateRequest,
  ): Promise<GatewayWriteResponse> {
    assertUuid(keyId, 'keyId');
    return this.writeAt(
      'PUT',
      `${AI_GW_API_KEYS_SERVICE_PATH}/${keyId}`,
      body,
      GatewayApiKeyUpdateRequestSchema,
    );
  }

  /**
   * Update a user API key.
   * @param keyId - Key UUID.
   * @param body - One or more fields to update.
   * @returns The raw update response. Shape unverified against a live tenant — see the PRD.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * await gw.apiKeys.updateUser('11111111-1111-4111-8111-111111111111', {
   *   name: 'calvin-laptop',
   *   scopes: ['completions.write'],
   *   organisation_id: '1852583913',
   *   workspace_id: '16f7e90d-382a-4e78-b577-1b01eb5f8297',
   *   type: 'workspace',
   *   user_id: 'fad91538-65a9-41f7-8b9c-6e4c0e8b9c5f',
   * });
   * ```
   */
  async updateUser(keyId: string, body: GatewayApiKeyUpdateRequest): Promise<GatewayWriteResponse> {
    assertUuid(keyId, 'keyId');
    return this.writeAt(
      'PUT',
      `${AI_GW_API_KEYS_USER_PATH}/${keyId}`,
      body,
      GatewayApiKeyUpdateRequestSchema,
    );
  }
}
