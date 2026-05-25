import { DLP_DATA_PATTERNS_PATH } from '../../constants.js';
import { request } from '../../http/request.js';
import type { AuthAdapter } from '../../http/types.js';
import {
  DataPatternResponseSchema,
  PageDataPatternResponseSchema,
  type DataPatternPatchRequest,
  type DataPatternRequest,
  type DataPatternResponse,
  type PageDataPatternResponse,
} from '../../models/dlp-data-pattern.js';

/** Query parameters accepted by {@link DataPatternsClient.list}. */
export interface DataPatternListParams {
  /** Zero-based page index. Server defaults to 0. */
  page?: number;
  /** Page size. Server defaults to 20. */
  size?: number;
  /**
   * Sort criteria in `property,(asc|desc)` form. Pass multiple entries to sort by several fields;
   * each entry is emitted as a separate `sort=` query parameter.
   */
  sort?: string[];
}

/** @internal */
export interface DataPatternsClientOptions {
  baseUrl: string;
  auth: AuthAdapter;
  numRetries: number;
}

/**
 * Client for the DLP Data Patterns resource (`/v2/api/data-patterns`).
 *
 * Full CRUD surface: list, create, get, replace (PUT), patch (JSON Merge Patch), delete.
 * DELETE soft-deletes (archives) the pattern server-side.
 */
export class DataPatternsClient {
  private readonly baseUrl: string;
  private readonly auth: AuthAdapter;
  private readonly numRetries: number;

  constructor(opts: DataPatternsClientOptions) {
    this.baseUrl = opts.baseUrl;
    this.auth = opts.auth;
    this.numRetries = opts.numRetries;
  }

  /**
   * List data patterns. Returns the Spring `Page<>` envelope verbatim so callers can inspect
   * `totalElements`, `pageable`, etc.
   * @example
   * ```ts
   * import { ManagementClient } from '@cdot65/prisma-airs-sdk';
   * const mgmt = new ManagementClient();
   *
   * const page = await mgmt.dlp.dataPatterns.list({ size: 5, sort: ['name,asc'] });
   * // page =>
   * // {
   * //   content: [{ id: 'dp-1', name: 'SSN', type: 'custom', status: 'active' }],
   * //   totalElements: 1, totalPages: 1, number: 0, size: 20, first: true, last: true
   * // }
   * ```
   */
  async list(params: DataPatternListParams = {}): Promise<PageDataPatternResponse> {
    const queryParams: Record<string, string | string[]> = {};
    if (params.page !== undefined) queryParams.page = String(params.page);
    if (params.size !== undefined) queryParams.size = String(params.size);
    if (params.sort !== undefined) queryParams.sort = params.sort;

    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: DLP_DATA_PATTERNS_PATH,
      params: queryParams,
      responseSchema: PageDataPatternResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Create a new custom data pattern.
   * @example
   * ```ts
   * import { ManagementClient } from '@cdot65/prisma-airs-sdk';
   * const mgmt = new ManagementClient();
   *
   * const created = await mgmt.dlp.dataPatterns.create({
   *   name: 'example-pattern',
   *   type: 'custom',
   *   detection_config: { technique: 'regex' },
   *   matching_rules: { regexes: [{ regex: '\\bexample\\b', weight: 1.0 }] },
   * });
   * // created =>
   * // { id: 'dp-1', name: 'example-pattern', type: 'custom', status: 'active' }
   * ```
   */
  async create(body: DataPatternRequest): Promise<DataPatternResponse> {
    return request({
      method: 'POST',
      baseUrl: this.baseUrl,
      path: DLP_DATA_PATTERNS_PATH,
      body,
      responseSchema: DataPatternResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Get a single data pattern by resource ID.
   * @example
   * ```ts
   * import { ManagementClient } from '@cdot65/prisma-airs-sdk';
   * const mgmt = new ManagementClient();
   *
   * const pattern = await mgmt.dlp.dataPatterns.get('dp-1');
   * // pattern =>
   * // { id: 'dp-1', name: 'SSN', type: 'custom', status: 'active', detection_config: { technique: 'regex' } }
   * ```
   */
  async get(resourceId: string): Promise<DataPatternResponse> {
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${DLP_DATA_PATTERNS_PATH}/${encodeURIComponent(resourceId)}`,
      responseSchema: DataPatternResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Full-replace (PUT) the pattern at `resourceId`. Returns the updated resource as the API
   * echoes it back.
   * @example
   * ```ts
   * import { ManagementClient } from '@cdot65/prisma-airs-sdk';
   * const mgmt = new ManagementClient();
   *
   * const updated = await mgmt.dlp.dataPatterns.replace('dp-1', {
   *   name: 'SSN',
   *   type: 'custom',
   *   detection_config: { technique: 'regex' },
   *   matching_rules: { regexes: [{ regex: '\\d{3}-\\d{2}-\\d{4}', weight: 1.0 }] },
   * });
   * // updated =>
   * // { id: 'dp-1', name: 'SSN', type: 'custom', status: 'active' }
   * ```
   */
  async replace(resourceId: string, body: DataPatternRequest): Promise<DataPatternResponse> {
    return request({
      method: 'PUT',
      baseUrl: this.baseUrl,
      path: `${DLP_DATA_PATTERNS_PATH}/${encodeURIComponent(resourceId)}`,
      body,
      responseSchema: DataPatternResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Partial update via JSON Merge Patch (RFC 7396). Sent with
   * `Content-Type: application/merge-patch+json`. Fields set to `null` clear server-side;
   * omitted fields are left unchanged.
   * @example
   * ```ts
   * import { ManagementClient } from '@cdot65/prisma-airs-sdk';
   * const mgmt = new ManagementClient();
   *
   * const patched = await mgmt.dlp.dataPatterns.patch('dp-1', {
   *   name: 'SSN',
   *   type: 'custom',
   *   detection_config: { technique: 'regex' },
   *   description: 'Updated by SDK',
   * });
   * // patched =>
   * // { id: 'dp-1', name: 'SSN', type: 'custom', description: 'Updated by SDK' }
   * ```
   */
  async patch(resourceId: string, body: DataPatternPatchRequest): Promise<DataPatternResponse> {
    return request({
      method: 'PATCH',
      baseUrl: this.baseUrl,
      path: `${DLP_DATA_PATTERNS_PATH}/${encodeURIComponent(resourceId)}`,
      body,
      contentType: 'application/merge-patch+json',
      responseSchema: DataPatternResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Soft-delete (archive) a data pattern. Resolves on the 204 No Content response.
   * @example
   * ```ts
   * import { ManagementClient } from '@cdot65/prisma-airs-sdk';
   * const mgmt = new ManagementClient();
   *
   * await mgmt.dlp.dataPatterns.delete('dp-1');
   * // resolves to undefined (204 No Content) — the pattern is archived server-side
   * ```
   */
  async delete(resourceId: string): Promise<void> {
    await request<void>({
      method: 'DELETE',
      baseUrl: this.baseUrl,
      path: `${DLP_DATA_PATTERNS_PATH}/${encodeURIComponent(resourceId)}`,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }
}
