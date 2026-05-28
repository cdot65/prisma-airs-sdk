import { DEFAULT_DLP_ENDPOINT, DEFAULT_MGMT_ENDPOINT, MGMT_ENDPOINT } from '../constants.js';
import { OAuthAuth } from '../http/auth/oauth.js';
import { resolveOAuthConfig } from '../oauth-config.js';
import { ProfilesClient } from './profiles.js';
import { TopicsClient } from './topics.js';
import { ApiKeysClient } from './api-keys.js';
import { CustomerAppsClient } from './customer-apps.js';
import { DlpProfilesClient } from './dlp-profiles.js';
import { DeploymentProfilesClient } from './deployment-profiles.js';
import { ScanLogsClient } from './scan-logs.js';
import { OAuthManagementClient } from './oauth-management.js';
import { DashboardClient } from './dashboard.js';
import { DlpNamespace } from './dlp/index.js';

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
  /**
   * DLP (Data Loss Prevention) API endpoint URL. Used by the `dlp` subclients.
   * Defaults to `https://api.dlp.paloaltonetworks.com`. Constructor-only — no env var override
   * (DLP shares OAuth credentials with the management API).
   */
  dlpEndpoint?: string;
  /** OAuth2 token endpoint URL. Falls back to `PANW_MGMT_TOKEN_ENDPOINT` env var. */
  tokenEndpoint?: string;
  /** Max retry attempts (0–5). Defaults to 5. */
  numRetries?: number;
}

/**
 * Client for AIRS management API operations.
 * Authenticates via OAuth2 client_credentials flow.
 * @example
 * ```ts
 * import { ManagementClient } from '@cdot65/prisma-airs-sdk';
 *
 * // Reads PANW_MGMT_CLIENT_ID / PANW_MGMT_CLIENT_SECRET / PANW_MGMT_TSG_ID env vars
 * const mgmt = new ManagementClient();
 *
 * // Or pass credentials explicitly
 * const explicit = new ManagementClient({
 *   clientId: 'your-client-id',
 *   clientSecret: 'your-client-secret',
 *   tsgId: '1234567890',
 * });
 *
 * const profiles = await mgmt.profiles.list();
 * // profiles.ai_profiles => [ { profile_id: '550e8400-...', profile_name: 'prod', active: true } ]
 * ```
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
  public readonly dashboard: DashboardClient;
  public readonly dlp: DlpNamespace;

  constructor(opts: ManagementClientOptions = {}) {
    const apiEndpoint = opts.apiEndpoint ?? process.env[MGMT_ENDPOINT] ?? DEFAULT_MGMT_ENDPOINT;
    const dlpEndpoint = opts.dlpEndpoint ?? DEFAULT_DLP_ENDPOINT;

    const { baseUrl, oauthClient, numRetries, tsgId } = resolveOAuthConfig({
      clientId: opts.clientId,
      clientSecret: opts.clientSecret,
      tsgId: opts.tsgId,
      baseUrl: apiEndpoint,
      numRetries: opts.numRetries,
      tokenEndpoint: opts.tokenEndpoint,
      primaryEnvPrefix: 'PANW_MGMT',
    });

    const auth = new OAuthAuth(oauthClient);

    this.profiles = new ProfilesClient({ baseUrl, auth, tsgId, numRetries });
    this.topics = new TopicsClient({ baseUrl, auth, tsgId, numRetries });
    this.apiKeys = new ApiKeysClient({ baseUrl, auth, tsgId, numRetries });
    this.customerApps = new CustomerAppsClient({ baseUrl, auth, tsgId, numRetries });
    this.dlpProfiles = new DlpProfilesClient({ baseUrl, auth, numRetries });
    this.deploymentProfiles = new DeploymentProfilesClient({ baseUrl, auth, numRetries });
    this.scanLogs = new ScanLogsClient({ baseUrl, auth, numRetries });
    this.oauth = new OAuthManagementClient({ baseUrl, auth, numRetries });
    this.dashboard = new DashboardClient({ baseUrl, auth, numRetries });
    this.dlp = new DlpNamespace({ baseUrl: dlpEndpoint, auth, numRetries });
  }
}
