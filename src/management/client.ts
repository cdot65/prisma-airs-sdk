import {
  DEFAULT_MGMT_ENDPOINT,
  MGMT_CLIENT_ID,
  MGMT_CLIENT_SECRET,
  MGMT_TSG_ID,
  MGMT_ENDPOINT,
  MGMT_TOKEN_ENDPOINT,
  MAX_NUMBER_OF_RETRIES,
} from '../constants.js';
import { AISecSDKException, ErrorType } from '../errors.js';
import { OAuthClient } from './oauth-client.js';
import { ProfilesClient } from './profiles.js';
import { TopicsClient } from './topics.js';
import { ApiKeysClient } from './api-keys.js';
import { CustomerAppsClient } from './customer-apps.js';
import { DlpProfilesClient } from './dlp-profiles.js';
import { DeploymentProfilesClient } from './deployment-profiles.js';
import { ScanLogsClient } from './scan-logs.js';
import { OAuthManagementClient } from './oauth-management.js';

/** Options for constructing a {@link ManagementClient}. */
export interface ManagementClientOptions {
  /** OAuth2 client ID. Falls back to `PANW_MGMT_CLIENT_ID` env var. */
  clientId?: string;
  /** OAuth2 client secret. Falls back to `PANW_MGMT_CLIENT_SECRET` env var. */
  clientSecret?: string;
  /** Tenant Service Group ID. Falls back to `PANW_MGMT_TSG_ID` env var. */
  tsgId?: string;
  /** Management API endpoint URL. Falls back to `PANW_MGMT_ENDPOINT` env var. */
  apiEndpoint?: string;
  /** OAuth2 token endpoint URL. Falls back to `PANW_MGMT_TOKEN_ENDPOINT` env var. */
  tokenEndpoint?: string;
  /** Max retry attempts (0–5). Defaults to 5. */
  numRetries?: number;
}

/**
 * Client for AIRS management API operations.
 * Authenticates via OAuth2 client_credentials flow.
 */
export class ManagementClient {
  public readonly profiles: ProfilesClient;
  public readonly topics: TopicsClient;
  public readonly apiKeys: ApiKeysClient;
  public readonly customerApps: CustomerAppsClient;
  public readonly dlpProfiles: DlpProfilesClient;
  public readonly deploymentProfiles: DeploymentProfilesClient;
  public readonly scanLogs: ScanLogsClient;
  public readonly oauth: OAuthManagementClient;

  constructor(opts: ManagementClientOptions = {}) {
    const clientId = opts.clientId ?? process.env[MGMT_CLIENT_ID];
    const clientSecret = opts.clientSecret ?? process.env[MGMT_CLIENT_SECRET];
    const tsgId = opts.tsgId ?? process.env[MGMT_TSG_ID];
    const apiEndpoint = opts.apiEndpoint ?? process.env[MGMT_ENDPOINT] ?? DEFAULT_MGMT_ENDPOINT;
    const tokenEndpoint = opts.tokenEndpoint ?? process.env[MGMT_TOKEN_ENDPOINT];
    const numRetries = Math.min(
      Math.max(opts.numRetries ?? MAX_NUMBER_OF_RETRIES, 0),
      MAX_NUMBER_OF_RETRIES,
    );

    if (!clientId) {
      throw new AISecSDKException(
        'clientId is required (option or PANW_MGMT_CLIENT_ID env var)',
        ErrorType.MISSING_VARIABLE,
      );
    }
    if (!clientSecret) {
      throw new AISecSDKException(
        'clientSecret is required (option or PANW_MGMT_CLIENT_SECRET env var)',
        ErrorType.MISSING_VARIABLE,
      );
    }
    if (!tsgId) {
      throw new AISecSDKException(
        'tsgId is required (option or PANW_MGMT_TSG_ID env var)',
        ErrorType.MISSING_VARIABLE,
      );
    }

    const oauthClient = new OAuthClient({
      clientId,
      clientSecret,
      tsgId,
      tokenEndpoint,
    });

    this.profiles = new ProfilesClient({
      baseUrl: apiEndpoint,
      oauthClient,
      tsgId,
      numRetries,
    });

    this.topics = new TopicsClient({
      baseUrl: apiEndpoint,
      oauthClient,
      tsgId,
      numRetries,
    });

    this.apiKeys = new ApiKeysClient({
      baseUrl: apiEndpoint,
      oauthClient,
      tsgId,
      numRetries,
    });

    this.customerApps = new CustomerAppsClient({
      baseUrl: apiEndpoint,
      oauthClient,
      tsgId,
      numRetries,
    });

    this.dlpProfiles = new DlpProfilesClient({
      baseUrl: apiEndpoint,
      oauthClient,
      numRetries,
    });

    this.deploymentProfiles = new DeploymentProfilesClient({
      baseUrl: apiEndpoint,
      oauthClient,
      numRetries,
    });

    this.scanLogs = new ScanLogsClient({
      baseUrl: apiEndpoint,
      oauthClient,
      numRetries,
    });

    this.oauth = new OAuthManagementClient({
      baseUrl: apiEndpoint,
      oauthClient,
      numRetries,
    });
  }
}
