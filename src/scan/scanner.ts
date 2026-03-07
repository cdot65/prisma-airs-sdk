// src/scan/scanner.ts — mirrors Python SDK scanner classes

import { httpRequest } from '../http-client.js';
import {
  SYNC_SCAN_PATH,
  ASYNC_SCAN_PATH,
  SCAN_RESULTS_PATH,
  SCAN_REPORTS_PATH,
  MAX_NUMBER_OF_SCAN_IDS,
  MAX_NUMBER_OF_REPORT_IDS,
  MAX_NUMBER_OF_BATCH_SCAN_OBJECTS,
  MAX_TRANSACTION_ID_STR_LENGTH,
  MAX_SESSION_ID_STR_LENGTH,
} from '../constants.js';
import { AISecSDKException, ErrorType } from '../errors.js';
import { isValidUuid } from '../utils.js';

import type { AiProfile } from '../models/ai-profile.js';
import type { Metadata } from '../models/metadata.js';
import type { ScanResponse } from '../models/scan-response.js';
import type { AsyncScanObject, AsyncScanResponse } from '../models/async-scan.js';
import type { ScanIdResult } from '../models/scan-id-result.js';
import type { ThreatScanReport } from '../models/threat-report.js';
import { Content } from './content.js';

/** Optional parameters for {@link Scanner.syncScan}. */
export interface SyncScanOptions {
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
   * Perform a synchronous content scan.
   * @param aiProfile - AI security profile to scan against.
   * @param content - Content to scan.
   * @param opts - Optional transaction/session IDs and metadata.
   * @returns Scan response with verdict, action, and detection details.
   */
  async syncScan(
    aiProfile: AiProfile,
    content: Content,
    opts: SyncScanOptions = {},
  ): Promise<ScanResponse> {
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

    const res = await httpRequest<ScanResponse>({
      method: 'POST',
      path: SYNC_SCAN_PATH,
      body,
    });
    return res.data;
  }

  /**
   * Submit content for asynchronous scanning.
   * @param scanObjects - Array of scan objects (1–5 items).
   * @returns Response containing scan IDs for later querying.
   */
  async asyncScan(scanObjects: AsyncScanObject[]): Promise<AsyncScanResponse> {
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

    const res = await httpRequest<AsyncScanResponse>({
      method: 'POST',
      path: ASYNC_SCAN_PATH,
      body: scanObjects,
    });
    return res.data;
  }

  /**
   * Query scan results by scan IDs.
   * @param scanIds - Array of scan UUIDs (1–5 items).
   * @returns Array of scan results with status and response data.
   */
  async queryByScanIds(scanIds: string[]): Promise<ScanIdResult[]> {
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

    const res = await httpRequest<ScanIdResult[]>({
      method: 'GET',
      path: SCAN_RESULTS_PATH,
      params: { scan_ids: scanIds.join(',') },
    });
    return res.data;
  }

  /**
   * Query detailed threat reports by report IDs.
   * @param reportIds - Array of report IDs (1–5 items).
   * @returns Array of threat scan reports with detection details.
   */
  async queryByReportIds(reportIds: string[]): Promise<ThreatScanReport[]> {
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

    const res = await httpRequest<ThreatScanReport[]>({
      method: 'GET',
      path: SCAN_REPORTS_PATH,
      params: { report_ids: reportIds.join(',') },
    });
    return res.data;
  }
}
