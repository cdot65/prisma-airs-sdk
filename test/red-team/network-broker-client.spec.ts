import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RedTeamNetworkBrokerClient } from '../../src/red-team/network-broker-client.js';
import type { AuthAdapter } from '../../src/http/types.js';
import { AISecSDKException } from '../../src/errors.js';
import { VALID_UUID, channelMock, channelListMock, channelStatsMock } from './_fixtures.js';

const validUuid = VALID_UUID;

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

function lastCall() {
  return (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
}

describe('RedTeamNetworkBrokerClient', () => {
  const originalFetch = globalThis.fetch;
  let client: RedTeamNetworkBrokerClient;

  beforeEach(() => {
    client = new RedTeamNetworkBrokerClient({
      baseUrl: 'https://nb.example.com',
      auth: passthroughAuth(),
      numRetries: 0,
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('listChannels', () => {
    it('GETs /v1/channels', async () => {
      mockFetch(channelListMock([channelMock()]));
      const result = await client.listChannels();

      expect(result.data).toHaveLength(1);
      const [url, init] = lastCall();
      expect(url).toBe('https://nb.example.com/v1/channels');
      expect(init.method).toBe('GET');
    });

    it('serializes limit, skip, and search', async () => {
      mockFetch(channelListMock());
      await client.listChannels({ limit: 10, skip: 5, search: 'prod' });

      const [url] = lastCall();
      expect(url).toContain('limit=10');
      expect(url).toContain('skip=5');
      expect(url).toContain('search=prod');
    });

    it('serializes include_all_if_empty', async () => {
      mockFetch(channelListMock());
      await client.listChannels({ include_all_if_empty: true });

      const [url] = lastCall();
      expect(url).toContain('include_all_if_empty=true');
    });

    it('serializes a single status filter', async () => {
      mockFetch(channelListMock());
      await client.listChannels({ status: 'ONLINE' });

      const [url] = lastCall();
      expect(url).toContain('status=ONLINE');
    });

    it('serializes repeated status filters', async () => {
      mockFetch(channelListMock());
      await client.listChannels({ status: ['ONLINE', 'DRAFT'] });

      const [url] = lastCall();
      const params = new URL(url).searchParams.getAll('status');
      expect(params).toEqual(['ONLINE', 'DRAFT']);
    });
  });

  describe('createChannel', () => {
    it('POSTs to /v1/channels with body', async () => {
      mockFetch(channelMock({ name: 'new-chan' }), 201);
      const result = await client.createChannel({ name: 'new-chan', description: 'd' });

      expect(result.name).toBe('new-chan');
      const [url, init] = lastCall();
      expect(url).toBe('https://nb.example.com/v1/channels');
      expect(init.method).toBe('POST');
      expect(JSON.parse(init.body)).toEqual({ name: 'new-chan', description: 'd' });
    });
  });

  describe('getChannelStats', () => {
    it('GETs /v1/channels/stats', async () => {
      mockFetch(channelStatsMock());
      const result = await client.getChannelStats();

      expect(result.total_channels).toBe(5);
      const [url, init] = lastCall();
      expect(url).toBe('https://nb.example.com/v1/channels/stats');
      expect(init.method).toBe('GET');
    });
  });

  describe('getChannel', () => {
    it('GETs /v1/channels/{channelId}', async () => {
      mockFetch(channelMock());
      const result = await client.getChannel(validUuid);

      expect(result.uuid).toBe(validUuid);
      const [url, init] = lastCall();
      expect(url).toBe(`https://nb.example.com/v1/channels/${validUuid}`);
      expect(init.method).toBe('GET');
    });

    it('rejects an invalid UUID', async () => {
      await expect(client.getChannel('bad')).rejects.toThrow(AISecSDKException);
    });
  });

  describe('updateChannel', () => {
    it('PATCHes /v1/channels/{channelId} with body', async () => {
      mockFetch(channelMock({ name: 'renamed' }));
      const result = await client.updateChannel(validUuid, { name: 'renamed' });

      expect(result.name).toBe('renamed');
      const [url, init] = lastCall();
      expect(url).toBe(`https://nb.example.com/v1/channels/${validUuid}`);
      expect(init.method).toBe('PATCH');
      expect(JSON.parse(init.body)).toEqual({ name: 'renamed' });
    });

    it('rejects an invalid UUID', async () => {
      await expect(client.updateChannel('bad', { name: 'x' })).rejects.toThrow(AISecSDKException);
    });
  });
});
