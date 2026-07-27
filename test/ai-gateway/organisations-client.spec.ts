import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AIGatewayOrganisationsClient } from '../../src/ai-gateway/organisations-client.js';
import type { AuthAdapter } from '../../src/http/types.js';
import { AISecSDKException } from '../../src/errors.js';

function passthroughAuth(): AuthAdapter {
  return { prepare: async (req) => req };
}
function mockFetch(data: unknown) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    text: () => Promise.resolve(JSON.stringify(data)),
  });
}

describe('AIGatewayOrganisationsClient', () => {
  const originalFetch = globalThis.fetch;
  let client: AIGatewayOrganisationsClient;

  beforeEach(() => {
    client = new AIGatewayOrganisationsClient({
      baseUrl: 'https://admin.example.com',
      auth: passthroughAuth(),
      numRetries: 0,
    });
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('GETs /organisations/self', async () => {
    mockFetch({ success: true, data: { name: 'Acme Corp' } });
    const res = await client.getSelf();

    const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(new URL(url as string).pathname).toBe('/organisations/self');
    expect((init as RequestInit).method).toBe('GET');
    expect(res.data.name).toBe('Acme Corp');
  });

  it('PUTs /organisations/self with the given body', async () => {
    mockFetch({});
    await client.updateSelf({ name: 'Acme Corp' });

    const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(new URL(url as string).pathname).toBe('/organisations/self');
    expect((init as RequestInit).method).toBe('PUT');
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ name: 'Acme Corp' });
  });

  it('GETs /organisations/{tsgId}/auth-settings', async () => {
    mockFetch({
      success: true,
      data: { auth_settings: {}, domains: ['acme.com'], scim_token: 'scim-secret-token' },
    });
    const res = await client.getAuthSettings('1852583913');

    const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(new URL(url as string).pathname).toBe('/organisations/1852583913/auth-settings');
    expect((init as RequestInit).method).toBe('GET');
    expect(res.data.scim_token).toBe('scim-secret-token');
  });

  it('PUTs /organisations/{tsgId}/auth-settings with the given body', async () => {
    mockFetch({});
    await client.updateAuthSettings('1852583913', { domains: ['acme.com'] });

    const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(new URL(url as string).pathname).toBe('/organisations/1852583913/auth-settings');
    expect((init as RequestInit).method).toBe('PUT');
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ domains: ['acme.com'] });
  });

  it('rejects a non-numeric tsgId in getAuthSettings() before issuing a request', async () => {
    globalThis.fetch = vi.fn();
    await expect(client.getAuthSettings('not-numeric')).rejects.toThrow(AISecSDKException);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('rejects a non-numeric tsgId in updateAuthSettings() before issuing a request', async () => {
    globalThis.fetch = vi.fn();
    await expect(
      client.updateAuthSettings('not-numeric', { domains: ['acme.com'] }),
    ).rejects.toThrow(AISecSDKException);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('rejects a tsgId containing a path-traversal segment', async () => {
    globalThis.fetch = vi.fn();
    await expect(client.getAuthSettings('../self')).rejects.toThrow(AISecSDKException);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
