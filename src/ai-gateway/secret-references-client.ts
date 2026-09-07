import { queryParams } from '../http/query.js';
import { request } from '../http/request.js';
import { gatewayPathSegment } from './runtime-wire.js';
import { assertLength } from '../validators.js';
import type { AIGatewaySubClientOptions } from './types.js';
import {
  type GatewaySecretReferencesClientListOptions,
  GatewaySecretReferencesClientListOptionsSchema,
  type GatewaySecretReferencesClientListResponse,
  GatewaySecretReferencesClientListResponseSchema,
  type GatewaySecretReferencesClientCreateRequest,
  GatewaySecretReferencesClientCreateRequestSchema,
  type GatewaySecretReferencesClientCreateResponse,
  GatewaySecretReferencesClientCreateResponseSchema,
  type GatewaySecretReferencesClientGetResponse,
  GatewaySecretReferencesClientGetResponseSchema,
  type GatewaySecretReferencesClientUpdateRequest,
  GatewaySecretReferencesClientUpdateRequestSchema,
  type GatewaySecretReferencesClientUpdateResponse,
  GatewaySecretReferencesClientUpdateResponseSchema,
  type GatewaySecretReferencesClientDeleteResponse,
  GatewaySecretReferencesClientDeleteResponseSchema,
} from '../models/ai-gateway-extensions.js';

/** Organisation-level secret-reference CRUD on the SCM admin plane. Never resolves an external secret.
 * @example `const client = new AIGatewayClient().secretReferences;`
 */
export class AIGatewaySecretReferencesClient {
  constructor(private readonly options: AIGatewaySubClientOptions) {}

  /** List All Secret References.
   * Verified on an isolated SCM fixture, 2026-09-06.
   * @example `await gw.secretReferences.list({});`
   */
  async list(
    opts: GatewaySecretReferencesClientListOptions = {},
  ): Promise<GatewaySecretReferencesClientListResponse> {
    return request({
      method: 'GET',
      baseUrl: this.options.baseUrl,
      path: `/secret-references`,
      params: queryParams(opts, GatewaySecretReferencesClientListOptionsSchema),
      responseSchema: GatewaySecretReferencesClientListResponseSchema,
      auth: this.options.auth,
      numRetries: this.options.numRetries,
      omitDebugBody: true,
    });
  }

  /** Create a Secret Reference.
   * Verified on an isolated SCM fixture, 2026-09-06.
   * @example `await gw.secretReferences.create(body);`
   */
  async create(
    body: GatewaySecretReferencesClientCreateRequest,
  ): Promise<GatewaySecretReferencesClientCreateResponse> {
    return request({
      method: 'POST',
      baseUrl: this.options.baseUrl,
      path: `/secret-references`,
      body,
      requestSchema: GatewaySecretReferencesClientCreateRequestSchema,
      responseSchema: GatewaySecretReferencesClientCreateResponseSchema,
      auth: this.options.auth,
      numRetries: this.options.numRetries,
      omitDebugBody: true,
    });
  }

  /** Get a Secret Reference.
   * Verified on an isolated SCM fixture, 2026-09-06.
   * @example `await gw.secretReferences.get('resource-id');`
   */
  async get(secretReferenceId: string): Promise<GatewaySecretReferencesClientGetResponse> {
    assertLength(secretReferenceId, 1, 512, 'secretReferenceId');
    return request({
      method: 'GET',
      baseUrl: this.options.baseUrl,
      path: `/secret-references/${gatewayPathSegment(secretReferenceId)}`,
      responseSchema: GatewaySecretReferencesClientGetResponseSchema,
      auth: this.options.auth,
      numRetries: this.options.numRetries,
      omitDebugBody: true,
    });
  }

  /** Update a Secret Reference.
   * Verified on an isolated SCM fixture, 2026-09-06.
   * @example `await gw.secretReferences.update('resource-id', body);`
   */
  async update(
    secretReferenceId: string,
    body: GatewaySecretReferencesClientUpdateRequest,
  ): Promise<GatewaySecretReferencesClientUpdateResponse> {
    assertLength(secretReferenceId, 1, 512, 'secretReferenceId');
    return request({
      method: 'PUT',
      baseUrl: this.options.baseUrl,
      path: `/secret-references/${gatewayPathSegment(secretReferenceId)}`,
      body,
      requestSchema: GatewaySecretReferencesClientUpdateRequestSchema,
      responseSchema: GatewaySecretReferencesClientUpdateResponseSchema,
      auth: this.options.auth,
      numRetries: this.options.numRetries,
      omitDebugBody: true,
    });
  }

  /** Delete a Secret Reference.
   * Verified on an isolated SCM fixture, 2026-09-06.
   * @example `await gw.secretReferences.delete('resource-id');`
   */
  async delete(secretReferenceId: string): Promise<GatewaySecretReferencesClientDeleteResponse> {
    assertLength(secretReferenceId, 1, 512, 'secretReferenceId');
    return request({
      method: 'DELETE',
      baseUrl: this.options.baseUrl,
      path: `/secret-references/${gatewayPathSegment(secretReferenceId)}`,
      responseSchema: GatewaySecretReferencesClientDeleteResponseSchema,
      auth: this.options.auth,
      numRetries: this.options.numRetries,
      omitDebugBody: true,
    });
  }
}
