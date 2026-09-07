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
import { AIGatewayMcpServersClient } from './mcp-servers-client.js';
import { AIGatewayUsageLimitsClient } from './usage-limits-client.js';
import { AIGatewayRateLimitsClient } from './rate-limits-client.js';
import { AIGatewayLogExportsClient } from './log-exports-client.js';
import { AIGatewaySecretReferencesClient } from './secret-references-client.js';
import {
  AIGatewayInferenceClient,
  type AIGatewayInferenceClientOptions,
} from './inference-client.js';

/** Options for constructing an {@link AIGatewayClient}. */
export interface AIGatewayClientOptions {
  /** Separate runtime endpoint/key configuration, resolved lazily when inference is accessed. */
  inference?: AIGatewayInferenceClientOptions;
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
 * The two planes authorize against **different SCM role scopes**. Verified tenant workflows
 * use grants at both scopes; authorization still depends on the requested operation:
 *
 * - an admin role at **tenant root** scope → `/ai_gw/admin/v2/*`
 * - `view_only_admin` or higher on the **`main_airs_workspace_<TSG>`** scope → `/ai_gw/v2/*`
 *
 * Both can coexist on one account, but SCM's Access Management UI edits an existing role row
 * by default — use *Add Role* to add the second, or you will move the first instead of
 * adding to it. `errorCode: "AB03"` indicates application authorization rejection; check the
 * requested workspace and plane. `403` with `x-opa-decision: false` indicates SCM policy denial,
 * not proof of a missing tenant-root grant or an available endpoint. Verified workspace reads
 * can succeed on both planes while candidate routes remain denied. Compare a known-good read
 * on the same plane and verify the route/query contract before considering permission changes.
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
  private readonly inferenceFactory: () => AIGatewayInferenceClient;
  private inferenceClient?: AIGatewayInferenceClient;
  /** Runtime gateway-key client; never sends management OAuth credentials to the runtime host.
   * @example `const result = await gw.inference.createEmbedding({ model: '@provider/embedding', input: 'Hello' });`
   */
  get inference(): AIGatewayInferenceClient {
    return (this.inferenceClient ??= this.inferenceFactory());
  }
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
  /** Workspace MCP servers, capabilities, user access, and connections. */
  public readonly mcpServers: AIGatewayMcpServersClient;
  /** Workspace cost/token usage-limit policies. Deletion archives a policy. */
  public readonly usageLimits: AIGatewayUsageLimitsClient;
  /** Workspace request/token rate-limit policies. */
  public readonly rateLimits: AIGatewayRateLimitsClient;
  /** Asynchronous request-log exports. Downloads return a signed URL, not fetched log content. */
  public readonly logExports: AIGatewayLogExportsClient;
  /** External secret-manager references (admin plane). CRUD does not resolve the referenced secret. */
  public readonly secretReferences: AIGatewaySecretReferencesClient;

  constructor(opts: AIGatewayClientOptions = {}) {
    const inferenceOptions = opts.inference ? { ...opts.inference } : undefined;
    this.inferenceFactory = () => new AIGatewayInferenceClient(inferenceOptions);
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
    this.mcpServers = new AIGatewayMcpServersClient(dataOpts);
    this.usageLimits = new AIGatewayUsageLimitsClient(dataOpts);
    this.rateLimits = new AIGatewayRateLimitsClient(dataOpts);
    this.logExports = new AIGatewayLogExportsClient(dataOpts);

    this.integrations = new AIGatewayIntegrationsClient(adminOpts);
    this.mcpIntegrations = new AIGatewayMcpIntegrationsClient(adminOpts);
    this.deployments = new AIGatewayDeploymentsClient(adminOpts);
    this.plugins = new AIGatewayPluginsClient(adminOpts);
    this.organisations = new AIGatewayOrganisationsClient(adminOpts);
    this.auditLogs = new AIGatewayAuditLogsClient(adminOpts);
    this.secretReferences = new AIGatewaySecretReferencesClient(adminOpts);
  }
}
