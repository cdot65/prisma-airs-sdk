import {
  AI_GW_ADMIN_ENDPOINT,
  AI_GW_DATA_ENDPOINT,
  DEFAULT_AI_GW_ADMIN_ENDPOINT,
  DEFAULT_AI_GW_DATA_ENDPOINT,
} from '../constants.js';
import { OAuthAuth } from '../http/auth/oauth.js';
import { TsgHeaderAuth } from '../http/auth/tsg-header.js';
import type { AuthAdapter } from '../http/types.js';
import { resolveOAuthConfig } from '../oauth-config.js';
import { AIGatewayTelemetryClient } from './telemetry-client.js';
import { AIGatewayWorkspacesClient } from './workspaces-client.js';
import { AIGatewayConfigsClient } from './configs-client.js';
import { AIGatewayGuardrailsClient } from './guardrails-client.js';
import { AIGatewayProvidersClient } from './providers-client.js';
import { AIGatewayApiKeysClient } from './api-keys-client.js';
import { AIGatewayIntegrationsClient } from './integrations-client.js';
import { AIGatewayMcpIntegrationsClient } from './mcp-integrations-client.js';
import { AIGatewayDeploymentsClient } from './deployments-client.js';
import { AIGatewayPluginsClient } from './plugins-client.js';
import { AIGatewayOrganisationsClient } from './organisations-client.js';
import { AIGatewayAuditLogsClient } from './audit-logs-client.js';

/** Options for constructing an {@link AIGatewayClient}. */
export interface AIGatewayClientOptions {
  /** OAuth2 client ID. Falls back to `PANW_AI_GW_CLIENT_ID`, then `PANW_MGMT_CLIENT_ID`. */
  clientId?: string;
  /** OAuth2 client secret. Falls back to `PANW_AI_GW_CLIENT_SECRET`, then `PANW_MGMT_CLIENT_SECRET`. */
  clientSecret?: string;
  /** Tenant Service Group ID. Falls back to `PANW_AI_GW_TSG_ID`, then `PANW_MGMT_TSG_ID`. */
  tsgId?: string;
  /** Data-plane endpoint. Falls back to `PANW_AI_GW_DATA_ENDPOINT`. */
  dataEndpoint?: string;
  /** Admin-plane endpoint. Falls back to `PANW_AI_GW_ADMIN_ENDPOINT`. */
  adminEndpoint?: string;
  /** OAuth2 token endpoint. Falls back to `PANW_AI_GW_TOKEN_ENDPOINT`, then `PANW_MGMT_TOKEN_ENDPOINT`. */
  tokenEndpoint?: string;
  /** Max retry attempts (0-5). Defaults to 5. */
  numRetries?: number;
}

/**
 * Client for the Prisma AIRS AI Gateway, managed through Strata Cloud Manager.
 *
 * Spans two planes over one credential set: the **data plane** (`/ai_gw/v2`) for runtime
 * telemetry and workspace-scoped config, and the **admin plane** (`/ai_gw/admin/v2`) for
 * organisation-level config.
 *
 * @remarks
 * The two planes authorize against **different SCM role scopes**, and the service account
 * needs both grants or half the API returns 403:
 *
 * - an admin role at **tenant root** scope → `/ai_gw/admin/v2/*`
 * - `view_only_admin` or higher on the **`main_airs_workspace_<TSG>`** scope → `/ai_gw/v2/*`
 *
 * Both can coexist on one account, but SCM's Access Management UI edits an existing role row
 * by default — use *Add Role* to add the second, or you will move the first instead of
 * adding to it. A `403` whose body carries `errorCode: "AB03"` means the workspace-scope
 * grant is missing; a `403` carrying `x-opa-decision: false` means the tenant-root grant is.
 *
 * @example
 * ```ts
 * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
 *
 * // Reads PANW_AI_GW_* (falling back to PANW_MGMT_*) env vars.
 * const gw = new AIGatewayClient();
 *
 * const cost = await gw.telemetry.cost({ workspaceSlug: 'ws-main-a-349e0e', days: 7 });
 * console.log(`$${(cost.data.total / 100).toFixed(2)}`); // cost is in cents
 * ```
 */
export class AIGatewayClient {
  /** Runtime telemetry: charts, group-bys, and raw request logs. */
  public readonly telemetry: AIGatewayTelemetryClient;
  /** Workspace reads (data plane). */
  public readonly workspaces: AIGatewayWorkspacesClient;
  /** Gateway routing configs. */
  public readonly configs: AIGatewayConfigsClient;
  /** Workspace guardrails. */
  public readonly guardrails: AIGatewayGuardrailsClient;
  /** Workspace-scoped provider bindings. */
  public readonly providers: AIGatewayProvidersClient;
  /** Service and user API keys. */
  public readonly apiKeys: AIGatewayApiKeysClient;
  /** Organisation-level provider integrations (admin plane). */
  public readonly integrations: AIGatewayIntegrationsClient;
  /** MCP server integrations (admin plane). */
  public readonly mcpIntegrations: AIGatewayMcpIntegrationsClient;
  /** Gateway deployments (admin plane). */
  public readonly deployments: AIGatewayDeploymentsClient;
  /** Plugin bindings such as the Prisma AIRS scanner (admin plane). */
  public readonly plugins: AIGatewayPluginsClient;
  /** Organisation and auth settings (admin plane). */
  public readonly organisations: AIGatewayOrganisationsClient;
  /** Organisation audit logs (admin plane). */
  public readonly auditLogs: AIGatewayAuditLogsClient;

  constructor(opts: AIGatewayClientOptions = {}) {
    const dataEndpoint =
      opts.dataEndpoint ?? process.env[AI_GW_DATA_ENDPOINT] ?? DEFAULT_AI_GW_DATA_ENDPOINT;
    const adminEndpoint =
      opts.adminEndpoint ?? process.env[AI_GW_ADMIN_ENDPOINT] ?? DEFAULT_AI_GW_ADMIN_ENDPOINT;

    const { oauthClient, numRetries, tsgId } = resolveOAuthConfig({
      clientId: opts.clientId,
      clientSecret: opts.clientSecret,
      tsgId: opts.tsgId,
      baseUrl: dataEndpoint,
      numRetries: opts.numRetries,
      tokenEndpoint: opts.tokenEndpoint,
      primaryEnvPrefix: 'PANW_AI_GW',
      fallbackEnvPrefix: 'PANW_MGMT',
    });

    // Every AI Gateway endpoint requires x-tsg-id on top of the bearer token.
    const auth: AuthAdapter = new TsgHeaderAuth(new OAuthAuth(oauthClient), tsgId);

    const dataOpts = { baseUrl: dataEndpoint, auth, numRetries };
    const adminOpts = { baseUrl: adminEndpoint, auth, numRetries };

    this.telemetry = new AIGatewayTelemetryClient({ ...dataOpts, tsgId });
    // The one sub-client needing both planes: reads default to data, writes are admin-only.
    this.workspaces = new AIGatewayWorkspacesClient({ ...dataOpts, adminBaseUrl: adminEndpoint });
    this.configs = new AIGatewayConfigsClient(dataOpts);
    this.guardrails = new AIGatewayGuardrailsClient(dataOpts);
    this.providers = new AIGatewayProvidersClient(dataOpts);
    this.apiKeys = new AIGatewayApiKeysClient(dataOpts);

    this.integrations = new AIGatewayIntegrationsClient(adminOpts);
    this.mcpIntegrations = new AIGatewayMcpIntegrationsClient(adminOpts);
    this.deployments = new AIGatewayDeploymentsClient(adminOpts);
    this.plugins = new AIGatewayPluginsClient(adminOpts);
    this.organisations = new AIGatewayOrganisationsClient(adminOpts);
    this.auditLogs = new AIGatewayAuditLogsClient(adminOpts);
  }
}
