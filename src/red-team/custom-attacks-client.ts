import { RED_TEAM_CUSTOM_ATTACK_PATH, USER_AGENT } from '../constants.js';
import { AISecSDKException, ErrorType } from '../errors.js';
import { isValidUuid } from '../utils.js';
import { managementHttpRequest } from '../management/management-http-client.js';
import { buildRedTeamListParams } from './list-params.js';
import type { OAuthClient } from '../management/oauth-client.js';
import type { RedTeamListOptions } from './scans-client.js';
import type {
  CustomPromptSetCreateRequest,
  CustomPromptSetUpdateRequest,
  CustomPromptSetArchiveRequest,
  CustomPromptSetResponse,
  CustomPromptSetList,
  CustomPromptSetListActive,
  CustomPromptSetReference,
  CustomPromptSetVersionInfo,
  CustomPromptCreateRequest,
  CustomPromptUpdateRequest,
  CustomPromptResponse,
  CustomPromptList,
  PropertyNameCreateRequest,
  PropertyValueCreateRequest,
  PropertyNamesListResponse,
  PropertyValuesResponse,
  PropertyValuesMultipleResponse,
  BaseResponse,
} from '../models/red-team.js';

/** Prompt set list filter options. */
export interface PromptSetListOptions extends RedTeamListOptions {
  status?: string;
  active?: boolean;
  archive?: boolean;
}

/** Prompt list filter options. */
export interface PromptListOptions extends RedTeamListOptions {
  active?: boolean;
}

/** @internal */
export interface RedTeamCustomAttacksClientOptions {
  baseUrl: string;
  oauthClient: OAuthClient;
  numRetries: number;
}

function validateUuid(uuid: string, label: string): void {
  if (!isValidUuid(uuid)) {
    throw new AISecSDKException(`Invalid ${label}: ${uuid}`, ErrorType.USER_REQUEST_PAYLOAD_ERROR);
  }
}

/** Client for Red Team management plane custom attack operations. */
export class RedTeamCustomAttacksClient {
  private readonly baseUrl: string;
  private readonly oauthClient: OAuthClient;
  private readonly numRetries: number;

  constructor(opts: RedTeamCustomAttacksClientOptions) {
    this.baseUrl = opts.baseUrl;
    this.oauthClient = opts.oauthClient;
    this.numRetries = opts.numRetries;
  }

  // -----------------------------------------------------------------------
  // Prompt Set operations
  // -----------------------------------------------------------------------

  /** Create a new custom prompt set. */
  async createPromptSet(request: CustomPromptSetCreateRequest): Promise<CustomPromptSetResponse> {
    const res = await managementHttpRequest<CustomPromptSetResponse>({
      method: 'POST',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_CUSTOM_ATTACK_PATH}/custom-prompt-set`,
      body: request,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /** List custom prompt sets. */
  async listPromptSets(opts?: PromptSetListOptions): Promise<CustomPromptSetList> {
    const params = buildRedTeamListParams(opts);
    if (opts?.status !== undefined) params.status = opts.status;
    if (opts?.active !== undefined) params.active = String(opts.active);
    if (opts?.archive !== undefined) params.archive = String(opts.archive);

    const res = await managementHttpRequest<CustomPromptSetList>({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_CUSTOM_ATTACK_PATH}/list-custom-prompt-sets`,
      params,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /** Get a prompt set by UUID. */
  async getPromptSet(uuid: string): Promise<CustomPromptSetResponse> {
    validateUuid(uuid, 'prompt set uuid');
    const res = await managementHttpRequest<CustomPromptSetResponse>({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_CUSTOM_ATTACK_PATH}/custom-prompt-set/${uuid}`,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /** Update a prompt set. */
  async updatePromptSet(
    uuid: string,
    request: CustomPromptSetUpdateRequest,
  ): Promise<CustomPromptSetResponse> {
    validateUuid(uuid, 'prompt set uuid');
    const res = await managementHttpRequest<CustomPromptSetResponse>({
      method: 'PUT',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_CUSTOM_ATTACK_PATH}/custom-prompt-set/${uuid}`,
      body: request,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /** Archive or unarchive a prompt set. */
  async archivePromptSet(
    uuid: string,
    request: CustomPromptSetArchiveRequest,
  ): Promise<CustomPromptSetResponse> {
    validateUuid(uuid, 'prompt set uuid');
    const res = await managementHttpRequest<CustomPromptSetResponse>({
      method: 'PUT',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_CUSTOM_ATTACK_PATH}/custom-prompt-set/${uuid}/archive`,
      body: request,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /** Resolve a prompt set reference for data plane consumption. */
  async getPromptSetReference(uuid: string): Promise<CustomPromptSetReference> {
    validateUuid(uuid, 'prompt set uuid');
    const res = await managementHttpRequest<CustomPromptSetReference>({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_CUSTOM_ATTACK_PATH}/custom-prompt-set/${uuid}/reference`,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /** Get version information for a prompt set. */
  async getPromptSetVersionInfo(uuid: string): Promise<CustomPromptSetVersionInfo> {
    validateUuid(uuid, 'prompt set uuid');
    const res = await managementHttpRequest<CustomPromptSetVersionInfo>({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_CUSTOM_ATTACK_PATH}/custom-prompt-set/${uuid}/version-info`,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /** List active prompt sets (for data plane). */
  async listActivePromptSets(): Promise<CustomPromptSetListActive> {
    const res = await managementHttpRequest<CustomPromptSetListActive>({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_CUSTOM_ATTACK_PATH}/active-custom-prompt-sets`,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /** Download CSV template for a prompt set. */
  async downloadTemplate(uuid: string): Promise<unknown> {
    validateUuid(uuid, 'prompt set uuid');
    const res = await managementHttpRequest<unknown>({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_CUSTOM_ATTACK_PATH}/download-template/${uuid}`,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /** Upload a CSV file of custom prompts for a prompt set. */
  async uploadPromptsCsv(promptSetUuid: string, file: Blob): Promise<BaseResponse> {
    validateUuid(promptSetUuid, 'prompt set uuid');

    const token = await this.oauthClient.getToken();
    const url = new URL(
      `${this.baseUrl.replace(/\/+$/, '')}${RED_TEAM_CUSTOM_ATTACK_PATH}/upload-custom-prompts-csv`,
    );
    url.searchParams.set('prompt_set_uuid', promptSetUuid);

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': USER_AGENT,
      },
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

  /** Create a new custom prompt. */
  async createPrompt(request: CustomPromptCreateRequest): Promise<CustomPromptResponse> {
    const res = await managementHttpRequest<CustomPromptResponse>({
      method: 'POST',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_CUSTOM_ATTACK_PATH}/custom-prompt-set/custom-prompt`,
      body: request,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /** List prompts in a prompt set. */
  async listPrompts(promptSetUuid: string, opts?: PromptListOptions): Promise<CustomPromptList> {
    validateUuid(promptSetUuid, 'prompt set uuid');
    const params = buildRedTeamListParams(opts);
    if (opts?.active !== undefined) params.active = String(opts.active);

    const res = await managementHttpRequest<CustomPromptList>({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_CUSTOM_ATTACK_PATH}/custom-prompt-set/${promptSetUuid}/list-custom-prompts`,
      params,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /** Get a prompt by UUID. */
  async getPrompt(promptSetUuid: string, promptUuid: string): Promise<CustomPromptResponse> {
    validateUuid(promptSetUuid, 'prompt set uuid');
    validateUuid(promptUuid, 'prompt uuid');
    const res = await managementHttpRequest<CustomPromptResponse>({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_CUSTOM_ATTACK_PATH}/custom-prompt-set/${promptSetUuid}/custom-prompt/${promptUuid}`,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /** Update a prompt. */
  async updatePrompt(
    promptSetUuid: string,
    promptUuid: string,
    request: CustomPromptUpdateRequest,
  ): Promise<CustomPromptResponse> {
    validateUuid(promptSetUuid, 'prompt set uuid');
    validateUuid(promptUuid, 'prompt uuid');
    const res = await managementHttpRequest<CustomPromptResponse>({
      method: 'PUT',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_CUSTOM_ATTACK_PATH}/custom-prompt-set/${promptSetUuid}/custom-prompt/${promptUuid}`,
      body: request,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /** Delete a prompt. */
  async deletePrompt(promptSetUuid: string, promptUuid: string): Promise<BaseResponse> {
    validateUuid(promptSetUuid, 'prompt set uuid');
    validateUuid(promptUuid, 'prompt uuid');
    const res = await managementHttpRequest<BaseResponse>({
      method: 'DELETE',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_CUSTOM_ATTACK_PATH}/custom-prompt-set/${promptSetUuid}/custom-prompt/${promptUuid}`,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  // -----------------------------------------------------------------------
  // Property operations
  // -----------------------------------------------------------------------

  /** Get all property names. */
  async getPropertyNames(): Promise<PropertyNamesListResponse> {
    const res = await managementHttpRequest<PropertyNamesListResponse>({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_CUSTOM_ATTACK_PATH}/property-names`,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /** Create a new property name. */
  async createPropertyName(request: PropertyNameCreateRequest): Promise<BaseResponse> {
    const res = await managementHttpRequest<BaseResponse>({
      method: 'POST',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_CUSTOM_ATTACK_PATH}/property-names`,
      body: request,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /** Get values for a property name. */
  async getPropertyValues(propertyName: string): Promise<PropertyValuesResponse> {
    const res = await managementHttpRequest<PropertyValuesResponse>({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_CUSTOM_ATTACK_PATH}/property-values/${encodeURIComponent(propertyName)}`,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /** Get values for multiple property names. */
  async getPropertyValuesMultiple(
    propertyNames: string[],
  ): Promise<PropertyValuesMultipleResponse> {
    const url = new URL(`https://placeholder${RED_TEAM_CUSTOM_ATTACK_PATH}/property-values`);
    for (const name of propertyNames) {
      url.searchParams.append('property_names', name);
    }
    const queryString = url.searchParams.toString();
    const pathWithQuery = `${RED_TEAM_CUSTOM_ATTACK_PATH}/property-values${queryString ? `?${queryString}` : ''}`;

    const res = await managementHttpRequest<PropertyValuesMultipleResponse>({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: pathWithQuery,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /** Create a property value. */
  async createPropertyValue(request: PropertyValueCreateRequest): Promise<BaseResponse> {
    const res = await managementHttpRequest<BaseResponse>({
      method: 'POST',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_CUSTOM_ATTACK_PATH}/property-values`,
      body: request,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }
}
