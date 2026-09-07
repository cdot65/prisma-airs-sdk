/** @internal Public metadata upstream, dev-owned capability toggles, no content/tool execution. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { runtimeSuite } from './e2e/gateway-runtime.js';
import { exerciseOwnedMcp } from './e2e/owned-mcp.js';
import { discoveryFetch, type McpHttpObservation } from './e2e/mcp-discovery-fetch.js';
import { anonymousSessionTermination, listMcpMetadata, metadataKinds } from './e2e/mcp-metadata.js';
import { observeGatewayFixtures } from './e2e/gateway-fixtures.js';
import { writePrivateReport } from './e2e/harness.js';

const suite = 'gateway-mcp-metadata';
assert(process.argv.includes('--writes'), 'Pass --writes for the disposable dev fixture');
assert.equal(process.env.E2E_GATEWAY_WORKSPACE ?? 'ws-develo-71f8d8', 'ws-develo-71f8d8');
// Primary upstream documentation: https://github.com/koala73/worldmonitor/blob/main/public/mcp-server.md
// Anonymous discovery only. No OAuth, API key, caller identity, content reads or tool invocation.
const source = { url: 'https://worldmonitor.app/mcp', configurations: {} };
const upstreamHttp: McpHttpObservation[] = [];
const upstreamTransport = new StreamableHTTPClientTransport(new URL(source.url), {
  fetch: discoveryFetch(new URL(source.url), upstreamHttp),
  reconnectionOptions: {
    maxRetries: 0,
    initialReconnectionDelay: 1000,
    maxReconnectionDelay: 1000,
    reconnectionDelayGrowFactor: 1,
  },
});
const upstream = new Client(
  { name: 'prisma-airs-sdk-anonymous-metadata-preflight', version: '0.25.0' },
  { capabilities: {} },
);
const preflight: Record<string, unknown> = {
  startedAt: new Date().toISOString(),
  http: upstreamHttp,
  credentialsLoaded: false,
};
try {
  await upstream.connect(upstreamTransport, { timeout: 20_000, maxTotalTimeout: 20_000 });
  preflight.protocolVersion = upstreamTransport.protocolVersion;
  for (const kind of metadataKinds) {
    const metadata = await listMcpMetadata(upstream, kind);
    assert(metadata.length > 0, 'Anonymous upstream must expose each required metadata variant');
    preflight[kind] = metadata.length;
  }
} finally {
  try {
    preflight.sessionIssued = !!upstreamTransport.sessionId;
    if (upstreamTransport.sessionId) {
      await upstreamTransport.terminateSession();
      const deletion = [...upstreamHttp].reverse().find((item) => item.method === 'DELETE');
      preflight.sessionRetirement = anonymousSessionTermination(deletion?.status);
      preflight.sessionTerminationStatus = deletion?.status;
    }
  } finally {
    await upstream.close();
    preflight.finishedAt = new Date().toISOString();
    writePrivateReport(`artifacts/e2e/${suite}-preflight.json`, preflight);
    writePrivateReport(
      `artifacts/e2e/history/${suite}-preflight-${String(preflight.startedAt).replaceAll(':', '-')}.json`,
      preflight,
    );
  }
}
const http: McpHttpObservation[] = [];
const observations: Record<string, unknown> = {
  preflight,
  http,
  publicReferenceUpstream: true,
  toolsInvoked: 0,
  promptsRetrieved: 0,
  resourcesRead: 0,
};
const finishFixtures = observeGatewayFixtures(suite);
try {
  await runtimeSuite(
    suite,
    (context) => exerciseOwnedMcp(context, source, observations, http, { metadataVariants: true }),
    { requiredScopes: ['mcp.invoke'] },
  );
} finally {
  finishFixtures();
}
const report = JSON.parse(readFileSync(`artifacts/e2e/${suite}.json`, 'utf8')) as {
  startedAt: string;
  finishedAt: string;
  failed: number;
  credentialsUnchanged: boolean;
};
const evidence = {
  ...observations,
  finishedAt: report.finishedAt,
  passed: report.failed === 0 && report.credentialsUnchanged,
};
writePrivateReport(`artifacts/e2e/${suite}-observations.json`, evidence);
writePrivateReport(
  `artifacts/e2e/history/${suite}-observations-${report.startedAt.replaceAll(':', '-')}.json`,
  evidence,
);
