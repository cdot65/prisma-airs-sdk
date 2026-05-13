import { RED_TEAM_CUSTOM_ATTACK_PATH, USER_AGENT } from '../constants.js';
import { AISecSDKException, ErrorType } from '../errors.js';
import { request } from '../http/request.js';
import type { AuthAdapter, PreparedRequest } from '../http/types.js';
import { serializeListing } from '../listing.js';
import { assertUuid } from '../validators.js';
import {
  BaseResponseSchema,
  CustomPromptSetResponseSchema,
  CustomPromptSetListSchema,
  CustomPromptSetListActiveSchema,
  CustomPromptSetReferenceSchema,
  CustomPromptSetVersionInfoSchema,
  CustomPromptResponseSchema,
  CustomPromptListSchema,
  PropertyNamesListResponseSchema,
  PropertyValuesResponseSchema,
  PropertyValuesMultipleResponseSchema,
  type CustomPromptSetCreateRequest,
  type CustomPromptSetUpdateRequest,
  type CustomPromptSetArchiveRequest,
  type CustomPromptSetResponse,
  type CustomPromptSetList,
  type CustomPromptSetListActive,
  type CustomPromptSetReference,
  type CustomPromptSetVersionInfo,
  type CustomPromptCreateRequest,
  type CustomPromptUpdateRequest,
  type CustomPromptResponse,
  type CustomPromptList,
  type PropertyNameCreateRequest,
  type PropertyValueCreateRequest,
  type PropertyNamesListResponse,
  type PropertyValuesResponse,
  type PropertyValuesMultipleResponse,
  type BaseResponse,
} from '../models/red-team.js';
import type { RedTeamListOptions } from './scans-client.js';

/** Prompt set list filter options. */
export interface PromptSetListOptions extends RedTeamListOptions {
  status?: string;
  active?: boolean;
  archive?: boolean;
}

/** Prompt list filter options. */
export interface PromptListOptions extends RedTeamListOptions {
  status?: string;
  active?: boolean;
}

/** @internal */
export interface RedTeamCustomAttacksClientOptions {
  baseUrl: string;
  auth: AuthAdapter;
  numRetries: number;
}

/** Client for Red Team management plane custom attack operations. */
export class RedTeamCustomAttacksClient {
  private readonly baseUrl: string;
  private readonly auth: AuthAdapter;
  private readonly numRetries: number;

  constructor(opts: RedTeamCustomAttacksClientOptions) {
    this.baseUrl = opts.baseUrl;
    this.auth = opts.auth;
    this.numRetries = opts.numRetries;
  }

  // -----------------------------------------------------------------------
  // Prompt Set operations
  // -----------------------------------------------------------------------

  /**
   * Create a new custom prompt set.
   * @param body - Prompt set creation request body.
   * @returns The created prompt set response.
   */
  async createPromptSet(body: CustomPromptSetCreateRequest): Promise<CustomPromptSetResponse> {
    return request({
      method: 'POST',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_CUSTOM_ATTACK_PATH}/custom-prompt-set`,
      body,
      responseSchema: CustomPromptSetResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * List custom prompt sets.
   * @param opts - Optional pagination, search, and filter options.
   * @returns The paginated list of prompt sets.
   */
  async listPromptSets(opts?: PromptSetListOptions): Promise<CustomPromptSetList> {
    const params = serializeListing(opts);
    if (opts?.status !== undefined) params.status = opts.status;
    if (opts?.active !== undefined) params.active = String(opts.active);
    if (opts?.archive !== undefined) params.archive = String(opts.archive);

    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_CUSTOM_ATTACK_PATH}/list-custom-prompt-sets`,
      params,
      responseSchema: CustomPromptSetListSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Get a prompt set by UUID.
   * @param uuid - The prompt set UUID.
   * @returns The prompt set response.
   */
  async getPromptSet(uuid: string): Promise<CustomPromptSetResponse> {
    assertUuid(uuid, 'prompt set uuid');
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_CUSTOM_ATTACK_PATH}/custom-prompt-set/${uuid}`,
      responseSchema: CustomPromptSetResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Update a prompt set.
   * @param uuid - The prompt set UUID.
   * @param body - Prompt set update request body.
   * @returns The updated prompt set response.
   */
  async updatePromptSet(
    uuid: string,
    body: CustomPromptSetUpdateRequest,
  ): Promise<CustomPromptSetResponse> {
    assertUuid(uuid, 'prompt set uuid');
    return request({
      method: 'PUT',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_CUSTOM_ATTACK_PATH}/custom-prompt-set/${uuid}`,
      body,
      responseSchema: CustomPromptSetResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Archive or unarchive a prompt set.
   * @param uuid - The prompt set UUID.
   * @param body - Archive request body.
   * @returns The updated prompt set response.
   */
  async archivePromptSet(
    uuid: string,
    body: CustomPromptSetArchiveRequest,
  ): Promise<CustomPromptSetResponse> {
    assertUuid(uuid, 'prompt set uuid');
    return request({
      method: 'PUT',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_CUSTOM_ATTACK_PATH}/custom-prompt-set/${uuid}/archive`,
      body,
      responseSchema: CustomPromptSetResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Resolve a prompt set reference for data plane consumption.
   * @param uuid - The prompt set UUID.
   * @returns The prompt set reference.
   */
  async getPromptSetReference(uuid: string): Promise<CustomPromptSetReference> {
    assertUuid(uuid, 'prompt set uuid');
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_CUSTOM_ATTACK_PATH}/custom-prompt-set/${uuid}/reference`,
      responseSchema: CustomPromptSetReferenceSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Get version information for a prompt set.
   * @param uuid - The prompt set UUID.
   * @param opts - Optional query params (e.g. specific version ID).
   * @returns The prompt set version info.
   */
  async getPromptSetVersionInfo(
    uuid: string,
    opts?: { version?: string },
  ): Promise<CustomPromptSetVersionInfo> {
    assertUuid(uuid, 'prompt set uuid');
    const params: Record<string, string> = {};
    if (opts?.version !== undefined) params.version = opts.version;

    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_CUSTOM_ATTACK_PATH}/custom-prompt-set/${uuid}/version-info`,
      params: Object.keys(params).length > 0 ? params : undefined,
      responseSchema: CustomPromptSetVersionInfoSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * List active prompt sets (for data plane).
   * @returns The list of active prompt sets.
   */
  async listActivePromptSets(): Promise<CustomPromptSetListActive> {
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_CUSTOM_ATTACK_PATH}/active-custom-prompt-sets`,
      responseSchema: CustomPromptSetListActiveSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Download CSV template for a prompt set.
   *
   * Bypasses `request()` because the response is `text/csv`, not JSON, and
   * `request()` unconditionally `JSON.parse()`s 2xx bodies.
   *
   * @param uuid - The prompt set UUID.
   * @returns The CSV template content as a raw string.
   */
  async downloadTemplate(uuid: string): Promise<string> {
    assertUuid(uuid, 'prompt set uuid');

    const url = new URL(
      `${this.baseUrl.replace(/\/+$/, '')}${RED_TEAM_CUSTOM_ATTACK_PATH}/download-template/${uuid}`,
    );

    const stub: PreparedRequest = {
      method: 'GET',
      url,
      headers: { 'User-Agent': USER_AGENT },
    };
    const prepared = await this.auth.prepare(stub);

    const response = await fetch(prepared.url.toString(), {
      method: 'GET',
      headers: prepared.headers,
    });

    const text = await response.text();
    if (!response.ok) {
      throw new AISecSDKException(
        `Download template failed (${response.status}): ${text}`,
        ErrorType.SERVER_SIDE_ERROR,
      );
    }
    return text;
  }

  /**
   * Upload a CSV file of custom prompts for a prompt set.
   * Bypasses `request()` because the body is `FormData`, not JSON.
   * @param promptSetUuid - The prompt set UUID.
   * @param file - The CSV file blob.
   * @returns The upload response.
   */
  async uploadPromptsCsv(promptSetUuid: string, file: Blob): Promise<BaseResponse> {
    assertUuid(promptSetUuid, 'prompt set uuid');

    const url = new URL(
      `${this.baseUrl.replace(/\/+$/, '')}${RED_TEAM_CUSTOM_ATTACK_PATH}/upload-custom-prompts-csv`,
    );
    url.searchParams.set('prompt_set_uuid', promptSetUuid);

    const stub: PreparedRequest = {
      method: 'POST',
      url,
      headers: { 'User-Agent': USER_AGENT },
    };
    const prepared = await this.auth.prepare(stub);

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(prepared.url.toString(), {
      method: 'POST',
      headers: prepared.headers,
      body: formData,
    });

    const text = await response.text();
    if (!response.ok) {
      throw new AISecSDKException(
        `Upload failed (${response.status}): ${text}`,
        ErrorType.SERVER_SIDE_ERROR,
      );
    }
    return text
      ? (JSON.parse(text) as BaseResponse)
      : ({ message: 'ok', status: 201 } as BaseResponse);
  }

  // -----------------------------------------------------------------------
  // Prompt operations
  // -----------------------------------------------------------------------

  /**
   * Create a new custom prompt.
   * @param body - Prompt creation request body.
   * @returns The created prompt response.
   */
  async createPrompt(body: CustomPromptCreateRequest): Promise<CustomPromptResponse> {
    return request({
      method: 'POST',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_CUSTOM_ATTACK_PATH}/custom-prompt-set/custom-prompt`,
      body,
      responseSchema: CustomPromptResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * List prompts in a prompt set.
   * @param promptSetUuid - The prompt set UUID.
   * @param opts - Optional pagination, search, and filter options.
   * @returns The paginated list of prompts.
   */
  async listPrompts(promptSetUuid: string, opts?: PromptListOptions): Promise<CustomPromptList> {
    assertUuid(promptSetUuid, 'prompt set uuid');
    const params = serializeListing(opts);
    if (opts?.status !== undefined) params.status = opts.status;
    if (opts?.active !== undefined) params.active = String(opts.active);

    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_CUSTOM_ATTACK_PATH}/custom-prompt-set/${promptSetUuid}/list-custom-prompts`,
      params,
      responseSchema: CustomPromptListSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Get a prompt by UUID.
   * @param promptSetUuid - The prompt set UUID.
   * @param promptUuid - The prompt UUID.
   * @returns The prompt response.
   */
  async getPrompt(promptSetUuid: string, promptUuid: string): Promise<CustomPromptResponse> {
    assertUuid(promptSetUuid, 'prompt set uuid');
    assertUuid(promptUuid, 'prompt uuid');
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_CUSTOM_ATTACK_PATH}/custom-prompt-set/${promptSetUuid}/custom-prompt/${promptUuid}`,
      responseSchema: CustomPromptResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Update a prompt.
   * @param promptSetUuid - The prompt set UUID.
   * @param promptUuid - The prompt UUID.
   * @param body - Prompt update request body.
   * @returns The updated prompt response.
   */
  async updatePrompt(
    promptSetUuid: string,
    promptUuid: string,
    body: CustomPromptUpdateRequest,
  ): Promise<CustomPromptResponse> {
    assertUuid(promptSetUuid, 'prompt set uuid');
    assertUuid(promptUuid, 'prompt uuid');
    return request({
      method: 'PUT',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_CUSTOM_ATTACK_PATH}/custom-prompt-set/${promptSetUuid}/custom-prompt/${promptUuid}`,
      body,
      responseSchema: CustomPromptResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Delete a prompt.
   * @param promptSetUuid - The prompt set UUID.
   * @param promptUuid - The prompt UUID.
   * @returns The delete response.
   */
  async deletePrompt(promptSetUuid: string, promptUuid: string): Promise<BaseResponse> {
    assertUuid(promptSetUuid, 'prompt set uuid');
    assertUuid(promptUuid, 'prompt uuid');
    return request({
      method: 'DELETE',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_CUSTOM_ATTACK_PATH}/custom-prompt-set/${promptSetUuid}/custom-prompt/${promptUuid}`,
      responseSchema: BaseResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  // -----------------------------------------------------------------------
  // Property operations
  // -----------------------------------------------------------------------

  /**
   * Get all property names.
   * @returns The list of property names.
   */
  async getPropertyNames(): Promise<PropertyNamesListResponse> {
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_CUSTOM_ATTACK_PATH}/property-names`,
      responseSchema: PropertyNamesListResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Create a new property name.
   * @param body - Property name creation request body.
   * @returns The creation response.
   */
  async createPropertyName(body: PropertyNameCreateRequest): Promise<BaseResponse> {
    return request({
      method: 'POST',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_CUSTOM_ATTACK_PATH}/property-names`,
      body,
      responseSchema: BaseResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Get values for a property name.
   * @param propertyName - The property name to look up.
   * @returns The property values response.
   */
  async getPropertyValues(propertyName: string): Promise<PropertyValuesResponse> {
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_CUSTOM_ATTACK_PATH}/property-values/${encodeURIComponent(propertyName)}`,
      responseSchema: PropertyValuesResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Get values for multiple property names.
   * @param propertyNames - Array of property names to look up.
   * @returns The property values for all requested names.
   */
  async getPropertyValuesMultiple(
    propertyNames: string[],
  ): Promise<PropertyValuesMultipleResponse> {
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_CUSTOM_ATTACK_PATH}/property-values`,
      params: { property_names: propertyNames },
      responseSchema: PropertyValuesMultipleResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Create a property value.
   * @param body - Property value creation request body.
   * @returns The creation response.
   */
  async createPropertyValue(body: PropertyValueCreateRequest): Promise<BaseResponse> {
    return request({
      method: 'POST',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_CUSTOM_ATTACK_PATH}/property-values`,
      body,
      responseSchema: BaseResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }
}
