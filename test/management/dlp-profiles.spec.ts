import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DlpProfilesClient } from '../../src/management/dlp-profiles.js';
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

describe('DlpProfilesClient', () => {
  const originalFetch = globalThis.fetch;
  let client: DlpProfilesClient;

  beforeEach(() => {
    client = new DlpProfilesClient({
      baseUrl: 'https://api.example.com',
      auth: passthroughAuth(),
      numRetries: 0,
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('list', () => {
    it('GETs /v1/mgmt/dlpprofiles', async () => {
      mockFetch({ dlp_profiles: [{ name: 'p1', uuid: 'u1' }] });
      const result = await client.list();

      expect(result.dlp_profiles).toHaveLength(1);
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('/v1/mgmt/dlpprofiles');
    });
  });
});
