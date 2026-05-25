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
   * @example
   * ```ts
   * import { ModelSecurityClient } from '@cdot65/prisma-airs-sdk';
   * const ms = new ModelSecurityClient();
   *
   * const group = await ms.securityGroups.create({
   *   name: 'hf-strict',
   *   source_type: 'HUGGING_FACE',
   *   description: 'Block unsafe Hugging Face models',
   * });
   * // group =>
   * // { uuid: '550e8400-...', name: 'hf-strict', source_type: 'HUGGING_FACE', state: 'PENDING', ... }
   * ```
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
   * @example
   * ```ts
   * import { ModelSecurityClient } from '@cdot65/prisma-airs-sdk';
   * const ms = new ModelSecurityClient();
   *
   * const groups = await ms.securityGroups.list({
   *   limit: 10,
   *   source_types: ['HUGGING_FACE'],
   *   sort_field: 'created_at',
   *   sort_dir: 'desc',
   * });
   * // groups.security_groups =>
   * // [{ uuid: '550e8400-...', name: 'hf-strict', state: 'ACTIVE', ... }]
   * ```
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
   * @example
   * ```ts
   * import { ModelSecurityClient } from '@cdot65/prisma-airs-sdk';
   * const ms = new ModelSecurityClient();
   *
   * const group = await ms.securityGroups.get('550e8400-e29b-41d4-a716-446655440000');
   * // group =>
   * // { uuid: '550e8400-...', name: 'hf-strict', source_type: 'HUGGING_FACE', state: 'ACTIVE', ... }
   * ```
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
   * @example
   * ```ts
   * import { ModelSecurityClient } from '@cdot65/prisma-airs-sdk';
   * const ms = new ModelSecurityClient();
   *
   * const group = await ms.securityGroups.update('550e8400-e29b-41d4-a716-446655440000', {
   *   name: 'hf-strict-v2',
   *   description: 'Updated policy',
   * });
   * // group =>
   * // { uuid: '550e8400-...', name: 'hf-strict-v2', state: 'ACTIVE', ... }
   * ```
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
   * @example
   * ```ts
   * import { ModelSecurityClient } from '@cdot65/prisma-airs-sdk';
   * const ms = new ModelSecurityClient();
   *
   * await ms.securityGroups.delete('550e8400-e29b-41d4-a716-446655440000');
   * // resolves to undefined on success
   * ```
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
   * @example
   * ```ts
   * import { ModelSecurityClient } from '@cdot65/prisma-airs-sdk';
   * const ms = new ModelSecurityClient();
   *
   * const res = await ms.securityGroups.listRuleInstances(
   *   '550e8400-e29b-41d4-a716-446655440000',
   *   { state: 'BLOCKING' },
   * );
   * // res.rule_instances =>
   * // [{ uuid: '660e8400-...', state: 'BLOCKING', rule: { name: 'Pickle Scan', ... }, ... }]
   * ```
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
   * @example
   * ```ts
   * import { ModelSecurityClient } from '@cdot65/prisma-airs-sdk';
   * const ms = new ModelSecurityClient();
   *
   * const ri = await ms.securityGroups.getRuleInstance(
   *   '550e8400-e29b-41d4-a716-446655440000',
   *   '660e8400-e29b-41d4-a716-446655440000',
   * );
   * // ri =>
   * // { uuid: '660e8400-...', state: 'BLOCKING', rule: { name: 'Pickle Scan', ... }, ... }
   * ```
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
   * @example
   * ```ts
   * import { ModelSecurityClient } from '@cdot65/prisma-airs-sdk';
   * const ms = new ModelSecurityClient();
   *
   * const ri = await ms.securityGroups.updateRuleInstance(
   *   '550e8400-e29b-41d4-a716-446655440000',
   *   '660e8400-e29b-41d4-a716-446655440000',
   *   { security_group_uuid: '550e8400-e29b-41d4-a716-446655440000', state: 'ALLOWING' },
   * );
   * // ri =>
   * // { uuid: '660e8400-...', state: 'ALLOWING', rule: { name: 'Pickle Scan', ... }, ... }
   * ```
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
