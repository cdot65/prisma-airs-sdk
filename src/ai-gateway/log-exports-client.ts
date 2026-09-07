import { queryParams } from '../http/query.js';
import { request } from '../http/request.js';
import { gatewayPathSegment } from './runtime-wire.js';
import { assertLength } from '../validators.js';
import type { AIGatewaySubClientOptions } from './types.js';
import {
  type GatewayLogExportsClientListOptions,
  GatewayLogExportsClientListOptionsSchema,
  type GatewayLogExportsClientListResponse,
  GatewayLogExportsClientListResponseSchema,
  type GatewayLogExportsClientCreateRequest,
  GatewayLogExportsClientCreateRequestSchema,
  type GatewayLogExportsClientCreateResponse,
  GatewayLogExportsClientCreateResponseSchema,
  type GatewayLogExportsClientGetResponse,
  GatewayLogExportsClientGetResponseSchema,
  type GatewayLogExportsClientUpdateRequest,
  GatewayLogExportsClientUpdateRequestSchema,
  type GatewayLogExportsClientUpdateResponse,
  GatewayLogExportsClientUpdateResponseSchema,
  type GatewayLogExportsClientStartResponse,
  GatewayLogExportsClientStartResponseSchema,
  type GatewayLogExportsClientCancelResponse,
  GatewayLogExportsClientCancelResponseSchema,
  type GatewayLogExportsClientDownloadResponse,
  GatewayLogExportsClientDownloadResponseSchema,
} from '../models/ai-gateway-extensions.js';

/** Workspace-scoped logExports operations on the SCM data plane.
 * @example `const client = new AIGatewayClient().logExports;`
 */
export class AIGatewayLogExportsClient {
  constructor(private readonly options: AIGatewaySubClientOptions) {}

  /** Get all logs exports.
   * Verified on an isolated SCM fixture, 2026-09-06.
   * @example `await gw.logExports.list({});`
   */
  async list(
    opts: GatewayLogExportsClientListOptions = {},
  ): Promise<GatewayLogExportsClientListResponse> {
    return request({
      method: 'GET',
      baseUrl: this.options.baseUrl,
      path: `/logs/exports`,
      params: queryParams(opts, GatewayLogExportsClientListOptionsSchema),
      responseSchema: GatewayLogExportsClientListResponseSchema,
      auth: this.options.auth,
      numRetries: this.options.numRetries,
      omitDebugBody: true,
    });
  }

  /** Create log export.
   * Verified on an isolated SCM fixture, 2026-09-06.
   * @example `await gw.logExports.create(body);`
   */
  async create(
    body: GatewayLogExportsClientCreateRequest,
  ): Promise<GatewayLogExportsClientCreateResponse> {
    return request({
      method: 'POST',
      baseUrl: this.options.baseUrl,
      path: `/logs/exports`,
      body,
      requestSchema: GatewayLogExportsClientCreateRequestSchema,
      responseSchema: GatewayLogExportsClientCreateResponseSchema,
      auth: this.options.auth,
      numRetries: this.options.numRetries,
      omitDebugBody: true,
    });
  }

  /** Get a specific logs export.
   * Verified on an isolated SCM fixture, 2026-09-06.
   * @example `await gw.logExports.get('resource-id');`
   */
  async get(exportId: string): Promise<GatewayLogExportsClientGetResponse> {
    assertLength(exportId, 1, 512, 'exportId');
    return request({
      method: 'GET',
      baseUrl: this.options.baseUrl,
      path: `/logs/exports/${gatewayPathSegment(exportId)}`,
      responseSchema: GatewayLogExportsClientGetResponseSchema,
      auth: this.options.auth,
      numRetries: this.options.numRetries,
      omitDebugBody: true,
    });
  }

  /** Update a logs export.
   * Verified on an isolated SCM fixture, 2026-09-06.
   * @example `await gw.logExports.update('resource-id', body);`
   */
  async update(
    exportId: string,
    body: GatewayLogExportsClientUpdateRequest,
  ): Promise<GatewayLogExportsClientUpdateResponse> {
    assertLength(exportId, 1, 512, 'exportId');
    return request({
      method: 'PUT',
      baseUrl: this.options.baseUrl,
      path: `/logs/exports/${gatewayPathSegment(exportId)}`,
      body,
      requestSchema: GatewayLogExportsClientUpdateRequestSchema,
      responseSchema: GatewayLogExportsClientUpdateResponseSchema,
      auth: this.options.auth,
      numRetries: this.options.numRetries,
      omitDebugBody: true,
    });
  }

  /** Start log export.
   * @experimental SCM returned HTTP 500 (AB04) for an isolated export; successful execution is unverified.
   * @example `await gw.logExports.start('resource-id');`
   */
  async start(exportId: string): Promise<GatewayLogExportsClientStartResponse> {
    assertLength(exportId, 1, 512, 'exportId');
    return request({
      method: 'POST',
      baseUrl: this.options.baseUrl,
      path: `/logs/exports/${gatewayPathSegment(exportId)}/start`,
      responseSchema: GatewayLogExportsClientStartResponseSchema,
      auth: this.options.auth,
      numRetries: this.options.numRetries,
      omitDebugBody: true,
    });
  }

  /** Cancel log export.
   * @experimental No running owned export was available; contract-tested only.
   * @example `await gw.logExports.cancel('resource-id');`
   */
  async cancel(exportId: string): Promise<GatewayLogExportsClientCancelResponse> {
    assertLength(exportId, 1, 512, 'exportId');
    return request({
      method: 'POST',
      baseUrl: this.options.baseUrl,
      path: `/logs/exports/${gatewayPathSegment(exportId)}/cancel`,
      responseSchema: GatewayLogExportsClientCancelResponseSchema,
      auth: this.options.auth,
      numRetries: this.options.numRetries,
      omitDebugBody: true,
    });
  }

  /** Download log export.
   * @experimental The owned export could not start; successful download is unverified.
   * @example `await gw.logExports.download('resource-id');`
   */
  async download(exportId: string): Promise<GatewayLogExportsClientDownloadResponse> {
    assertLength(exportId, 1, 512, 'exportId');
    return request({
      method: 'GET',
      baseUrl: this.options.baseUrl,
      path: `/logs/exports/${gatewayPathSegment(exportId)}/download`,
      responseSchema: GatewayLogExportsClientDownloadResponseSchema,
      auth: this.options.auth,
      numRetries: this.options.numRetries,
      omitDebugBody: true,
    });
  }
}
