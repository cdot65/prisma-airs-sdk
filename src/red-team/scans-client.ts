import { RED_TEAM_SCAN_PATH, RED_TEAM_CATEGORIES_PATH } from '../constants.js';
import { AISecSDKException, ErrorType } from '../errors.js';
import { isValidUuid } from '../utils.js';
import { managementHttpRequest } from '../management/management-http-client.js';
import { buildRedTeamListParams } from './list-params.js';
import type { OAuthClient } from '../management/oauth-client.js';
import type {
  JobCreateRequest,
  JobResponse,
  JobListResponse,
  JobAbortResponse,
  CategoryModel,
} from '../models/red-team.js';

/** Pagination and filter options for Red Team list operations. */
export interface RedTeamListOptions {
  skip?: number;
  limit?: number;
  search?: string;
}

/** Extended list options for scan/job listing. */
export interface RedTeamScanListOptions extends RedTeamListOptions {
  status?: string;
  job_type?: string;
  target_id?: string;
}

/** @internal */
export interface RedTeamScansClientOptions {
  baseUrl: string;
  oauthClient: OAuthClient;
  numRetries: number;
}

/** Client for Red Team data plane scan operations. */
export class RedTeamScansClient {
  private readonly baseUrl: string;
  private readonly oauthClient: OAuthClient;
  private readonly numRetries: number;

  constructor(opts: RedTeamScansClientOptions) {
    this.baseUrl = opts.baseUrl;
    this.oauthClient = opts.oauthClient;
    this.numRetries = opts.numRetries;
  }

  /**
   * Create a new red team scan job.
   * @param request - Job creation request body.
   * @returns The created job response.
   */
  async create(request: JobCreateRequest): Promise<JobResponse> {
    const res = await managementHttpRequest<JobResponse>({
      method: 'POST',
      baseUrl: this.baseUrl,
      path: RED_TEAM_SCAN_PATH,
      body: request,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /** List red team scan jobs with optional filters. */
  async list(opts?: RedTeamScanListOptions): Promise<JobListResponse> {
    const params = buildRedTeamListParams(opts);
    if (opts?.status !== undefined) params.status = opts.status;
    if (opts?.job_type !== undefined) params.job_type = opts.job_type;
    if (opts?.target_id !== undefined) params.target_id = opts.target_id;

    const res = await managementHttpRequest<JobListResponse>({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: RED_TEAM_SCAN_PATH,
      params,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /** Get a single scan job by ID. */
  async get(jobId: string): Promise<JobResponse> {
    if (!isValidUuid(jobId)) {
      throw new AISecSDKException(`Invalid job id: ${jobId}`, ErrorType.USER_REQUEST_PAYLOAD_ERROR);
    }

    const res = await managementHttpRequest<JobResponse>({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_SCAN_PATH}/${jobId}`,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /** Abort a running scan job. */
  async abort(jobId: string): Promise<JobAbortResponse> {
    if (!isValidUuid(jobId)) {
      throw new AISecSDKException(`Invalid job id: ${jobId}`, ErrorType.USER_REQUEST_PAYLOAD_ERROR);
    }

    const res = await managementHttpRequest<JobAbortResponse>({
      method: 'POST',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_SCAN_PATH}/${jobId}/abort`,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /** Get all categories with subcategories. */
  async getCategories(): Promise<CategoryModel[]> {
    const res = await managementHttpRequest<CategoryModel[]>({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: RED_TEAM_CATEGORIES_PATH,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }
}
