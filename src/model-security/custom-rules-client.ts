import { request } from '../http/request.js';
import type { AuthAdapter } from '../http/types.js';
import { assertUuid } from '../validators.js';
import { AISecSDKException, ErrorType } from '../errors.js';
import { collectAll, collectSkipPages, paginate, type CollectAllOptions } from '../listing.js';
import {
  CustomRuleCreateRequestSchema,
  CustomRuleUpdateRequestSchema,
  CustomRuleResponseSchema,
  ListCustomRulesResponseSchema,
  ListCustomRuleSecurityGroupsResponseSchema,
  BatchAssignCustomRuleRequestSchema,
  BatchAssignCustomRuleResponseSchema,
  SnapshotVersionListResponseSchema,
  type CustomRuleCreateRequest,
  type CustomRuleUpdateRequest,
  type CustomRuleResponse,
  type ListCustomRulesResponse,
  type ListCustomRuleSecurityGroupsResponse,
  type BatchAssignCustomRuleRequest,
  type BatchAssignCustomRuleResponse,
  type SnapshotVersionListResponse,
} from '../models/model-security-custom-rules.js';

/** Historical generation reads ignore other filters on the server. */
export interface CustomRuleListOptions {
  limit?: number;
  skip?: number;
  sort_field?: 'created_at' | 'updated_at';
  sort_dir?: 'asc' | 'desc';
  is_archived?: boolean;
  search_query?: string;
  source_types?: string[];
  generation?: number;
}
/** Cursor options for historical snapshots. */
export interface SnapshotVersionListOptions {
  limit?: number;
  next_token?: string;
}

/** @internal Validate and serialize Model Security query fields. */
export function modelSecurityParams(opts: object = {}): Record<string, string | string[]> {
  const output: Record<string, string | string[]> = {};
  for (const [key, value] of Object.entries(opts)) {
    if (value === undefined) continue;
    if (
      (key === 'limit' && (!Number.isSafeInteger(value) || value < 1 || value > 100)) ||
      ((key === 'skip' || key === 'generation') && (!Number.isSafeInteger(value) || value < 0))
    ) {
      throw new AISecSDKException(
        `Invalid ${key} query parameter`,
        ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      );
    }
    output[key] = Array.isArray(value) ? value.map(String) : String(value);
  }
  return output;
}
/** @internal Shared connection settings. */
export interface ModelSecurityCustomRulesClientOptions {
  baseUrl: string;
  auth: AuthAdapter;
  numRetries: number;
}

/** Manage custom rules, group assignments, archives and historical snapshots. */
export class ModelSecurityCustomRulesClient {
  private readonly baseUrl: string;
  private readonly auth: AuthAdapter;
  private readonly numRetries: number;
  constructor(opts: ModelSecurityCustomRulesClientOptions) {
    this.baseUrl = opts.baseUrl;
    this.auth = opts.auth;
    this.numRetries = opts.numRetries;
  }

  /** List custom rules. @example `const page = await ms.customRules.list({ limit: 20 });` */
  async list(opts: CustomRuleListOptions = {}): Promise<ListCustomRulesResponse> {
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: '/v1/custom-rules',
      params: modelSecurityParams(opts),
      responseSchema: ListCustomRulesResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }
  /** Collect current rules. @example `const rules = await ms.customRules.listAll({ max: 500 });` */
  async listAll(
    opts: Omit<CustomRuleListOptions, 'skip' | 'generation'> & CollectAllOptions = {},
  ): Promise<ListCustomRulesResponse['custom_rules']> {
    const { max, ...filters } = opts;
    return collectSkipPages(
      async (skip, limit) => {
        const page = await this.list({ ...filters, skip, limit });
        return { items: page.custom_rules, total: page.pagination.total_items };
      },
      { limit: opts.limit, max },
    );
  }
  /** Create a rule. @example `await ms.customRules.create({ name: 'Review', compatible_sources: ['HUGGING_FACE'], condition: { type: 'label', key: 'reviewed', operator: 'not_exists' }, violation_message: 'Review required' });` */
  async create(body: CustomRuleCreateRequest): Promise<CustomRuleResponse> {
    return request({
      method: 'POST',
      baseUrl: this.baseUrl,
      path: '/v1/custom-rules',
      body,
      requestSchema: CustomRuleCreateRequestSchema,
      responseSchema: CustomRuleResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }
  /** Read a rule. @example `const rule = await ms.customRules.get(ruleUuid);` */
  async get(uuid: string): Promise<CustomRuleResponse> {
    assertUuid(uuid, 'custom rule uuid');
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `/v1/custom-rules/${uuid}`,
      responseSchema: CustomRuleResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }
  /** Update a rule. @example `await ms.customRules.update(ruleUuid, { description: 'Reviewed' });` */
  async update(uuid: string, body: CustomRuleUpdateRequest): Promise<CustomRuleResponse> {
    assertUuid(uuid, 'custom rule uuid');
    return request({
      method: 'PUT',
      baseUrl: this.baseUrl,
      path: `/v1/custom-rules/${uuid}`,
      body,
      requestSchema: CustomRuleUpdateRequestSchema,
      responseSchema: CustomRuleResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }
  /** Archive a rule. @example `await ms.customRules.archive(ruleUuid);` */
  async archive(uuid: string): Promise<void> {
    assertUuid(uuid, 'custom rule uuid');
    return request({
      method: 'POST',
      baseUrl: this.baseUrl,
      path: `/v1/custom-rules/${uuid}/archive`,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }
  /** Restore a rule. @example `await ms.customRules.unarchive(ruleUuid);` */
  async unarchive(uuid: string): Promise<void> {
    assertUuid(uuid, 'custom rule uuid');
    return request({
      method: 'POST',
      baseUrl: this.baseUrl,
      path: `/v1/custom-rules/${uuid}/unarchive`,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }
  /** List assigned groups. @example `const page = await ms.customRules.listSecurityGroups(ruleUuid);` */
  async listSecurityGroups(
    uuid: string,
    opts: { skip?: number; limit?: number } = {},
  ): Promise<ListCustomRuleSecurityGroupsResponse> {
    assertUuid(uuid, 'custom rule uuid');
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `/v1/custom-rules/${uuid}/security-groups`,
      params: modelSecurityParams(opts),
      responseSchema: ListCustomRuleSecurityGroupsResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }
  /** Assign up to 50 groups; inspect each 207 result. @example `await ms.customRules.assignSecurityGroups(ruleUuid, { assignments: [{ security_group_uuid: groupUuid, state: 'ALLOWING' }] });` */
  async assignSecurityGroups(
    uuid: string,
    body: BatchAssignCustomRuleRequest,
  ): Promise<BatchAssignCustomRuleResponse> {
    assertUuid(uuid, 'custom rule uuid');
    return request({
      method: 'POST',
      baseUrl: this.baseUrl,
      path: `/v1/custom-rules/${uuid}/security-groups`,
      body,
      requestSchema: BatchAssignCustomRuleRequestSchema,
      responseSchema: BatchAssignCustomRuleResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }
  /** Remove an assignment. @example `await ms.customRules.removeAssignment(ruleUuid, groupUuid);` */
  async removeAssignment(uuid: string, groupUuid: string): Promise<void> {
    assertUuid(uuid, 'custom rule uuid');
    assertUuid(groupUuid, 'security group uuid');
    return request({
      method: 'DELETE',
      baseUrl: this.baseUrl,
      path: `/v1/custom-rules/${uuid}/security-groups/${groupUuid}`,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }
  /** List historical snapshots. @example `const page = await ms.customRules.listVersions({ limit: 10 });` */
  async listVersions(opts: SnapshotVersionListOptions = {}): Promise<SnapshotVersionListResponse> {
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: '/v1/custom-rules/versions',
      params: modelSecurityParams(opts),
      responseSchema: SnapshotVersionListResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }
  /** Collect snapshot history. @example `const versions = await ms.customRules.listAllVersions({ max: 500 });` */
  async listAllVersions(
    opts: SnapshotVersionListOptions & CollectAllOptions = {},
  ): Promise<SnapshotVersionListResponse['versions']> {
    return collectAll(
      paginate(async (next_token: string | undefined) => {
        const page = await this.listVersions({ limit: opts.limit, next_token });
        return { items: page.versions, next: page.pagination.next_token ?? undefined };
      }, opts.next_token),
      { max: opts.max },
    );
  }
}
