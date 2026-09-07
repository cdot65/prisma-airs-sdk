import { queryParams } from '../http/query.js';
import { request } from '../http/request.js';
import { gatewayPathSegment } from './runtime-wire.js';
import { assertLength } from '../validators.js';
import type { AIGatewaySubClientOptions } from './types.js';
import {
  type GatewayUsageLimitsClientListOptions,
  GatewayUsageLimitsClientListOptionsSchema,
  type GatewayUsageLimitsClientListResponse,
  GatewayUsageLimitsClientListResponseSchema,
  type GatewayUsageLimitsClientCreateRequest,
  GatewayUsageLimitsClientCreateRequestSchema,
  type GatewayUsageLimitsClientCreateResponse,
  GatewayUsageLimitsClientCreateResponseSchema,
  type GatewayUsageLimitsClientGetOptions,
  GatewayUsageLimitsClientGetOptionsSchema,
  type GatewayUsageLimitsClientGetResponse,
  GatewayUsageLimitsClientGetResponseSchema,
  type GatewayUsageLimitsClientUpdateRequest,
  GatewayUsageLimitsClientUpdateRequestSchema,
  type GatewayUsageLimitsClientUpdateResponse,
  GatewayUsageLimitsClientUpdateResponseSchema,
  type GatewayUsageLimitsClientDeleteResponse,
  GatewayUsageLimitsClientDeleteResponseSchema,
  type GatewayUsageLimitsClientListEntitiesOptions,
  GatewayUsageLimitsClientListEntitiesOptionsSchema,
  type GatewayUsageLimitsClientListEntitiesResponse,
  GatewayUsageLimitsClientListEntitiesResponseSchema,
  type GatewayUsageLimitsClientResetEntityResponse,
  GatewayUsageLimitsClientResetEntityResponseSchema,
} from '../models/ai-gateway-extensions.js';

/** Workspace-scoped usageLimits operations on the SCM data plane.
 * @example `const client = new AIGatewayClient().usageLimits;`
 */
export class AIGatewayUsageLimitsClient {
  constructor(private readonly options: AIGatewaySubClientOptions) {}

  /** List Usage Limits Policies.
   * Verified on an isolated SCM fixture, 2026-09-06.
   * @example `await gw.usageLimits.list({});`
   */
  async list(
    opts: GatewayUsageLimitsClientListOptions = {},
  ): Promise<GatewayUsageLimitsClientListResponse> {
    return request({
      method: 'GET',
      baseUrl: this.options.baseUrl,
      path: `/policies/usage-limits`,
      params: queryParams(opts, GatewayUsageLimitsClientListOptionsSchema),
      responseSchema: GatewayUsageLimitsClientListResponseSchema,
      auth: this.options.auth,
      numRetries: this.options.numRetries,
    });
  }

  /** Create Usage Limits Policy.
   * Verified on an isolated SCM fixture, 2026-09-06.
   * @example `await gw.usageLimits.create(body);`
   */
  async create(
    body: GatewayUsageLimitsClientCreateRequest,
  ): Promise<GatewayUsageLimitsClientCreateResponse> {
    return request({
      method: 'POST',
      baseUrl: this.options.baseUrl,
      path: `/policies/usage-limits`,
      body,
      requestSchema: GatewayUsageLimitsClientCreateRequestSchema,
      responseSchema: GatewayUsageLimitsClientCreateResponseSchema,
      auth: this.options.auth,
      numRetries: this.options.numRetries,
    });
  }

  /** Get Usage Limits Policy.
   * Verified on an isolated SCM fixture, 2026-09-06.
   * @example `await gw.usageLimits.get('resource-id', {});`
   */
  async get(
    policyUsageLimitsId: string,
    opts: GatewayUsageLimitsClientGetOptions = {},
  ): Promise<GatewayUsageLimitsClientGetResponse> {
    assertLength(policyUsageLimitsId, 1, 512, 'policyUsageLimitsId');
    return request({
      method: 'GET',
      baseUrl: this.options.baseUrl,
      path: `/policies/usage-limits/${gatewayPathSegment(policyUsageLimitsId)}`,
      params: queryParams(opts, GatewayUsageLimitsClientGetOptionsSchema),
      responseSchema: GatewayUsageLimitsClientGetResponseSchema,
      auth: this.options.auth,
      numRetries: this.options.numRetries,
    });
  }

  /** Update Usage Limits Policy.
   * Verified on an isolated SCM fixture, 2026-09-06.
   * @example `await gw.usageLimits.update('resource-id', body);`
   */
  async update(
    policyUsageLimitsId: string,
    body: GatewayUsageLimitsClientUpdateRequest,
  ): Promise<GatewayUsageLimitsClientUpdateResponse> {
    assertLength(policyUsageLimitsId, 1, 512, 'policyUsageLimitsId');
    return request({
      method: 'PUT',
      baseUrl: this.options.baseUrl,
      path: `/policies/usage-limits/${gatewayPathSegment(policyUsageLimitsId)}`,
      body,
      requestSchema: GatewayUsageLimitsClientUpdateRequestSchema,
      responseSchema: GatewayUsageLimitsClientUpdateResponseSchema,
      auth: this.options.auth,
      numRetries: this.options.numRetries,
    });
  }

  /** Delete Usage Limits Policy.
   * Verified on an isolated SCM fixture, 2026-09-06.
   * @example `await gw.usageLimits.delete('resource-id');`
   */
  async delete(policyUsageLimitsId: string): Promise<GatewayUsageLimitsClientDeleteResponse> {
    assertLength(policyUsageLimitsId, 1, 512, 'policyUsageLimitsId');
    return request({
      method: 'DELETE',
      baseUrl: this.options.baseUrl,
      path: `/policies/usage-limits/${gatewayPathSegment(policyUsageLimitsId)}`,
      responseSchema: GatewayUsageLimitsClientDeleteResponseSchema,
      auth: this.options.auth,
      numRetries: this.options.numRetries,
    });
  }

  /** List Usage Limits Policy Entities.
   * Verified on an isolated SCM fixture, 2026-09-06.
   * @example `await gw.usageLimits.listEntities('resource-id', {});`
   */
  async listEntities(
    policyUsageLimitsId: string,
    opts: GatewayUsageLimitsClientListEntitiesOptions = {},
  ): Promise<GatewayUsageLimitsClientListEntitiesResponse> {
    assertLength(policyUsageLimitsId, 1, 512, 'policyUsageLimitsId');
    return request({
      method: 'GET',
      baseUrl: this.options.baseUrl,
      path: `/policies/usage-limits/${gatewayPathSegment(policyUsageLimitsId)}/entities`,
      params: queryParams(opts, GatewayUsageLimitsClientListEntitiesOptionsSchema),
      responseSchema: GatewayUsageLimitsClientListEntitiesResponseSchema,
      auth: this.options.auth,
      numRetries: this.options.numRetries,
    });
  }

  /** Reset Usage Limits Policy Entity.
   * @experimental No traffic-derived entity existed on the isolated policy; existing counters were not reset.
   * @example `await gw.usageLimits.resetEntity('resource-id', 'resource-id');`
   */
  async resetEntity(
    policyUsageLimitsId: string,
    entityId: string,
  ): Promise<GatewayUsageLimitsClientResetEntityResponse> {
    assertLength(policyUsageLimitsId, 1, 512, 'policyUsageLimitsId');
    assertLength(entityId, 1, 512, 'entityId');
    return request({
      method: 'PUT',
      baseUrl: this.options.baseUrl,
      path: `/policies/usage-limits/${gatewayPathSegment(policyUsageLimitsId)}/entities/${gatewayPathSegment(entityId)}/reset`,
      responseSchema: GatewayUsageLimitsClientResetEntityResponseSchema,
      auth: this.options.auth,
      numRetries: this.options.numRetries,
    });
  }
}
