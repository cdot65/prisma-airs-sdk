import {
  DEFAULT_RED_TEAM_DATA_ENDPOINT,
  DEFAULT_RED_TEAM_MGMT_ENDPOINT,
  RED_TEAM_CLIENT_ID,
  RED_TEAM_CLIENT_SECRET,
  RED_TEAM_TSG_ID,
  RED_TEAM_DATA_ENDPOINT,
  RED_TEAM_MGMT_ENDPOINT,
  RED_TEAM_TOKEN_ENDPOINT,
  MGMT_CLIENT_ID,
  MGMT_CLIENT_SECRET,
  MGMT_TSG_ID,
  MGMT_TOKEN_ENDPOINT,
  MAX_NUMBER_OF_RETRIES,
  RED_TEAM_DASHBOARD_PATH,
  RED_TEAM_QUOTA_PATH,
  RED_TEAM_ERROR_LOG_PATH,
  RED_TEAM_SENTIMENT_PATH,
  RED_TEAM_MGMT_DASHBOARD_PATH,
} from '../constants.js';
import { AISecSDKException, ErrorType } from '../errors.js';
import { isValidUuid } from '../utils.js';
import { OAuthClient } from '../management/oauth-client.js';
import { managementHttpRequest } from '../management/management-http-client.js';
import { RedTeamScansClient } from './scans-client.js';
import { RedTeamReportsClient } from './reports-client.js';
import { RedTeamCustomAttackReportsClient } from './custom-attack-reports-client.js';
import { RedTeamTargetsClient } from './targets-client.js';
import { RedTeamCustomAttacksClient } from './custom-attacks-client.js';
import type { RedTeamListOptions } from './scans-client.js';
import { buildRedTeamListParams } from './list-params.js';
import type {
  ScanStatisticsResponse,
  ScoreTrendResponse,
  QuotaSummary,
  ErrorLogListResponse,
  SentimentRequest,
  SentimentResponse,
  DashboardOverviewResponse,
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

  private readonly dataEndpoint: string;
  private readonly mgmtEndpoint: string;
  private readonly oauthClient: OAuthClient;
  private readonly numRetries: number;

  constructor(opts: RedTeamClientOptions = {}) {
    const clientId =
      opts.clientId ?? process.env[RED_TEAM_CLIENT_ID] ?? process.env[MGMT_CLIENT_ID];
    const clientSecret =
      opts.clientSecret ?? process.env[RED_TEAM_CLIENT_SECRET] ?? process.env[MGMT_CLIENT_SECRET];
    const tsgId = opts.tsgId ?? process.env[RED_TEAM_TSG_ID] ?? process.env[MGMT_TSG_ID];
    const dataEndpoint =
      opts.dataEndpoint ?? process.env[RED_TEAM_DATA_ENDPOINT] ?? DEFAULT_RED_TEAM_DATA_ENDPOINT;
    const mgmtEndpoint =
      opts.mgmtEndpoint ?? process.env[RED_TEAM_MGMT_ENDPOINT] ?? DEFAULT_RED_TEAM_MGMT_ENDPOINT;
    const tokenEndpoint =
      opts.tokenEndpoint ??
      process.env[RED_TEAM_TOKEN_ENDPOINT] ??
      process.env[MGMT_TOKEN_ENDPOINT];
    const numRetries = Math.min(
      Math.max(opts.numRetries ?? MAX_NUMBER_OF_RETRIES, 0),
      MAX_NUMBER_OF_RETRIES,
    );

    if (!clientId) {
      throw new AISecSDKException(
        'clientId is required (option or PANW_RED_TEAM_CLIENT_ID / PANW_MGMT_CLIENT_ID env var)',
        ErrorType.MISSING_VARIABLE,
      );
    }
    if (!clientSecret) {
      throw new AISecSDKException(
        'clientSecret is required (option or PANW_RED_TEAM_CLIENT_SECRET / PANW_MGMT_CLIENT_SECRET env var)',
        ErrorType.MISSING_VARIABLE,
      );
    }
    if (!tsgId) {
      throw new AISecSDKException(
        'tsgId is required (option or PANW_RED_TEAM_TSG_ID / PANW_MGMT_TSG_ID env var)',
        ErrorType.MISSING_VARIABLE,
      );
    }

    this.oauthClient = new OAuthClient({ clientId, clientSecret, tsgId, tokenEndpoint });
    this.dataEndpoint = dataEndpoint;
    this.mgmtEndpoint = mgmtEndpoint;
    this.numRetries = numRetries;

    this.scans = new RedTeamScansClient({
      baseUrl: dataEndpoint,
      oauthClient: this.oauthClient,
      numRetries,
    });

    this.reports = new RedTeamReportsClient({
      baseUrl: dataEndpoint,
      oauthClient: this.oauthClient,
      numRetries,
    });

    this.customAttackReports = new RedTeamCustomAttackReportsClient({
      baseUrl: dataEndpoint,
      oauthClient: this.oauthClient,
      numRetries,
    });

    this.targets = new RedTeamTargetsClient({
      baseUrl: mgmtEndpoint,
      oauthClient: this.oauthClient,
      numRetries,
    });

    this.customAttacks = new RedTeamCustomAttacksClient({
      baseUrl: mgmtEndpoint,
      oauthClient: this.oauthClient,
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
   */
  async getScanStatistics(params?: {
    date_range?: string;
    target_id?: string;
  }): Promise<ScanStatisticsResponse> {
    const p: Record<string, string> = {};
    if (params?.date_range !== undefined) p.date_range = params.date_range;
    if (params?.target_id !== undefined) p.target_id = params.target_id;

    const res = await managementHttpRequest<ScanStatisticsResponse>({
      method: 'GET',
      baseUrl: this.dataEndpoint,
      path: `${RED_TEAM_DASHBOARD_PATH}/scan-statistics`,
      params: p,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /**
   * Get score trend for a target (data plane dashboard).
   * @param targetId - The target UUID.
   * @returns The score trend response.
   */
  async getScoreTrend(targetId: string): Promise<ScoreTrendResponse> {
    if (!isValidUuid(targetId)) {
      throw new AISecSDKException(
        `Invalid target id: ${targetId}`,
        ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      );
    }
    const res = await managementHttpRequest<ScoreTrendResponse>({
      method: 'GET',
      baseUrl: this.dataEndpoint,
      path: `${RED_TEAM_DASHBOARD_PATH}/score-trend`,
      params: { target_id: targetId },
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /**
   * Get quota summary.
   * @returns The quota summary.
   */
  async getQuota(): Promise<QuotaSummary> {
    const res = await managementHttpRequest<QuotaSummary>({
      method: 'POST',
      baseUrl: this.dataEndpoint,
      path: RED_TEAM_QUOTA_PATH,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /**
   * List error logs for a scan job.
   * @param jobId - The job UUID.
   * @param opts - Optional pagination and search options.
   * @returns The paginated list of error logs.
   */
  async getErrorLogs(jobId: string, opts?: RedTeamListOptions): Promise<ErrorLogListResponse> {
    if (!isValidUuid(jobId)) {
      throw new AISecSDKException(`Invalid job id: ${jobId}`, ErrorType.USER_REQUEST_PAYLOAD_ERROR);
    }
    const res = await managementHttpRequest<ErrorLogListResponse>({
      method: 'GET',
      baseUrl: this.dataEndpoint,
      path: `${RED_TEAM_ERROR_LOG_PATH}/${jobId}`,
      params: buildRedTeamListParams(opts),
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /**
   * Update sentiment for a scan report.
   * @param request - The sentiment request body.
   * @returns The sentiment response.
   */
  async updateSentiment(request: SentimentRequest): Promise<SentimentResponse> {
    const res = await managementHttpRequest<SentimentResponse>({
      method: 'POST',
      baseUrl: this.dataEndpoint,
      path: RED_TEAM_SENTIMENT_PATH,
      body: request,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /**
   * Get sentiment for a scan report.
   * @param jobId - The job UUID.
   * @returns The sentiment response.
   */
  async getSentiment(jobId: string): Promise<SentimentResponse> {
    if (!isValidUuid(jobId)) {
      throw new AISecSDKException(`Invalid job id: ${jobId}`, ErrorType.USER_REQUEST_PAYLOAD_ERROR);
    }
    const res = await managementHttpRequest<SentimentResponse>({
      method: 'GET',
      baseUrl: this.dataEndpoint,
      path: `${RED_TEAM_SENTIMENT_PATH}/${jobId}`,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  // -----------------------------------------------------------------------
  // Management plane convenience methods
  // -----------------------------------------------------------------------

  /**
   * Get management dashboard overview.
   * @returns The dashboard overview response.
   */
  async getDashboardOverview(): Promise<DashboardOverviewResponse> {
    const res = await managementHttpRequest<DashboardOverviewResponse>({
      method: 'GET',
      baseUrl: this.mgmtEndpoint,
      path: RED_TEAM_MGMT_DASHBOARD_PATH,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }
}
