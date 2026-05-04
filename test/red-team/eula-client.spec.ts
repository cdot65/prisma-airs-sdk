import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RedTeamEulaClient } from '../../src/red-team/eula-client.js';
import type { AuthAdapter } from '../../src/http/types.js';

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

describe('RedTeamEulaClient', () => {
  const originalFetch = globalThis.fetch;
  let client: RedTeamEulaClient;

  beforeEach(() => {
    client = new RedTeamEulaClient({
      baseUrl: 'https://mgmt.example.com',
      auth: passthroughAuth(),
      numRetries: 0,
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  // -----------------------------------------------------------------------
  // getContent
  // -----------------------------------------------------------------------
  describe('getContent', () => {
    it('GETs /v1/eula/content', async () => {
      mockFetch({ content: 'EULA text here...' });
      const result = await client.getContent();

      expect(result.content).toBe('EULA text here...');
      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('/v1/eula/content');
      expect(init.method).toBe('GET');
    });
  });

  // -----------------------------------------------------------------------
  // getStatus
  // -----------------------------------------------------------------------
  describe('getStatus', () => {
    it('GETs /v1/eula/status', async () => {
      mockFetch({ is_accepted: true, accepted_at: '2025-01-01T00:00:00Z' });
      const result = await client.getStatus();

      expect(result.is_accepted).toBe(true);
      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('/v1/eula/status');
      expect(init.method).toBe('GET');
    });
  });

  // -----------------------------------------------------------------------
  // accept
  // -----------------------------------------------------------------------
  describe('accept', () => {
    it('POSTs to /v1/eula/accept with body', async () => {
      const body = { eula_content: 'I accept', accepted_at: '2025-01-01T00:00:00Z' };
      mockFetch({ is_accepted: true, accepted_at: '2025-01-01T00:00:00Z' });
      const result = await client.accept(body);

      expect(result.is_accepted).toBe(true);
      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('/v1/eula/accept');
      expect(init.method).toBe('POST');
      expect(JSON.parse(init.body)).toEqual(body);
    });
  });
});
