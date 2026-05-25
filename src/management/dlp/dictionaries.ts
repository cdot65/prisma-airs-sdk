import { DLP_DICTIONARIES_PATH } from '../../constants.js';
import { request } from '../../http/request.js';
import type { AuthAdapter } from '../../http/types.js';
import {
  DictionaryResponseSchema,
  PageDictionaryResponseSchema,
  type DictionaryPatchRequest,
  type DictionaryRequest,
  type DictionaryResponse,
  type PageDictionaryResponse,
} from '../../models/dlp-dictionary.js';

/** Accepted shapes for the dictionary keyword-file payload. */
export type DictionaryFileInput = Blob | ArrayBuffer | Uint8Array | string;

/** Query parameters accepted by {@link DictionariesClient.list}. */
export interface DictionaryListParams {
  page?: number;
  size?: number;
  sort?: string[];
  /** When true, the API includes the `keywords` array in each response entry. */
  keywords?: boolean;
}

/** Parameters accepted by {@link DictionariesClient.get}. */
export interface DictionaryGetParams {
  /** When true, request that the response include the dictionary's keyword list. */
  includeKeywords?: boolean;
}

/** Parameters accepted by {@link DictionariesClient.create} and {@link DictionariesClient.replace}. */
export interface DictionaryUploadParams {
  metadata: DictionaryRequest;
  file: DictionaryFileInput;
  /** When true, the response will include the keyword list (`keywords=true` query param). */
  includeKeywords?: boolean;
}

/** @internal */
export interface DictionariesClientOptions {
  baseUrl: string;
  auth: AuthAdapter;
  numRetries: number;
}

function toBlob(file: DictionaryFileInput): Blob {
  if (file instanceof Blob) return file;
  if (typeof file === 'string') return new Blob([file], { type: 'text/plain' });
  if (file instanceof Uint8Array) return new Blob([file as Uint8Array<ArrayBuffer>]);
  return new Blob([file]);
}

function buildFormData(metadata: DictionaryRequest, file: DictionaryFileInput): FormData {
  const fd = new FormData();
  fd.append(
    'json',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' }),
    'metadata.json',
  );
  fd.append('file', toBlob(file), metadata.original_file_name);
  return fd;
}

/**
 * Client for the DLP Dictionaries resource (`/v2/api/dictionaries`).
 *
 * POST and PUT take a multipart body with `json` (the metadata) and `file` (the keyword
 * file) parts. PATCH uses JSON Merge Patch. DELETE returns 204 No Content. PUT can return
 * either a 200 with the resource or a 204 with no body, so {@link DictionariesClient.replace}
 * returns `DictionaryResponse | undefined`.
 */
export class DictionariesClient {
  private readonly baseUrl: string;
  private readonly auth: AuthAdapter;
  private readonly numRetries: number;

  constructor(opts: DictionariesClientOptions) {
    this.baseUrl = opts.baseUrl;
    this.auth = opts.auth;
    this.numRetries = opts.numRetries;
  }

  /**
   * List dictionaries. Returns the Spring `Page<>` envelope verbatim.
   * @example
   * ```ts
   * import { ManagementClient } from '@cdot65/prisma-airs-sdk';
   * const mgmt = new ManagementClient();
   *
   * const page = await mgmt.dlp.dictionaries.list({ size: 5 });
   * // page =>
   * // {
   * //   content: [{ id: 'dict-1', name: 'PII', category: 'Confidential', region_name: 'us', type: 'custom' }],
   * //   totalElements: 1, totalPages: 1, number: 0, size: 20, first: true, last: true
   * // }
   * ```
   */
  async list(params: DictionaryListParams = {}): Promise<PageDictionaryResponse> {
    const queryParams: Record<string, string | string[]> = {};
    if (params.page !== undefined) queryParams.page = String(params.page);
    if (params.size !== undefined) queryParams.size = String(params.size);
    if (params.sort !== undefined) queryParams.sort = params.sort;
    if (params.keywords !== undefined) queryParams.keywords = String(params.keywords);

    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: DLP_DICTIONARIES_PATH,
      params: queryParams,
      responseSchema: PageDictionaryResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Create a dictionary by uploading a keyword file. Sends a multipart body — the SDK does
   * not set Content-Type so the runtime can write the correct boundary.
   * @example
   * ```ts
   * import { ManagementClient } from '@cdot65/prisma-airs-sdk';
   * const mgmt = new ManagementClient();
   *
   * const created = await mgmt.dlp.dictionaries.create({
   *   metadata: {
   *     category: 'Confidential',
   *     name: 'PII',
   *     original_file_name: 'keywords.txt',
   *     region_name: 'us-west-2',
   *     type: 'custom',
   *   },
   *   file: 'alpha\nbravo\ncharlie\n',
   *   includeKeywords: true,
   * });
   * // created =>
   * // { id: 'dict-1', name: 'PII', category: 'Confidential', region_name: 'us-west-2', type: 'custom' }
   * ```
   */
  async create({
    metadata,
    file,
    includeKeywords,
  }: DictionaryUploadParams): Promise<DictionaryResponse> {
    const queryParams: Record<string, string> = {};
    if (includeKeywords !== undefined) queryParams.keywords = String(includeKeywords);

    return request({
      method: 'POST',
      baseUrl: this.baseUrl,
      path: DLP_DICTIONARIES_PATH,
      params: queryParams,
      formData: buildFormData(metadata, file),
      responseSchema: DictionaryResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Get a single dictionary by resource ID, optionally including its keyword list.
   * @example
   * ```ts
   * import { ManagementClient } from '@cdot65/prisma-airs-sdk';
   * const mgmt = new ManagementClient();
   *
   * const dict = await mgmt.dlp.dictionaries.get('dict-1', { includeKeywords: true });
   * // dict =>
   * // { id: 'dict-1', name: 'PII', category: 'Confidential', type: 'custom', keywords: ['alpha', 'bravo'] }
   * ```
   */
  async get(resourceId: string, params: DictionaryGetParams = {}): Promise<DictionaryResponse> {
    const queryParams: Record<string, string> = {};
    if (params.includeKeywords !== undefined) queryParams.keywords = String(params.includeKeywords);

    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${DLP_DICTIONARIES_PATH}/${encodeURIComponent(resourceId)}`,
      params: queryParams,
      responseSchema: DictionaryResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Full-replace the dictionary at `resourceId` via multipart upload.
   *
   * The API may respond with either 200 + body or 204 + no body — both are normal. Returns
   * the parsed body on 200 and `undefined` on 204.
   * @example
   * ```ts
   * import { ManagementClient } from '@cdot65/prisma-airs-sdk';
   * const mgmt = new ManagementClient();
   *
   * const replaced = await mgmt.dlp.dictionaries.replace('dict-1', {
   *   metadata: {
   *     category: 'Confidential',
   *     name: 'PII',
   *     original_file_name: 'keywords.txt',
   *     region_name: 'us-west-2',
   *     type: 'custom',
   *   },
   *   file: 'alpha\nbravo\ncharlie\ndelta\n',
   * });
   * // replaced => { id: 'dict-1', name: 'PII', ... } on 200, or undefined on 204
   * ```
   */
  async replace(
    resourceId: string,
    { metadata, file, includeKeywords }: DictionaryUploadParams,
  ): Promise<DictionaryResponse | undefined> {
    const queryParams: Record<string, string> = {};
    if (includeKeywords !== undefined) queryParams.keywords = String(includeKeywords);

    return request<DictionaryResponse | undefined>({
      method: 'PUT',
      baseUrl: this.baseUrl,
      path: `${DLP_DICTIONARIES_PATH}/${encodeURIComponent(resourceId)}`,
      params: queryParams,
      formData: buildFormData(metadata, file),
      responseSchema: DictionaryResponseSchema.optional(),
      allowEmptyBody: true,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Partial update via JSON Merge Patch (RFC 7396). Sent with
   * `Content-Type: application/merge-patch+json`.
   * @example
   * ```ts
   * import { ManagementClient } from '@cdot65/prisma-airs-sdk';
   * const mgmt = new ManagementClient();
   *
   * const patched = await mgmt.dlp.dictionaries.patch('dict-1', {
   *   category: 'Confidential',
   *   name: 'PII',
   *   original_file_name: 'keywords.txt',
   *   description: 'Updated by SDK',
   * });
   * // patched =>
   * // { id: 'dict-1', name: 'PII', category: 'Confidential', description: 'Updated by SDK' }
   * ```
   */
  async patch(resourceId: string, body: DictionaryPatchRequest): Promise<DictionaryResponse> {
    return request({
      method: 'PATCH',
      baseUrl: this.baseUrl,
      path: `${DLP_DICTIONARIES_PATH}/${encodeURIComponent(resourceId)}`,
      body,
      contentType: 'application/merge-patch+json',
      responseSchema: DictionaryResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Delete a dictionary. Resolves to `undefined` on the 204 No Content response.
   * @example
   * ```ts
   * import { ManagementClient } from '@cdot65/prisma-airs-sdk';
   * const mgmt = new ManagementClient();
   *
   * await mgmt.dlp.dictionaries.delete('dict-1');
   * // resolves to undefined (204 No Content)
   * ```
   */
  async delete(resourceId: string): Promise<void> {
    await request<void>({
      method: 'DELETE',
      baseUrl: this.baseUrl,
      path: `${DLP_DICTIONARIES_PATH}/${encodeURIComponent(resourceId)}`,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }
}
