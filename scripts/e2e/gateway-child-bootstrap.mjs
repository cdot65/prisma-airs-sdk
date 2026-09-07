// E2E-only resolver workaround for this host's split DNS. No SDK or system DNS mutation.
import dns from 'node:dns';
if (process.env.E2E_GATEWAY_IPV4_ONLY === '1') {
  const hostname = new URL(process.env.PANW_AI_GW_INFERENCE_ENDPOINT).hostname;
  const original = dns.lookup;
  dns.lookup = function lookup(name, options, callback) {
    if (name !== hostname) return original.apply(this, arguments);
    const cb = typeof options === 'function' ? options : callback;
    const settings = options && typeof options === 'object' ? options : {};
    return original.call(this, name, { ...settings, family: 4 }, cb);
  };
}
