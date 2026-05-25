import { MODEL_SEC_SECURITY_RULES_PATH } from '../constants.js';
import { request } from '../http/request.js';
import type { AuthAdapter } from '../http/types.js';
import { serializeListing, type ListingOptions } from '../listing.js';
import { assertUuid } from '../validators.js';
import {
  ListModelSecurityRulesResponseSchema,
  ModelSecurityRuleResponseSchema,
  type ListModelSecurityRulesResponse,
  type ModelSecurityRuleResponse,
} from '../models/model-security.js';

/** Options for listing security rules. */
export interface ModelSecurityRuleListOptions extends ListingOptions {
  /** Filter by source type. */
  source_type?: string;
  /** Search term (matches UUID or Name, 3-1000 chars). */
  search_query?: string;
}

/** @internal */
export interface ModelSecurityRulesClientOptions {
  baseUrl: string;
  auth: AuthAdapter;
  numRetries: number;
}

/** Client for Model Security management plane security rule operations (read-only). */
export class ModelSecurityRulesClient {
  private readonly baseUrl: string;
  private readonly auth: AuthAdapter;
  private readonly numRetries: number;

  constructor(opts: ModelSecurityRulesClientOptions) {
    this.baseUrl = opts.baseUrl;
    this.auth = opts.auth;
    this.numRetries = opts.numRetries;
  }

  /**
   * List available security rules.
   * @param opts - Pagination + filter options.
   * @returns Paginated list of security rules.
   * @example
   * ```ts
   * import { ModelSecurityClient } from '@cdot65/prisma-airs-sdk';
   * const ms = new ModelSecurityClient();
   *
   * const rules = await ms.securityRules.list({
   *   limit: 20,
   *   source_type: 'HUGGING_FACE',
   *   search_query: 'pickle',
   * });
   * // rules.rules =>
   * // [{ uuid: '550e8400-...', name: 'Pickle Scan', rule_type: 'ARTIFACT', default_state: 'BLOCKING', ... }]
   * ```
   */
  async list(opts?: ModelSecurityRuleListOptions): Promise<ListModelSecurityRulesResponse> {
    const params = serializeListing(opts);
    if (opts?.source_type !== undefined) params.source_type = opts.source_type;
    if (opts?.search_query !== undefined) params.search_query = opts.search_query;

    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: MODEL_SEC_SECURITY_RULES_PATH,
      params,
      responseSchema: ListModelSecurityRulesResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Get a single security rule by UUID.
   * @param uuid - Security rule UUID.
   * @returns The security rule.
   * @example
   * ```ts
   * import { ModelSecurityClient } from '@cdot65/prisma-airs-sdk';
   * const ms = new ModelSecurityClient();
   *
   * const rule = await ms.securityRules.get('550e8400-e29b-41d4-a716-446655440000');
   * // rule =>
   * // { uuid: '550e8400-...', name: 'Pickle Scan', rule_type: 'ARTIFACT', default_state: 'BLOCKING', ... }
   * ```
   */
  async get(uuid: string): Promise<ModelSecurityRuleResponse> {
    assertUuid(uuid, 'security rule uuid');
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${MODEL_SEC_SECURITY_RULES_PATH}/${uuid}`,
      responseSchema: ModelSecurityRuleResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }
}
