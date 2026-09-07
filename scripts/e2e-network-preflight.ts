/** @internal Verify this workspace's opt-in DNS workaround without changing infrastructure. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { Resolver } from 'node:dns/promises';
import { loadLiveCredentials } from './live-credentials.js';
import { OAuthClient } from '../src/management/oauth-client.js';
import { writePrivateReport } from './e2e/harness.js';

const source = loadLiveCredentials();
const readCluster = (args: string[]) =>
  execFileSync('kubectl', ['--request-timeout=10s', ...args], {
    encoding: 'utf8',
    timeout: 15_000,
  });
const coreArgs = [
  '-n',
  'kube-system',
  'get',
  'configmap',
  'coredns',
  '-o',
  'jsonpath={.data.Corefile}',
];
const ingressArgs = [
  '-n',
  'airs-gw',
  'get',
  'ingressroute.traefik.io',
  'airs-gw-https',
  '-o',
  'json',
];
const coreBefore = readCluster(coreArgs);
const ingressBefore = readCluster(ingressArgs);
const ingress = JSON.parse(ingressBefore) as {
  spec: {
    entryPoints: string[];
    routes: { match: string; services: { name: string; port: number }[] }[];
    tls: { secretName: string };
  };
};
assert(coreBefore.includes('forward . 192.168.1.1 192.168.1.2'));
assert.equal(process.env.E2E_SERVICES_ABSOLUTE_DNS4, '1');
assert(ingress.spec.entryPoints.includes('websecure'));
assert(
  ingress.spec.routes.some(
    (route) =>
      route.match === 'Host(`airs.cdot.io`)' &&
      route.services.some((service) => service.name === 'airs-gw' && service.port === 80),
  ),
);
assert.equal(typeof ingress.spec.tls.secretName, 'string');
const results = [];
for (const resolverAddress of ['192.168.1.1', '192.168.1.2']) {
  const resolver = new Resolver({ timeout: 2000, tries: 1 });
  resolver.setServers([resolverAddress]);
  try {
    results.push({
      resolver: resolverAddress,
      addresses: await resolver.resolve4('airs.cdot.io.'),
    });
  } catch (error) {
    results.push({ resolver: resolverAddress, errorCode: (error as NodeJS.ErrnoException).code });
  }
}
assert(results[1].addresses?.includes(process.env.E2E_GATEWAY_IPV4_ADDRESS!));
try {
  const oauth = new OAuthClient({
    clientId: process.env.PANW_MGMT_CLIENT_ID!,
    clientSecret: process.env.PANW_MGMT_CLIENT_SECRET!,
    tsgId: process.env.PANW_MGMT_TSG_ID!,
  });
  const token = await oauth.getToken();
  assert(typeof token === 'string' && token.length > 0);
  const response = await fetch('https://airs.cdot.io/v1/models', {
    signal: AbortSignal.timeout(15_000),
    redirect: 'error',
  });
  await response.body?.cancel();
  assert.equal(response.status, 401, 'Expected the gateway authentication boundary without a key');
  source.verifyUnchanged();
  assert.equal(readCluster(coreArgs), coreBefore);
  assert.equal(readCluster(ingressArgs), ingressBefore);
  const report = {
    checkedAt: new Date().toISOString(),
    passed: true,
    credentialsUnchanged: true,
    infrastructureUnchanged: true,
    publicGatewayReachabilityCertified: false,
    tlsVerificationEnabled: true,
    oauthSucceeded: true,
    unauthenticatedGatewayStatus: response.status,
    dns: results,
    coreDnsSha256: createHash('sha256').update(coreBefore).digest('hex'),
    ingressSha256: createHash('sha256').update(ingressBefore).digest('hex'),
    disclosure:
      'Process-only fully qualified IPv4 lookups for the known service hosts, with the gateway address verified against the existing secondary split-DNS resolver and exact HTTPS ingress route. The public WAN address timed out from this workspace and is not certified. Original HTTPS URL/SNI, gateway authentication, and certificate validation are preserved. No system DNS, ingress, service, key or workspace configuration is changed.',
  };
  writePrivateReport('artifacts/e2e/network-preflight.json', report);
  console.log(JSON.stringify({ ...report, dns: undefined }));
} finally {
  source.verifyUnchanged();
}
