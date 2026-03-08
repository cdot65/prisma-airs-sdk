import { RED_TEAM_CUSTOM_ATTACKS_REPORT_PATH } from '../constants.js';
import { AISecSDKException, ErrorType } from '../errors.js';
import { isValidUuid } from '../utils.js';
import { managementHttpRequest } from '../management/management-http-client.js';
import type { OAuthClient } from '../management/oauth-client.js';
import type { RedTeamListOptions } from './scans-client.js';
import type {
  CustomAttackReportResponse,
  PromptSetsReportResponse,
  PromptDetailResponse,
  CustomAttacksListResponse,
  PropertyStatistic,
} from '../models/red-team.js';

/** @internal */
export interface RedTeamCustomAttackReportsClientOptions {
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

/** Client for Red Team custom attack report operations. */
export class RedTeamCustomAttackReportsClient {
  private readonly baseUrl: string;
  private readonly oauthClient: OAuthClient;
  private readonly numRetries: number;

  constructor(opts: RedTeamCustomAttackReportsClientOptions) {
    this.baseUrl = opts.baseUrl;
    this.oauthClient = opts.oauthClient;
    this.numRetries = opts.numRetries;
  }

  /** Get custom attack report for a scan. */
  async getReport(jobId: string): Promise<CustomAttackReportResponse> {
    validateJobId(jobId);
    const res = await managementHttpRequest<CustomAttackReportResponse>({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_CUSTOM_ATTACKS_REPORT_PATH}/report/${jobId}`,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /** Get prompt sets for a custom attack scan. */
  async getPromptSets(jobId: string): Promise<PromptSetsReportResponse> {
    validateJobId(jobId);
    const res = await managementHttpRequest<PromptSetsReportResponse>({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_CUSTOM_ATTACKS_REPORT_PATH}/report/${jobId}/prompt-sets`,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /** Get prompts for a specific prompt set in a scan. */
  async getPromptsBySet(
    jobId: string,
    promptSetId: string,
    opts?: RedTeamListOptions,
  ): Promise<unknown> {
    validateJobId(jobId);
    if (!isValidUuid(promptSetId)) {
      throw new AISecSDKException(
        `Invalid prompt set id: ${promptSetId}`,
        ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      );
    }

    const res = await managementHttpRequest<unknown>({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_CUSTOM_ATTACKS_REPORT_PATH}/report/${jobId}/prompt-set/${promptSetId}/prompts`,
      params: buildListParams(opts),
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /** Get details for a specific prompt. */
  async getPromptDetail(jobId: string, promptId: string): Promise<PromptDetailResponse> {
    validateJobId(jobId);
    if (!isValidUuid(promptId)) {
      throw new AISecSDKException(
        `Invalid prompt id: ${promptId}`,
        ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      );
    }

    const res = await managementHttpRequest<PromptDetailResponse>({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_CUSTOM_ATTACKS_REPORT_PATH}/report/${jobId}/prompt/${promptId}`,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /** List custom attacks for a scan. */
  async listCustomAttacks(
    jobId: string,
    opts?: RedTeamListOptions,
  ): Promise<CustomAttacksListResponse> {
    validateJobId(jobId);
    const res = await managementHttpRequest<CustomAttacksListResponse>({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_CUSTOM_ATTACKS_REPORT_PATH}/job/${jobId}/list-custom-attacks`,
      params: buildListParams(opts),
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /** Get attack outputs for a custom attack. */
  async getAttackOutputs(jobId: string, attackId: string): Promise<unknown> {
    validateJobId(jobId);
    if (!isValidUuid(attackId)) {
      throw new AISecSDKException(
        `Invalid attack id: ${attackId}`,
        ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      );
    }

    const res = await managementHttpRequest<unknown>({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_CUSTOM_ATTACKS_REPORT_PATH}/job/${jobId}/attack/${attackId}/list-outputs`,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /** Get property statistics for a custom attack scan. */
  async getPropertyStats(jobId: string): Promise<PropertyStatistic[]> {
    validateJobId(jobId);
    const res = await managementHttpRequest<PropertyStatistic[]>({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_CUSTOM_ATTACKS_REPORT_PATH}/job/${jobId}/property-stats`,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }
}
