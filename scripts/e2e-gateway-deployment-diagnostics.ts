/** @internal Read-only, source-fingerprinted reproduction of the deployed storage limitations. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { loadLiveCredentials } from './live-credentials.js';
import { LiveHarness, writePrivateReport } from './e2e/harness.js';

const credentials = loadLiveCredentials();
const harness = new LiveHarness();
const namespace = 'airs-gw';
const deploymentName = 'airs-gw';
const image = 'registry.portkey.ai/airsgw/gateway_enterprise:2.20.0';
const bundleSha256 = 'b2710c4f6a580a5a1bb525695f942175e4698d61a0c90ba066c48f93490f6331';
interface Resource {
  metadata: {
    name: string;
    uid: string;
    generation?: number;
    ownerReferences?: { uid: string; controller?: boolean }[];
  };
  spec: {
    selector?: { matchLabels: Record<string, string> };
    containers?: { name: string; image: string }[];
    template?: { spec: { containers: { name: string; image: string }[] } };
  };
  status: {
    observedGeneration?: number;
    readyReplicas?: number;
    availableReplicas?: number;
    containerStatuses?: { name: string; ready: boolean }[];
  };
}
function kubectl(args: string[]): string {
  return execFileSync('kubectl', ['--request-timeout=10s', '-n', namespace, ...args], {
    encoding: 'utf8',
    timeout: 20_000,
    maxBuffer: 4 * 1024 * 1024,
  });
}
const get = (kind: string, name?: string): Resource | { items: Resource[] } =>
  JSON.parse(kubectl(['get', kind, ...(name ? [name] : []), '-o', 'json']));
const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const observations: unknown[] = [];

// Evaluate reviewed, hash-pinned storage functions and a synthetic realtime wait expression.
// Never import/run the server bundle, use its credentials, or invoke its network/database clients.
const remoteProbe = `
const fs = require('node:fs');
const crypto = require('node:crypto');
const vm = require('node:vm');
const assert = require('node:assert/strict');
(async () => {
  const source = fs.readFileSync('/app/build/start-server.js', 'utf8');
  const hash = crypto.createHash('sha256').update(source).digest('hex');
  assert.equal(hash, ${JSON.stringify(bundleSha256)}, 'Changed image code requires a fresh manual review');
  for (const route of ['/v1/completions', '/v1/prompts/:promptId/completions', '/v1/prompts/:promptId/render'])
    assert(source.includes('.post(' + JSON.stringify(route) + ','));
  assert(source.includes('return"chatComplete"===t?eN(e):"complete"===t?tN(e)'));
  assert(source.includes('.post("/v1/chat/completions",'));
  const authoringPaths = ['/collections', '/labels', '/prompts', '/prompts/partials'];
  const explicitAuthoringReadRoutes = authoringPaths.filter(path =>
    source.includes('.get(' + JSON.stringify('/v1' + path) + ','));
  assert.deepEqual(explicitAuthoringReadRoutes, []);
  assert(source.includes('U$.get("/v1/:path{(?!realtime).*}",xU([yr.WRITE]),rN.bind({fn:"proxy"}),ZC)'));
  const middlewareStart = source.indexOf('const rN=function(');
  const middlewareEnd = source.indexOf(';const nN=', middlewareStart);
  assert(middlewareStart > 0 && middlewareEnd > middlewareStart);
  const proxyPreflight = vm.runInNewContext('(' + source.slice(
    middlewareStart + 'const rN='.length, middlewareEnd) + ')', {
    Response, Me: 'portkey', mr: ['openai'], hr: {}, je: {},
    Uo: () => ({ valid: true }),
  }, { timeout: 500 });
  let nextCalls = 0;
  const missingProvider = proxyPreflight.call({ fn: 'proxy' }, {
    get: key => { assert.equal(key, 'mappedHeaders'); return {}; },
  }, () => { nextCalls++; });
  assert.equal(missingProvider.status, 400);
  const missingProviderMessage = (await missingProvider.json()).message;
  assert.equal(missingProviderMessage, 'Either x-portkey-config or x-portkey-provider header is required');
  assert.equal(nextCalls, 0);
  proxyPreflight.call({ fn: 'proxy' }, {
    get: key => { assert.equal(key, 'mappedHeaders'); return { 'x-portkey-provider': 'openai' }; },
  }, () => { nextCalls++; });
  assert.equal(nextCalls, 1);
  // The synthetic continuation above is not the provider proxy or a network/database call.
  const realtimeStart = source.indexOf('if(AM){const{injectWebSocket');
  assert(realtimeStart > 0);
  const realtime = source.slice(realtimeStart, source.indexOf('const i=(e,t)=>sR', realtimeStart));
  assert(realtime.includes('U$.get("/v1/realtime",xU([yr.WRITE]),rN,r('));
  assert(realtime.includes('s.replace(/@[^/]+\\\\//,""))'));
  const waitStart = realtime.indexOf('const m=new Promise(');
  const waitEnd = realtime.indexOf(';return await m,', waitStart);
  assert(waitStart > 0 && waitEnd > waitStart);
  const socketListeners = {};
  const pending = vm.runInNewContext(realtime.slice(waitStart + 'const m='.length, waitEnd), {
    d: { addEventListener: (name, listener) => { socketListeners[name] = listener; } },
  }, { timeout: 500 });
  let settled = false;
  pending.then(() => { settled = true; }, () => { settled = true; });
  socketListeners.error?.({});
  socketListeners.close?.({});
  await Promise.resolve();
  assert.equal(settled, false);
  assert.deepEqual(Object.keys(socketListeners), ['open']);
  socketListeners.open();
  assert.equal(await pending, true);
  assert.equal(process.env.ANALYTICS_STORE, 'control_plane');
  assert.equal(process.env.LOG_STORE, 'control_plane');
  const cut = (start, end) => {
    const from = source.indexOf(start);
    const to = source.indexOf(end, from + start.length);
    assert(from >= 0 && to > from);
    return source.slice(from, to);
  };
  const logFunction = cut('async function sC(', 'async function cC(');
  assert(!logFunction.includes('Sm.CONTROL_PLANE'));
  const getLog = vm.runInNewContext('(' + logFunction + ')', {
    kn: () => ({ LOG_STORE: 'control_plane' }),
    Sm: { MONGO: 'mongo', WASABI: 'wasabi', S3: 's3', S3_ASSUME: 's3_assume',
      GOOGLE_CLOUD_STORAGE: 'gcs', GOOGLE_CLOUD_STORAGE_ASSUME: 'gcs_assume',
      AZURE_STORAGE: 'azure', NETAPP: 'netapp', S3_CUSTOM: 's3_custom' },
  }, { timeout: 500 });
  let logReadError;
  try { await getLog({}, 0, 'synthetic-log-id', {}); } catch (error) { logReadError = error.message; }
  assert.equal(logReadError, 'Invalid Log Storage');
  const feedbackFunction = cut('LN=async', ',$N=').slice(3);
  const readFeedback = vm.runInNewContext('(' + feedbackFunction + ')', {
    NN: () => undefined, DE: () => null, wn: { error: () => undefined },
  }, { timeout: 500 });
  const feedback = await readFeedback({}, 'feedbacks', 'synthetic-org', 'synthetic-feedback');
  const feedbackReadError = feedback.err?.message;
  assert.equal(feedbackReadError, 'ClickHouse client not initialized');
  assert(source.includes('if("clickhouse"!==(kn({}).ANALYTICS_STORE||"control_plane"))return;'));
  const handler = cut('async function BN(', 'function KN(');
  assert(handler.includes('const o=await LN(r,i.feedbackTable,i.organisationDetails.id,e);if(o.err)return jN("failure",500'));
  const logHandler = cut('async function vU(', 'const xU=');
  assert(logHandler.includes('await sC(') && logHandler.includes('status:500'));
  console.log(JSON.stringify({ bundleSha256: hash, analyticsStore: 'control_plane',
    logStore: 'control_plane', feedbackReadError, logReadError,
    feedbackHandlerReturns500OnReadError: true, logHandlerReturns500OnReadError: true,
    clickhouseInitializationSkipped: true, networkOrDatabaseCalls: 0,
    promptRuntimeRoutesRegistered: true, promptCompletionUsesNativeHandlers: true,
    runtimeAuthoringExplicitReadRoutes: explicitAuthoringReadRoutes,
    runtimeProviderProxyFallbackRegistered: true,
    runtimeAuthoringMissingProviderStatus: missingProvider.status,
    runtimeAuthoringMissingProviderMessage: missingProviderMessage,
    runtimeAuthoringProviderPreflightContinues: true,
    realtimeRouteRegistered: true, realtimeProviderPrefixRemoved: true,
    realtimeWaitOnlyResolvesOnOpen: true }));
})().catch(() => { console.error('Pinned deployment diagnostic failed; no secret or source dump emitted.'); process.exitCode = 1; });
`;

try {
  const before = get('deployment', deploymentName) as Resource;
  const specHash = digest(before.spec);
  await harness.check('deployment-diagnostics.health', async () => {
    assert.equal(before.status.observedGeneration, before.metadata.generation);
    assert.equal(before.status.readyReplicas, 2);
    assert.equal(before.status.availableReplicas, 2);
    assert(
      before.spec.template?.spec.containers.some((c) => c.name === 'airs-gw' && c.image === image),
    );
    return { readyReplicas: 2, availableReplicas: 2, image };
  });
  const replicaSets = (get('replicasets') as { items: Resource[] }).items.filter((r) =>
    r.metadata.ownerReferences?.some(
      (owner) => owner.controller && owner.uid === before.metadata.uid,
    ),
  );
  const ownerIds = new Set(replicaSets.map((r) => r.metadata.uid));
  const pods = (get('pods') as { items: Resource[] }).items;
  const targets = pods
    .filter(
      (pod) =>
        pod.metadata.ownerReferences?.some(
          (owner) => owner.controller && ownerIds.has(owner.uid),
        ) && pod.spec.containers?.some((c) => c.name === 'airs-gw' && c.image === image),
    )
    .sort((a, b) => a.metadata.name.localeCompare(b.metadata.name));
  const isolated = await harness.check('deployment-diagnostics.target-isolation', async () => {
    assert.equal(targets.length, 2);
    assert(
      targets.every((pod) =>
        pod.status.containerStatuses?.some((c) => c.name === 'airs-gw' && c.ready),
      ),
    );
    assert(targets.every((pod) => !pod.spec.containers?.some((c) => c.name === 'redis')));
    return true;
  });
  assert(isolated, 'Do not exec a generic deployment selector or an unverified pod/container');
  for (const [index, pod] of targets.entries()) {
    await harness.check(
      `deployment-diagnostics.replica-${index + 1}.storage-reproduction`,
      async () => {
        const result: unknown = JSON.parse(
          kubectl(['exec', pod.metadata.name, '-c', 'airs-gw', '--', 'node', '-e', remoteProbe]),
        );
        observations.push(result);
        return result;
      },
    );
  }
  await harness.check('deployment-diagnostics.configuration-unchanged', async () => {
    assert.equal(digest((get('deployment', deploymentName) as Resource).spec), specHash);
    return { configurationUnchanged: true };
  });
} catch (error) {
  await harness.check('deployment-diagnostics.prerequisites', async () => {
    throw error;
  });
} finally {
  credentials.verifyUnchanged();
  harness.finish('gateway-deployment-diagnostics', true);
  writePrivateReport('artifacts/e2e/gateway-deployment-diagnostics-evidence.json', {
    startedAt: harness.startedAt,
    checkedAt: new Date().toISOString(),
    image,
    bundleSha256,
    observations,
    mutations: false,
    credentialsUnchanged: true,
    disclosure:
      'Read-only Kubernetes metadata and exact Deployment-owned pod/container execution. Only reviewed pure functions from the pinned deployed bundle were evaluated with synthetic dependencies; the server bundle, live clients, credentials and database/network operations were not invoked. Passing diagnostics reproduce limitations, not successful SDK operations.',
  });
}
