import {
  MGMT_DASHBOARD_APPLICATION_PATH,
  MGMT_DASHBOARD_APPLICATION_VIOLATION_BREAKDOWN_PATH,
} from '../constants.js';
import { request } from '../http/request.js';
import type { AuthAdapter } from '../http/types.js';
import {
  DashboardApplicationSchema,
  DashboardApplicationViolationBreakdownSchema,
  type DashboardApplication,
  type DashboardApplicationViolationBreakdown,
} from '../models/mgmt-dashboard.js';

/** @internal */
export interface DashboardClientOptions {
  baseUrl: string;
  auth: AuthAdapter;
  numRetries: number;
}

/**
 * Query parameters shared by both dashboard application endpoints.
 *
 * Both `appId` AND `appName` are REQUIRED by the API; omitting `appname` returns an all-null
 * response rather than 4xx, which is the most common gotcha when integrating these endpoints.
 */
export interface DashboardAppQuery {
  /**
   * Customer application UUID. Source it from
   * {@link import('./customer-apps.js').CustomerAppsClient.list}'s `customer_appId` field.
   */
  appId: string;
  /** Application display name. Required. URL encoding is handled internally. */
  appName: string;
  /** Look-back window length. Defaults to 30. */
  timeInterval?: number;
  /** Look-back window unit. Defaults to 'days'. History max is 30 days. */
  timeUnit?: 'days' | 'hours' | 'minutes';
}

/**
 * Client for AIRS SCM dashboard endpoints that power the
 * "AI Security > Runtime > API Applications" detail panel.
 *
 * Together, {@link application} (overview + token consumption + session activity) and
 * {@link applicationViolationBreakdown} (per-detector violations) reproduce the full panel and
 * unlock per-app token chargeback reporting.
 *
 * @example
 * ```ts
 * import { ManagementClient } from '@cdot65/prisma-airs-sdk';
 * const mgmt = new ManagementClient();
 *
 * const apps = await mgmt.customerApps.list();
 * const first = apps.customer_apps?.[0];
 * if (!first?.customer_appId) return;
 *
 * const overview = await mgmt.dashboard.application({
 *   appId: first.customer_appId,
 *   appName: first.app_name,
 * });
 * // overview.token_stats?.monthly_total_tokens + scale ("K" | "M") = current month consumption
 *
 * const violations = await mgmt.dashboard.applicationViolationBreakdown({
 *   appId: first.customer_appId,
 *   appName: first.app_name,
 * });
 * // violations.detection_type_violation_breakdown -> per-detector severity counts
 * ```
 */
export class DashboardClient {
  private readonly baseUrl: string;
  private readonly auth: AuthAdapter;
  private readonly numRetries: number;

  constructor(opts: DashboardClientOptions) {
    this.baseUrl = opts.baseUrl;
    this.auth = opts.auth;
    this.numRetries = opts.numRetries;
  }

  /**
   * Get per-application token consumption and session activity over the requested window.
   *
   * @param query - App identity and time window. `appId` and `appName` are both required.
   * @returns The application overview with `token_stats`, `session_stats`, attached profiles,
   *   and monitoring metadata.
   * @example
   * ```ts
   * import { ManagementClient } from '@cdot65/prisma-airs-sdk';
   * const mgmt = new ManagementClient(); // reads PANW_MGMT_* env vars
   *
   * const overview = await mgmt.dashboard.application({
   *   appId: 'd8dc4033-593b-45e7-9633-e0dfc130cc82',
   *   appName: 'chatbot',
   * });
   * // overview =>
   * // { name: 'chatbot', cloud: 'other', source: 'api',
   * //   token_stats: { average_daily_tokens: 744.233, average_daily_tokens_scale: 'K',
   * //                  monthly_total_tokens: 17.71, monthly_total_tokens_scale: 'M' },
   * //   session_stats: { total: 56935, violating: 31136, ... },
   * //   profiles: ['ms-tuned', 'golden-v2'] }
   * ```
   */
  async application(query: DashboardAppQuery): Promise<DashboardApplication> {
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: MGMT_DASHBOARD_APPLICATION_PATH,
      params: {
        appid: query.appId,
        appname: query.appName,
        time_interval: String(query.timeInterval ?? 30),
        time_unit: query.timeUnit ?? 'days',
      },
      responseSchema: DashboardApplicationSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Get per-detector violation severity counts for the application over the requested window.
   *
   * @param query - App identity and time window. `appId` and `appName` are both required.
   * @returns The detection-type breakdown (one entry per detector: agent_security, dlp,
   *   malicious_code, pi, tc, topic_guardrails, uf) plus `total_violating`.
   * @example
   * ```ts
   * import { ManagementClient } from '@cdot65/prisma-airs-sdk';
   * const mgmt = new ManagementClient(); // reads PANW_MGMT_* env vars
   *
   * const breakdown = await mgmt.dashboard.applicationViolationBreakdown({
   *   appId: 'd8dc4033-593b-45e7-9633-e0dfc130cc82',
   *   appName: 'chatbot',
   * });
   * // breakdown =>
   * // { detection_type_violation_breakdown: [
   * //     { detection_type: 'topic_guardrails',
   * //       violation_breakdown: { critical: 0, high: 0, medium: 3, low: 0, total: 3 } },
   * //     { detection_type: 'dlp',
   * //       violation_breakdown: { critical: 0, high: 0, medium: 0, low: 0, total: 0 } },
   * //     ... ],
   * //   total_violating: 3 }
   * ```
   */
  async applicationViolationBreakdown(
    query: DashboardAppQuery,
  ): Promise<DashboardApplicationViolationBreakdown> {
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: MGMT_DASHBOARD_APPLICATION_VIOLATION_BREAKDOWN_PATH,
      params: {
        appid: query.appId,
        appname: query.appName,
        time_interval: String(query.timeInterval ?? 30),
        time_unit: query.timeUnit ?? 'days',
      },
      responseSchema: DashboardApplicationViolationBreakdownSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }
}
