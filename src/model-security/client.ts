import {
  DEFAULT_MODEL_SEC_DATA_ENDPOINT,
  DEFAULT_MODEL_SEC_MGMT_ENDPOINT,
  MODEL_SEC_CLIENT_ID,
  MODEL_SEC_CLIENT_SECRET,
  MODEL_SEC_TSG_ID,
  MODEL_SEC_DATA_ENDPOINT,
  MODEL_SEC_MGMT_ENDPOINT,
  MODEL_SEC_TOKEN_ENDPOINT,
  MGMT_CLIENT_ID,
  MGMT_CLIENT_SECRET,
  MGMT_TSG_ID,
  MGMT_TOKEN_ENDPOINT,
  MAX_NUMBER_OF_RETRIES,
  MODEL_SEC_PYPI_AUTH_PATH,
} from '../constants.js';
import { AISecSDKException, ErrorType } from '../errors.js';
import { OAuthClient } from '../management/oauth-client.js';
import { managementHttpRequest } from '../management/management-http-client.js';
import { ModelSecurityScansClient } from './scans-client.js';
import { ModelSecurityGroupsClient } from './security-groups-client.js';
import { ModelSecurityRulesClient } from './security-rules-client.js';
import type { PyPIAuthResponse } from '../models/model-security.js';

/** Options for constructing a {@link ModelSecurityClient}. */
export interface ModelSecurityClientOptions {
  /** OAuth2 client ID. Falls back to `PANW_MODEL_SEC_CLIENT_ID`, then `PANW_MGMT_CLIENT_ID`. */
  clientId?: string;
  /** OAuth2 client secret. Falls back to `PANW_MODEL_SEC_CLIENT_SECRET`, then `PANW_MGMT_CLIENT_SECRET`. */
  clientSecret?: string;
  /** Tenant Service Group ID. Falls back to `PANW_MODEL_SEC_TSG_ID`, then `PANW_MGMT_TSG_ID`. */
  tsgId?: string;
  /** Data plane endpoint URL. Falls back to `PANW_MODEL_SEC_DATA_ENDPOINT`. */
  dataEndpoint?: string;
  /** Management plane endpoint URL. Falls back to `PANW_MODEL_SEC_MGMT_ENDPOINT`. */
  mgmtEndpoint?: string;
  /** OAuth2 token endpoint URL. Falls back to `PANW_MODEL_SEC_TOKEN_ENDPOINT`, then `PANW_MGMT_TOKEN_ENDPOINT`. */
  tokenEndpoint?: string;
  /** Max retry attempts (0-5). Defaults to 5. */
  numRetries?: number;
}

/**
 * Client for AIRS Model Security API operations.
 * Uses two base URLs: data plane for scans, management plane for security groups/rules.
 * Authenticates via OAuth2 client_credentials flow (shared token for both planes).
 */
export class ModelSecurityClient {
  /** Data plane scan operations. */
  public readonly scans: ModelSecurityScansClient;
  /** Management plane security group operations. */
  public readonly securityGroups: ModelSecurityGroupsClient;
  /** Management plane security rule operations (read-only). */
  public readonly securityRules: ModelSecurityRulesClient;

  private readonly mgmtEndpoint: string;
  private readonly oauthClient: OAuthClient;
  private readonly numRetries: number;

  constructor(opts: ModelSecurityClientOptions = {}) {
    const clientId =
      opts.clientId ?? process.env[MODEL_SEC_CLIENT_ID] ?? process.env[MGMT_CLIENT_ID];
    const clientSecret =
      opts.clientSecret ?? process.env[MODEL_SEC_CLIENT_SECRET] ?? process.env[MGMT_CLIENT_SECRET];
    const tsgId = opts.tsgId ?? process.env[MODEL_SEC_TSG_ID] ?? process.env[MGMT_TSG_ID];
    const dataEndpoint =
      opts.dataEndpoint ?? process.env[MODEL_SEC_DATA_ENDPOINT] ?? DEFAULT_MODEL_SEC_DATA_ENDPOINT;
    const mgmtEndpoint =
      opts.mgmtEndpoint ?? process.env[MODEL_SEC_MGMT_ENDPOINT] ?? DEFAULT_MODEL_SEC_MGMT_ENDPOINT;
    const tokenEndpoint =
      opts.tokenEndpoint ??
      process.env[MODEL_SEC_TOKEN_ENDPOINT] ??
      process.env[MGMT_TOKEN_ENDPOINT];
    const numRetries = Math.min(
      Math.max(opts.numRetries ?? MAX_NUMBER_OF_RETRIES, 0),
      MAX_NUMBER_OF_RETRIES,
    );

    if (!clientId) {
      throw new AISecSDKException(
        'clientId is required (option or PANW_MODEL_SEC_CLIENT_ID / PANW_MGMT_CLIENT_ID env var)',
        ErrorType.MISSING_VARIABLE,
      );
    }
    if (!clientSecret) {
      throw new AISecSDKException(
        'clientSecret is required (option or PANW_MODEL_SEC_CLIENT_SECRET / PANW_MGMT_CLIENT_SECRET env var)',
        ErrorType.MISSING_VARIABLE,
      );
    }
    if (!tsgId) {
      throw new AISecSDKException(
        'tsgId is required (option or PANW_MODEL_SEC_TSG_ID / PANW_MGMT_TSG_ID env var)',
        ErrorType.MISSING_VARIABLE,
      );
    }

    this.oauthClient = new OAuthClient({
      clientId,
      clientSecret,
      tsgId,
      tokenEndpoint,
    });
    this.mgmtEndpoint = mgmtEndpoint;
    this.numRetries = numRetries;

    this.scans = new ModelSecurityScansClient({
      baseUrl: dataEndpoint,
      oauthClient: this.oauthClient,
      numRetries,
    });

    this.securityGroups = new ModelSecurityGroupsClient({
      baseUrl: mgmtEndpoint,
      oauthClient: this.oauthClient,
      numRetries,
    });

    this.securityRules = new ModelSecurityRulesClient({
      baseUrl: mgmtEndpoint,
      oauthClient: this.oauthClient,
      numRetries,
    });
  }

  /**
   * Get PyPI authentication credentials for Google Artifact Registry.
   * @returns PyPI auth response with URL and expiration.
   */
  async getPyPIAuth(): Promise<PyPIAuthResponse> {
    const res = await managementHttpRequest<PyPIAuthResponse>({
      method: 'GET',
      baseUrl: this.mgmtEndpoint,
      path: MODEL_SEC_PYPI_AUTH_PATH,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }
}
