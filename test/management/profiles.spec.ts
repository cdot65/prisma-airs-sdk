import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ProfilesClient } from '../../src/management/profiles.js';
import { OAuthClient } from '../../src/management/oauth-client.js';
import { AISecSDKException } from '../../src/errors.js';

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

const sampleProfile = {
  profile_id: '550e8400-e29b-41d4-a716-446655440000',
  profile_name: 'test-prof',
  revision: 1,
  active: true,
};

describe('ProfilesClient', () => {
  const originalFetch = globalThis.fetch;
  let client: ProfilesClient;

  beforeEach(() => {
    client = new ProfilesClient({
      baseUrl: 'https://api.example.com/aisec',
      oauthClient: createMockOAuth(),
      tsgId: '123',
      numRetries: 0,
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('create', () => {
    it('POSTs to /v1/mgmt/profile', async () => {
      mockFetch(sampleProfile, 201);
      const result = await client.create({ profile_name: 'test-prof' });

      expect(result.profile_name).toBe('test-prof');
      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toBe('https://api.example.com/aisec/v1/mgmt/profile');
      expect(init.method).toBe('POST');
    });
  });

  describe('list', () => {
    it('GETs profiles for tsg', async () => {
      mockFetch({ ai_profiles: [sampleProfile] });
      const result = await client.list();

      expect(result.ai_profiles).toHaveLength(1);
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('/v1/mgmt/profiles/tsg/123');
    });

    it('passes pagination params', async () => {
      mockFetch({ ai_profiles: [], next_offset: 20 });
      await client.list({ offset: 10, limit: 10 });

      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('offset=10');
      expect(url).toContain('limit=10');
    });
  });

  describe('update', () => {
    it('PUTs to /v1/mgmt/profile/uuid/:id', async () => {
      mockFetch({ ...sampleProfile, profile_name: 'updated' });
      const result = await client.update('550e8400-e29b-41d4-a716-446655440000', {
        profile_name: 'updated',
      });

      expect(result.profile_name).toBe('updated');
      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('/v1/mgmt/profile/uuid/550e8400-e29b-41d4-a716-446655440000');
      expect(init.method).toBe('PUT');
    });

    it('rejects invalid UUID', async () => {
      await expect(client.update('not-a-uuid', { profile_name: 'x' })).rejects.toThrow(
        AISecSDKException,
      );
    });
  });

  describe('delete', () => {
    it('DELETEs profile by id', async () => {
      mockFetch({ message: 'deleted' });
      const result = await client.delete('550e8400-e29b-41d4-a716-446655440000');

      expect(result.message).toBe('deleted');
      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('/v1/mgmt/profile/550e8400-e29b-41d4-a716-446655440000');
      expect(init.method).toBe('DELETE');
    });

    it('rejects invalid UUID', async () => {
      await expect(client.delete('bad')).rejects.toThrow(AISecSDKException);
    });
  });

  describe('forceDelete', () => {
    it('DELETEs /v1/mgmt/profile/:id/force with updated_by', async () => {
      mockFetch({ message: 'force deleted' });
      const result = await client.forceDelete(
        '550e8400-e29b-41d4-a716-446655440000',
        'admin@test.com',
      );

      expect(result.message).toBe('force deleted');
      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('/v1/mgmt/profile/550e8400-e29b-41d4-a716-446655440000/force');
      expect(url).toContain('updated_by=admin');
      expect(init.method).toBe('DELETE');
    });

    it('rejects invalid UUID', async () => {
      await expect(client.forceDelete('bad', 'user@test.com')).rejects.toThrow(AISecSDKException);
    });
  });
});
