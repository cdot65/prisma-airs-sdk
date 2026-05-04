import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RedTeamScansClient } from '../../src/red-team/scans-client.js';
import type { AuthAdapter } from '../../src/http/types.js';
import { AISecSDKException } from '../../src/errors.js';
import { VALID_UUID, jobMock, paginatedListMock, jobAbortMock, categoryMock } from './_fixtures.js';

function passthroughAuth(): AuthAdapter {
  return { prepare: async (req) => req };
}

function mockFetch(data: unknown, status = 200) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(data)),
  });
}

describe('RedTeamScansClient', () => {
  const originalFetch = globalThis.fetch;
  let client: RedTeamScansClient;

  beforeEach(() => {
    client = new RedTeamScansClient({
      baseUrl: 'https://data.example.com',
      auth: passthroughAuth(),
      numRetries: 0,
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('create', () => {
    it('POSTs to /v1/scan', async () => {
      mockFetch(jobMock({ uuid: VALID_UUID, status: 'PENDING' }), 201);
      const result = await client.create({ target_id: VALID_UUID, job_type: 'STATIC' });

      expect(result.uuid).toBe(VALID_UUID);
      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toBe('https://data.example.com/v1/scan');
      expect(init.method).toBe('POST');
    });
  });

  describe('list', () => {
    it('GETs /v1/scan', async () => {
      mockFetch(paginatedListMock());
      const result = await client.list();

      expect(result.data).toEqual([]);
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('/v1/scan');
    });

    it('passes pagination params', async () => {
      mockFetch(paginatedListMock());
      await client.list({ skip: 10, limit: 5 });

      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('skip=10');
      expect(url).toContain('limit=5');
    });

    it('passes filter params', async () => {
      mockFetch(paginatedListMock());
      await client.list({ status: 'COMPLETED', job_type: 'STATIC', target_id: VALID_UUID });

      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('status=COMPLETED');
      expect(url).toContain('job_type=STATIC');
      expect(url).toContain(`target_id=${VALID_UUID}`);
    });
  });

  describe('get', () => {
    it('GETs /v1/scan/:jobId', async () => {
      mockFetch(jobMock({ uuid: VALID_UUID, status: 'COMPLETED' }));
      const result = await client.get(VALID_UUID);

      expect(result.uuid).toBe(VALID_UUID);
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain(`/v1/scan/${VALID_UUID}`);
    });

    it('rejects invalid UUID', async () => {
      await expect(client.get('bad')).rejects.toThrow(AISecSDKException);
    });
  });

  describe('abort', () => {
    it('POSTs to /v1/scan/:jobId/abort', async () => {
      mockFetch(jobAbortMock());
      const result = await client.abort(VALID_UUID);

      expect(result.message).toBe('aborted');
      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain(`/v1/scan/${VALID_UUID}/abort`);
      expect(init.method).toBe('POST');
    });

    it('rejects invalid UUID', async () => {
      await expect(client.abort('bad')).rejects.toThrow(AISecSDKException);
    });
  });

  describe('getCategories', () => {
    it('GETs /v1/categories', async () => {
      mockFetch([categoryMock()]);
      const result = await client.getCategories();

      expect(result).toHaveLength(1);
      expect(result[0].display_name).toBe('Jailbreak');
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('/v1/categories');
    });
  });
});
