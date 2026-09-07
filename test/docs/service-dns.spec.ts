import { describe, expect, it, vi } from 'vitest';
// @ts-expect-error The standalone Node bootstrap intentionally has no production declaration.
import { serviceDnsLookup } from '../../scripts/e2e/service-dns-bootstrap.mjs';

describe('opt-in test-only DNS accommodation', () => {
  it('fully qualifies only the known service hosts and preserves the all-address callback shape', () => {
    const original = vi.fn();
    const callback = vi.fn();
    const lookup = serviceDnsLookup(original);
    lookup('auth.apps.paloaltonetworks.com', { all: true, hints: 0 }, callback);
    expect(original).toHaveBeenCalledWith(
      'auth.apps.paloaltonetworks.com.',
      { all: true, hints: 0, family: 4 },
      callback,
    );
  });
  it('supports the callback-only and numeric-family overloads', () => {
    const original = vi.fn();
    const callback = vi.fn();
    const lookup = serviceDnsLookup(original);
    lookup('api.apps.paloaltonetworks.com', callback);
    lookup('api.sase.paloaltonetworks.com', 0, callback);
    expect(original.mock.calls.map((call) => call.slice(1))).toEqual([
      [{ family: 4 }, callback],
      [{ family: 4 }, callback],
    ]);
  });
  it('leaves unrelated hosts and an unconfigured gateway with the original resolver', () => {
    const original = vi.fn();
    const callback = vi.fn();
    const lookup = serviceDnsLookup(original);
    lookup('unrelated.example', 6, callback);
    lookup('airs.cdot.io', callback);
    expect(original.mock.calls).toEqual([
      ['unrelated.example', 6, callback],
      ['airs.cdot.io', callback],
    ]);
  });
  it('uses an explicit gateway address asynchronously with both Node callback shapes', async () => {
    const original = vi.fn();
    const callback = vi.fn();
    const all = vi.fn();
    const lookup = serviceDnsLookup(original, '192.0.2.1');
    lookup('airs.cdot.io', callback);
    lookup('airs.cdot.io', { all: true }, all);
    expect(callback).not.toHaveBeenCalled();
    await Promise.resolve();
    expect(callback).toHaveBeenCalledWith(null, '192.0.2.1', 4);
    expect(all).toHaveBeenCalledWith(null, [{ address: '192.0.2.1', family: 4 }]);
    expect(original).not.toHaveBeenCalled();
  });
  it.each(['', 'not-an-ip', '::1'])('rejects malformed explicit addresses: %s', (address) => {
    expect(() => serviceDnsLookup(vi.fn(), address)).toThrow('verified IPv4');
    expect(() => serviceDnsLookup(vi.fn(), undefined, address)).toThrow('verified IPv4');
  });
  it('keeps the MCP and LLM gateway overrides independent and exact', async () => {
    const original = vi.fn();
    const callback = vi.fn();
    const lookup = serviceDnsLookup(original, '192.0.2.1', '192.0.2.2');
    lookup('mcp-airs.cdot.io', { all: true }, callback);
    lookup('other.mcp-airs.cdot.io', callback);
    await Promise.resolve();
    expect(callback).toHaveBeenCalledWith(null, [{ address: '192.0.2.2', family: 4 }]);
    expect(original).toHaveBeenCalledWith('other.mcp-airs.cdot.io', callback);
    serviceDnsLookup(original, '192.0.2.1')('mcp-airs.cdot.io', callback);
    expect(original).toHaveBeenLastCalledWith('mcp-airs.cdot.io', callback);
  });
});
