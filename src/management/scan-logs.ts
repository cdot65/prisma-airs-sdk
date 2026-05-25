import { MGMT_SCAN_LOGS_PATH } from '../constants.js';
import { request } from '../http/request.js';
import type { AuthAdapter } from '../http/types.js';
import { PaginatedScanResultsSchema, type PaginatedScanResults } from '../models/mgmt-scan-log.js';

/** @internal */
export interface ScanLogsClientOptions {
  baseUrl: string;
  auth: AuthAdapter;
  numRetries: number;
}

/** Options for querying scan logs. */
export interface ScanLogQueryOptions {
  /** Time interval value. */
  time_interval: number;
  /** Time unit (e.g. 'hour', 'day'). */
  time_unit: string;
  /** Page number (1-based). */
  pageNumber: number;
  /** Number of records per page. */
  pageSize: number;
  /** Filter: 'all', 'benign', or 'threat'. */
  filter: string;
  /** Encrypted page token for pagination continuation. */
  page_token?: string;
}

/** Client for retrieving scan logs. */
export class ScanLogsClient {
  private readonly baseUrl: string;
  private readonly auth: AuthAdapter;
  private readonly numRetries: number;

  constructor(opts: ScanLogsClientOptions) {
    this.baseUrl = opts.baseUrl;
    this.auth = opts.auth;
    this.numRetries = opts.numRetries;
  }

  /**
   * Retrieve scan logs by time interval.
   * @param opts - Query options including time range, pagination, and filter.
   * @returns Paginated scan results.
   * @example
   * ```ts
   * import { ManagementClient } from '@cdot65/prisma-airs-sdk';
   * const mgmt = new ManagementClient(); // reads PANW_MGMT_* env vars
   *
   * const logs = await mgmt.scanLogs.query({
   *   time_interval: 24,
   *   time_unit: 'hour',
   *   pageNumber: 1,
   *   pageSize: 10,
   *   filter: 'threat',
   * });
   * // logs =>
   * // { total_pages: 1, page_number: 1, page_size: 10, scan_result_for_dashboard: { ... } }
   * ```
   */
  async query(opts: ScanLogQueryOptions): Promise<PaginatedScanResults> {
    const params: Record<string, string> = {
      time_interval: String(opts.time_interval),
      time_unit: opts.time_unit,
      pageNumber: String(opts.pageNumber),
      pageSize: String(opts.pageSize),
      filter: opts.filter,
    };

    const body = opts.page_token ? { page_token: opts.page_token } : undefined;

    return request({
      method: 'POST',
      baseUrl: this.baseUrl,
      path: MGMT_SCAN_LOGS_PATH,
      params,
      body,
      responseSchema: PaginatedScanResultsSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }
}
