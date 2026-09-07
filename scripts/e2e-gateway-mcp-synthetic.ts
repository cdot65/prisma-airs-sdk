/** @internal Real gateway lifecycle using a disposable synthetic upstream; not existing-source certification. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runtimeSuite } from './e2e/gateway-runtime.js';
import { exerciseOwnedMcp } from './e2e/owned-mcp.js';
import { createSyntheticMcpUpstream, syntheticMcpMetrics } from './e2e/synthetic-mcp-kubernetes.js';
import { observeGatewayFixtures } from './e2e/gateway-fixtures.js';
import { writePrivateReport } from './e2e/harness.js';
import type { McpHttpObservation } from './e2e/mcp-discovery-fetch.js';

const suite = 'gateway-mcp-synthetic';
assert.equal(process.env.E2E_GATEWAY_WORKSPACE ?? 'ws-develo-71f8d8', 'ws-develo-71f8d8');
const http: McpHttpObservation[] = [];
const observations: Record<string, unknown> = { http, syntheticUpstream: true };
const finishFixtures = observeGatewayFixtures(suite);
try {
  await runtimeSuite(
    suite,
    async (context) => {
      const upstream = await context.harness.check('synthetic-upstream.ready', () =>
        createSyntheticMcpUpstream(context.harness, context.tag),
      );
      assert(upstream, 'A ready owned upstream is required');
      // Runs before infrastructure retirement even if discovery fails.
      context.harness.defer('synthetic-upstream.no-tool-execution', async () => {
        const metrics = await syntheticMcpMetrics(upstream.name, upstream.podUid);
        observations.upstream = metrics;
        return metrics;
      });
      await exerciseOwnedMcp(
        context,
        { url: upstream.url, configurations: {} },
        observations,
        http,
      );
    },
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
