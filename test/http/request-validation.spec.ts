import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { AISecSDKException, ErrorType } from '../../src/errors.js';
import { request } from '../../src/http/request.js';
import type { AuthAdapter } from '../../src/http/types.js';

describe('request requestSchema validation', () => {
  it('rejects before auth preparation and fetch without exposing the invalid value', async () => {
    const prepare = vi.fn(async (prepared) => prepared);
    const auth: AuthAdapter = { prepare };
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn();

    try {
      const call = request({
        method: 'POST',
        baseUrl: 'https://api.example.com',
        path: '/items',
        body: { credential: 'sentinel-secret', count: -1 },
        requestSchema: z.object({ credential: z.string(), count: z.number().min(0) }).strict(),
        auth,
        numRetries: 0,
      });

      await expect(call).rejects.toMatchObject({
        errorType: ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      });
      await expect(call).rejects.toBeInstanceOf(AISecSDKException);
      await expect(call).rejects.toThrow(/POST \/items.*count/);
      await expect(call).rejects.not.toThrow(/sentinel-secret/);
      expect(prepare).not.toHaveBeenCalled();
      expect(globalThis.fetch).not.toHaveBeenCalled();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('serializes the parsed request body', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => '' });

    try {
      await request({
        method: 'POST',
        baseUrl: 'https://api.example.com',
        path: '/items',
        body: { count: 3 },
        requestSchema: z.object({ count: z.coerce.string() }).strict(),
        auth: { prepare: async (prepared) => prepared },
        numRetries: 0,
      });

      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://api.example.com/items',
        expect.objectContaining({ body: JSON.stringify({ count: '3' }) }),
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
