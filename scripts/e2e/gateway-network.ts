/** @internal Optional process-local workaround for split DNS returning NXDOMAIN for gateway AAAA queries.
 * Native fetch/TLS remain in use. No hosts file, resolver settings or SDK defaults are changed.
 */
import dns from 'node:dns';

export function gatewayIpv4Lookup(endpoint: string): () => void {
  if (process.env.E2E_GATEWAY_IPV4_ONLY !== '1') return () => {};
  const hostname = new URL(endpoint).hostname;
  const original = dns.lookup;
  dns.lookup = ((...args: unknown[]) => {
    if (args[0] === hostname) {
      if (typeof args[1] === 'function') args.splice(1, 0, { family: 4 });
      else
        args[1] = {
          ...(typeof args[1] === 'object' && args[1] !== null ? args[1] : {}),
          family: 4,
        };
    }
    return Reflect.apply(original, dns, args);
  }) as typeof dns.lookup;
  return () => {
    dns.lookup = original;
  };
}
