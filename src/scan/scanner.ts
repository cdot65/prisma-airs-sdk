import { z } from 'zod';
import {
  SYNC_SCAN_PATH,
  ASYNC_SCAN_PATH,
  SCAN_RESULTS_PATH,
  SCAN_REPORTS_PATH,
  MAX_NUMBER_OF_SCAN_IDS,
  MAX_NUMBER_OF_REPORT_IDS,
  MAX_NUMBER_OF_BATCH_SCAN_OBJECTS,
  MAX_NUMBER_OF_RETRIES,
  MAX_TRANSACTION_ID_STR_LENGTH,
  MAX_SESSION_ID_STR_LENGTH,
} from '../constants.js';
import { AISecSDKException, ErrorType } from '../errors.js';
import { globalConfiguration } from '../configuration.js';
import { ApiKeyAuth } from '../http/auth/api-key.js';
import { request } from '../http/request.js';
import type { AuthAdapter } from '../http/types.js';
import { isValidUuid } from '../utils.js';
import type { AiProfile } from '../models/ai-profile.js';
import type { Metadata } from '../models/metadata.js';
import { ScanResponseSchema, type ScanResponse } from '../models/scan-response.js';
import {
  AsyncScanResponseSchema,
  type AsyncScanObject,
  type AsyncScanResponse,
} from '../models/async-scan.js';
import { ScanIdResultSchema, type ScanIdResult } from '../models/scan-id-result.js';
import { ThreatScanReportSchema, type ThreatScanReport } from '../models/threat-report.js';
import { Content } from './content.js';

function resolveNumRetries(opts: ScanCallOptions): number {
  const numRetries = opts.numRetries ?? globalConfiguration.numRetries;
  if (
    !Number.isFinite(numRetries) ||
    !Number.isInteger(numRetries) ||
    numRetries < 0 ||
    numRetries > MAX_NUMBER_OF_RETRIES
  ) {
    throw new AISecSDKException(
      `numRetries must be a finite integer between 0 and ${MAX_NUMBER_OF_RETRIES}`,
      ErrorType.USER_REQUEST_PAYLOAD_ERROR,
    );
  }
  return numRetries;
}

/** Transport options shared by all {@link Scanner} operations. */
export interface ScanCallOptions {
  /** Per-call retry override (0–5). Omit to use the global configuration. */
  numRetries?: number;
}

/** Optional parameters for {@link Scanner.syncScan}. */
export interface SyncScanOptions extends ScanCallOptions {
  /** Transaction ID for tracing. Max 100 characters. */
  trId?: string;
  /** Session ID for grouping related scans. Max 100 characters. */
  sessionId?: string;
  /** Application metadata attached to the scan request. */
  metadata?: Metadata;
}

/** Client for AIRS scan operations (sync, async, and query). */
export class Scanner {
  /**
   * @internal
   * Build the per-request auth adapter from `globalConfiguration`. Throws if
   * `init()` has not been called.
   */
  private buildAuth(): AuthAdapter {
    const cfg = globalConfiguration;
    if (!cfg.initialized) {
      throw new AISecSDKException(
        'SDK not initialized. Call init() before making requests.',
        ErrorType.MISSING_VARIABLE,
      );
    }
    return new ApiKeyAuth({ apiKey: cfg.apiKey, apiToken: cfg.apiToken });
  }

  /**
   * Perform a synchronous content scan.
   * @param aiProfile - AI security profile to scan against.
   * @param content - Content to scan.
   * @param opts - Optional transaction/session IDs, metadata, and per-call retry override.
   * @returns Scan response with verdict, action, and detection details.
   * @example
   * ```ts
   * import { init, Scanner, Content } from '@cdot65/prisma-airs-sdk';
   * init(); // reads PANW_AI_SEC_API_KEY from env
   * const scanner = new Scanner();
   *
   * const result = await scanner.syncScan(
   *   { profile_name: 'my-profile' },
   *   new Content({ prompt: 'What is the capital of France?' }),
   *   { metadata: { app_name: 'my-app', app_user: 'user123', ai_model: 'gpt-4' } },
   * );
   * // result =>
   * // { report_id: 'R000...', scan_id: '550e...', category: 'benign',
   * //   action: 'allow', timeout: false, error: false, errors: [] }
   * ```
   */
  async syncScan(
    aiProfile: AiProfile,
    content: Content,
    opts: SyncScanOptions = {},
  ): Promise<ScanResponse> {
    const numRetries = resolveNumRetries(opts);
    if (opts.trId && opts.trId.length > MAX_TRANSACTION_ID_STR_LENGTH) {
      throw new AISecSDKException(
        `trId exceeds max length of ${MAX_TRANSACTION_ID_STR_LENGTH}`,
        ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      );
    }
    if (opts.sessionId && opts.sessionId.length > MAX_SESSION_ID_STR_LENGTH) {
      throw new AISecSDKException(
        `sessionId exceeds max length of ${MAX_SESSION_ID_STR_LENGTH}`,
        ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      );
    }

    const body: Record<string, unknown> = {
      ai_profile: aiProfile,
      contents: [content.toJSON()],
    };
    if (opts.trId) body.tr_id = opts.trId;
    if (opts.sessionId) body.session_id = opts.sessionId;
    if (opts.metadata) body.metadata = opts.metadata;

    return request({
      method: 'POST',
      baseUrl: globalConfiguration.apiEndpoint,
      path: SYNC_SCAN_PATH,
      body,
      responseSchema: ScanResponseSchema,
      auth: this.buildAuth(),
      numRetries,
    });
  }

  /**
   * Submit one batch of content for asynchronous scanning.
   *
   * The call accepts 1–20 request objects and returns one batch receipt. A batch `scan_id` can fan
   * out to several unordered result rows. Correlate each row by `(scan_id, req_id)`, never array
   * position or `scan_id` alone. The SDK preserves the server's row order and cardinality.
   *
   * Setting `numRetries: 0` guarantees one SDK fetch attempt, but cannot guarantee exactly-once
   * server submission after an ambiguous network or 5xx failure.
   * @param scanObjects - Array of scan objects (1–20 items), each with its own `req_id`.
   * @param opts - Optional per-call retry override.
   * @returns One batch receipt containing the shared scan ID for later querying.
   * @example
   * ```ts
   * import { init, Scanner } from '@cdot65/prisma-airs-sdk';
   * init();
   * const scanner = new Scanner();
   *
   * const receipt = await scanner.asyncScan(
   *   [
   *     {
   *       req_id: 1,
   *       scan_req: {
   *         ai_profile: { profile_name: 'my-profile' },
   *         contents: [{ prompt: 'Tell me about machine learning.' }],
   *       },
   *     },
   *     {
   *       req_id: 2,
   *       scan_req: {
   *         ai_profile: { profile_name: 'my-profile' },
   *         contents: [{ prompt: 'What are neural networks?' }],
   *       },
   *     },
   *   ],
   *   { numRetries: 0 },
   * );
   * // receipt =>
   * // { received: '2024-01-01T00:00:00Z', scan_id: '550e...' }
   * ```
   */
  async asyncScan(
    scanObjects: AsyncScanObject[],
    opts: ScanCallOptions = {},
  ): Promise<AsyncScanResponse> {
    const numRetries = resolveNumRetries(opts);
    if (scanObjects.length < 1) {
      throw new AISecSDKException(
        'At least 1 scan object is required',
        ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      );
    }
    if (scanObjects.length > MAX_NUMBER_OF_BATCH_SCAN_OBJECTS) {
      throw new AISecSDKException(
        `Max of ${MAX_NUMBER_OF_BATCH_SCAN_OBJECTS} scan objects allowed`,
        ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      );
    }

    return request({
      method: 'POST',
      baseUrl: globalConfiguration.apiEndpoint,
      path: ASYNC_SCAN_PATH,
      body: scanObjects,
      responseSchema: AsyncScanResponseSchema,
      auth: this.buildAuth(),
      numRetries,
    });
  }

  /**
   * Query scan results by scan IDs.
   *
   * One scan ID can return several unordered rows. Correlate them using `(scan_id, req_id)`. The
   * SDK does not sort, deduplicate, or collapse the response.
   * @param scanIds - Array of scan UUIDs (1–5 items).
   * @param opts - Optional per-call retry override.
   * @returns Every scan-result row in server order, with status and response data.
   * @example
   * ```ts
   * import { init, Scanner } from '@cdot65/prisma-airs-sdk';
   * init();
   * const scanner = new Scanner();
   *
   * const results = await scanner.queryByScanIds([
   *   '550e8400-e29b-41d4-a716-446655440000',
   * ]);
   * // A single scan ID may produce multiple rows, for example req_id 2 then req_id 1.
   * for (const row of results) {
   *   console.log(`${row.scan_id}:${row.req_id}`, row.status, row.result?.action);
   * }
   * ```
   */
  async queryByScanIds(scanIds: string[], opts: ScanCallOptions = {}): Promise<ScanIdResult[]> {
    const numRetries = resolveNumRetries(opts);
    if (scanIds.length < 1) {
      throw new AISecSDKException(
        'At least 1 scan_id is required',
        ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      );
    }
    if (scanIds.length > MAX_NUMBER_OF_SCAN_IDS) {
      throw new AISecSDKException(
        `Max of ${MAX_NUMBER_OF_SCAN_IDS} scan_ids allowed`,
        ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      );
    }
    for (const id of scanIds) {
      if (!isValidUuid(id)) {
        throw new AISecSDKException(`Invalid scan_id: ${id}`, ErrorType.USER_REQUEST_PAYLOAD_ERROR);
      }
    }

    return request({
      method: 'GET',
      baseUrl: globalConfiguration.apiEndpoint,
      path: SCAN_RESULTS_PATH,
      params: { scan_ids: scanIds.join(',') },
      responseSchema: z.array(ScanIdResultSchema),
      auth: this.buildAuth(),
      numRetries,
    });
  }

  /**
   * Query detailed threat reports by report IDs.
   *
   * One report ID can return several rows. Correlate them using `(report_id, req_id)`. The SDK
   * preserves server order and cardinality without sorting or deduplicating.
   * @param reportIds - Array of report IDs (1–5 items).
   * @param opts - Optional per-call retry override.
   * @returns Every report row in server order, with detection details.
   * @example
   * ```ts
   * import { init, Scanner } from '@cdot65/prisma-airs-sdk';
   * init();
   * const scanner = new Scanner();
   *
   * const reports = await scanner.queryByReportIds(['R000...']);
   * for (const report of reports) {
   *   console.log(`${report.report_id}:${report.req_id}`, report.detection_results);
   * }
   * ```
   */
  async queryByReportIds(
    reportIds: string[],
    opts: ScanCallOptions = {},
  ): Promise<ThreatScanReport[]> {
    const numRetries = resolveNumRetries(opts);
    if (reportIds.length < 1) {
      throw new AISecSDKException(
        'At least 1 report_id is required',
        ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      );
    }
    if (reportIds.length > MAX_NUMBER_OF_REPORT_IDS) {
      throw new AISecSDKException(
        `Max of ${MAX_NUMBER_OF_REPORT_IDS} report_ids allowed`,
        ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      );
    }

    return request({
      method: 'GET',
      baseUrl: globalConfiguration.apiEndpoint,
      path: SCAN_REPORTS_PATH,
      params: { report_ids: reportIds.join(',') },
      responseSchema: z.array(ThreatScanReportSchema),
      auth: this.buildAuth(),
      numRetries,
    });
  }
}
