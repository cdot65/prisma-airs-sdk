import { RED_TEAM_SCAN_PATH, RED_TEAM_CATEGORIES_PATH } from '../constants.js';
import { request } from '../http/request.js';
import type { AuthAdapter } from '../http/types.js';
import { z } from 'zod';
import { serializeListing, type ListingOptions } from '../listing.js';
import { assertUuid } from '../validators.js';
import {
  JobResponseSchema,
  JobListResponseSchema,
  JobAbortResponseSchema,
  CategoryModelSchema,
  type JobCreateRequest,
  type JobResponse,
  type JobListResponse,
  type JobAbortResponse,
  type CategoryModel,
} from '../models/red-team.js';

/** Pagination + filter options for Red Team list operations. */
export type RedTeamListOptions = ListingOptions;

/** Extended list options for scan/job listing. */
export interface RedTeamScanListOptions extends RedTeamListOptions {
  status?: string;
  job_type?: string;
  target_id?: string;
}

/** @internal */
export interface RedTeamScansClientOptions {
  baseUrl: string;
  auth: AuthAdapter;
  numRetries: number;
}

/** Client for Red Team data plane scan operations. */
export class RedTeamScansClient {
  private readonly baseUrl: string;
  private readonly auth: AuthAdapter;
  private readonly numRetries: number;

  constructor(opts: RedTeamScansClientOptions) {
    this.baseUrl = opts.baseUrl;
    this.auth = opts.auth;
    this.numRetries = opts.numRetries;
  }

  /**
   * Create a new red team scan job.
   * @param body - Job creation request body.
   * @returns The created job response.
   * @example
   * ```ts
   * import { RedTeamClient } from '@cdot65/prisma-airs-sdk';
   * const rt = new RedTeamClient();
   *
   * const job = await rt.scans.create({
   *   name: 'nightly-static-scan',
   *   target: { uuid: '550e8400-e29b-41d4-a716-446655440000' },
   *   job_type: 'STATIC',
   *   job_metadata: {},
   * });
   * // job =>
   * // { uuid: '550e8400-...', name: 'nightly-static-scan', status: 'QUEUED', job_type: 'STATIC' }
   * ```
   */
  async create(body: JobCreateRequest): Promise<JobResponse> {
    return request({
      method: 'POST',
      baseUrl: this.baseUrl,
      path: RED_TEAM_SCAN_PATH,
      body,
      responseSchema: JobResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * List red team scan jobs with optional filters.
   * @param opts - Optional pagination, search, and filter options.
   * @returns The paginated list of scan jobs.
   * @example
   * ```ts
   * import { RedTeamClient } from '@cdot65/prisma-airs-sdk';
   * const rt = new RedTeamClient();
   *
   * const scans = await rt.scans.list({ limit: 5, status: 'COMPLETED' });
   * // scans =>
   * // { pagination: { total_items: 12 }, data: [{ uuid: '550e8400-...', name: 'job', status: 'COMPLETED', job_type: 'STATIC' }] }
   * ```
   */
  async list(opts?: RedTeamScanListOptions): Promise<JobListResponse> {
    const params = serializeListing(opts);
    if (opts?.status !== undefined) params.status = opts.status;
    if (opts?.job_type !== undefined) params.job_type = opts.job_type;
    if (opts?.target_id !== undefined) params.target_id = opts.target_id;

    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: RED_TEAM_SCAN_PATH,
      params,
      responseSchema: JobListResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Get a single scan job by ID.
   * @param jobId - The job UUID.
   * @returns The job response.
   * @example
   * ```ts
   * import { RedTeamClient } from '@cdot65/prisma-airs-sdk';
   * const rt = new RedTeamClient();
   *
   * const job = await rt.scans.get('550e8400-e29b-41d4-a716-446655440000');
   * // job =>
   * // { uuid: '550e8400-...', name: 'job', status: 'RUNNING', job_type: 'STATIC', target_id: '550e8400-...' }
   * ```
   */
  async get(jobId: string): Promise<JobResponse> {
    assertUuid(jobId, 'job id');
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_SCAN_PATH}/${jobId}`,
      responseSchema: JobResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Abort a running scan job.
   * @param jobId - The job UUID.
   * @returns The abort response.
   * @example
   * ```ts
   * import { RedTeamClient } from '@cdot65/prisma-airs-sdk';
   * const rt = new RedTeamClient();
   *
   * const result = await rt.scans.abort('550e8400-e29b-41d4-a716-446655440000');
   * // result =>
   * // { job_id: '550e8400-...', message: 'aborted' }
   * ```
   */
  async abort(jobId: string): Promise<JobAbortResponse> {
    assertUuid(jobId, 'job id');
    return request({
      method: 'POST',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_SCAN_PATH}/${jobId}/abort`,
      responseSchema: JobAbortResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Get all categories with subcategories.
   * @returns The list of category models.
   * @example
   * ```ts
   * import { RedTeamClient } from '@cdot65/prisma-airs-sdk';
   * const rt = new RedTeamClient();
   *
   * const categories = await rt.scans.getCategories();
   * // categories =>
   * // [{ id: 'jailbreak', display_name: 'Jailbreak', description: '...', sub_categories: [] }]
   * ```
   */
  async getCategories(): Promise<CategoryModel[]> {
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: RED_TEAM_CATEGORIES_PATH,
      responseSchema: z.array(CategoryModelSchema),
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }
}
