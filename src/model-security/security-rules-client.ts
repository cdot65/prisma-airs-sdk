import { MODEL_SEC_SECURITY_RULES_PATH } from '../constants.js';
import { AISecSDKException, ErrorType } from '../errors.js';
import { isValidUuid } from '../utils.js';
import { managementHttpRequest } from '../management/management-http-client.js';
import type { OAuthClient } from '../management/oauth-client.js';
import type {
  ListModelSecurityRulesResponse,
  ModelSecurityRuleResponse,
} from '../models/model-security.js';

/** Options for listing security rules. */
export interface ModelSecurityRuleListOptions {
  /** Number of items to skip. */
  skip?: number;
  /** Maximum number of items to return. */
  limit?: number;
  /** Filter by source type. */
  source_type?: string;
  /** Search term (matches UUID or Name, 3-1000 chars). */
  search_query?: string;
}

/** @internal */
export interface ModelSecurityRulesClientOptions {
  baseUrl: string;
  oauthClient: OAuthClient;
  numRetries: number;
}

/** Build query params for security rules list. */
function buildRuleListParams(opts?: ModelSecurityRuleListOptions): Record<string, string> {
  const params: Record<string, string> = {};
  if (opts?.skip !== undefined) params.skip = String(opts.skip);
  if (opts?.limit !== undefined) params.limit = String(opts.limit);
  if (opts?.source_type !== undefined) params.source_type = opts.source_type;
  if (opts?.search_query !== undefined) params.search_query = opts.search_query;
  return params;
}

/** Client for Model Security management plane security rule operations (read-only). */
export class ModelSecurityRulesClient {
  private readonly baseUrl: string;
  private readonly oauthClient: OAuthClient;
  private readonly numRetries: number;

  constructor(opts: ModelSecurityRulesClientOptions) {
    this.baseUrl = opts.baseUrl;
    this.oauthClient = opts.oauthClient;
    this.numRetries = opts.numRetries;
  }

  /**
   * List available security rules.
   * @param opts - Pagination options.
   * @returns Paginated list of security rules.
   */
  async list(opts?: ModelSecurityRuleListOptions): Promise<ListModelSecurityRulesResponse> {
    const res = await managementHttpRequest<ListModelSecurityRulesResponse>({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: MODEL_SEC_SECURITY_RULES_PATH,
      params: buildRuleListParams(opts),
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /**
   * Get a single security rule by UUID.
   * @param uuid - Security rule UUID.
   * @returns The security rule.
   */
  async get(uuid: string): Promise<ModelSecurityRuleResponse> {
    if (!isValidUuid(uuid)) {
      throw new AISecSDKException(
        `Invalid security rule uuid: ${uuid}`,
        ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      );
    }

    const res = await managementHttpRequest<ModelSecurityRuleResponse>({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${MODEL_SEC_SECURITY_RULES_PATH}/${uuid}`,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }
}
