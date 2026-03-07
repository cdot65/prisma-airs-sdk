import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RedTeamTargetsClient } from '../../src/red-team/targets-client.js';
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

describe('RedTeamTargetsClient', () => {
  const originalFetch = globalThis.fetch;
  let client: RedTeamTargetsClient;

  beforeEach(() => {
    client = new RedTeamTargetsClient({
      baseUrl: 'https://mgmt.example.com',
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
    it('POSTs to /v1/target', async () => {
      const target = { id: validUuid, name: 'test-target' };
      mockFetch(target, 201);
      const result = await client.create({ name: 'test-target', target_type: 'API' });

      expect(result.id).toBe(validUuid);
      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toBe('https://mgmt.example.com/v1/target');
      expect(init.method).toBe('POST');
    });
  });

  // -----------------------------------------------------------------------
  // list
  // -----------------------------------------------------------------------
  describe('list', () => {
    it('GETs /v1/target', async () => {
      mockFetch({ targets: [], total: 0 });
      const result = await client.list();

      expect(result.targets).toEqual([]);
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('/v1/target');
    });

    it('passes filter params', async () => {
      mockFetch({ targets: [], total: 0 });
      await client.list({ target_type: 'API', status: 'ACTIVE', active: true });

      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('target_type=API');
      expect(url).toContain('status=ACTIVE');
      expect(url).toContain('active=true');
    });

    it('passes pagination params', async () => {
      mockFetch({ targets: [], total: 0 });
      await client.list({ skip: 5, limit: 10 });

      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('skip=5');
      expect(url).toContain('limit=10');
    });
  });

  // -----------------------------------------------------------------------
  // get
  // -----------------------------------------------------------------------
  describe('get', () => {
    it('GETs /v1/target/:uuid', async () => {
      const target = { id: validUuid, name: 'test-target' };
      mockFetch(target);
      const result = await client.get(validUuid);

      expect(result.id).toBe(validUuid);
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain(`/v1/target/${validUuid}`);
    });

    it('rejects invalid UUID', async () => {
      await expect(client.get('bad')).rejects.toThrow(AISecSDKException);
    });
  });

  // -----------------------------------------------------------------------
  // update
  // -----------------------------------------------------------------------
  describe('update', () => {
    it('PUTs to /v1/target/:uuid', async () => {
      const target = { id: validUuid, name: 'updated' };
      mockFetch(target);
      const result = await client.update(validUuid, { name: 'updated' });

      expect(result.name).toBe('updated');
      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain(`/v1/target/${validUuid}`);
      expect(init.method).toBe('PUT');
    });

    it('rejects invalid UUID', async () => {
      await expect(client.update('bad', { name: 'x' })).rejects.toThrow(AISecSDKException);
    });
  });

  // -----------------------------------------------------------------------
  // delete
  // -----------------------------------------------------------------------
  describe('delete', () => {
    it('DELETEs /v1/target/:uuid', async () => {
      mockFetch({ success: true });
      const result = await client.delete(validUuid);

      expect(result.success).toBe(true);
      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain(`/v1/target/${validUuid}`);
      expect(init.method).toBe('DELETE');
    });

    it('rejects invalid UUID', async () => {
      await expect(client.delete('bad')).rejects.toThrow(AISecSDKException);
    });
  });

  // -----------------------------------------------------------------------
  // probe
  // -----------------------------------------------------------------------
  describe('probe', () => {
    it('POSTs to /v1/target/probe', async () => {
      const target = { id: validUuid, status: 'PROBING' };
      mockFetch(target);
      const result = await client.probe({ target_id: validUuid });

      expect(result.status).toBe('PROBING');
      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('/v1/target/probe');
      expect(init.method).toBe('POST');
    });
  });

  // -----------------------------------------------------------------------
  // getProfile
  // -----------------------------------------------------------------------
  describe('getProfile', () => {
    it('GETs /v1/target/:uuid/profile', async () => {
      mockFetch({ target_id: validUuid, background: 'test' });
      const result = await client.getProfile(validUuid);

      expect(result.target_id).toBe(validUuid);
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain(`/v1/target/${validUuid}/profile`);
    });

    it('rejects invalid UUID', async () => {
      await expect(client.getProfile('bad')).rejects.toThrow(AISecSDKException);
    });
  });

  // -----------------------------------------------------------------------
  // updateProfile
  // -----------------------------------------------------------------------
  describe('updateProfile', () => {
    it('PUTs to /v1/target/:uuid/profile', async () => {
      mockFetch({ target_id: validUuid, background: 'updated' });
      const result = await client.updateProfile(validUuid, { background: 'updated' });

      expect(result.background).toBe('updated');
      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain(`/v1/target/${validUuid}/profile`);
      expect(init.method).toBe('PUT');
    });

    it('rejects invalid UUID', async () => {
      await expect(client.updateProfile('bad', { background: 'x' })).rejects.toThrow(
        AISecSDKException,
      );
    });
  });
});
