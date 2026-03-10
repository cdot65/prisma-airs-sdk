import { RED_TEAM_CUSTOM_ATTACKS_REPORT_PATH } from '../constants.js';
import { AISecSDKException, ErrorType } from '../errors.js';
import { isValidUuid } from '../utils.js';
import { managementHttpRequest } from '../management/management-http-client.js';
import { buildRedTeamListParams } from './list-params.js';
import type { OAuthClient } from '../management/oauth-client.js';
import type { RedTeamListOptions } from './scans-client.js';
import type {
  CustomAttackReportResponse,
  PromptSetsReportResponse,
  PromptDetailResponse,
  CustomAttacksListResponse,
  CustomAttackOutput,
  PropertyStatistic,
} from '../models/red-team.js';

/** Filter options for listing prompts by set in a report. */
export interface PromptsBySetListOptions extends RedTeamListOptions {
  is_threat?: boolean;
}

/** Filter options for listing custom attacks in a report. */
export interface CustomAttacksReportListOptions extends RedTeamListOptions {
  threat?: boolean;
  prompt_set_id?: string;
  property_value?: string;
}

/** @internal */
export interface RedTeamCustomAttackReportsClientOptions {
  baseUrl: string;
  oauthClient: OAuthClient;
  numRetries: number;
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

  /**
   * Get custom attack report for a scan.
   * @param jobId - The job UUID.
   * @returns The custom attack report response.
   */
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

  /**
   * Get prompt sets for a custom attack scan.
   * @param jobId - The job UUID.
   * @returns The prompt sets report response.
   */
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

  /**
   * Get prompts for a specific prompt set in a scan.
   * @param jobId - The job UUID.
   * @param promptSetId - The prompt set UUID.
   * @param opts - Optional pagination, search, and filter options.
   * @returns The list of prompt detail responses.
   */
  async getPromptsBySet(
    jobId: string,
    promptSetId: string,
    opts?: PromptsBySetListOptions,
  ): Promise<PromptDetailResponse[]> {
    validateJobId(jobId);
    if (!isValidUuid(promptSetId)) {
      throw new AISecSDKException(
        `Invalid prompt set id: ${promptSetId}`,
        ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      );
    }

    const params = buildRedTeamListParams(opts);
    if (opts?.is_threat !== undefined) params.is_threat = String(opts.is_threat);

    const res = await managementHttpRequest<PromptDetailResponse[]>({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_CUSTOM_ATTACKS_REPORT_PATH}/report/${jobId}/prompt-set/${promptSetId}/prompts`,
      params,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /**
   * Get details for a specific prompt.
   * @param jobId - The job UUID.
   * @param promptId - The prompt UUID.
   * @returns The prompt detail response.
   */
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

  /**
   * List custom attacks for a scan.
   * @param jobId - The job UUID.
   * @param opts - Optional pagination, search, and filter options.
   * @returns The paginated list of custom attacks.
   */
  async listCustomAttacks(
    jobId: string,
    opts?: CustomAttacksReportListOptions,
  ): Promise<CustomAttacksListResponse> {
    validateJobId(jobId);
    const params = buildRedTeamListParams(opts);
    if (opts?.threat !== undefined) params.threat = String(opts.threat);
    if (opts?.prompt_set_id !== undefined) params.prompt_set_id = opts.prompt_set_id;
    if (opts?.property_value !== undefined) params.property_value = opts.property_value;

    const res = await managementHttpRequest<CustomAttacksListResponse>({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_CUSTOM_ATTACKS_REPORT_PATH}/job/${jobId}/list-custom-attacks`,
      params,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /**
   * Get attack outputs for a custom attack.
   * @param jobId - The job UUID.
   * @param attackId - The attack UUID.
   * @returns The list of attack outputs.
   */
  async getAttackOutputs(jobId: string, attackId: string): Promise<CustomAttackOutput[]> {
    validateJobId(jobId);
    if (!isValidUuid(attackId)) {
      throw new AISecSDKException(
        `Invalid attack id: ${attackId}`,
        ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      );
    }

    const res = await managementHttpRequest<CustomAttackOutput[]>({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_CUSTOM_ATTACKS_REPORT_PATH}/job/${jobId}/attack/${attackId}/list-outputs`,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /**
   * Get property statistics for a custom attack scan.
   * @param jobId - The job UUID.
   * @returns The list of property statistics.
   */
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
