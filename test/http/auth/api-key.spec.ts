import { describe, it, expect } from 'vitest';
import { ApiKeyAuth } from '../../../src/http/auth/api-key.js';
import type { PreparedRequest } from '../../../src/http/types.js';
import { generatePayloadHash } from '../../../src/utils.js';
import { HEADER_API_KEY, HEADER_AUTH_TOKEN, PAYLOAD_HASH } from '../../../src/constants.js';

function baseRequest(): PreparedRequest {
  return {
    method: 'GET',
    url: new URL('https://service.api.aisecurity.paloaltonetworks.com/v1/scan/sync/request'),
    headers: { 'User-Agent': 'test' },
  };
}

describe('ApiKeyAuth.prepare', () => {
  it('adds x-pan-token header when configured with apiKey', async () => {
    const auth = new ApiKeyAuth({ apiKey: 'sec-key' });
    const out = await auth.prepare(baseRequest());
    expect(out.headers[HEADER_API_KEY]).toBe('sec-key');
  });

  it('adds Authorization Bearer header when configured with apiToken', async () => {
    const auth = new ApiKeyAuth({ apiToken: 'bearer-tok' });
    const out = await auth.prepare(baseRequest());
    expect(out.headers[HEADER_AUTH_TOKEN]).toBe('Bearer bearer-tok');
  });

  it('adds both auth headers when configured with apiKey and apiToken', async () => {
    const auth = new ApiKeyAuth({ apiKey: 'sec-key', apiToken: 'bearer-tok' });
    const out = await auth.prepare(baseRequest());
    expect(out.headers[HEADER_API_KEY]).toBe('sec-key');
    expect(out.headers[HEADER_AUTH_TOKEN]).toBe('Bearer bearer-tok');
  });

  it('adds payload hash header when bodyText present and apiKey configured', async () => {
    const auth = new ApiKeyAuth({ apiKey: 'secret-123' });
    const bodyText = '{"hello":"world"}';
    const req: PreparedRequest = {
      method: 'POST',
      url: new URL('https://service.api.aisecurity.paloaltonetworks.com/v1/scan/sync/request'),
      headers: {},
      bodyText,
    };
    const out = await auth.prepare(req);
    expect(out.headers[PAYLOAD_HASH]).toBe(generatePayloadHash(bodyText, 'secret-123'));
  });

  it('does not add payload hash when no bodyText', async () => {
    const auth = new ApiKeyAuth({ apiKey: 'secret-123' });
    const out = await auth.prepare(baseRequest());
    expect(out.headers[PAYLOAD_HASH]).toBeUndefined();
  });

  it('does not add payload hash when only apiToken (no apiKey)', async () => {
    const auth = new ApiKeyAuth({ apiToken: 'tok' });
    const req: PreparedRequest = {
      method: 'POST',
      url: new URL('https://service.api.aisecurity.paloaltonetworks.com/v1/scan/sync/request'),
      headers: {},
      bodyText: '{"a":1}',
    };
    const out = await auth.prepare(req);
    expect(out.headers[PAYLOAD_HASH]).toBeUndefined();
  });

  it('preserves existing headers', async () => {
    const auth = new ApiKeyAuth({ apiKey: 'k' });
    const req = baseRequest();
    req.headers['X-Custom'] = 'keep';
    const out = await auth.prepare(req);
    expect(out.headers['X-Custom']).toBe('keep');
    expect(out.headers['User-Agent']).toBe('test');
  });

  it('returns request with same url, method, bodyText', async () => {
    const auth = new ApiKeyAuth({ apiKey: 'k' });
    const req: PreparedRequest = {
      method: 'POST',
      url: new URL('https://api.example.com/v1/x'),
      headers: {},
      bodyText: '{"a":1}',
    };
    const out = await auth.prepare(req);
    expect(out.method).toBe('POST');
    expect(out.url.toString()).toBe('https://api.example.com/v1/x');
    expect(out.bodyText).toBe('{"a":1}');
  });

  it('throws if neither apiKey nor apiToken configured', () => {
    expect(() => new ApiKeyAuth({})).toThrow();
  });

  it('does not implement onUnauthorized (scan auth has no token refresh)', () => {
    const auth = new ApiKeyAuth({ apiKey: 'k' });
    expect(auth.onUnauthorized).toBeUndefined();
  });
});
