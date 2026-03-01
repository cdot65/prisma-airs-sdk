import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Scanner } from '../../src/scan/scanner.js';
import { Content } from '../../src/scan/content.js';
import { globalConfiguration, init } from '../../src/configuration.js';
import { AISecSDKException } from '../../src/errors.js';
import type { AiProfile } from '../../src/models/ai-profile.js';

function mockFetch(data: unknown, status = 200) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
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
      };
      mockFetch(response);

      const scanner = new Scanner();
      const content = new Content({ prompt: 'hello' });
      const result = await scanner.syncScan(profile, content);

      expect(result.scan_id).toBe('s1');
      expect(result.category).toBe('benign');
    });

    it('sends trId and sessionId', async () => {
      mockFetch({ report_id: 'r', scan_id: 's', category: 'benign', action: 'allow' });

      const scanner = new Scanner();
      const content = new Content({ prompt: 'hi' });
      await scanner.syncScan(profile, content, { trId: 'tx1', sessionId: 'sess1' });

      const body = JSON.parse((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
      expect(body.tr_id).toBe('tx1');
      expect(body.session_id).toBe('sess1');
    });

    it('sends metadata', async () => {
      mockFetch({ report_id: 'r', scan_id: 's', category: 'benign', action: 'allow' });

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
  });

  describe('queryByReportIds', () => {
    it('returns reports', async () => {
      const response = [{ report_id: 'r1', scan_id: 's1' }];
      mockFetch(response);

      const scanner = new Scanner();
      const result = await scanner.queryByReportIds(['r1']);
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
  });
});
