import { z } from 'zod';
import { RED_TEAM_CUSTOM_ATTACKS_REPORT_PATH } from '../constants.js';
import { request } from '../http/request.js';
import type { AuthAdapter } from '../http/types.js';
import { serializeListing } from '../listing.js';
import { assertUuid } from '../validators.js';
import {
  CustomAttackReportResponseSchema,
  PromptSetsReportResponseSchema,
  PromptDetailResponseSchema,
  CustomAttacksListResponseSchema,
  CustomAttackOutputSchema,
  PropertyStatisticSchema,
  type CustomAttackReportResponse,
  type PromptSetsReportResponse,
  type PromptDetailResponse,
  type CustomAttacksListResponse,
  type CustomAttackOutput,
  type PropertyStatistic,
} from '../models/red-team.js';
import type { RedTeamListOptions } from './scans-client.js';

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
  auth: AuthAdapter;
  numRetries: number;
}

/** Client for Red Team custom attack report operations. */
export class RedTeamCustomAttackReportsClient {
  private readonly baseUrl: string;
  private readonly auth: AuthAdapter;
  private readonly numRetries: number;

  constructor(opts: RedTeamCustomAttackReportsClientOptions) {
    this.baseUrl = opts.baseUrl;
    this.auth = opts.auth;
    this.numRetries = opts.numRetries;
  }

  /**
   * Get custom attack report for a scan.
   * @param jobId - The job UUID.
   * @returns The custom attack report response.
   */
  async getReport(jobId: string): Promise<CustomAttackReportResponse> {
    assertUuid(jobId, 'job id');
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_CUSTOM_ATTACKS_REPORT_PATH}/report/${jobId}`,
      responseSchema: CustomAttackReportResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Get prompt sets for a custom attack scan.
   * @param jobId - The job UUID.
   * @returns The prompt sets report response.
   */
  async getPromptSets(jobId: string): Promise<PromptSetsReportResponse> {
    assertUuid(jobId, 'job id');
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_CUSTOM_ATTACKS_REPORT_PATH}/report/${jobId}/prompt-sets`,
      responseSchema: PromptSetsReportResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
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
    assertUuid(jobId, 'job id');
    assertUuid(promptSetId, 'prompt set id');

    const params = serializeListing(opts);
    if (opts?.is_threat !== undefined) params.is_threat = String(opts.is_threat);

    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_CUSTOM_ATTACKS_REPORT_PATH}/report/${jobId}/prompt-set/${promptSetId}/prompts`,
      params,
      responseSchema: z.array(PromptDetailResponseSchema),
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Get details for a specific prompt.
   * @param jobId - The job UUID.
   * @param promptId - The prompt UUID.
   * @returns The prompt detail response.
   */
  async getPromptDetail(jobId: string, promptId: string): Promise<PromptDetailResponse> {
    assertUuid(jobId, 'job id');
    assertUuid(promptId, 'prompt id');

    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_CUSTOM_ATTACKS_REPORT_PATH}/report/${jobId}/prompt/${promptId}`,
      responseSchema: PromptDetailResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
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
    assertUuid(jobId, 'job id');
    const params = serializeListing(opts);
    if (opts?.threat !== undefined) params.threat = String(opts.threat);
    if (opts?.prompt_set_id !== undefined) params.prompt_set_id = opts.prompt_set_id;
    if (opts?.property_value !== undefined) params.property_value = opts.property_value;

    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_CUSTOM_ATTACKS_REPORT_PATH}/job/${jobId}/list-custom-attacks`,
      params,
      responseSchema: CustomAttacksListResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Get attack outputs for a custom attack.
   * @param jobId - The job UUID.
   * @param attackId - The attack UUID.
   * @returns The list of attack outputs.
   */
  async getAttackOutputs(jobId: string, attackId: string): Promise<CustomAttackOutput[]> {
    assertUuid(jobId, 'job id');
    assertUuid(attackId, 'attack id');

    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_CUSTOM_ATTACKS_REPORT_PATH}/job/${jobId}/attack/${attackId}/list-outputs`,
      responseSchema: z.array(CustomAttackOutputSchema),
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Get property statistics for a custom attack scan.
   * @param jobId - The job UUID.
   * @returns The list of property statistics.
   */
  async getPropertyStats(jobId: string): Promise<PropertyStatistic[]> {
    assertUuid(jobId, 'job id');
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_CUSTOM_ATTACKS_REPORT_PATH}/job/${jobId}/property-stats`,
      responseSchema: z.array(PropertyStatisticSchema),
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }
}
