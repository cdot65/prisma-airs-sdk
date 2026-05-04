import { MODEL_SEC_SECURITY_GROUPS_PATH } from '../constants.js';
import { request } from '../http/request.js';
import type { AuthAdapter } from '../http/types.js';
import { serializeListing, type ListingOptions } from '../listing.js';
import { assertUuid } from '../validators.js';
import {
  ModelSecurityGroupResponseSchema,
  ListModelSecurityGroupsResponseSchema,
  ModelSecurityRuleInstanceResponseSchema,
  ListModelSecurityRuleInstancesResponseSchema,
  type ModelSecurityGroupCreateRequest,
  type ModelSecurityGroupResponse,
  type ModelSecurityGroupUpdateRequest,
  type ListModelSecurityGroupsResponse,
  type ModelSecurityRuleInstanceResponse,
  type ModelSecurityRuleInstanceUpdateRequest,
  type ListModelSecurityRuleInstancesResponse,
} from '../models/model-security.js';

/** Options for listing security groups. */
export interface ModelSecurityGroupListOptions extends ListingOptions {
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
export interface ModelSecurityRuleInstanceListOptions extends ListingOptions {
  /** Filter by security rule UUID. */
  security_rule_uuid?: string;
  /** Filter by rule state: 'DISABLED', 'ALLOWING', or 'BLOCKING'. */
  state?: string;
}

/** @internal */
export interface ModelSecurityGroupsClientOptions {
  baseUrl: string;
  auth: AuthAdapter;
  numRetries: number;
}

function buildGroupListParams(
  opts?: ModelSecurityGroupListOptions,
): Record<string, string | string[]> {
  const params: Record<string, string | string[]> = serializeListing(opts);
  if (opts?.sort_field !== undefined) params.sort_field = opts.sort_field;
  if (opts?.sort_dir !== undefined) params.sort_dir = opts.sort_dir;
  if (opts?.source_types !== undefined) params.source_types = opts.source_types;
  if (opts?.search_query !== undefined) params.search_query = opts.search_query;
  if (opts?.enabled_rules !== undefined) params.enabled_rules = opts.enabled_rules;
  return params;
}

function buildRuleInstanceListParams(
  opts?: ModelSecurityRuleInstanceListOptions,
): Record<string, string> {
  const params = serializeListing(opts);
  if (opts?.security_rule_uuid !== undefined) params.security_rule_uuid = opts.security_rule_uuid;
  if (opts?.state !== undefined) params.state = opts.state;
  return params;
}

/** Client for Model Security management plane security group operations. */
export class ModelSecurityGroupsClient {
  private readonly baseUrl: string;
  private readonly auth: AuthAdapter;
  private readonly numRetries: number;

  constructor(opts: ModelSecurityGroupsClientOptions) {
    this.baseUrl = opts.baseUrl;
    this.auth = opts.auth;
    this.numRetries = opts.numRetries;
  }

  /**
   * Create a new security group.
   * @param body - Security group creation request.
   * @returns The created security group.
   */
  async create(body: ModelSecurityGroupCreateRequest): Promise<ModelSecurityGroupResponse> {
    return request({
      method: 'POST',
      baseUrl: this.baseUrl,
      path: MODEL_SEC_SECURITY_GROUPS_PATH,
      body,
      responseSchema: ModelSecurityGroupResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * List security groups with optional filters.
   * @param opts - Pagination and filter options.
   * @returns Paginated list of security groups.
   */
  async list(opts?: ModelSecurityGroupListOptions): Promise<ListModelSecurityGroupsResponse> {
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: MODEL_SEC_SECURITY_GROUPS_PATH,
      params: buildGroupListParams(opts),
      responseSchema: ListModelSecurityGroupsResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Get a single security group by UUID.
   * @param uuid - Security group UUID.
   * @returns The security group.
   */
  async get(uuid: string): Promise<ModelSecurityGroupResponse> {
    assertUuid(uuid, 'security group uuid');
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${MODEL_SEC_SECURITY_GROUPS_PATH}/${uuid}`,
      responseSchema: ModelSecurityGroupResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Update an existing security group.
   * @param uuid - Security group UUID.
   * @param body - Updated security group fields.
   * @returns The updated security group.
   */
  async update(
    uuid: string,
    body: ModelSecurityGroupUpdateRequest,
  ): Promise<ModelSecurityGroupResponse> {
    assertUuid(uuid, 'security group uuid');
    return request({
      method: 'PUT',
      baseUrl: this.baseUrl,
      path: `${MODEL_SEC_SECURITY_GROUPS_PATH}/${uuid}`,
      body,
      responseSchema: ModelSecurityGroupResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Delete a security group.
   * @param uuid - Security group UUID.
   * @returns Resolves when the security group is deleted.
   */
  async delete(uuid: string): Promise<void> {
    assertUuid(uuid, 'security group uuid');
    await request({
      method: 'DELETE',
      baseUrl: this.baseUrl,
      path: `${MODEL_SEC_SECURITY_GROUPS_PATH}/${uuid}`,
      auth: this.auth,
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
    assertUuid(securityGroupUuid, 'security group uuid');
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${MODEL_SEC_SECURITY_GROUPS_PATH}/${securityGroupUuid}/rule-instances`,
      params: buildRuleInstanceListParams(opts),
      responseSchema: ListModelSecurityRuleInstancesResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
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
    assertUuid(securityGroupUuid, 'security group uuid');
    assertUuid(ruleInstanceUuid, 'rule instance uuid');
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${MODEL_SEC_SECURITY_GROUPS_PATH}/${securityGroupUuid}/rule-instances/${ruleInstanceUuid}`,
      responseSchema: ModelSecurityRuleInstanceResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Update a rule instance within a security group.
   * @param securityGroupUuid - Security group UUID.
   * @param ruleInstanceUuid - Rule instance UUID.
   * @param body - Updated rule instance fields.
   * @returns The updated rule instance.
   */
  async updateRuleInstance(
    securityGroupUuid: string,
    ruleInstanceUuid: string,
    body: ModelSecurityRuleInstanceUpdateRequest,
  ): Promise<ModelSecurityRuleInstanceResponse> {
    assertUuid(securityGroupUuid, 'security group uuid');
    assertUuid(ruleInstanceUuid, 'rule instance uuid');
    return request({
      method: 'PUT',
      baseUrl: this.baseUrl,
      path: `${MODEL_SEC_SECURITY_GROUPS_PATH}/${securityGroupUuid}/rule-instances/${ruleInstanceUuid}`,
      body,
      responseSchema: ModelSecurityRuleInstanceResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }
}
