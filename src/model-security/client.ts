import {
  DEFAULT_MODEL_SEC_DATA_ENDPOINT,
  DEFAULT_MODEL_SEC_MGMT_ENDPOINT,
  MODEL_SEC_DATA_ENDPOINT,
  MODEL_SEC_MGMT_ENDPOINT,
  MODEL_SEC_PYPI_AUTH_PATH,
} from '../constants.js';
import { resolveOAuthConfig } from '../oauth-config.js';
import { managementHttpRequest } from '../management/management-http-client.js';
import { ModelSecurityScansClient } from './scans-client.js';
import { ModelSecurityGroupsClient } from './security-groups-client.js';
import { ModelSecurityRulesClient } from './security-rules-client.js';
import type { OAuthClient } from '../management/oauth-client.js';
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
    const dataEndpoint =
      opts.dataEndpoint ?? process.env[MODEL_SEC_DATA_ENDPOINT] ?? DEFAULT_MODEL_SEC_DATA_ENDPOINT;
    const mgmtEndpoint =
      opts.mgmtEndpoint ?? process.env[MODEL_SEC_MGMT_ENDPOINT] ?? DEFAULT_MODEL_SEC_MGMT_ENDPOINT;

    const { oauthClient, numRetries } = resolveOAuthConfig({
      clientId: opts.clientId,
      clientSecret: opts.clientSecret,
      tsgId: opts.tsgId,
      baseUrl: mgmtEndpoint,
      numRetries: opts.numRetries,
      tokenEndpoint: opts.tokenEndpoint,
      primaryEnvPrefix: 'PANW_MODEL_SEC',
      fallbackEnvPrefix: 'PANW_MGMT',
    });

    this.oauthClient = oauthClient;
    this.mgmtEndpoint = mgmtEndpoint;
    this.numRetries = numRetries;

    this.scans = new ModelSecurityScansClient({
      baseUrl: dataEndpoint,
      oauthClient,
      numRetries,
    });

    this.securityGroups = new ModelSecurityGroupsClient({
      baseUrl: mgmtEndpoint,
      oauthClient,
      numRetries,
    });

    this.securityRules = new ModelSecurityRulesClient({
      baseUrl: mgmtEndpoint,
      oauthClient,
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
