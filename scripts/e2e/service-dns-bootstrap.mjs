/** E2E-only DNS accommodation. Never imported by SDK source or installed package payloads. */
import dns from 'node:dns';
import { isIP } from 'node:net';

const serviceHosts = new Set([
  'api.portkey.ai',
  'auth.apps.paloaltonetworks.com',
  'api.apps.paloaltonetworks.com',
  'api.sase.paloaltonetworks.com',
  'api.dlp.paloaltonetworks.com',
  'service.api.aisecurity.paloaltonetworks.com',
]);

/** Caller must separately verify any gateway address against the configured DNS/ingress before use. */
export function serviceDnsLookup(original, gatewayAddress) {
  if (gatewayAddress !== undefined && isIP(gatewayAddress) !== 4)
    throw new Error('E2E gateway address must be a verified IPv4 address');
  return function lookup(name, options, callback) {
    const cb = typeof options === 'function' ? options : callback;
    const settings = options && typeof options === 'object' ? options : {};
    if (name === 'airs.cdot.io' && gatewayAddress) {
      queueMicrotask(() =>
        settings.all
          ? cb(null, [{ address: gatewayAddress, family: 4 }])
          : cb(null, gatewayAddress, 4),
      );
      return;
    }
    if (serviceHosts.has(name))
      return original.call(dns, name + '.', { ...settings, family: 4 }, cb);
    return original.apply(dns, arguments);
  };
}

if (process.env.E2E_SERVICES_ABSOLUTE_DNS4 === '1')
  dns.lookup = serviceDnsLookup(dns.lookup, process.env.E2E_GATEWAY_IPV4_ADDRESS);
