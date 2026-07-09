import { MODEL_SEC_MODELS_PATH, MODEL_SEC_MODEL_VERSIONS_PATH } from '../constants.js';
import { request } from '../http/request.js';
import type { AuthAdapter } from '../http/types.js';
import { serializeListing, type ListingOptions } from '../listing.js';
import { assertUuid } from '../validators.js';
import {
  ModelResponseSchema,
  ModelListSchema,
  ModelVersionResponseSchema,
  ModelVersionListSchema,
  FileListSchema,
  type Model,
  type ModelList,
  type ModelVersion,
  type ModelVersionList,
  type FileList,
} from '../models/model-security.js';

/** Pagination + filter options for listing models. */
export interface ModelSecurityModelListOptions extends ListingOptions {
  /** Search query (matches model UUID or name). */
  search_query?: string;
  /** Sort field: 'created_at' or 'updated_at'. */
  sort_field?: string;
  /** Sort order: 'asc' or 'desc'. */
  sort_order?: string;
  /** Filter by the latest version's evaluation outcomes (array). */
  latest_version_outcomes?: string[];
  /** Filter by the latest version's model formats (array). */
  latest_version_formats?: string[];
  /** Filter by the latest version's source types (array). */
  latest_version_source_types?: string[];
  /** Only models whose latest version was scanned before this ISO datetime. */
  latest_version_scan_time_before?: string;
  /** Filter by created start time (ISO datetime). */
  start_time?: string;
  /** Filter by created end time (ISO datetime). */
  end_time?: string;
}

/** Pagination + sort options for listing a model's versions. */
export interface ModelSecurityModelVersionListOptions extends ListingOptions {
  /** Sort order: 'asc' or 'desc'. */
  sort_order?: string;
}

/** Pagination options for listing a model version's files. */
export type ModelSecurityModelVersionFileListOptions = ListingOptions;

/** @internal */
export interface ModelSecurityModelsClientOptions {
  baseUrl: string;
  auth: AuthAdapter;
  numRetries: number;
}

function buildModelListParams(
  opts?: ModelSecurityModelListOptions,
): Record<string, string | string[]> {
  const params: Record<string, string | string[]> = serializeListing(opts);
  if (opts?.search_query !== undefined) params.search_query = opts.search_query;
  if (opts?.sort_field !== undefined) params.sort_field = opts.sort_field;
  if (opts?.sort_order !== undefined) params.sort_order = opts.sort_order;
  if (opts?.latest_version_outcomes !== undefined)
    params.latest_version_outcomes = opts.latest_version_outcomes;
  if (opts?.latest_version_formats !== undefined)
    params.latest_version_formats = opts.latest_version_formats;
  if (opts?.latest_version_source_types !== undefined)
    params.latest_version_source_types = opts.latest_version_source_types;
  if (opts?.latest_version_scan_time_before !== undefined)
    params.latest_version_scan_time_before = opts.latest_version_scan_time_before;
  if (opts?.start_time !== undefined) params.start_time = opts.start_time;
  if (opts?.end_time !== undefined) params.end_time = opts.end_time;
  return params;
}

/** Client for Model Security data plane model and model-version operations (read-only). */
export class ModelSecurityModelsClient {
  private readonly baseUrl: string;
  private readonly auth: AuthAdapter;
  private readonly numRetries: number;

  constructor(opts: ModelSecurityModelsClientOptions) {
    this.baseUrl = opts.baseUrl;
    this.auth = opts.auth;
    this.numRetries = opts.numRetries;
  }

  /**
   * List models with optional search, sort, and latest-version filters.
   * @param opts - Pagination and filter options.
   * @returns Paginated list of models.
   * @example
   * ```ts
   * import { ModelSecurityClient } from '@cdot65/prisma-airs-sdk';
   * const ms = new ModelSecurityClient();
   *
   * const models = await ms.models.listModels({ limit: 10, search_query: 'llama' });
   * // models =>
   * // { pagination: { total_items: 3 }, models: [{ uuid: '550e8400-...', name: 'org/llama', latest_version_outcome: 'PASSED' }] }
   * ```
   */
  async listModels(opts?: ModelSecurityModelListOptions): Promise<ModelList> {
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: MODEL_SEC_MODELS_PATH,
      params: buildModelListParams(opts),
      responseSchema: ModelListSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Get a single model by UUID.
   * @param uuid - Model UUID.
   * @returns The model.
   * @example
   * ```ts
   * import { ModelSecurityClient } from '@cdot65/prisma-airs-sdk';
   * const ms = new ModelSecurityClient();
   *
   * const model = await ms.models.getModel('550e8400-e29b-41d4-a716-446655440000');
   * // model =>
   * // { uuid: '550e8400-...', name: 'org/model', latest_version_uuid: '660e8400-...', latest_version_outcome: 'PASSED' }
   * ```
   */
  async getModel(uuid: string): Promise<Model> {
    assertUuid(uuid, 'model uuid');
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${MODEL_SEC_MODELS_PATH}/${uuid}`,
      responseSchema: ModelResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * List the versions of a model.
   * @param modelUuid - Model UUID.
   * @param opts - Pagination and sort options.
   * @returns Paginated list of model versions.
   * @example
   * ```ts
   * import { ModelSecurityClient } from '@cdot65/prisma-airs-sdk';
   * const ms = new ModelSecurityClient();
   *
   * const versions = await ms.models.listModelVersions('550e8400-e29b-41d4-a716-446655440000', {
   *   sort_order: 'desc',
   * });
   * // versions =>
   * // { pagination: { total_items: 2 }, model_versions: [{ uuid: '660e8400-...', revision: 'main', file_count: 12 }] }
   * ```
   */
  async listModelVersions(
    modelUuid: string,
    opts?: ModelSecurityModelVersionListOptions,
  ): Promise<ModelVersionList> {
    assertUuid(modelUuid, 'model uuid');
    const params = serializeListing(opts);
    if (opts?.sort_order !== undefined) params.sort_order = opts.sort_order;
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${MODEL_SEC_MODELS_PATH}/${modelUuid}/model-versions`,
      params,
      responseSchema: ModelVersionListSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Get a single model version by UUID.
   * @param uuid - Model version UUID.
   * @returns The model version.
   * @example
   * ```ts
   * import { ModelSecurityClient } from '@cdot65/prisma-airs-sdk';
   * const ms = new ModelSecurityClient();
   *
   * const version = await ms.models.getModelVersion('660e8400-e29b-41d4-a716-446655440000');
   * // version =>
   * // { uuid: '660e8400-...', revision: 'main', model_uuid: '550e8400-...', last_eval_outcome: 'PASSED' }
   * ```
   */
  async getModelVersion(uuid: string): Promise<ModelVersion> {
    assertUuid(uuid, 'model version uuid');
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${MODEL_SEC_MODEL_VERSIONS_PATH}/${uuid}`,
      responseSchema: ModelVersionResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * List the files of a model version.
   * @param modelVersionUuid - Model version UUID.
   * @param opts - Pagination options.
   * @returns Paginated list of files (same shape as scan files).
   * @example
   * ```ts
   * import { ModelSecurityClient } from '@cdot65/prisma-airs-sdk';
   * const ms = new ModelSecurityClient();
   *
   * const files = await ms.models.listModelVersionFiles('660e8400-e29b-41d4-a716-446655440000', {
   *   limit: 50,
   * });
   * // files =>
   * // { pagination: { total_items: 12 }, files: [{ uuid: '770e8400-...', path: '/model.safetensors', type: 'FILE', result: 'SUCCESS' }] }
   * ```
   */
  async listModelVersionFiles(
    modelVersionUuid: string,
    opts?: ModelSecurityModelVersionFileListOptions,
  ): Promise<FileList> {
    assertUuid(modelVersionUuid, 'model version uuid');
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${MODEL_SEC_MODEL_VERSIONS_PATH}/${modelVersionUuid}/files`,
      params: serializeListing(opts),
      responseSchema: FileListSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }
}
