import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TopicsClient } from '../../src/management/topics.js';
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

const sampleTopic = {
  topic_id: '550e8400-e29b-41d4-a716-446655440000',
  topic_name: 'credit-cards',
  revision: 1,
  active: true,
};

describe('TopicsClient', () => {
  const originalFetch = globalThis.fetch;
  let client: TopicsClient;

  beforeEach(() => {
    client = new TopicsClient({
      baseUrl: 'https://api.example.com/aisec',
      oauthClient: createMockOAuth(),
      tsgId: '456',
      numRetries: 0,
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('create', () => {
    it('POSTs to /v1/mgmt/topic', async () => {
      mockFetch(sampleTopic, 201);
      const result = await client.create({ topic_name: 'credit-cards' });

      expect(result.topic_name).toBe('credit-cards');
      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toBe('https://api.example.com/aisec/v1/mgmt/topic');
      expect(init.method).toBe('POST');
    });
  });

  describe('list', () => {
    it('GETs topics for tsg', async () => {
      mockFetch({ custom_topics: [sampleTopic] });
      const result = await client.list();

      expect(result.custom_topics).toHaveLength(1);
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('/v1/mgmt/topics/tsg/456');
    });

    it('passes pagination params', async () => {
      mockFetch({ custom_topics: [], next_offset: 20 });
      await client.list({ offset: 5, limit: 5 });

      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('offset=5');
      expect(url).toContain('limit=5');
    });
  });

  describe('update', () => {
    it('PUTs to /v1/mgmt/topic/uuid/:id', async () => {
      mockFetch({ ...sampleTopic, topic_name: 'updated' });
      const result = await client.update('550e8400-e29b-41d4-a716-446655440000', {
        topic_name: 'updated',
      });

      expect(result.topic_name).toBe('updated');
      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('/v1/mgmt/topic/uuid/550e8400-e29b-41d4-a716-446655440000');
      expect(init.method).toBe('PUT');
    });

    it('rejects invalid UUID', async () => {
      await expect(client.update('bad', { topic_name: 'x' })).rejects.toThrow(AISecSDKException);
    });
  });

  describe('delete', () => {
    it('DELETEs topic by id', async () => {
      mockFetch({ message: 'deleted' });
      const result = await client.delete('550e8400-e29b-41d4-a716-446655440000');

      expect(result.message).toBe('deleted');
      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('/v1/mgmt/topic/550e8400-e29b-41d4-a716-446655440000');
      expect(init.method).toBe('DELETE');
    });

    it('rejects invalid UUID', async () => {
      await expect(client.delete('bad')).rejects.toThrow(AISecSDKException);
    });
  });

  describe('forceDelete', () => {
    it('DELETEs via /v1/mgmt/topic/force/:id', async () => {
      mockFetch({ message: 'force deleted' });
      const result = await client.forceDelete('550e8400-e29b-41d4-a716-446655440000');

      expect(result.message).toBe('force deleted');
      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('/v1/mgmt/topic/force/550e8400-e29b-41d4-a716-446655440000');
      expect(init.method).toBe('DELETE');
    });

    it('rejects invalid UUID', async () => {
      await expect(client.forceDelete('bad')).rejects.toThrow(AISecSDKException);
    });
  });
});
