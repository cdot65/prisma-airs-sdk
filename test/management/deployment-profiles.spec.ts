import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DeploymentProfilesClient } from '../../src/management/deployment-profiles.js';
import { OAuthClient } from '../../src/management/oauth-client.js';

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

describe('DeploymentProfilesClient', () => {
  const originalFetch = globalThis.fetch;
  let client: DeploymentProfilesClient;

  beforeEach(() => {
    client = new DeploymentProfilesClient({
      baseUrl: 'https://api.example.com',
      oauthClient: createMockOAuth(),
      numRetries: 0,
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('list', () => {
    it('GETs /v1/mgmt/deploymentprofiles', async () => {
      mockFetch({ deployment_profiles: [], status: 'ok' });
      const result = await client.list();

      expect(result.deployment_profiles).toEqual([]);
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('/v1/mgmt/deploymentprofiles');
    });

    it('passes unactivated filter', async () => {
      mockFetch({ deployment_profiles: [], status: 'ok' });
      await client.list({ unactivated: true });

      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('unactivated=true');
    });
  });
});
