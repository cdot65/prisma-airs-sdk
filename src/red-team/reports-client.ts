import {
  RED_TEAM_REPORT_STATIC_PATH,
  RED_TEAM_REPORT_DYNAMIC_PATH,
  RED_TEAM_REPORT_PATH,
} from '../constants.js';
import { AISecSDKException, ErrorType } from '../errors.js';
import { isValidUuid } from '../utils.js';
import { managementHttpRequest } from '../management/management-http-client.js';
import type { OAuthClient } from '../management/oauth-client.js';
import type { RedTeamListOptions } from './scans-client.js';
import type {
  AttackListResponse,
  AttackDetailResponse,
  AttackMultiTurnDetailResponse,
  StaticJobReport,
  DynamicJobReport,
  RemediationResponse,
  RuntimeSecurityProfileResponse,
  GoalListResponse,
  StreamListResponse,
  StreamDetailResponse,
} from '../models/red-team.js';

/** Attack list filter options. */
export interface AttackListOptions extends RedTeamListOptions {
  status?: string;
  severity?: string;
  category?: string;
  sub_category?: string;
}

/** Goal list filter options. */
export interface GoalListOptions extends RedTeamListOptions {
  goal_type?: string;
}

/** @internal */
export interface RedTeamReportsClientOptions {
  baseUrl: string;
  oauthClient: OAuthClient;
  numRetries: number;
}

function buildListParams(opts?: RedTeamListOptions): Record<string, string> {
  const params: Record<string, string> = {};
  if (opts?.skip !== undefined) params.skip = String(opts.skip);
  if (opts?.limit !== undefined) params.limit = String(opts.limit);
  if (opts?.search !== undefined) params.search = opts.search;
  return params;
}

function validateJobId(jobId: string): void {
  if (!isValidUuid(jobId)) {
    throw new AISecSDKException(`Invalid job id: ${jobId}`, ErrorType.USER_REQUEST_PAYLOAD_ERROR);
  }
}

/** Client for Red Team data plane report operations. */
export class RedTeamReportsClient {
  private readonly baseUrl: string;
  private readonly oauthClient: OAuthClient;
  private readonly numRetries: number;

  constructor(opts: RedTeamReportsClientOptions) {
    this.baseUrl = opts.baseUrl;
    this.oauthClient = opts.oauthClient;
    this.numRetries = opts.numRetries;
  }

  // -----------------------------------------------------------------------
  // Static (attack library) report endpoints
  // -----------------------------------------------------------------------

  /** List attacks for a static scan. */
  async listAttacks(jobId: string, opts?: AttackListOptions): Promise<AttackListResponse> {
    validateJobId(jobId);
    const params = buildListParams(opts);
    if (opts?.status !== undefined) params.status = opts.status;
    if (opts?.severity !== undefined) params.severity = opts.severity;
    if (opts?.category !== undefined) params.category = opts.category;
    if (opts?.sub_category !== undefined) params.sub_category = opts.sub_category;

    const res = await managementHttpRequest<AttackListResponse>({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_REPORT_STATIC_PATH}/${jobId}/list-attacks`,
      params,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /** Get attack details for a static scan. */
  async getAttackDetail(jobId: string, attackId: string): Promise<AttackDetailResponse> {
    validateJobId(jobId);
    if (!isValidUuid(attackId)) {
      throw new AISecSDKException(
        `Invalid attack id: ${attackId}`,
        ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      );
    }

    const res = await managementHttpRequest<AttackDetailResponse>({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_REPORT_STATIC_PATH}/${jobId}/attack/${attackId}`,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /** Get multi-turn attack details for a static scan. */
  async getMultiTurnAttackDetail(
    jobId: string,
    attackId: string,
  ): Promise<AttackMultiTurnDetailResponse> {
    validateJobId(jobId);
    if (!isValidUuid(attackId)) {
      throw new AISecSDKException(
        `Invalid attack id: ${attackId}`,
        ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      );
    }

    const res = await managementHttpRequest<AttackMultiTurnDetailResponse>({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_REPORT_STATIC_PATH}/${jobId}/attack-multi-turn/${attackId}`,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /** Get the attack library report for a static scan. */
  async getStaticReport(jobId: string): Promise<StaticJobReport> {
    validateJobId(jobId);
    const res = await managementHttpRequest<StaticJobReport>({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_REPORT_STATIC_PATH}/${jobId}/report`,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /** Get remediation recommendations for a static scan. */
  async getStaticRemediation(jobId: string): Promise<RemediationResponse> {
    validateJobId(jobId);
    const res = await managementHttpRequest<RemediationResponse>({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_REPORT_STATIC_PATH}/${jobId}/remediation`,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /** Get runtime security profile config for a static scan. */
  async getStaticRuntimePolicy(jobId: string): Promise<RuntimeSecurityProfileResponse> {
    validateJobId(jobId);
    const res = await managementHttpRequest<RuntimeSecurityProfileResponse>({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_REPORT_STATIC_PATH}/${jobId}/runtime-policy-config`,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  // -----------------------------------------------------------------------
  // Dynamic (agent) report endpoints
  // -----------------------------------------------------------------------

  /** Get the agent scan report for a dynamic scan. */
  async getDynamicReport(jobId: string): Promise<DynamicJobReport> {
    validateJobId(jobId);
    const res = await managementHttpRequest<DynamicJobReport>({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_REPORT_DYNAMIC_PATH}/${jobId}/report`,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /** Get remediation recommendations for a dynamic scan. */
  async getDynamicRemediation(jobId: string): Promise<RemediationResponse> {
    validateJobId(jobId);
    const res = await managementHttpRequest<RemediationResponse>({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_REPORT_DYNAMIC_PATH}/${jobId}/remediation`,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /** Get runtime security profile config for a dynamic scan. */
  async getDynamicRuntimePolicy(jobId: string): Promise<RuntimeSecurityProfileResponse> {
    validateJobId(jobId);
    const res = await managementHttpRequest<RuntimeSecurityProfileResponse>({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_REPORT_DYNAMIC_PATH}/${jobId}/runtime-policy-config`,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /** List goals for a dynamic scan. */
  async listGoals(jobId: string, opts?: GoalListOptions): Promise<GoalListResponse> {
    validateJobId(jobId);
    const params = buildListParams(opts);
    if (opts?.goal_type !== undefined) params.goal_type = opts.goal_type;

    const res = await managementHttpRequest<GoalListResponse>({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_REPORT_DYNAMIC_PATH}/${jobId}/list-goals`,
      params,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /** List streams for a goal in a dynamic scan. */
  async listGoalStreams(
    jobId: string,
    goalId: string,
    opts?: RedTeamListOptions,
  ): Promise<StreamListResponse> {
    validateJobId(jobId);
    if (!isValidUuid(goalId)) {
      throw new AISecSDKException(
        `Invalid goal id: ${goalId}`,
        ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      );
    }

    const res = await managementHttpRequest<StreamListResponse>({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_REPORT_DYNAMIC_PATH}/${jobId}/goal/${goalId}/list-streams`,
      params: buildListParams(opts),
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  // -----------------------------------------------------------------------
  // Common report endpoints
  // -----------------------------------------------------------------------

  /** Get stream details by stream ID. */
  async getStreamDetail(streamId: string): Promise<StreamDetailResponse> {
    if (!isValidUuid(streamId)) {
      throw new AISecSDKException(
        `Invalid stream id: ${streamId}`,
        ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      );
    }

    const res = await managementHttpRequest<StreamDetailResponse>({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_REPORT_DYNAMIC_PATH}/stream/${streamId}`,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /** Download a report in the specified format. */
  async downloadReport(jobId: string, format?: string): Promise<unknown> {
    validateJobId(jobId);
    const params: Record<string, string> = {};
    if (format !== undefined) params.file_format = format;

    const res = await managementHttpRequest<unknown>({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_REPORT_PATH}/${jobId}/download`,
      params,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /** Generate a partial report for a running scan. */
  async generatePartialReport(jobId: string): Promise<unknown> {
    validateJobId(jobId);
    const res = await managementHttpRequest<unknown>({
      method: 'POST',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_REPORT_PATH}/${jobId}/generate-partial-report`,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }
}
