import { z } from 'zod';
import {
  RED_TEAM_REPORT_STATIC_PATH,
  RED_TEAM_REPORT_DYNAMIC_PATH,
  RED_TEAM_REPORT_PATH,
} from '../constants.js';
import { request } from '../http/request.js';
import type { AuthAdapter } from '../http/types.js';
import { serializeListing } from '../listing.js';
import { assertUuid } from '../validators.js';
import {
  AttackListResponseSchema,
  AttackDetailResponseSchema,
  AttackMultiTurnDetailResponseSchema,
  StaticJobReportSchema,
  DynamicJobReportSchema,
  RemediationResponseSchema,
  RuntimeSecurityProfileResponseSchema,
  GoalListResponseSchema,
  StreamListResponseSchema,
  StreamDetailResponseSchema,
  type AttackListResponse,
  type AttackDetailResponse,
  type AttackMultiTurnDetailResponse,
  type StaticJobReport,
  type DynamicJobReport,
  type RemediationResponse,
  type RuntimeSecurityProfileResponse,
  type GoalListResponse,
  type StreamListResponse,
  type StreamDetailResponse,
} from '../models/red-team.js';
import type { RedTeamListOptions } from './scans-client.js';

/** Attack list filter options. */
export interface AttackListOptions extends RedTeamListOptions {
  status?: string;
  severity?: string;
  category?: string;
  sub_category?: string;
  attack_type?: string;
  threat?: boolean;
}

/** Goal list filter options. */
export interface GoalListOptions extends RedTeamListOptions {
  goal_type?: string;
  status?: string;
  count?: boolean;
}

/** @internal */
export interface RedTeamReportsClientOptions {
  baseUrl: string;
  auth: AuthAdapter;
  numRetries: number;
}

/** Client for Red Team data plane report operations. */
export class RedTeamReportsClient {
  private readonly baseUrl: string;
  private readonly auth: AuthAdapter;
  private readonly numRetries: number;

  constructor(opts: RedTeamReportsClientOptions) {
    this.baseUrl = opts.baseUrl;
    this.auth = opts.auth;
    this.numRetries = opts.numRetries;
  }

  // -----------------------------------------------------------------------
  // Static (attack library) report endpoints
  // -----------------------------------------------------------------------

  /**
   * List attacks for a static scan.
   * @param jobId - The job UUID.
   * @param opts - Optional pagination, search, and filter options.
   * @returns The paginated list of attacks.
   * @example
   * ```ts
   * import { RedTeamClient } from '@cdot65/prisma-airs-sdk';
   * const rt = new RedTeamClient();
   *
   * const attacks = await rt.reports.listAttacks('550e8400-e29b-41d4-a716-446655440000', {
   *   threat: true,
   *   limit: 20,
   * });
   * // attacks =>
   * // { pagination: { total_items: 1 }, data: [{ uuid: '550e8400-...', category: 'jailbreak', prompt: '...' }] }
   * ```
   */
  async listAttacks(jobId: string, opts?: AttackListOptions): Promise<AttackListResponse> {
    assertUuid(jobId, 'job id');
    const params = serializeListing(opts);
    if (opts?.status !== undefined) params.status = opts.status;
    if (opts?.severity !== undefined) params.severity = opts.severity;
    if (opts?.category !== undefined) params.category = opts.category;
    if (opts?.sub_category !== undefined) params.sub_category = opts.sub_category;
    if (opts?.attack_type !== undefined) params.attack_type = opts.attack_type;
    if (opts?.threat !== undefined) params.threat = String(opts.threat);

    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_REPORT_STATIC_PATH}/${jobId}/list-attacks`,
      params,
      responseSchema: AttackListResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Get attack details for a static scan.
   * @param jobId - The job UUID.
   * @param attackId - The attack UUID.
   * @returns The attack detail response.
   * @example
   * ```ts
   * import { RedTeamClient } from '@cdot65/prisma-airs-sdk';
   * const rt = new RedTeamClient();
   *
   * const detail = await rt.reports.getAttackDetail(
   *   '550e8400-e29b-41d4-a716-446655440000',
   *   '550e8400-e29b-41d4-a716-446655440000',
   * );
   * // detail =>
   * // { uuid: '550e8400-...', category: 'jailbreak', sub_category: 'jb-1', prompt: 'p', goal: null }
   * ```
   */
  async getAttackDetail(jobId: string, attackId: string): Promise<AttackDetailResponse> {
    assertUuid(jobId, 'job id');
    assertUuid(attackId, 'attack id');
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_REPORT_STATIC_PATH}/${jobId}/attack/${attackId}`,
      responseSchema: AttackDetailResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Get multi-turn attack details for a static scan.
   * @param jobId - The job UUID.
   * @param attackId - The attack UUID.
   * @returns The multi-turn attack detail response.
   * @example
   * ```ts
   * import { RedTeamClient } from '@cdot65/prisma-airs-sdk';
   * const rt = new RedTeamClient();
   *
   * const detail = await rt.reports.getMultiTurnAttackDetail(
   *   '550e8400-e29b-41d4-a716-446655440000',
   *   '550e8400-e29b-41d4-a716-446655440000',
   * );
   * // detail =>
   * // { uuid: '550e8400-...', category: 'jailbreak', sub_category: 'jb-1', prompt: 'p' }
   * ```
   */
  async getMultiTurnAttackDetail(
    jobId: string,
    attackId: string,
  ): Promise<AttackMultiTurnDetailResponse> {
    assertUuid(jobId, 'job id');
    assertUuid(attackId, 'attack id');
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_REPORT_STATIC_PATH}/${jobId}/attack-multi-turn/${attackId}`,
      responseSchema: AttackMultiTurnDetailResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Get the attack library report for a static scan.
   * @param jobId - The job UUID.
   * @returns The static job report.
   * @example
   * ```ts
   * import { RedTeamClient } from '@cdot65/prisma-airs-sdk';
   * const rt = new RedTeamClient();
   *
   * const report = await rt.reports.getStaticReport('550e8400-e29b-41d4-a716-446655440000');
   * // report =>
   * // { severity_report: { stats: [{ severity: 'high', count: 3 }] } }
   * ```
   */
  async getStaticReport(jobId: string): Promise<StaticJobReport> {
    assertUuid(jobId, 'job id');
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_REPORT_STATIC_PATH}/${jobId}/report`,
      responseSchema: StaticJobReportSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Get remediation recommendations for a static scan.
   * @param jobId - The job UUID.
   * @returns The remediation response.
   * @example
   * ```ts
   * import { RedTeamClient } from '@cdot65/prisma-airs-sdk';
   * const rt = new RedTeamClient();
   *
   * const remediation = await rt.reports.getStaticRemediation('550e8400-e29b-41d4-a716-446655440000');
   * // remediation =>
   * // { remediations: [{ remediation: 'Add input filtering', description: '...', priority_level: 'high' }] }
   * ```
   */
  async getStaticRemediation(jobId: string): Promise<RemediationResponse> {
    assertUuid(jobId, 'job id');
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_REPORT_STATIC_PATH}/${jobId}/remediation`,
      responseSchema: RemediationResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Get runtime security profile config for a static scan.
   * @param jobId - The job UUID.
   * @returns The runtime security profile response.
   * @example
   * ```ts
   * import { RedTeamClient } from '@cdot65/prisma-airs-sdk';
   * const rt = new RedTeamClient();
   *
   * const policy = await rt.reports.getStaticRuntimePolicy('550e8400-e29b-41d4-a716-446655440000');
   * // policy =>
   * // { runtime_security_profile: null }
   * ```
   */
  async getStaticRuntimePolicy(jobId: string): Promise<RuntimeSecurityProfileResponse> {
    assertUuid(jobId, 'job id');
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_REPORT_STATIC_PATH}/${jobId}/runtime-policy-config`,
      responseSchema: RuntimeSecurityProfileResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  // -----------------------------------------------------------------------
  // Dynamic (agent) report endpoints
  // -----------------------------------------------------------------------

  /**
   * Get the agent scan report for a dynamic scan.
   * @param jobId - The job UUID.
   * @returns The dynamic job report.
   * @example
   * ```ts
   * import { RedTeamClient } from '@cdot65/prisma-airs-sdk';
   * const rt = new RedTeamClient();
   *
   * const report = await rt.reports.getDynamicReport('550e8400-e29b-41d4-a716-446655440000');
   * // report =>
   * // { total_goals: 12, goals_achieved: 3, total_threats: 5, score: 75, asr: 0.25 }
   * ```
   */
  async getDynamicReport(jobId: string): Promise<DynamicJobReport> {
    assertUuid(jobId, 'job id');
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_REPORT_DYNAMIC_PATH}/${jobId}/report`,
      responseSchema: DynamicJobReportSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Get remediation recommendations for a dynamic scan.
   * @param jobId - The job UUID.
   * @returns The remediation response.
   * @example
   * ```ts
   * import { RedTeamClient } from '@cdot65/prisma-airs-sdk';
   * const rt = new RedTeamClient();
   *
   * const remediation = await rt.reports.getDynamicRemediation('550e8400-e29b-41d4-a716-446655440000');
   * // remediation =>
   * // { remediations: [{ remediation: 'Add input filtering', description: '...', priority_level: 'high' }] }
   * ```
   */
  async getDynamicRemediation(jobId: string): Promise<RemediationResponse> {
    assertUuid(jobId, 'job id');
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_REPORT_DYNAMIC_PATH}/${jobId}/remediation`,
      responseSchema: RemediationResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Get runtime security profile config for a dynamic scan.
   * @param jobId - The job UUID.
   * @returns The runtime security profile response.
   * @example
   * ```ts
   * import { RedTeamClient } from '@cdot65/prisma-airs-sdk';
   * const rt = new RedTeamClient();
   *
   * const policy = await rt.reports.getDynamicRuntimePolicy('550e8400-e29b-41d4-a716-446655440000');
   * // policy =>
   * // { runtime_security_profile: null }
   * ```
   */
  async getDynamicRuntimePolicy(jobId: string): Promise<RuntimeSecurityProfileResponse> {
    assertUuid(jobId, 'job id');
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_REPORT_DYNAMIC_PATH}/${jobId}/runtime-policy-config`,
      responseSchema: RuntimeSecurityProfileResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * List goals for a dynamic scan.
   * @param jobId - The job UUID.
   * @param opts - Optional pagination, search, and filter options.
   * @returns The paginated list of goals.
   * @example
   * ```ts
   * import { RedTeamClient } from '@cdot65/prisma-airs-sdk';
   * const rt = new RedTeamClient();
   *
   * const goals = await rt.reports.listGoals('550e8400-e29b-41d4-a716-446655440000', { limit: 10 });
   * // goals =>
   * // { pagination: { total_items: 4 }, data: [{ uuid: '550e8400-...', goal: 'Extract secrets', status: 'ACHIEVED' }] }
   * ```
   */
  async listGoals(jobId: string, opts?: GoalListOptions): Promise<GoalListResponse> {
    assertUuid(jobId, 'job id');
    const params = serializeListing(opts);
    if (opts?.goal_type !== undefined) params.goal_type = opts.goal_type;
    if (opts?.status !== undefined) params.status = opts.status;
    if (opts?.count !== undefined) params.count = String(opts.count);

    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_REPORT_DYNAMIC_PATH}/${jobId}/list-goals`,
      params,
      responseSchema: GoalListResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * List streams for a goal in a dynamic scan.
   * @param jobId - The job UUID.
   * @param goalId - The goal UUID.
   * @param opts - Optional pagination and search options.
   * @returns The paginated list of streams.
   * @example
   * ```ts
   * import { RedTeamClient } from '@cdot65/prisma-airs-sdk';
   * const rt = new RedTeamClient();
   *
   * const streams = await rt.reports.listGoalStreams(
   *   '550e8400-e29b-41d4-a716-446655440000',
   *   '550e8400-e29b-41d4-a716-446655440000',
   * );
   * // streams =>
   * // { pagination: { total_items: 2 }, data: [{ uuid: '550e8400-...', goal_id: '550e8400-...' }] }
   * ```
   */
  async listGoalStreams(
    jobId: string,
    goalId: string,
    opts?: RedTeamListOptions,
  ): Promise<StreamListResponse> {
    assertUuid(jobId, 'job id');
    assertUuid(goalId, 'goal id');
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_REPORT_DYNAMIC_PATH}/${jobId}/goal/${goalId}/list-streams`,
      params: serializeListing(opts),
      responseSchema: StreamListResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  // -----------------------------------------------------------------------
  // Common report endpoints
  // -----------------------------------------------------------------------

  /**
   * Get stream details by stream ID.
   * @param streamId - The stream UUID.
   * @returns The stream detail response.
   * @example
   * ```ts
   * import { RedTeamClient } from '@cdot65/prisma-airs-sdk';
   * const rt = new RedTeamClient();
   *
   * const stream = await rt.reports.getStreamDetail('550e8400-e29b-41d4-a716-446655440000');
   * // stream =>
   * // { uuid: '550e8400-...', job_id: '550e8400-...', target_id: '550e8400-...', goal_id: '550e8400-...' }
   * ```
   */
  async getStreamDetail(streamId: string): Promise<StreamDetailResponse> {
    assertUuid(streamId, 'stream id');
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_REPORT_DYNAMIC_PATH}/stream/${streamId}`,
      responseSchema: StreamDetailResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Download a report in the specified format.
   * @param jobId - The job UUID.
   * @param format - The file format (e.g. "pdf", "csv").
   * @returns The report data in the requested format (untyped — shape depends on `format`).
   * @example
   * ```ts
   * import { RedTeamClient } from '@cdot65/prisma-airs-sdk';
   * const rt = new RedTeamClient();
   *
   * const data = await rt.reports.downloadReport('550e8400-e29b-41d4-a716-446655440000', 'pdf');
   * // data => raw report payload (shape depends on the requested file_format)
   * ```
   */
  async downloadReport(jobId: string, format: string): Promise<unknown> {
    assertUuid(jobId, 'job id');
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_REPORT_PATH}/${jobId}/download`,
      params: { file_format: format },
      responseSchema: z.unknown(),
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Generate a partial report for a running scan.
   * @param jobId - The job UUID.
   * @returns The partial report payload (untyped — schema not yet defined by the API).
   * @example
   * ```ts
   * import { RedTeamClient } from '@cdot65/prisma-airs-sdk';
   * const rt = new RedTeamClient();
   *
   * const partial = await rt.reports.generatePartialReport('550e8400-e29b-41d4-a716-446655440000');
   * // partial => partial report payload (untyped; schema not yet defined by the API)
   * ```
   */
  async generatePartialReport(jobId: string): Promise<unknown> {
    assertUuid(jobId, 'job id');
    return request({
      method: 'POST',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_REPORT_PATH}/${jobId}/generate-partial-report`,
      responseSchema: z.unknown(),
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }
}
