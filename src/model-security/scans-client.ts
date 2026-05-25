import {
  MODEL_SEC_SCANS_PATH,
  MODEL_SEC_EVALUATIONS_PATH,
  MODEL_SEC_VIOLATIONS_PATH,
} from '../constants.js';
import { request } from '../http/request.js';
import type { AuthAdapter } from '../http/types.js';
import { serializeListing, type ListingOptions } from '../listing.js';
import { assertUuid } from '../validators.js';
import {
  ScanBaseResponseSchema,
  ScanListSchema,
  RuleEvaluationListSchema,
  RuleEvaluationResponseSchema,
  FileListSchema,
  LabelsResponseSchema,
  ViolationListSchema,
  ViolationResponseSchema,
  LabelKeyListSchema,
  LabelValueListSchema,
  type ScanCreateRequest,
  type ScanBaseResponse,
  type ScanList,
  type RuleEvaluationList,
  type RuleEvaluationResponse,
  type FileList,
  type LabelsCreateRequest,
  type LabelsResponse,
  type ViolationList,
  type ViolationResponse,
  type LabelKeyList,
  type LabelValueList,
} from '../models/model-security.js';

/** Pagination + filter options for model security scan listing. */
export interface ModelSecurityScanListOptions extends ListingOptions {
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
export interface ModelSecurityEvaluationListOptions extends ListingOptions {
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
export interface ModelSecurityFileListOptions extends ListingOptions {
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
export type ModelSecurityLabelListOptions = ListingOptions;

/** Options for listing violations. */
export type ModelSecurityViolationListOptions = ListingOptions;

/** @internal */
export interface ModelSecurityScansClientOptions {
  baseUrl: string;
  auth: AuthAdapter;
  numRetries: number;
}

function buildScanListParams(
  opts?: ModelSecurityScanListOptions,
): Record<string, string | string[]> {
  const params: Record<string, string | string[]> = serializeListing(opts);
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

function buildEvaluationListParams(
  opts?: ModelSecurityEvaluationListOptions,
): Record<string, string> {
  const params = serializeListing(opts);
  if (opts?.sort_field !== undefined) params.sort_field = opts.sort_field;
  if (opts?.sort_order !== undefined) params.sort_order = opts.sort_order;
  if (opts?.result !== undefined) params.result = opts.result;
  if (opts?.rule_instance_uuid !== undefined) params.rule_instance_uuid = opts.rule_instance_uuid;
  return params;
}

function buildFileListParams(opts?: ModelSecurityFileListOptions): Record<string, string> {
  const params = serializeListing(opts);
  if (opts?.sort_field !== undefined) params.sort_field = opts.sort_field;
  if (opts?.sort_dir !== undefined) params.sort_dir = opts.sort_dir;
  if (opts?.type !== undefined) params.type = opts.type;
  if (opts?.result !== undefined) params.result = opts.result;
  if (opts?.query_path !== undefined) params.query_path = opts.query_path;
  return params;
}

/** Client for Model Security data plane scan operations. */
export class ModelSecurityScansClient {
  private readonly baseUrl: string;
  private readonly auth: AuthAdapter;
  private readonly numRetries: number;

  constructor(opts: ModelSecurityScansClientOptions) {
    this.baseUrl = opts.baseUrl;
    this.auth = opts.auth;
    this.numRetries = opts.numRetries;
  }

  /**
   * Create a new model security scan.
   * @param body - Scan creation request body.
   * @returns The created scan response.
   * @example
   * ```ts
   * import { ModelSecurityClient } from '@cdot65/prisma-airs-sdk';
   * const ms = new ModelSecurityClient();
   *
   * const scan = await ms.scans.create({
   *   model_uri: 'hf://org/model',
   *   security_group_uuid: '550e8400-e29b-41d4-a716-446655440000',
   *   scan_origin: 'MODEL_SECURITY_SDK',
   * });
   * // scan =>
   * // { uuid: '550e8400-...', eval_outcome: 'PENDING', source_type: 'HUGGING_FACE', ... }
   * ```
   */
  async create(body: ScanCreateRequest): Promise<ScanBaseResponse> {
    return request({
      method: 'POST',
      baseUrl: this.baseUrl,
      path: MODEL_SEC_SCANS_PATH,
      body,
      responseSchema: ScanBaseResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * List model security scans with optional filters.
   * @param opts - Pagination and filter options.
   * @returns Paginated list of scans.
   * @example
   * ```ts
   * import { ModelSecurityClient } from '@cdot65/prisma-airs-sdk';
   * const ms = new ModelSecurityClient();
   *
   * const scans = await ms.scans.list({ limit: 5, source_types: ['HUGGING_FACE'] });
   * // scans =>
   * // { pagination: { total_items: 42 }, scans: [{ uuid: '550e8400-...', eval_outcome: 'ALLOWED', ... }] }
   * ```
   */
  async list(opts?: ModelSecurityScanListOptions): Promise<ScanList> {
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: MODEL_SEC_SCANS_PATH,
      params: buildScanListParams(opts),
      responseSchema: ScanListSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Get a single scan by UUID.
   * @param uuid - Scan UUID.
   * @returns The scan response.
   * @example
   * ```ts
   * import { ModelSecurityClient } from '@cdot65/prisma-airs-sdk';
   * const ms = new ModelSecurityClient();
   *
   * const scan = await ms.scans.get('550e8400-e29b-41d4-a716-446655440000');
   * // scan =>
   * // { uuid: '550e8400-...', eval_outcome: 'ALLOWED', model_uri: 'hf://org/model', ... }
   * ```
   */
  async get(uuid: string): Promise<ScanBaseResponse> {
    assertUuid(uuid, 'scan uuid');
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${MODEL_SEC_SCANS_PATH}/${uuid}`,
      responseSchema: ScanBaseResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Get rule evaluations for a scan.
   * @param scanUuid - Scan UUID.
   * @param opts - Pagination and filter options.
   * @returns Paginated list of rule evaluations.
   * @example
   * ```ts
   * import { ModelSecurityClient } from '@cdot65/prisma-airs-sdk';
   * const ms = new ModelSecurityClient();
   *
   * const evals = await ms.scans.getEvaluations('550e8400-e29b-41d4-a716-446655440000', {
   *   result: 'FAILED',
   * });
   * // evals.evaluations =>
   * // [{ uuid: '660e8400-...', rule_name: 'Pickle Scan', result: 'FAILED', violation_count: 2, ... }]
   * ```
   */
  async getEvaluations(
    scanUuid: string,
    opts?: ModelSecurityEvaluationListOptions,
  ): Promise<RuleEvaluationList> {
    assertUuid(scanUuid, 'scan uuid');
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${MODEL_SEC_SCANS_PATH}/${scanUuid}/evaluations`,
      params: buildEvaluationListParams(opts),
      responseSchema: RuleEvaluationListSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Get files for a scan.
   * @param scanUuid - Scan UUID.
   * @param opts - Pagination and file filter options.
   * @returns Paginated list of files.
   * @example
   * ```ts
   * import { ModelSecurityClient } from '@cdot65/prisma-airs-sdk';
   * const ms = new ModelSecurityClient();
   *
   * const files = await ms.scans.getFiles('550e8400-e29b-41d4-a716-446655440000', {
   *   query_path: '/',
   * });
   * // files.files =>
   * // [{ uuid: '660e8400-...', path: '/model.bin', type: 'FILE', result: 'SUCCESS', ... }]
   * ```
   */
  async getFiles(scanUuid: string, opts?: ModelSecurityFileListOptions): Promise<FileList> {
    assertUuid(scanUuid, 'scan uuid');
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${MODEL_SEC_SCANS_PATH}/${scanUuid}/files`,
      params: buildFileListParams(opts),
      responseSchema: FileListSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Add labels to a scan (merge with existing).
   * @param scanUuid - Scan UUID.
   * @param body - Labels to add.
   * @returns Labels response.
   * @example
   * ```ts
   * import { ModelSecurityClient } from '@cdot65/prisma-airs-sdk';
   * const ms = new ModelSecurityClient();
   *
   * const res = await ms.scans.addLabels('550e8400-e29b-41d4-a716-446655440000', {
   *   labels: [{ key: 'env', value: 'prod' }],
   * });
   * // res => {} (empty object on success)
   * ```
   */
  async addLabels(scanUuid: string, body: LabelsCreateRequest): Promise<LabelsResponse> {
    assertUuid(scanUuid, 'scan uuid');
    return request({
      method: 'POST',
      baseUrl: this.baseUrl,
      path: `${MODEL_SEC_SCANS_PATH}/${scanUuid}/labels`,
      body,
      responseSchema: LabelsResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Set labels on a scan (replace all existing).
   * @param scanUuid - Scan UUID.
   * @param body - Labels to set.
   * @returns Labels response.
   * @example
   * ```ts
   * import { ModelSecurityClient } from '@cdot65/prisma-airs-sdk';
   * const ms = new ModelSecurityClient();
   *
   * const res = await ms.scans.setLabels('550e8400-e29b-41d4-a716-446655440000', {
   *   labels: [{ key: 'env', value: 'staging' }],
   * });
   * // res => {} (empty object on success)
   * ```
   */
  async setLabels(scanUuid: string, body: LabelsCreateRequest): Promise<LabelsResponse> {
    assertUuid(scanUuid, 'scan uuid');
    return request({
      method: 'PUT',
      baseUrl: this.baseUrl,
      path: `${MODEL_SEC_SCANS_PATH}/${scanUuid}/labels`,
      body,
      responseSchema: LabelsResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Delete labels from a scan by key.
   * @param scanUuid - Scan UUID.
   * @param keys - Label keys to delete.
   * @returns Resolves when the labels are deleted.
   * @example
   * ```ts
   * import { ModelSecurityClient } from '@cdot65/prisma-airs-sdk';
   * const ms = new ModelSecurityClient();
   *
   * await ms.scans.deleteLabels('550e8400-e29b-41d4-a716-446655440000', ['env', 'team']);
   * // resolves to undefined on success
   * ```
   */
  async deleteLabels(scanUuid: string, keys: string[]): Promise<void> {
    assertUuid(scanUuid, 'scan uuid');
    await request({
      method: 'DELETE',
      baseUrl: this.baseUrl,
      path: `${MODEL_SEC_SCANS_PATH}/${scanUuid}/labels`,
      params: { keys },
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Get rule violations for a scan.
   * @param scanUuid - Scan UUID.
   * @param opts - Pagination options.
   * @returns Paginated list of violations.
   * @example
   * ```ts
   * import { ModelSecurityClient } from '@cdot65/prisma-airs-sdk';
   * const ms = new ModelSecurityClient();
   *
   * const v = await ms.scans.getViolations('550e8400-e29b-41d4-a716-446655440000', { limit: 10 });
   * // v.violations =>
   * // [{ uuid: '660e8400-...', rule_name: 'Pickle Scan', description: 'Unsafe pickle opcode', ... }]
   * ```
   */
  async getViolations(
    scanUuid: string,
    opts?: ModelSecurityViolationListOptions,
  ): Promise<ViolationList> {
    assertUuid(scanUuid, 'scan uuid');
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${MODEL_SEC_SCANS_PATH}/${scanUuid}/rule-violations`,
      params: serializeListing(opts),
      responseSchema: ViolationListSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Get distinct label keys across all scans.
   * @param opts - Pagination options.
   * @returns Paginated list of label keys.
   * @example
   * ```ts
   * import { ModelSecurityClient } from '@cdot65/prisma-airs-sdk';
   * const ms = new ModelSecurityClient();
   *
   * const keys = await ms.scans.getLabelKeys({ limit: 50 });
   * // keys =>
   * // { pagination: { total_items: 3 }, keys: ['env', 'team', 'owner'] }
   * ```
   */
  async getLabelKeys(opts?: ModelSecurityLabelListOptions): Promise<LabelKeyList> {
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${MODEL_SEC_SCANS_PATH}/label-keys`,
      params: serializeListing(opts),
      responseSchema: LabelKeyListSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Get distinct values for a label key.
   * @param key - Label key to get values for.
   * @param opts - Pagination options.
   * @returns Paginated list of label values.
   * @example
   * ```ts
   * import { ModelSecurityClient } from '@cdot65/prisma-airs-sdk';
   * const ms = new ModelSecurityClient();
   *
   * const values = await ms.scans.getLabelValues('env', { limit: 50 });
   * // values =>
   * // { pagination: { total_items: 2 }, values: ['prod', 'staging'] }
   * ```
   */
  async getLabelValues(key: string, opts?: ModelSecurityLabelListOptions): Promise<LabelValueList> {
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${MODEL_SEC_SCANS_PATH}/label-keys/${encodeURIComponent(key)}/values`,
      params: serializeListing(opts),
      responseSchema: LabelValueListSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Get a single rule evaluation by UUID.
   * @param uuid - Evaluation UUID.
   * @returns The rule evaluation response.
   * @example
   * ```ts
   * import { ModelSecurityClient } from '@cdot65/prisma-airs-sdk';
   * const ms = new ModelSecurityClient();
   *
   * const ev = await ms.scans.getEvaluation('660e8400-e29b-41d4-a716-446655440000');
   * // ev =>
   * // { uuid: '660e8400-...', rule_name: 'Pickle Scan', result: 'FAILED', violation_count: 2, ... }
   * ```
   */
  async getEvaluation(uuid: string): Promise<RuleEvaluationResponse> {
    assertUuid(uuid, 'evaluation uuid');
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${MODEL_SEC_EVALUATIONS_PATH}/${uuid}`,
      responseSchema: RuleEvaluationResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Get a single violation by UUID.
   * @param uuid - Violation UUID.
   * @returns The violation response.
   * @example
   * ```ts
   * import { ModelSecurityClient } from '@cdot65/prisma-airs-sdk';
   * const ms = new ModelSecurityClient();
   *
   * const violation = await ms.scans.getViolation('660e8400-e29b-41d4-a716-446655440000');
   * // violation =>
   * // { uuid: '660e8400-...', rule_name: 'Pickle Scan', description: 'Unsafe pickle opcode', ... }
   * ```
   */
  async getViolation(uuid: string): Promise<ViolationResponse> {
    assertUuid(uuid, 'violation uuid');
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${MODEL_SEC_VIOLATIONS_PATH}/${uuid}`,
      responseSchema: ViolationResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }
}
