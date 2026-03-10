import { MODEL_SEC_SECURITY_GROUPS_PATH } from '../constants.js';
import { AISecSDKException, ErrorType } from '../errors.js';
import { isValidUuid } from '../utils.js';
import { managementHttpRequest } from '../management/management-http-client.js';
import type { OAuthClient } from '../management/oauth-client.js';
import type {
  ModelSecurityGroupCreateRequest,
  ModelSecurityGroupResponse,
  ModelSecurityGroupUpdateRequest,
  ListModelSecurityGroupsResponse,
  ModelSecurityRuleInstanceResponse,
  ModelSecurityRuleInstanceUpdateRequest,
  ListModelSecurityRuleInstancesResponse,
} from '../models/model-security.js';

/** Options for listing security groups. */
export interface ModelSecurityGroupListOptions {
  /** Number of items to skip. */
  skip?: number;
  /** Maximum number of items to return (1-100). */
  limit?: number;
  /** Field to sort by: 'created_at' or 'updated_at'. */
  sort_field?: string;
  /** Sort direction: 'asc' or 'desc'. */
  sort_dir?: string;
  /** Filter by source types. */
  source_types?: string[];
  /** Search term (matches UUID or Name, 3-1000 chars). */
  search_query?: string;
  /** Filter by rule UUIDs with ALLOWING or BLOCKING state. */
  enabled_rules?: string[];
}

/** Options for listing rule instances within a security group. */
export interface ModelSecurityRuleInstanceListOptions {
  /** Number of items to skip. */
  skip?: number;
  /** Maximum number of items to return. */
  limit?: number;
  /** Filter by security rule UUID. */
  security_rule_uuid?: string;
  /** Filter by rule state: 'DISABLED', 'ALLOWING', or 'BLOCKING'. */
  state?: string;
}

/** @internal */
export interface ModelSecurityGroupsClientOptions {
  baseUrl: string;
  oauthClient: OAuthClient;
  numRetries: number;
}

/** Build query params for security group list. */
function buildGroupListParams(
  opts?: ModelSecurityGroupListOptions,
): Record<string, string | string[]> {
  const params: Record<string, string | string[]> = {};
  if (opts?.skip !== undefined) params.skip = String(opts.skip);
  if (opts?.limit !== undefined) params.limit = String(opts.limit);
  if (opts?.sort_field !== undefined) params.sort_field = opts.sort_field;
  if (opts?.sort_dir !== undefined) params.sort_dir = opts.sort_dir;
  if (opts?.source_types !== undefined) params.source_types = opts.source_types;
  if (opts?.search_query !== undefined) params.search_query = opts.search_query;
  if (opts?.enabled_rules !== undefined) params.enabled_rules = opts.enabled_rules;
  return params;
}

/** Build query params for rule instance list. */
function buildRuleInstanceListParams(
  opts?: ModelSecurityRuleInstanceListOptions,
): Record<string, string> {
  const params: Record<string, string> = {};
  if (opts?.skip !== undefined) params.skip = String(opts.skip);
  if (opts?.limit !== undefined) params.limit = String(opts.limit);
  if (opts?.security_rule_uuid !== undefined) params.security_rule_uuid = opts.security_rule_uuid;
  if (opts?.state !== undefined) params.state = opts.state;
  return params;
}

/** Client for Model Security management plane security group operations. */
export class ModelSecurityGroupsClient {
  private readonly baseUrl: string;
  private readonly oauthClient: OAuthClient;
  private readonly numRetries: number;

  constructor(opts: ModelSecurityGroupsClientOptions) {
    this.baseUrl = opts.baseUrl;
    this.oauthClient = opts.oauthClient;
    this.numRetries = opts.numRetries;
  }

  /**
   * Create a new security group.
   * @param request - Security group creation request.
   * @returns The created security group.
   */
  async create(request: ModelSecurityGroupCreateRequest): Promise<ModelSecurityGroupResponse> {
    const res = await managementHttpRequest<ModelSecurityGroupResponse>({
      method: 'POST',
      baseUrl: this.baseUrl,
      path: MODEL_SEC_SECURITY_GROUPS_PATH,
      body: request,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /**
   * List security groups with optional filters.
   * @param opts - Pagination and filter options.
   * @returns Paginated list of security groups.
   */
  async list(opts?: ModelSecurityGroupListOptions): Promise<ListModelSecurityGroupsResponse> {
    const res = await managementHttpRequest<ListModelSecurityGroupsResponse>({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: MODEL_SEC_SECURITY_GROUPS_PATH,
      params: buildGroupListParams(opts),
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /**
   * Get a single security group by UUID.
   * @param uuid - Security group UUID.
   * @returns The security group.
   */
  async get(uuid: string): Promise<ModelSecurityGroupResponse> {
    if (!isValidUuid(uuid)) {
      throw new AISecSDKException(
        `Invalid security group uuid: ${uuid}`,
        ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      );
    }

    const res = await managementHttpRequest<ModelSecurityGroupResponse>({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${MODEL_SEC_SECURITY_GROUPS_PATH}/${uuid}`,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /**
   * Update an existing security group.
   * @param uuid - Security group UUID.
   * @param request - Updated security group fields.
   * @returns The updated security group.
   */
  async update(
    uuid: string,
    request: ModelSecurityGroupUpdateRequest,
  ): Promise<ModelSecurityGroupResponse> {
    if (!isValidUuid(uuid)) {
      throw new AISecSDKException(
        `Invalid security group uuid: ${uuid}`,
        ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      );
    }

    const res = await managementHttpRequest<ModelSecurityGroupResponse>({
      method: 'PUT',
      baseUrl: this.baseUrl,
      path: `${MODEL_SEC_SECURITY_GROUPS_PATH}/${uuid}`,
      body: request,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /**
   * Delete a security group.
   * @param uuid - Security group UUID.
   * @returns Resolves when the security group is deleted.
   */
  async delete(uuid: string): Promise<void> {
    if (!isValidUuid(uuid)) {
      throw new AISecSDKException(
        `Invalid security group uuid: ${uuid}`,
        ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      );
    }

    await managementHttpRequest<void>({
      method: 'DELETE',
      baseUrl: this.baseUrl,
      path: `${MODEL_SEC_SECURITY_GROUPS_PATH}/${uuid}`,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
  }

  /**
   * List rule instances for a security group.
   * @param securityGroupUuid - Security group UUID.
   * @param opts - Pagination options.
   * @returns Paginated list of rule instances.
   */
  async listRuleInstances(
    securityGroupUuid: string,
    opts?: ModelSecurityRuleInstanceListOptions,
  ): Promise<ListModelSecurityRuleInstancesResponse> {
    if (!isValidUuid(securityGroupUuid)) {
      throw new AISecSDKException(
        `Invalid security group uuid: ${securityGroupUuid}`,
        ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      );
    }

    const res = await managementHttpRequest<ListModelSecurityRuleInstancesResponse>({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${MODEL_SEC_SECURITY_GROUPS_PATH}/${securityGroupUuid}/rule-instances`,
      params: buildRuleInstanceListParams(opts),
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /**
   * Get a single rule instance within a security group.
   * @param securityGroupUuid - Security group UUID.
   * @param ruleInstanceUuid - Rule instance UUID.
   * @returns The rule instance.
   */
  async getRuleInstance(
    securityGroupUuid: string,
    ruleInstanceUuid: string,
  ): Promise<ModelSecurityRuleInstanceResponse> {
    if (!isValidUuid(securityGroupUuid)) {
      throw new AISecSDKException(
        `Invalid security group uuid: ${securityGroupUuid}`,
        ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      );
    }
    if (!isValidUuid(ruleInstanceUuid)) {
      throw new AISecSDKException(
        `Invalid rule instance uuid: ${ruleInstanceUuid}`,
        ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      );
    }

    const res = await managementHttpRequest<ModelSecurityRuleInstanceResponse>({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${MODEL_SEC_SECURITY_GROUPS_PATH}/${securityGroupUuid}/rule-instances/${ruleInstanceUuid}`,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /**
   * Update a rule instance within a security group.
   * @param securityGroupUuid - Security group UUID.
   * @param ruleInstanceUuid - Rule instance UUID.
   * @param request - Updated rule instance fields.
   * @returns The updated rule instance.
   */
  async updateRuleInstance(
    securityGroupUuid: string,
    ruleInstanceUuid: string,
    request: ModelSecurityRuleInstanceUpdateRequest,
  ): Promise<ModelSecurityRuleInstanceResponse> {
    if (!isValidUuid(securityGroupUuid)) {
      throw new AISecSDKException(
        `Invalid security group uuid: ${securityGroupUuid}`,
        ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      );
    }
    if (!isValidUuid(ruleInstanceUuid)) {
      throw new AISecSDKException(
        `Invalid rule instance uuid: ${ruleInstanceUuid}`,
        ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      );
    }

    const res = await managementHttpRequest<ModelSecurityRuleInstanceResponse>({
      method: 'PUT',
      baseUrl: this.baseUrl,
      path: `${MODEL_SEC_SECURITY_GROUPS_PATH}/${securityGroupUuid}/rule-instances/${ruleInstanceUuid}`,
      body: request,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }
}
