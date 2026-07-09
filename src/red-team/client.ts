import {
  DEFAULT_RED_TEAM_DATA_ENDPOINT,
  DEFAULT_RED_TEAM_MGMT_ENDPOINT,
  DEFAULT_RED_TEAM_NETWORK_BROKER_ENDPOINT,
  RED_TEAM_DATA_ENDPOINT,
  RED_TEAM_MGMT_ENDPOINT,
  RED_TEAM_NETWORK_BROKER_ENDPOINT,
  RED_TEAM_DASHBOARD_PATH,
  RED_TEAM_QUOTA_PATH,
  RED_TEAM_ERROR_LOG_PATH,
  RED_TEAM_ERROR_LOG_TARGET_PROFILE_PATH,
  RED_TEAM_LANGUAGES_PATH,
  RED_TEAM_SENTIMENT_PATH,
  RED_TEAM_MGMT_DASHBOARD_PATH,
} from '../constants.js';
import { OAuthAuth } from '../http/auth/oauth.js';
import { request } from '../http/request.js';
import type { AuthAdapter } from '../http/types.js';
import { serializeListing } from '../listing.js';
import { resolveOAuthConfig } from '../oauth-config.js';
import { assertUuid } from '../validators.js';
import { RedTeamScansClient, type RedTeamListOptions } from './scans-client.js';
import { RedTeamReportsClient } from './reports-client.js';
import { RedTeamCustomAttackReportsClient } from './custom-attack-reports-client.js';
import { RedTeamTargetsClient } from './targets-client.js';
import { RedTeamCustomAttacksClient } from './custom-attacks-client.js';
import { RedTeamEulaClient } from './eula-client.js';
import { RedTeamInstancesClient } from './instances-client.js';
import { RedTeamNetworkBrokerClient } from './network-broker-client.js';
import {
  ScanStatisticsResponseSchema,
  ScoreTrendResponseSchema,
  QuotaSummarySchema,
  ErrorLogListResponseSchema,
  SentimentResponseSchema,
  DashboardOverviewResponseSchema,
  TenantLanguagesResponseSchema,
  type ScanStatisticsResponse,
  type ScoreTrendResponse,
  type QuotaSummary,
  type ErrorLogListResponse,
  type SentimentRequest,
  type SentimentResponse,
  type DashboardOverviewResponse,
  type TenantLanguagesResponse,
} from '../models/red-team.js';

/** Options for constructing a {@link RedTeamClient}. */
export interface RedTeamClientOptions {
  /** OAuth2 client ID. Falls back to `PANW_RED_TEAM_CLIENT_ID`, then `PANW_MGMT_CLIENT_ID`. */
  clientId?: string;
  /** OAuth2 client secret. Falls back to `PANW_RED_TEAM_CLIENT_SECRET`, then `PANW_MGMT_CLIENT_SECRET`. */
  clientSecret?: string;
  /** Tenant Service Group ID. Falls back to `PANW_RED_TEAM_TSG_ID`, then `PANW_MGMT_TSG_ID`. */
  tsgId?: string;
  /** Data plane endpoint URL. Falls back to `PANW_RED_TEAM_DATA_ENDPOINT`. */
  dataEndpoint?: string;
  /** Management plane endpoint URL. Falls back to `PANW_RED_TEAM_MGMT_ENDPOINT`. */
  mgmtEndpoint?: string;
  /** Network broker endpoint URL. Falls back to `PANW_RED_TEAM_NETWORK_BROKER_ENDPOINT`. */
  networkBrokerEndpoint?: string;
  /** OAuth2 token endpoint URL. Falls back to `PANW_RED_TEAM_TOKEN_ENDPOINT`, then `PANW_MGMT_TOKEN_ENDPOINT`. */
  tokenEndpoint?: string;
  /** Max retry attempts (0-5). Defaults to 5. */
  numRetries?: number;
}

/**
 * Client for AIRS Red Teaming API operations.
 * Uses two base URLs: data plane for scans/reports, management plane for targets/custom attacks.
 * @example
 * ```ts
 * import { RedTeamClient } from '@cdot65/prisma-airs-sdk';
 * // Reads PANW_RED_TEAM_* env vars (falls back to PANW_MGMT_*).
 * const rt = new RedTeamClient();
 *
 * const scans = await rt.scans.list({ limit: 5 });
 * // scans =>
 * // { pagination: { total_items: 12 }, data: [{ uuid: '550e8400-...', status: 'COMPLETED', job_type: 'STATIC' }] }
 * ```
 */
export class RedTeamClient {
  /** Data plane scan operations. */
  public readonly scans: RedTeamScansClient;
  /** Data plane report operations. */
  public readonly reports: RedTeamReportsClient;
  /** Data plane custom attack report operations. */
  public readonly customAttackReports: RedTeamCustomAttackReportsClient;
  /** Management plane target operations. */
  public readonly targets: RedTeamTargetsClient;
  /** Management plane custom attack/prompt set operations. */
  public readonly customAttacks: RedTeamCustomAttacksClient;
  /** Management plane EULA operations. */
  public readonly eula: RedTeamEulaClient;
  /** Management plane instance/licensing operations. */
  public readonly instances: RedTeamInstancesClient;
  /** Network broker channel operations (distinct network broker base URL). */
  public readonly networkBroker: RedTeamNetworkBrokerClient;

  private readonly dataEndpoint: string;
  private readonly mgmtEndpoint: string;
  private readonly auth: AuthAdapter;
  private readonly numRetries: number;

  constructor(opts: RedTeamClientOptions = {}) {
    const dataEndpoint =
      opts.dataEndpoint ?? process.env[RED_TEAM_DATA_ENDPOINT] ?? DEFAULT_RED_TEAM_DATA_ENDPOINT;
    const mgmtEndpoint =
      opts.mgmtEndpoint ?? process.env[RED_TEAM_MGMT_ENDPOINT] ?? DEFAULT_RED_TEAM_MGMT_ENDPOINT;
    const networkBrokerEndpoint =
      opts.networkBrokerEndpoint ??
      process.env[RED_TEAM_NETWORK_BROKER_ENDPOINT] ??
      DEFAULT_RED_TEAM_NETWORK_BROKER_ENDPOINT;

    const { oauthClient, numRetries } = resolveOAuthConfig({
      clientId: opts.clientId,
      clientSecret: opts.clientSecret,
      tsgId: opts.tsgId,
      baseUrl: dataEndpoint,
      numRetries: opts.numRetries,
      tokenEndpoint: opts.tokenEndpoint,
      primaryEnvPrefix: 'PANW_RED_TEAM',
      fallbackEnvPrefix: 'PANW_MGMT',
    });

    const auth = new OAuthAuth(oauthClient);
    this.auth = auth;
    this.dataEndpoint = dataEndpoint;
    this.mgmtEndpoint = mgmtEndpoint;
    this.numRetries = numRetries;

    this.scans = new RedTeamScansClient({ baseUrl: dataEndpoint, auth, numRetries });
    this.reports = new RedTeamReportsClient({ baseUrl: dataEndpoint, auth, numRetries });
    this.customAttackReports = new RedTeamCustomAttackReportsClient({
      baseUrl: dataEndpoint,
      auth,
      numRetries,
    });
    this.targets = new RedTeamTargetsClient({ baseUrl: mgmtEndpoint, auth, numRetries });
    this.customAttacks = new RedTeamCustomAttacksClient({
      baseUrl: mgmtEndpoint,
      auth,
      numRetries,
    });
    this.eula = new RedTeamEulaClient({ baseUrl: mgmtEndpoint, auth, numRetries });
    this.instances = new RedTeamInstancesClient({ baseUrl: mgmtEndpoint, auth, numRetries });
    this.networkBroker = new RedTeamNetworkBrokerClient({
      baseUrl: networkBrokerEndpoint,
      auth,
      numRetries,
    });
  }

  // -----------------------------------------------------------------------
  // Data plane convenience methods
  // -----------------------------------------------------------------------

  /**
   * Get scan statistics and risk profile (data plane dashboard).
   * @param params - Optional date range and target ID filters.
   * @returns The scan statistics response.
   * @example
   * ```ts
   * import { RedTeamClient } from '@cdot65/prisma-airs-sdk';
   * const rt = new RedTeamClient();
   *
   * const stats = await rt.getScanStatistics({ date_range: '30d' });
   * // stats =>
   * // { total_scans: 10, targets_scanned: 5 }
   * ```
   */
  async getScanStatistics(params?: {
    date_range?: string;
    target_id?: string;
  }): Promise<ScanStatisticsResponse> {
    const p: Record<string, string> = {};
    if (params?.date_range !== undefined) p.date_range = params.date_range;
    if (params?.target_id !== undefined) p.target_id = params.target_id;

    return request({
      method: 'GET',
      baseUrl: this.dataEndpoint,
      path: `${RED_TEAM_DASHBOARD_PATH}/scan-statistics`,
      params: p,
      responseSchema: ScanStatisticsResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Get score trend for a target (data plane dashboard).
   * @param targetId - The target UUID.
   * @returns The score trend response.
   * @example
   * ```ts
   * import { RedTeamClient } from '@cdot65/prisma-airs-sdk';
   * const rt = new RedTeamClient();
   *
   * const trend = await rt.getScoreTrend('550e8400-e29b-41d4-a716-446655440000');
   * // trend =>
   * // { labels: ['2026-04', '2026-05'], series: [{ name: 'risk', data: [42, 38] }] }
   * ```
   */
  async getScoreTrend(targetId: string): Promise<ScoreTrendResponse> {
    assertUuid(targetId, 'target id');
    return request({
      method: 'GET',
      baseUrl: this.dataEndpoint,
      path: `${RED_TEAM_DASHBOARD_PATH}/score-trend`,
      params: { target_id: targetId },
      responseSchema: ScoreTrendResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Get quota summary.
   * @returns The quota summary.
   * @example
   * ```ts
   * import { RedTeamClient } from '@cdot65/prisma-airs-sdk';
   * const rt = new RedTeamClient();
   *
   * const quota = await rt.getQuota();
   * // quota =>
   * // { static: { allocated: 100, unlimited: false, consumed: 5 }, dynamic: {...}, custom: {...} }
   * ```
   */
  async getQuota(): Promise<QuotaSummary> {
    return request({
      method: 'POST',
      baseUrl: this.dataEndpoint,
      path: RED_TEAM_QUOTA_PATH,
      responseSchema: QuotaSummarySchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * List error logs for a scan job.
   * @param jobId - The job UUID.
   * @param opts - Optional pagination and search options.
   * @returns The paginated list of error logs.
   * @example
   * ```ts
   * import { RedTeamClient } from '@cdot65/prisma-airs-sdk';
   * const rt = new RedTeamClient();
   *
   * const logs = await rt.getErrorLogs('550e8400-e29b-41d4-a716-446655440000', { limit: 10 });
   * // logs =>
   * // { pagination: { total_items: 1 }, data: [{ error_type: 'TIMEOUT', error_message: '...', created_at: '2025-01-01T00:00:00Z' }] }
   * ```
   */
  async getErrorLogs(jobId: string, opts?: RedTeamListOptions): Promise<ErrorLogListResponse> {
    assertUuid(jobId, 'job id');
    return request({
      method: 'GET',
      baseUrl: this.dataEndpoint,
      path: `${RED_TEAM_ERROR_LOG_PATH}/${jobId}`,
      params: serializeListing(opts),
      responseSchema: ErrorLogListResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * List profiling error logs for a target (data plane).
   * @param targetId - The target UUID.
   * @param opts - Optional pagination/search options (the endpoint honors `limit`).
   * @returns The paginated list of target-profile error logs.
   * @example
   * ```ts
   * import { RedTeamClient } from '@cdot65/prisma-airs-sdk';
   * const rt = new RedTeamClient();
   *
   * const logs = await rt.getTargetProfileErrorLogs('550e8400-e29b-41d4-a716-446655440000', { limit: 10 });
   * // logs =>
   * // { pagination: { total_items: 1 }, data: [{ target_id: '550e8400-...', error_type: 'PROBE', error_message: '...', created_at: '2025-01-01T00:00:00Z' }] }
   * ```
   */
  async getTargetProfileErrorLogs(
    targetId: string,
    opts?: RedTeamListOptions,
  ): Promise<ErrorLogListResponse> {
    assertUuid(targetId, 'target id');
    return request({
      method: 'GET',
      baseUrl: this.dataEndpoint,
      path: `${RED_TEAM_ERROR_LOG_TARGET_PROFILE_PATH}/${targetId}`,
      params: serializeListing(opts),
      responseSchema: ErrorLogListResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Get the tenant's allowed languages for Red Team scans (data plane).
   * @returns The supported-languages response.
   * @example
   * ```ts
   * import { RedTeamClient } from '@cdot65/prisma-airs-sdk';
   * const rt = new RedTeamClient();
   *
   * const langs = await rt.getLanguages();
   * // langs =>
   * // { multilingual_enabled: true, supported_job_types: ['STATIC', 'DYNAMIC'],
   * //   languages: [{ code: 'en', name: 'English' }, { code: 'es', name: 'Spanish' }] }
   * ```
   */
  async getLanguages(): Promise<TenantLanguagesResponse> {
    return request({
      method: 'GET',
      baseUrl: this.dataEndpoint,
      path: RED_TEAM_LANGUAGES_PATH,
      responseSchema: TenantLanguagesResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Get the tenant's allowed languages from the management plane.
   * Same response shape as {@link RedTeamClient.getLanguages}, served from the management endpoint.
   * @returns The supported-languages response.
   * @example
   * ```ts
   * import { RedTeamClient } from '@cdot65/prisma-airs-sdk';
   * const rt = new RedTeamClient();
   *
   * const langs = await rt.getManagementLanguages();
   * // langs =>
   * // { multilingual_enabled: true, supported_job_types: ['STATIC', 'DYNAMIC'],
   * //   languages: [{ code: 'en', name: 'English' }] }
   * ```
   */
  async getManagementLanguages(): Promise<TenantLanguagesResponse> {
    return request({
      method: 'GET',
      baseUrl: this.mgmtEndpoint,
      path: RED_TEAM_LANGUAGES_PATH,
      responseSchema: TenantLanguagesResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Update sentiment for a scan report.
   * @param body - The sentiment request body.
   * @returns The sentiment response.
   * @example
   * ```ts
   * import { RedTeamClient } from '@cdot65/prisma-airs-sdk';
   * const rt = new RedTeamClient();
   *
   * const result = await rt.updateSentiment({
   *   job_id: '550e8400-e29b-41d4-a716-446655440000',
   *   up_vote: true,
   * });
   * // result =>
   * // { job_id: '550e8400-...', up_vote: true }
   * ```
   */
  async updateSentiment(body: SentimentRequest): Promise<SentimentResponse> {
    return request({
      method: 'POST',
      baseUrl: this.dataEndpoint,
      path: RED_TEAM_SENTIMENT_PATH,
      body,
      responseSchema: SentimentResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Get sentiment for a scan report.
   * @param jobId - The job UUID.
   * @returns The sentiment response.
   * @example
   * ```ts
   * import { RedTeamClient } from '@cdot65/prisma-airs-sdk';
   * const rt = new RedTeamClient();
   *
   * const sentiment = await rt.getSentiment('550e8400-e29b-41d4-a716-446655440000');
   * // sentiment =>
   * // { job_id: '550e8400-...', up_vote: true }
   * ```
   */
  async getSentiment(jobId: string): Promise<SentimentResponse> {
    assertUuid(jobId, 'job id');
    return request({
      method: 'GET',
      baseUrl: this.dataEndpoint,
      path: `${RED_TEAM_SENTIMENT_PATH}/${jobId}`,
      responseSchema: SentimentResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  // -----------------------------------------------------------------------
  // Management plane convenience methods
  // -----------------------------------------------------------------------

  /**
   * Get management dashboard overview.
   * @returns The dashboard overview response.
   * @example
   * ```ts
   * import { RedTeamClient } from '@cdot65/prisma-airs-sdk';
   * const rt = new RedTeamClient();
   *
   * const overview = await rt.getDashboardOverview();
   * // overview =>
   * // { total_targets: 7, targets_by_type: [{ type: 'API', count: 4 }] }
   * ```
   */
  async getDashboardOverview(): Promise<DashboardOverviewResponse> {
    return request({
      method: 'GET',
      baseUrl: this.mgmtEndpoint,
      path: RED_TEAM_MGMT_DASHBOARD_PATH,
      responseSchema: DashboardOverviewResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }
}
