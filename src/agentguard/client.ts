import { z } from 'zod';
import { AISecSDKException, ErrorType } from '../errors.js';
import {
  AGENT_GUARD_DATA_ENDPOINT,
  AGENT_GUARD_MGMT_ENDPOINT,
  AGENT_GUARD_SCANS_PATH,
  AGENT_GUARD_STATS_PATH,
  AGENT_GUARD_RULES_PATH,
} from '../constants.js';
import { OAuthAuth } from '../http/auth/oauth.js';
import { TsgHeaderAuth } from '../http/auth/tsg-header.js';
import { request } from '../http/request.js';
import { resolveOAuthConfig } from '../oauth-config.js';
import { assertUuid } from '../validators.js';
import {
  AgentGuardScanListSchema,
  AgentGuardScanStatsSchema,
  AgentGuardVulnerabilityListSchema,
  AgentGuardRuleListSchema,
  AgentGuardPageOptionsSchema,
  AgentGuardScanListOptionsSchema,
  AgentGuardStatsOptionsSchema,
  type AgentGuardScanListOptions,
  type AgentGuardPageOptions,
  type AgentGuardStatsOptions,
} from '../models/agentguard.js';

function query<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success)
    throw new AISecSDKException(
      'Invalid AgentGuard query options',
      ErrorType.USER_REQUEST_PAYLOAD_ERROR,
    );
  return result.data;
}

/** AgentGuard uses Management OAuth credentials and separate data/management endpoints. */
export interface AgentGuardClientOptions {
  clientId?: string;
  clientSecret?: string;
  tsgId?: string;
  dataEndpoint?: string;
  mgmtEndpoint?: string;
  tokenEndpoint?: string;
  numRetries?: number;
}

/** Experimental read-only AI Supply Chain AgentGuard APIs, derived from browser captures.
 * @example
 * const client = new AgentGuardClient(); // PANW_AGENT_GUARD_* falling back to PANW_MGMT_*
 * const page = await client.listScans({ limit: 10, skip: 0 });
 * // page.scans contains skill and agent scans; page.pagination.total_items is the total.
 */
export class AgentGuardClient {
  private readonly dataEndpoint: string;
  private readonly mgmtEndpoint: string;
  private readonly auth: TsgHeaderAuth;
  private readonly numRetries: number;

  constructor(opts: AgentGuardClientOptions = {}) {
    this.dataEndpoint =
      opts.dataEndpoint ?? process.env.PANW_AGENT_GUARD_DATA_ENDPOINT ?? AGENT_GUARD_DATA_ENDPOINT;
    this.mgmtEndpoint =
      opts.mgmtEndpoint ?? process.env.PANW_AGENT_GUARD_MGMT_ENDPOINT ?? AGENT_GUARD_MGMT_ENDPOINT;
    const config = resolveOAuthConfig({
      ...opts,
      baseUrl: this.dataEndpoint,
      primaryEnvPrefix: 'PANW_AGENT_GUARD',
      fallbackEnvPrefix: 'PANW_MGMT',
    });
    this.auth = new TsgHeaderAuth(new OAuthAuth(config.oauthClient), config.tsgId);
    this.numRetries = config.numRetries;
  }

  private get<T>(
    baseUrl: string,
    path: string,
    responseSchema: z.ZodType<T>,
    values: Record<string, unknown> = {},
  ) {
    const params = Object.fromEntries(
      Object.entries(values)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)]),
    );
    return request({
      method: 'GET',
      baseUrl,
      path,
      params,
      responseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
      omitDebugBody: true,
    });
  }

  /** List one page of agent and skill scans. Invalid queries fail before authentication.
   * @example `const page = await client.listScans({ skip: 0, limit: 10, isBackgroundRefresh: false });`
   */
  async listScans(options: AgentGuardScanListOptions = {}) {
    return this.get(
      this.dataEndpoint,
      AGENT_GUARD_SCANS_PATH,
      AgentGuardScanListSchema,
      query(AgentGuardScanListOptionsSchema, options),
    );
  }

  /** Retrieve server-reported 30-day skill statistics.
   * @example `const stats = await client.getScanStats({ time_period: '30_DAYS' });`
   */
  async getScanStats(options: AgentGuardStatsOptions = {}) {
    const parsed = query(AgentGuardStatsOptionsSchema, options);
    return this.get(this.dataEndpoint, AGENT_GUARD_STATS_PATH, AgentGuardScanStatsSchema, {
      time_period: parsed.time_period ?? '30_DAYS',
    });
  }

  /** Get findings for a scan. Content may contain secrets; never include it in a public report.
   * @example `const findings = await client.listScanVulnerabilities('c3f3192d-7ff1-4b03-81e0-d392a0dd7a3f');`
   */
  async listScanVulnerabilities(scanUuid: string) {
    assertUuid(scanUuid, 'scanUuid');
    return this.get(
      this.dataEndpoint,
      `${AGENT_GUARD_SCANS_PATH}/${encodeURIComponent(scanUuid)}/vulnerabilities`,
      AgentGuardVulnerabilityListSchema,
    );
  }

  /** List rule catalog defaults, not effective tenant policy settings.
   * The observed API's pagination.total_items is the current page count, not the catalog total.
   * Continue with increasing skip until a short/empty page; apply a budget and duplicate guard.
   * @example `const catalog = await client.listRules({ skip: 0, limit: 100 });`
   */
  async listRules(options: AgentGuardPageOptions = {}) {
    return this.get(
      this.mgmtEndpoint,
      AGENT_GUARD_RULES_PATH,
      AgentGuardRuleListSchema,
      query(AgentGuardPageOptionsSchema, options),
    );
  }
}
