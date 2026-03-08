import {
  MODEL_SEC_SCANS_PATH,
  MODEL_SEC_EVALUATIONS_PATH,
  MODEL_SEC_VIOLATIONS_PATH,
} from '../constants.js';
import { AISecSDKException, ErrorType } from '../errors.js';
import { isValidUuid } from '../utils.js';
import { managementHttpRequest } from '../management/management-http-client.js';
import type { OAuthClient } from '../management/oauth-client.js';
import type {
  ScanCreateRequest,
  ScanBaseResponse,
  ScanList,
  RuleEvaluationList,
  RuleEvaluationResponse,
  FileList,
  LabelsCreateRequest,
  LabelsResponse,
  ViolationList,
  ViolationResponse,
  LabelKeyList,
  LabelValueList,
} from '../models/model-security.js';

/** Pagination options for model security scan listing. */
export interface ModelSecurityScanListOptions {
  /** Number of items to skip. */
  skip?: number;
  /** Maximum number of items to return. */
  limit?: number;
  /** Sort field: 'created_at' or 'updated_at'. */
  sort_by?: string;
  /** Sort order: 'asc' or 'desc'. */
  sort_order?: string;
  /** Search query (matches UUID or name, 3-1000 chars). */
  search_query?: string;
  /** Filter by evaluation outcomes (array). */
  eval_outcomes?: string[];
  /** Filter by source types (array). */
  source_types?: string[];
  /** Filter by security group UUID. */
  security_group_uuid?: string;
  /** Filter by start time (ISO datetime). */
  start_time?: string;
  /** Filter by end time (ISO datetime). */
  end_time?: string;
  /** Labels query filter (max 4096 chars). */
  labels_query?: string;
}

/** Options for listing rule evaluations within a scan. */
export interface ModelSecurityEvaluationListOptions {
  /** Number of items to skip. */
  skip?: number;
  /** Maximum number of items to return. */
  limit?: number;
  /** Sort field: 'created_at' or 'updated_at'. */
  sort_field?: string;
  /** Sort order: 'asc' or 'desc'. */
  sort_order?: string;
  /** Filter by evaluation result: 'PASSED', 'FAILED', or 'ERROR'. */
  result?: string;
  /** Filter by rule instance UUID. */
  rule_instance_uuid?: string;
}

/** Options for listing files within a scan. */
export interface ModelSecurityFileListOptions {
  /** Number of items to skip. */
  skip?: number;
  /** Maximum number of items to return. */
  limit?: number;
  /** Sort field: 'path' or 'type'. */
  sort_field?: string;
  /** Sort direction: 'asc' or 'desc'. */
  sort_dir?: string;
  /** Filter by file type. */
  type?: string;
  /** Filter by file result. */
  result?: string;
  /** Filter files by path within the scan (default "/"). */
  query_path?: string;
}

/** Options for listing label keys or values. */
export interface ModelSecurityLabelListOptions {
  /** Number of items to skip. */
  skip?: number;
  /** Maximum number of items to return. */
  limit?: number;
  /** Search query string. */
  search?: string;
}

/** Options for listing violations. */
export interface ModelSecurityViolationListOptions {
  /** Number of items to skip. */
  skip?: number;
  /** Maximum number of items to return. */
  limit?: number;
}

/** @internal */
export interface ModelSecurityScansClientOptions {
  baseUrl: string;
  oauthClient: OAuthClient;
  numRetries: number;
}

/** Build query params for scan list. */
function buildScanListParams(
  opts?: ModelSecurityScanListOptions,
): Record<string, string | string[]> {
  const params: Record<string, string | string[]> = {};
  if (opts?.skip !== undefined) params.skip = String(opts.skip);
  if (opts?.limit !== undefined) params.limit = String(opts.limit);
  if (opts?.sort_by !== undefined) params.sort_by = opts.sort_by;
  if (opts?.sort_order !== undefined) params.sort_order = opts.sort_order;
  if (opts?.search_query !== undefined) params.search_query = opts.search_query;
  if (opts?.eval_outcomes !== undefined) params.eval_outcomes = opts.eval_outcomes;
  if (opts?.source_types !== undefined) params.source_types = opts.source_types;
  if (opts?.security_group_uuid !== undefined)
    params.security_group_uuid = opts.security_group_uuid;
  if (opts?.start_time !== undefined) params.start_time = opts.start_time;
  if (opts?.end_time !== undefined) params.end_time = opts.end_time;
  if (opts?.labels_query !== undefined) params.labels_query = opts.labels_query;
  return params;
}

/** Build query params for evaluation list. */
function buildEvaluationListParams(
  opts?: ModelSecurityEvaluationListOptions,
): Record<string, string> {
  const params: Record<string, string> = {};
  if (opts?.skip !== undefined) params.skip = String(opts.skip);
  if (opts?.limit !== undefined) params.limit = String(opts.limit);
  if (opts?.sort_field !== undefined) params.sort_field = opts.sort_field;
  if (opts?.sort_order !== undefined) params.sort_order = opts.sort_order;
  if (opts?.result !== undefined) params.result = opts.result;
  if (opts?.rule_instance_uuid !== undefined) params.rule_instance_uuid = opts.rule_instance_uuid;
  return params;
}

/** Build query params for file list. */
function buildFileListParams(opts?: ModelSecurityFileListOptions): Record<string, string> {
  const params: Record<string, string> = {};
  if (opts?.skip !== undefined) params.skip = String(opts.skip);
  if (opts?.limit !== undefined) params.limit = String(opts.limit);
  if (opts?.sort_field !== undefined) params.sort_field = opts.sort_field;
  if (opts?.sort_dir !== undefined) params.sort_dir = opts.sort_dir;
  if (opts?.type !== undefined) params.type = opts.type;
  if (opts?.result !== undefined) params.result = opts.result;
  if (opts?.query_path !== undefined) params.query_path = opts.query_path;
  return params;
}

/** Build query params for label key/value list. */
function buildLabelListParams(opts?: ModelSecurityLabelListOptions): Record<string, string> {
  const params: Record<string, string> = {};
  if (opts?.skip !== undefined) params.skip = String(opts.skip);
  if (opts?.limit !== undefined) params.limit = String(opts.limit);
  if (opts?.search !== undefined) params.search = opts.search;
  return params;
}

/** Build query params for violation list. */
function buildViolationListParams(
  opts?: ModelSecurityViolationListOptions,
): Record<string, string> {
  const params: Record<string, string> = {};
  if (opts?.skip !== undefined) params.skip = String(opts.skip);
  if (opts?.limit !== undefined) params.limit = String(opts.limit);
  return params;
}

/** Client for Model Security data plane scan operations. */
export class ModelSecurityScansClient {
  private readonly baseUrl: string;
  private readonly oauthClient: OAuthClient;
  private readonly numRetries: number;

  constructor(opts: ModelSecurityScansClientOptions) {
    this.baseUrl = opts.baseUrl;
    this.oauthClient = opts.oauthClient;
    this.numRetries = opts.numRetries;
  }

  /**
   * Create a new model security scan.
   * @param request - Scan creation request body.
   * @returns The created scan response.
   */
  async create(request: ScanCreateRequest): Promise<ScanBaseResponse> {
    const res = await managementHttpRequest<ScanBaseResponse>({
      method: 'POST',
      baseUrl: this.baseUrl,
      path: MODEL_SEC_SCANS_PATH,
      body: request,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /**
   * List model security scans with optional filters.
   * @param opts - Pagination and filter options.
   * @returns Paginated list of scans.
   */
  async list(opts?: ModelSecurityScanListOptions): Promise<ScanList> {
    const res = await managementHttpRequest<ScanList>({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: MODEL_SEC_SCANS_PATH,
      params: buildScanListParams(opts),
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /**
   * Get a single scan by UUID.
   * @param uuid - Scan UUID.
   * @returns The scan response.
   */
  async get(uuid: string): Promise<ScanBaseResponse> {
    if (!isValidUuid(uuid)) {
      throw new AISecSDKException(
        `Invalid scan uuid: ${uuid}`,
        ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      );
    }

    const res = await managementHttpRequest<ScanBaseResponse>({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${MODEL_SEC_SCANS_PATH}/${uuid}`,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /**
   * Get rule evaluations for a scan.
   * @param scanUuid - Scan UUID.
   * @param opts - Pagination and filter options.
   * @returns Paginated list of rule evaluations.
   */
  async getEvaluations(
    scanUuid: string,
    opts?: ModelSecurityEvaluationListOptions,
  ): Promise<RuleEvaluationList> {
    if (!isValidUuid(scanUuid)) {
      throw new AISecSDKException(
        `Invalid scan uuid: ${scanUuid}`,
        ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      );
    }

    const res = await managementHttpRequest<RuleEvaluationList>({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${MODEL_SEC_SCANS_PATH}/${scanUuid}/evaluations`,
      params: buildEvaluationListParams(opts),
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /**
   * Get files for a scan.
   * @param scanUuid - Scan UUID.
   * @param opts - Pagination and file filter options.
   * @returns Paginated list of files.
   */
  async getFiles(scanUuid: string, opts?: ModelSecurityFileListOptions): Promise<FileList> {
    if (!isValidUuid(scanUuid)) {
      throw new AISecSDKException(
        `Invalid scan uuid: ${scanUuid}`,
        ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      );
    }

    const res = await managementHttpRequest<FileList>({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${MODEL_SEC_SCANS_PATH}/${scanUuid}/files`,
      params: buildFileListParams(opts),
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /**
   * Add labels to a scan (merge with existing).
   * @param scanUuid - Scan UUID.
   * @param request - Labels to add.
   * @returns Labels response.
   */
  async addLabels(scanUuid: string, request: LabelsCreateRequest): Promise<LabelsResponse> {
    if (!isValidUuid(scanUuid)) {
      throw new AISecSDKException(
        `Invalid scan uuid: ${scanUuid}`,
        ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      );
    }

    const res = await managementHttpRequest<LabelsResponse>({
      method: 'POST',
      baseUrl: this.baseUrl,
      path: `${MODEL_SEC_SCANS_PATH}/${scanUuid}/labels`,
      body: request,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /**
   * Set labels on a scan (replace all existing).
   * @param scanUuid - Scan UUID.
   * @param request - Labels to set.
   * @returns Labels response.
   */
  async setLabels(scanUuid: string, request: LabelsCreateRequest): Promise<LabelsResponse> {
    if (!isValidUuid(scanUuid)) {
      throw new AISecSDKException(
        `Invalid scan uuid: ${scanUuid}`,
        ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      );
    }

    const res = await managementHttpRequest<LabelsResponse>({
      method: 'PUT',
      baseUrl: this.baseUrl,
      path: `${MODEL_SEC_SCANS_PATH}/${scanUuid}/labels`,
      body: request,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /**
   * Delete labels from a scan by key.
   * @param scanUuid - Scan UUID.
   * @param keys - Label keys to delete.
   */
  async deleteLabels(scanUuid: string, keys: string[]): Promise<void> {
    if (!isValidUuid(scanUuid)) {
      throw new AISecSDKException(
        `Invalid scan uuid: ${scanUuid}`,
        ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      );
    }

    // Build keys as repeated query params: ?keys=key1&keys=key2
    // managementHttpRequest uses URLSearchParams.set which only supports single values,
    // so we manually build the query string portion
    const url = new URL(`https://placeholder${MODEL_SEC_SCANS_PATH}/${scanUuid}/labels`);
    for (const key of keys) {
      url.searchParams.append('keys', key);
    }
    // Extract just the query string and append to path
    const queryString = url.searchParams.toString();
    const pathWithQuery = `${MODEL_SEC_SCANS_PATH}/${scanUuid}/labels${queryString ? `?${queryString}` : ''}`;

    await managementHttpRequest<void>({
      method: 'DELETE',
      baseUrl: this.baseUrl,
      path: pathWithQuery,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
  }

  /**
   * Get rule violations for a scan.
   * @param scanUuid - Scan UUID.
   * @param opts - Pagination options.
   * @returns Paginated list of violations.
   */
  async getViolations(
    scanUuid: string,
    opts?: ModelSecurityViolationListOptions,
  ): Promise<ViolationList> {
    if (!isValidUuid(scanUuid)) {
      throw new AISecSDKException(
        `Invalid scan uuid: ${scanUuid}`,
        ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      );
    }

    const res = await managementHttpRequest<ViolationList>({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${MODEL_SEC_SCANS_PATH}/${scanUuid}/rule-violations`,
      params: buildViolationListParams(opts),
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /**
   * Get distinct label keys across all scans.
   * @param opts - Pagination options.
   * @returns Paginated list of label keys.
   */
  async getLabelKeys(opts?: ModelSecurityLabelListOptions): Promise<LabelKeyList> {
    const res = await managementHttpRequest<LabelKeyList>({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${MODEL_SEC_SCANS_PATH}/label-keys`,
      params: buildLabelListParams(opts),
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /**
   * Get distinct values for a label key.
   * @param key - Label key to get values for.
   * @param opts - Pagination options.
   * @returns Paginated list of label values.
   */
  async getLabelValues(key: string, opts?: ModelSecurityLabelListOptions): Promise<LabelValueList> {
    const res = await managementHttpRequest<LabelValueList>({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${MODEL_SEC_SCANS_PATH}/label-keys/${encodeURIComponent(key)}/values`,
      params: buildLabelListParams(opts),
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /**
   * Get a single rule evaluation by UUID.
   * @param uuid - Evaluation UUID.
   * @returns The rule evaluation response.
   */
  async getEvaluation(uuid: string): Promise<RuleEvaluationResponse> {
    if (!isValidUuid(uuid)) {
      throw new AISecSDKException(
        `Invalid evaluation uuid: ${uuid}`,
        ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      );
    }

    const res = await managementHttpRequest<RuleEvaluationResponse>({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${MODEL_SEC_EVALUATIONS_PATH}/${uuid}`,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /**
   * Get a single violation by UUID.
   * @param uuid - Violation UUID.
   * @returns The violation response.
   */
  async getViolation(uuid: string): Promise<ViolationResponse> {
    if (!isValidUuid(uuid)) {
      throw new AISecSDKException(
        `Invalid violation uuid: ${uuid}`,
        ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      );
    }

    const res = await managementHttpRequest<ViolationResponse>({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${MODEL_SEC_VIOLATIONS_PATH}/${uuid}`,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }
}
