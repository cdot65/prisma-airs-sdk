import { MGMT_SCAN_LOGS_PATH } from '../constants.js';
import { managementHttpRequest } from './management-http-client.js';
import type { OAuthClient } from './oauth-client.js';
import type { PaginatedScanResults } from '../models/mgmt-scan-log.js';

/** @internal */
export interface ScanLogsClientOptions {
  baseUrl: string;
  oauthClient: OAuthClient;
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
  private readonly oauthClient: OAuthClient;
  private readonly numRetries: number;

  constructor(opts: ScanLogsClientOptions) {
    this.baseUrl = opts.baseUrl;
    this.oauthClient = opts.oauthClient;
    this.numRetries = opts.numRetries;
  }

  /**
   * Retrieve scan logs by time interval.
   * @param opts - Query options including time range, pagination, and filter.
   * @returns Paginated scan results.
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

    const res = await managementHttpRequest<PaginatedScanResults>({
      method: 'POST',
      baseUrl: this.baseUrl,
      path: MGMT_SCAN_LOGS_PATH,
      params,
      body,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }
}
