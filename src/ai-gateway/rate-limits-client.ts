import { queryParams } from '../http/query.js';
import { request } from '../http/request.js';
import { gatewayPathSegment } from './runtime-wire.js';
import { assertLength } from '../validators.js';
import type { AIGatewaySubClientOptions } from './types.js';
import {
  type GatewayRateLimitsClientListOptions,
  GatewayRateLimitsClientListOptionsSchema,
  type GatewayRateLimitsClientListResponse,
  GatewayRateLimitsClientListResponseSchema,
  type GatewayRateLimitsClientCreateRequest,
  GatewayRateLimitsClientCreateRequestSchema,
  type GatewayRateLimitsClientCreateResponse,
  GatewayRateLimitsClientCreateResponseSchema,
  type GatewayRateLimitsClientGetOptions,
  GatewayRateLimitsClientGetOptionsSchema,
  type GatewayRateLimitsClientGetResponse,
  GatewayRateLimitsClientGetResponseSchema,
  type GatewayRateLimitsClientUpdateRequest,
  GatewayRateLimitsClientUpdateRequestSchema,
  type GatewayRateLimitsClientUpdateResponse,
  GatewayRateLimitsClientUpdateResponseSchema,
  type GatewayRateLimitsClientDeleteResponse,
  GatewayRateLimitsClientDeleteResponseSchema,
} from '../models/ai-gateway-extensions.js';

/** Workspace-scoped rateLimits operations on the SCM data plane.
 * @example `const client = new AIGatewayClient().rateLimits;`
 */
export class AIGatewayRateLimitsClient {
  constructor(private readonly options: AIGatewaySubClientOptions) {}

  /** List Rate Limits Policies.
   * Verified on an isolated SCM fixture, 2026-09-06.
   * @example `await gw.rateLimits.list({});`
   */
  async list(
    opts: GatewayRateLimitsClientListOptions = {},
  ): Promise<GatewayRateLimitsClientListResponse> {
    return request({
      method: 'GET',
      baseUrl: this.options.baseUrl,
      path: `/policies/rate-limits`,
      params: queryParams(opts, GatewayRateLimitsClientListOptionsSchema),
      responseSchema: GatewayRateLimitsClientListResponseSchema,
      auth: this.options.auth,
      numRetries: this.options.numRetries,
    });
  }

  /** Create Rate Limits Policy.
   * Verified on an isolated SCM fixture, 2026-09-06.
   * @example `await gw.rateLimits.create(body);`
   */
  async create(
    body: GatewayRateLimitsClientCreateRequest,
  ): Promise<GatewayRateLimitsClientCreateResponse> {
    return request({
      method: 'POST',
      baseUrl: this.options.baseUrl,
      path: `/policies/rate-limits`,
      body,
      requestSchema: GatewayRateLimitsClientCreateRequestSchema,
      responseSchema: GatewayRateLimitsClientCreateResponseSchema,
      auth: this.options.auth,
      numRetries: this.options.numRetries,
    });
  }

  /** Get Rate Limits Policy.
   * Verified on an isolated SCM fixture, 2026-09-06.
   * @example `await gw.rateLimits.get('resource-id', {});`
   */
  async get(
    rateLimitsPolicyId: string,
    opts: GatewayRateLimitsClientGetOptions = {},
  ): Promise<GatewayRateLimitsClientGetResponse> {
    assertLength(rateLimitsPolicyId, 1, 512, 'rateLimitsPolicyId');
    return request({
      method: 'GET',
      baseUrl: this.options.baseUrl,
      path: `/policies/rate-limits/${gatewayPathSegment(rateLimitsPolicyId)}`,
      params: queryParams(opts, GatewayRateLimitsClientGetOptionsSchema),
      responseSchema: GatewayRateLimitsClientGetResponseSchema,
      auth: this.options.auth,
      numRetries: this.options.numRetries,
    });
  }

  /** Update Rate Limits Policy.
   * Verified on an isolated SCM fixture, 2026-09-06.
   * @example `await gw.rateLimits.update('resource-id', body);`
   */
  async update(
    rateLimitsPolicyId: string,
    body: GatewayRateLimitsClientUpdateRequest,
  ): Promise<GatewayRateLimitsClientUpdateResponse> {
    assertLength(rateLimitsPolicyId, 1, 512, 'rateLimitsPolicyId');
    return request({
      method: 'PUT',
      baseUrl: this.options.baseUrl,
      path: `/policies/rate-limits/${gatewayPathSegment(rateLimitsPolicyId)}`,
      body,
      requestSchema: GatewayRateLimitsClientUpdateRequestSchema,
      responseSchema: GatewayRateLimitsClientUpdateResponseSchema,
      auth: this.options.auth,
      numRetries: this.options.numRetries,
    });
  }

  /** Delete Rate Limits Policy.
   * Verified on an isolated SCM fixture, 2026-09-06.
   * @example `await gw.rateLimits.delete('resource-id');`
   */
  async delete(rateLimitsPolicyId: string): Promise<GatewayRateLimitsClientDeleteResponse> {
    assertLength(rateLimitsPolicyId, 1, 512, 'rateLimitsPolicyId');
    return request({
      method: 'DELETE',
      baseUrl: this.options.baseUrl,
      path: `/policies/rate-limits/${gatewayPathSegment(rateLimitsPolicyId)}`,
      responseSchema: GatewayRateLimitsClientDeleteResponseSchema,
      auth: this.options.auth,
      numRetries: this.options.numRetries,
    });
  }
}
