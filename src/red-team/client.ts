import {
  DEFAULT_RED_TEAM_DATA_ENDPOINT,
  DEFAULT_RED_TEAM_MGMT_ENDPOINT,
  RED_TEAM_DATA_ENDPOINT,
  RED_TEAM_MGMT_ENDPOINT,
  RED_TEAM_DASHBOARD_PATH,
  RED_TEAM_QUOTA_PATH,
  RED_TEAM_ERROR_LOG_PATH,
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
import {
  ScanStatisticsResponseSchema,
  ScoreTrendResponseSchema,
  QuotaSummarySchema,
  ErrorLogListResponseSchema,
  SentimentResponseSchema,
  DashboardOverviewResponseSchema,
  type ScanStatisticsResponse,
  type ScoreTrendResponse,
  type QuotaSummary,
  type ErrorLogListResponse,
  type SentimentRequest,
  type SentimentResponse,
  type DashboardOverviewResponse,
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
  /** OAuth2 token endpoint URL. Falls back to `PANW_RED_TEAM_TOKEN_ENDPOINT`, then `PANW_MGMT_TOKEN_ENDPOINT`. */
  tokenEndpoint?: string;
  /** Max retry attempts (0-5). Defaults to 5. */
  numRetries?: number;
}

/**
 * Client for AIRS Red Teaming API operations.
 * Uses two base URLs: data plane for scans/reports, management plane for targets/custom attacks.
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

  private readonly dataEndpoint: string;
  private readonly mgmtEndpoint: string;
  private readonly auth: AuthAdapter;
  private readonly numRetries: number;

  constructor(opts: RedTeamClientOptions = {}) {
    const dataEndpoint =
      opts.dataEndpoint ?? process.env[RED_TEAM_DATA_ENDPOINT] ?? DEFAULT_RED_TEAM_DATA_ENDPOINT;
    const mgmtEndpoint =
      opts.mgmtEndpoint ?? process.env[RED_TEAM_MGMT_ENDPOINT] ?? DEFAULT_RED_TEAM_MGMT_ENDPOINT;

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
  }

  // -----------------------------------------------------------------------
  // Data plane convenience methods
  // -----------------------------------------------------------------------

  /**
   * Get scan statistics and risk profile (data plane dashboard).
   * @param params - Optional date range and target ID filters.
   * @returns The scan statistics response.
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
   * Update sentiment for a scan report.
   * @param body - The sentiment request body.
   * @returns The sentiment response.
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
