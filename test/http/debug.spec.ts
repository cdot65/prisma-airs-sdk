import { describe, it, expect, afterEach, vi } from 'vitest';
import { createHash } from 'node:crypto';
import {
  isDebugEnabled,
  hashToken,
  sanitizeHeaders,
  logRequest,
  logResponse,
} from '../../src/http/debug.js';

describe('debug — isDebugEnabled', () => {
  const original = process.env.PANW_AI_SEC_DEBUG;
  afterEach(() => {
    if (original === undefined) delete process.env.PANW_AI_SEC_DEBUG;
    else process.env.PANW_AI_SEC_DEBUG = original;
  });

  it('is false when unset', () => {
    delete process.env.PANW_AI_SEC_DEBUG;
    expect(isDebugEnabled()).toBe(false);
  });

  it.each(['1', 'true', 'TRUE', 'yes', 'YES', 'on'])('is true for %s', (v) => {
    process.env.PANW_AI_SEC_DEBUG = v;
    expect(isDebugEnabled()).toBe(true);
  });

  it.each(['0', 'false', 'no', '', 'off'])('is false for %s', (v) => {
    process.env.PANW_AI_SEC_DEBUG = v;
    expect(isDebugEnabled()).toBe(false);
  });
});

describe('debug — hashToken', () => {
  it('formats as sha256:<12 hex>', () => {
    const h = hashToken('super-secret-token');
    expect(h).toMatch(/^sha256:[0-9a-f]{12}$/);
  });

  it('is deterministic and matches a sha256 prefix', () => {
    const value = 'Bearer abc.def.ghi';
    const expected = 'sha256:' + createHash('sha256').update(value).digest('hex').slice(0, 12);
    expect(hashToken(value)).toBe(expected);
    expect(hashToken(value)).toBe(hashToken(value));
  });

  it('differs for different inputs', () => {
    expect(hashToken('token-a')).not.toBe(hashToken('token-b'));
  });

  it('never contains the raw secret', () => {
    const secret = 'pan-key-1234567890';
    expect(hashToken(secret)).not.toContain(secret);
  });
});

describe('debug — sanitizeHeaders', () => {
  it('hashes Authorization and x-pan-token, leaves others intact', () => {
    const out = sanitizeHeaders({
      'User-Agent': 'PAN-AIRS/0.0.0',
      Authorization: 'Bearer the-oauth-token',
      'x-pan-token': 'Bearer the-api-token',
      'x-payload-hash': 'already-a-hash',
    });
    expect(out['User-Agent']).toBe('PAN-AIRS/0.0.0');
    expect(out['x-payload-hash']).toBe('already-a-hash');
    expect(out.Authorization).toMatch(/^sha256:[0-9a-f]{12}$/);
    expect(out['x-pan-token']).toMatch(/^sha256:[0-9a-f]{12}$/);
    expect(out.Authorization).not.toContain('the-oauth-token');
    expect(out['x-pan-token']).not.toContain('the-api-token');
  });

  it('matches sensitive header names case-insensitively', () => {
    const out = sanitizeHeaders({ authorization: 'Bearer x', 'X-PAN-TOKEN': 'secret' });
    expect(out.authorization).toMatch(/^sha256:/);
    expect(out['X-PAN-TOKEN']).toMatch(/^sha256:/);
  });

  it('does not mutate the input object', () => {
    const input = { Authorization: 'Bearer keep-me' };
    sanitizeHeaders(input);
    expect(input.Authorization).toBe('Bearer keep-me');
  });
});

describe('debug — logRequest / logResponse', () => {
  afterEach(() => vi.restoreAllMocks());

  it('logRequest writes a sanitized line to stderr', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    logRequest('POST', 'https://api/x', { Authorization: 'Bearer raw-secret' }, '{"a":1}');
    const out = spy.mock.calls.flat().join(' ');
    expect(out).toContain('[airs-sdk]');
    expect(out).toContain('POST');
    expect(out).toContain('https://api/x');
    expect(out).not.toContain('raw-secret');
  });

  it('logResponse writes status and duration to stderr', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    logResponse(200, 143, '{"ok":true}');
    const out = spy.mock.calls.flat().join(' ');
    expect(out).toContain('[airs-sdk]');
    expect(out).toContain('200');
    expect(out).toContain('143');
  });
});
