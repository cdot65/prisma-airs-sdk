import { AI_GW_AUDIT_LOGS_PATH } from '../constants.js';
import { request } from '../http/request.js';
import type { AuthAdapter } from '../http/types.js';
import {
  GatewayAuditLogsResponseSchema,
  type GatewayAuditLogsResponse,
} from '../models/ai-gateway.js';
import type { AIGatewaySubClientOptions } from './types.js';

/** Time range for an audit-log query. Both bounds are required by the API. */
export interface AIGatewayAuditLogListOptions {
  start: Date;
  end: Date;
}

/** Client for AI Gateway audit logs (admin plane). */
export class AIGatewayAuditLogsClient {
  private readonly baseUrl: string;
  private readonly auth: AuthAdapter;
  private readonly numRetries: number;

  constructor(opts: AIGatewaySubClientOptions) {
    this.baseUrl = opts.baseUrl;
    this.auth = opts.auth;
    this.numRetries = opts.numRetries;
  }

  /**
   * Read organisation audit logs.
   *
   * @remarks
   * **Handle the result as sensitive.** The API returns each entry's `request_body`
   * **unredacted**, so records for credential-bearing calls (integrations, plugins) can
   * contain live secrets — private keys, provider API keys — in plaintext. The sibling
   * `request_headers` field is masked, but `request_body` is not. The SDK returns the
   * response faithfully rather than altering it; never log these records wholesale, and
   * never forward them to a third-party sink. Note that setting `PANW_AI_SEC_DEBUG` will
   * print the raw response — including these unredacted secrets — to the SDK's own debug
   * log regardless of this warning.
   *
   * @param opts - Inclusive start and end of the window.
   * @returns Audit records, newest first.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * const logs = await gw.auditLogs.list({
   *   start: new Date('2026-07-20T00:00:00Z'),
   *   end: new Date(),
   * });
   * // Safe projection — never log the whole record.
   * const summary = logs.records.map((r) => `${r.timestamp} ${r.method} ${r.uri}`);
   * ```
   */
  async list(opts: AIGatewayAuditLogListOptions): Promise<GatewayAuditLogsResponse> {
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: AI_GW_AUDIT_LOGS_PATH,
      params: {
        start_time: opts.start.toISOString(),
        end_time: opts.end.toISOString(),
      },
      responseSchema: GatewayAuditLogsResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }
}
