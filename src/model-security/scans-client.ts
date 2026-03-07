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

/** Pagination and filter options for model security list operations. */
export interface ModelSecurityListOptions {
  /** Number of items to skip. */
  skip?: number;
  /** Maximum number of items to return. */
  limit?: number;
  /** Field name to sort by. */
  sort_by?: string;
  /** Sort direction: 'asc' or 'desc'. */
  sort_direction?: string;
  /** Search query string. */
  search?: string;
}

/** Extended list options for scan listing with additional filters. */
export interface ModelSecurityScanListOptions extends ModelSecurityListOptions {
  /** Filter by evaluation outcome. */
  eval_outcome?: string;
  /** Filter by source type. */
  source_type?: string;
  /** Filter by scan origin. */
  scan_origin?: string;
}

/** List options for file listing with file-specific filters. */
export interface ModelSecurityFileListOptions extends ModelSecurityListOptions {
  /** Filter by file type. */
  type?: string;
  /** Filter by file result. */
  result?: string;
}

/** @internal */
export interface ModelSecurityScansClientOptions {
  baseUrl: string;
  oauthClient: OAuthClient;
  numRetries: number;
}

/** Build query params from list options. */
function buildListParams(opts?: ModelSecurityListOptions): Record<string, string> {
  const params: Record<string, string> = {};
  if (opts?.skip !== undefined) params.skip = String(opts.skip);
  if (opts?.limit !== undefined) params.limit = String(opts.limit);
  if (opts?.sort_by !== undefined) params.sort_by = opts.sort_by;
  if (opts?.sort_direction !== undefined) params.sort_direction = opts.sort_direction;
  if (opts?.search !== undefined) params.search = opts.search;
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
    const params = buildListParams(opts);
    if (opts?.eval_outcome !== undefined) params.eval_outcome = opts.eval_outcome;
    if (opts?.source_type !== undefined) params.source_type = opts.source_type;
    if (opts?.scan_origin !== undefined) params.scan_origin = opts.scan_origin;

    const res = await managementHttpRequest<ScanList>({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: MODEL_SEC_SCANS_PATH,
      params,
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
   * @param opts - Pagination options.
   * @returns Paginated list of rule evaluations.
   */
  async getEvaluations(
    scanUuid: string,
    opts?: ModelSecurityListOptions,
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
      params: buildListParams(opts),
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

    const params = buildListParams(opts);
    if (opts?.type !== undefined) params.type = opts.type;
    if (opts?.result !== undefined) params.result = opts.result;

    const res = await managementHttpRequest<FileList>({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${MODEL_SEC_SCANS_PATH}/${scanUuid}/files`,
      params,
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
  async getViolations(scanUuid: string, opts?: ModelSecurityListOptions): Promise<ViolationList> {
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
      params: buildListParams(opts),
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
  async getLabelKeys(opts?: ModelSecurityListOptions): Promise<LabelKeyList> {
    const res = await managementHttpRequest<LabelKeyList>({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${MODEL_SEC_SCANS_PATH}/label-keys`,
      params: buildListParams(opts),
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
  async getLabelValues(key: string, opts?: ModelSecurityListOptions): Promise<LabelValueList> {
    const res = await managementHttpRequest<LabelValueList>({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${MODEL_SEC_SCANS_PATH}/label-keys/${encodeURIComponent(key)}/values`,
      params: buildListParams(opts),
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
