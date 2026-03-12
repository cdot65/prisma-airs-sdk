import { DEFAULT_MGMT_ENDPOINT, MGMT_ENDPOINT } from '../constants.js';
import { resolveOAuthConfig } from '../oauth-config.js';
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
    const apiEndpoint = opts.apiEndpoint ?? process.env[MGMT_ENDPOINT] ?? DEFAULT_MGMT_ENDPOINT;

    const { baseUrl, oauthClient, numRetries, tsgId } = resolveOAuthConfig({
      clientId: opts.clientId,
      clientSecret: opts.clientSecret,
      tsgId: opts.tsgId,
      baseUrl: apiEndpoint,
      numRetries: opts.numRetries,
      tokenEndpoint: opts.tokenEndpoint,
      primaryEnvPrefix: 'PANW_MGMT',
    });

    this.profiles = new ProfilesClient({
      baseUrl,
      oauthClient,
      tsgId,
      numRetries,
    });

    this.topics = new TopicsClient({
      baseUrl,
      oauthClient,
      tsgId,
      numRetries,
    });

    this.apiKeys = new ApiKeysClient({
      baseUrl,
      oauthClient,
      tsgId,
      numRetries,
    });

    this.customerApps = new CustomerAppsClient({
      baseUrl,
      oauthClient,
      tsgId,
      numRetries,
    });

    this.dlpProfiles = new DlpProfilesClient({
      baseUrl,
      oauthClient,
      numRetries,
    });

    this.deploymentProfiles = new DeploymentProfilesClient({
      baseUrl,
      oauthClient,
      numRetries,
    });

    this.scanLogs = new ScanLogsClient({
      baseUrl,
      oauthClient,
      numRetries,
    });

    this.oauth = new OAuthManagementClient({
      baseUrl,
      oauthClient,
      numRetries,
    });
  }
}
