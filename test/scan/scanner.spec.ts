import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Scanner } from '../../src/scan/scanner.js';
import { Content } from '../../src/scan/content.js';
import { globalConfiguration, init } from '../../src/configuration.js';
import { AISecSDKException, ErrorType } from '../../src/errors.js';
import type { AiProfile } from '../../src/models/ai-profile.js';

function mockFetch(data: unknown, status = 200) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(data)),
  });
}

const profile: AiProfile = { profile_name: 'test-profile' };

describe('Scanner', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalConfiguration.reset();
    init({ apiKey: 'test-key', numRetries: 0 });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    globalThis.fetch = originalFetch;
    globalConfiguration.reset();
  });

  describe('syncScan', () => {
    it('returns ScanResponse on success', async () => {
      const response = {
        report_id: 'r1',
        scan_id: 's1',
        category: 'benign',
        action: 'allow',
        timeout: false,
        error: false,
        errors: [],
      };
      mockFetch(response);

      const scanner = new Scanner();
      const content = new Content({ prompt: 'hello' });
      const result = await scanner.syncScan(profile, content, { numRetries: 0 });

      expect(result.scan_id).toBe('s1');
      expect(result.category).toBe('benign');
    });

    it('sends trId and sessionId', async () => {
      mockFetch({
        report_id: 'r',
        scan_id: 's',
        category: 'benign',
        action: 'allow',
        timeout: false,
        error: false,
        errors: [],
      });

      const scanner = new Scanner();
      const content = new Content({ prompt: 'hi' });
      await scanner.syncScan(profile, content, { trId: 'tx1', sessionId: 'sess1' });

      const body = JSON.parse((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
      expect(body.tr_id).toBe('tx1');
      expect(body.session_id).toBe('sess1');
    });

    it('sends metadata', async () => {
      mockFetch({
        report_id: 'r',
        scan_id: 's',
        category: 'benign',
        action: 'allow',
        timeout: false,
        error: false,
        errors: [],
      });

      const scanner = new Scanner();
      const content = new Content({ prompt: 'hi' });
      await scanner.syncScan(profile, content, {
        metadata: { app_name: 'test-app' },
      });

      const body = JSON.parse((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
      expect(body.metadata.app_name).toBe('test-app');
    });

    it('throws for oversized trId', async () => {
      const scanner = new Scanner();
      const content = new Content({ prompt: 'hi' });
      await expect(scanner.syncScan(profile, content, { trId: 'x'.repeat(200) })).rejects.toThrow(
        AISecSDKException,
      );
    });
  });

  describe('asyncScan', () => {
    it('returns AsyncScanResponse', async () => {
      const response = { received: '2024-01-01T00:00:00Z', scan_id: 's1' };
      mockFetch(response);

      const scanner = new Scanner();
      const result = await scanner.asyncScan([
        {
          req_id: 1,
          scan_req: {
            ai_profile: profile,
            contents: [{ prompt: 'test' }],
          },
        },
      ]);

      expect(result.scan_id).toBe('s1');
    });

    it('throws for empty array', async () => {
      const scanner = new Scanner();
      await expect(scanner.asyncScan([])).rejects.toThrow(AISecSDKException);
    });

    it('throws for >5 objects', async () => {
      const scanner = new Scanner();
      const objects = Array.from({ length: 6 }, (_, i) => ({
        req_id: i,
        scan_req: { ai_profile: profile, contents: [{ prompt: 'x' }] },
      }));
      await expect(scanner.asyncScan(objects)).rejects.toThrow(AISecSDKException);
    });

    it('exposes Retry-After metadata from an HTTP 429', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: 'rate limited' }), {
          status: 429,
          headers: { 'Retry-After': '2' },
        }),
      );

      const scanner = new Scanner();
      const submission = scanner.asyncScan([
        {
          req_id: 1,
          scan_req: { ai_profile: profile, contents: [{ prompt: 'test' }] },
        },
      ]);

      await expect(submission).rejects.toMatchObject({
        errorType: ErrorType.CLIENT_SIDE_ERROR,
        failureKind: 'http',
        statusCode: 429,
        retryAfterMs: 2_000,
      });
    });

    it('normalizes AIRS JSON retry guidance when the header is absent', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            message: 'rate limited',
            retry_after: { interval: 3, unit: 'seconds' },
          }),
          { status: 429 },
        ),
      );

      const scanner = new Scanner();
      const submission = scanner.asyncScan([
        {
          req_id: 1,
          scan_req: { ai_profile: profile, contents: [{ prompt: 'test' }] },
        },
      ]);

      await expect(submission).rejects.toMatchObject({ retryAfterMs: 3_000 });
    });

    it('prefers valid header retry guidance and falls back to the body for invalid headers', async () => {
      const responses = [
        new Response(
          JSON.stringify({
            message: 'rate limited',
            retry_after: { interval: 9, unit: 'seconds' },
          }),
          { status: 429, headers: { 'Retry-After': '2' } },
        ),
        new Response(
          JSON.stringify({
            message: 'rate limited',
            retry_after: { interval: 3, unit: 'minutes' },
          }),
          { status: 429, headers: { 'Retry-After': 'not-a-delay' } },
        ),
        new Response(
          JSON.stringify({
            message: 'rate limited',
            retry_after: { interval: 4, unit: 'seconds' },
          }),
          { status: 429, headers: { 'Retry-After': '-1' } },
        ),
      ];
      globalThis.fetch = vi.fn().mockImplementation(() => Promise.resolve(responses.shift()));
      const scanner = new Scanner();
      const objects = [
        {
          req_id: 1,
          scan_req: { ai_profile: profile, contents: [{ prompt: 'test' }] },
        },
      ];

      await expect(scanner.asyncScan(objects)).rejects.toMatchObject({ retryAfterMs: 2_000 });
      await expect(scanner.asyncScan(objects)).rejects.toMatchObject({ retryAfterMs: 180_000 });
      await expect(scanner.asyncScan(objects)).rejects.toMatchObject({ retryAfterMs: 4_000 });
    });

    it('normalizes HTTP dates and supported body units without fabricating invalid delays', async () => {
      vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-07-17T12:00:00Z'));
      const cases = [
        { header: 'Fri, 17 Jul 2026 12:00:05 GMT', body: undefined, expected: 5_000 },
        { header: 'Fri, 17 Jul 2026 11:59:55 GMT', body: undefined, expected: 0 },
        { body: { interval: 25, unit: 'MS' }, expected: 25 },
        { body: { interval: 2, unit: 'min' }, expected: 120_000 },
        { body: { interval: -1, unit: 'seconds' }, expected: undefined },
        { body: { interval: 1, unit: 'fortnights' }, expected: undefined },
      ];
      const responses = cases.map(
        ({ header, body }) =>
          new Response(JSON.stringify({ message: 'rate limited', retry_after: body }), {
            status: 429,
            headers: header ? { 'Retry-After': header } : undefined,
          }),
      );
      globalThis.fetch = vi.fn().mockImplementation(() => Promise.resolve(responses.shift()));
      const scanner = new Scanner();
      const objects = [
        {
          req_id: 1,
          scan_req: { ai_profile: profile, contents: [{ prompt: 'test' }] },
        },
      ];

      for (const { expected } of cases) {
        const error = await scanner.asyncScan(objects).catch((caught: unknown) => caught);
        expect(error).toBeInstanceOf(AISecSDKException);
        expect((error as AISecSDKException).retryAfterMs).toBe(expected);
      }
    });

    it('distinguishes a network failure from an HTTP failure', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('connection reset'));
      const scanner = new Scanner();

      const submission = scanner.asyncScan([
        {
          req_id: 1,
          scan_req: { ai_profile: profile, contents: [{ prompt: 'test' }] },
        },
      ]);

      const error = await submission.catch((caught: unknown) => caught);
      expect(error).toMatchObject({
        errorType: ErrorType.CLIENT_SIDE_ERROR,
        failureKind: 'network',
      });
      expect((error as AISecSDKException).statusCode).toBeUndefined();
      expect((error as AISecSDKException).retryAfterMs).toBeUndefined();
    });

    it('retains the transport status and server-side classification for a terminal 503', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: 'unavailable', status_code: 429 }), {
          status: 503,
        }),
      );
      const scanner = new Scanner();

      const submission = scanner.asyncScan([
        {
          req_id: 1,
          scan_req: { ai_profile: profile, contents: [{ prompt: 'test' }] },
        },
      ]);

      await expect(submission).rejects.toMatchObject({
        errorType: ErrorType.SERVER_SIDE_ERROR,
        failureKind: 'http',
        statusCode: 503,
      });
    });

    it('allows async submission to override five global retries with zero retries', async () => {
      globalConfiguration.reset();
      init({ apiKey: 'test-key', numRetries: 5 });
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('connection reset'));
      vi.spyOn(Math, 'random').mockReturnValue(0);
      const scanner = new Scanner();

      await expect(
        scanner.asyncScan(
          [
            {
              req_id: 1,
              scan_req: { ai_profile: profile, contents: [{ prompt: 'test' }] },
            },
          ],
          { numRetries: 0 },
        ),
      ).rejects.toBeInstanceOf(AISecSDKException);

      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    it.each([-1, 0.5, Number.NaN, Number.POSITIVE_INFINITY, 6])(
      'rejects invalid per-call retry count %s before fetch',
      async (numRetries) => {
        globalThis.fetch = vi.fn();
        const scanner = new Scanner();

        await expect(
          scanner.asyncScan(
            [
              {
                req_id: 1,
                scan_req: { ai_profile: profile, contents: [{ prompt: 'test' }] },
              },
            ],
            { numRetries },
          ),
        ).rejects.toMatchObject({ errorType: ErrorType.USER_REQUEST_PAYLOAD_ERROR });
        expect(globalThis.fetch).not.toHaveBeenCalled();
      },
    );

    it('keeps using the global retry count when per-call options are omitted', async () => {
      globalConfiguration.reset();
      init({ apiKey: 'test-key', numRetries: 1 });
      globalThis.fetch = vi
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ message: 'unavailable' }), { status: 503 }),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ received: 'now', scan_id: 'shared-scan' }), {
            status: 200,
          }),
        );
      vi.spyOn(Math, 'random').mockReturnValue(0);

      const result = await new Scanner().asyncScan([
        {
          req_id: 1,
          scan_req: { ai_profile: profile, contents: [{ prompt: 'test' }] },
        },
      ]);

      expect(result.scan_id).toBe('shared-scan');
      expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('queryByScanIds', () => {
    it('returns results', async () => {
      const response = [{ scan_id: '550e8400-e29b-41d4-a716-446655440000', status: 'complete' }];
      mockFetch(response);

      const scanner = new Scanner();
      const result = await scanner.queryByScanIds(['550e8400-e29b-41d4-a716-446655440000']);
      expect(result).toHaveLength(1);
    });

    it('throws for empty array', async () => {
      const scanner = new Scanner();
      await expect(scanner.queryByScanIds([])).rejects.toThrow(AISecSDKException);
    });

    it('throws for >5 ids', async () => {
      const scanner = new Scanner();
      const ids = Array.from({ length: 6 }, () => '550e8400-e29b-41d4-a716-446655440000');
      await expect(scanner.queryByScanIds(ids)).rejects.toThrow(AISecSDKException);
    });

    it('throws for invalid uuid', async () => {
      const scanner = new Scanner();
      await expect(scanner.queryByScanIds(['not-a-uuid'])).rejects.toThrow(AISecSDKException);
    });

    it('allows a query to override zero global retries with one retry', async () => {
      const unavailable = new Response(JSON.stringify({ message: 'unavailable' }), { status: 503 });
      const success = new Response(
        JSON.stringify([{ scan_id: '550e8400-e29b-41d4-a716-446655440000', status: 'complete' }]),
        { status: 200 },
      );
      globalThis.fetch = vi.fn().mockResolvedValueOnce(unavailable).mockResolvedValueOnce(success);
      vi.spyOn(Math, 'random').mockReturnValue(0);
      const scanner = new Scanner();

      const result = await scanner.queryByScanIds(['550e8400-e29b-41d4-a716-446655440000'], {
        numRetries: 1,
      });

      expect(result).toHaveLength(1);
      expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    });

    it('preserves every unordered row when one scan ID fans out by req_id', async () => {
      const response = [3, 4, 0, 1, 2].map((req_id) => ({
        scan_id: '550e8400-e29b-41d4-a716-446655440000',
        req_id,
        status: 'complete',
      }));
      mockFetch(response);

      const results = await new Scanner().queryByScanIds(['550e8400-e29b-41d4-a716-446655440000']);

      expect(results).toEqual(response);
      expect(results.map((row) => row.req_id)).toEqual([3, 4, 0, 1, 2]);
    });
  });

  describe('queryByReportIds', () => {
    it('returns reports', async () => {
      const response = [{ report_id: 'r1', scan_id: 's1' }];
      mockFetch(response);

      const scanner = new Scanner();
      const result = await scanner.queryByReportIds(['r1'], { numRetries: 0 });
      expect(result).toHaveLength(1);
    });

    it('throws for empty array', async () => {
      const scanner = new Scanner();
      await expect(scanner.queryByReportIds([])).rejects.toThrow(AISecSDKException);
    });

    it('throws for >5 ids', async () => {
      const scanner = new Scanner();
      const ids = Array.from({ length: 6 }, () => 'r1');
      await expect(scanner.queryByReportIds(ids)).rejects.toThrow(AISecSDKException);
    });

    it('preserves every row when one report ID fans out by req_id', async () => {
      const response = [2, 0, 1].map((req_id) => ({
        report_id: 'shared-report',
        scan_id: 'shared-scan',
        req_id,
        marker: `row-${req_id}`,
      }));
      mockFetch(response);

      const reports = await new Scanner().queryByReportIds(['shared-report']);

      expect(reports).toEqual(response);
      expect(reports.map((row) => [row.report_id, row.req_id])).toEqual([
        ['shared-report', 2],
        ['shared-report', 0],
        ['shared-report', 1],
      ]);
    });
  });
});
