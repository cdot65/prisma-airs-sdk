import { describe, it, expect, vi } from 'vitest';
import { TsgHeaderAuth } from '../../src/http/auth/tsg-header.js';
import type { AuthAdapter, PreparedRequest } from '../../src/http/types.js';

function baseReq(): PreparedRequest {
  return { method: 'GET', url: new URL('https://example.com/x'), headers: { A: '1' } };
}

describe('TsgHeaderAuth', () => {
  it('adds x-tsg-id and preserves inner headers', async () => {
    const inner: AuthAdapter = {
      prepare: async (r) => ({ ...r, headers: { ...r.headers, Authorization: 'Bearer t' } }),
    };
    const auth = new TsgHeaderAuth(inner, '1852583913');

    const out = await auth.prepare(baseReq());

    expect(out.headers['x-tsg-id']).toBe('1852583913');
    expect(out.headers.Authorization).toBe('Bearer t');
    expect(out.headers.A).toBe('1');
  });

  it('delegates onUnauthorized to the inner adapter', async () => {
    const onUnauthorized = vi.fn().mockResolvedValue(true);
    const inner: AuthAdapter = { prepare: async (r) => r, onUnauthorized };
    const auth = new TsgHeaderAuth(inner, '123');

    const res = new Response(null, { status: 401 });
    await expect(auth.onUnauthorized(res)).resolves.toBe(true);
    expect(onUnauthorized).toHaveBeenCalledWith(res);
  });

  it('returns false when the inner adapter has no onUnauthorized', async () => {
    const auth = new TsgHeaderAuth({ prepare: async (r) => r }, '123');
    await expect(auth.onUnauthorized(new Response(null, { status: 401 }))).resolves.toBe(false);
  });
});
