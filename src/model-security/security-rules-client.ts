import { MODEL_SEC_SECURITY_RULES_PATH } from '../constants.js';
import { AISecSDKException, ErrorType } from '../errors.js';
import { isValidUuid } from '../utils.js';
import { managementHttpRequest } from '../management/management-http-client.js';
import type { OAuthClient } from '../management/oauth-client.js';
import type { ModelSecurityListOptions } from './scans-client.js';
import type {
  ListModelSecurityRulesResponse,
  ModelSecurityRuleResponse,
} from '../models/model-security.js';

/** @internal */
export interface ModelSecurityRulesClientOptions {
  baseUrl: string;
  oauthClient: OAuthClient;
  numRetries: number;
}

/** Build query params from list options. */
function buildListParams(opts?: ModelSecurityListOptions): Record<string, string> {
  const params: Record<string, string> = {};
  if (opts?.skip !== undefined) params.skip = String(opts.skip);
  if (opts?.limit !== undefined) params.limit = String(opts.limit);
  if (opts?.sort_by !== undefined) params.sort_by = opts.sort_by;
  if (opts?.sort_direction !== undefined) params.sort_direction = opts.sort_direction;
  if (opts?.search !== undefined) params.search = opts.search;
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
  async list(opts?: ModelSecurityListOptions): Promise<ListModelSecurityRulesResponse> {
    const res = await managementHttpRequest<ListModelSecurityRulesResponse>({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: MODEL_SEC_SECURITY_RULES_PATH,
      params: buildListParams(opts),
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
