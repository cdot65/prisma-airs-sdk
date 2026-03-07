import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RedTeamScansClient } from '../../src/red-team/scans-client.js';
import { OAuthClient } from '../../src/management/oauth-client.js';
import { AISecSDKException } from '../../src/errors.js';

const validUuid = '550e8400-e29b-41d4-a716-446655440000';

function createMockOAuth(): OAuthClient {
  return {
    getToken: vi.fn().mockResolvedValue('tok'),
    clearToken: vi.fn(),
  } as unknown as OAuthClient;
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
      oauthClient: createMockOAuth(),
      numRetries: 0,
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  // -----------------------------------------------------------------------
  // create
  // -----------------------------------------------------------------------
  describe('create', () => {
    it('POSTs to /v1/scan', async () => {
      const job = { id: validUuid, status: 'PENDING' };
      mockFetch(job, 201);
      const result = await client.create({ target_id: validUuid, job_type: 'STATIC' });

      expect(result.id).toBe(validUuid);
      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toBe('https://data.example.com/v1/scan');
      expect(init.method).toBe('POST');
    });
  });

  // -----------------------------------------------------------------------
  // list
  // -----------------------------------------------------------------------
  describe('list', () => {
    it('GETs /v1/scan', async () => {
      mockFetch({ jobs: [], total: 0 });
      const result = await client.list();

      expect(result.jobs).toEqual([]);
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('/v1/scan');
    });

    it('passes pagination params', async () => {
      mockFetch({ jobs: [], total: 0 });
      await client.list({ skip: 10, limit: 5 });

      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('skip=10');
      expect(url).toContain('limit=5');
    });

    it('passes filter params', async () => {
      mockFetch({ jobs: [], total: 0 });
      await client.list({ status: 'COMPLETED', job_type: 'STATIC', target_id: validUuid });

      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('status=COMPLETED');
      expect(url).toContain('job_type=STATIC');
      expect(url).toContain(`target_id=${validUuid}`);
    });
  });

  // -----------------------------------------------------------------------
  // get
  // -----------------------------------------------------------------------
  describe('get', () => {
    it('GETs /v1/scan/:jobId', async () => {
      const job = { id: validUuid, status: 'COMPLETED' };
      mockFetch(job);
      const result = await client.get(validUuid);

      expect(result.id).toBe(validUuid);
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain(`/v1/scan/${validUuid}`);
    });

    it('rejects invalid UUID', async () => {
      await expect(client.get('bad')).rejects.toThrow(AISecSDKException);
    });
  });

  // -----------------------------------------------------------------------
  // abort
  // -----------------------------------------------------------------------
  describe('abort', () => {
    it('POSTs to /v1/scan/:jobId/abort', async () => {
      const resp = { id: validUuid, status: 'ABORTED' };
      mockFetch(resp);
      const result = await client.abort(validUuid);

      expect(result.status).toBe('ABORTED');
      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain(`/v1/scan/${validUuid}/abort`);
      expect(init.method).toBe('POST');
    });

    it('rejects invalid UUID', async () => {
      await expect(client.abort('bad')).rejects.toThrow(AISecSDKException);
    });
  });

  // -----------------------------------------------------------------------
  // getCategories
  // -----------------------------------------------------------------------
  describe('getCategories', () => {
    it('GETs /v1/categories', async () => {
      const categories = [{ name: 'Jailbreak', subcategories: [] }];
      mockFetch(categories);
      const result = await client.getCategories();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Jailbreak');
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('/v1/categories');
    });
  });
});
