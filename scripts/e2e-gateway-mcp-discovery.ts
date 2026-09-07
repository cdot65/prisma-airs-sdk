/** @internal Populate capabilities through discovery on an owned clone. Never invokes MCP tools. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runtimeSuite } from './e2e/gateway-runtime.js';
import { type McpHttpObservation } from './e2e/mcp-discovery-fetch.js';
import { observeGatewayFixtures } from './e2e/gateway-fixtures.js';
import { writePrivateReport } from './e2e/harness.js';

import { exerciseOwnedMcp } from './e2e/owned-mcp.js';

const suite = 'gateway-mcp-discovery';
assert.equal(process.env.E2E_GATEWAY_WORKSPACE ?? 'ws-develo-71f8d8', 'ws-develo-71f8d8');
const sourceUrl = process.env.E2E_MCP_SOURCE_URL ?? 'https://scm-ngfw-mcp.cdot.io/mcp';
assert(
  [
    'https://scm-ngfw-mcp.cdot.io/mcp',
    'https://panw-mcp.cdot.io/mcp',
    'http://clippy-mcp.cdot.io:8080/mcp',
  ].includes(sourceUrl),
  'MCP source must be an established credential-free integration endpoint',
);
const http: McpHttpObservation[] = [];
const observations: Record<string, unknown> = {
  http,
  toolsInvoked: 0,
  sourceHost: new URL(sourceUrl).hostname,
};
const finishFixtures = observeGatewayFixtures(suite);
try {
  await runtimeSuite(
    suite,
    async (context) => {
      const { harness: h, management: gw } = context;
      const integrations = await gw.mcpIntegrations.list();
      const source = integrations.data.find((item) => {
        const url = new URL(item.url);
        return item.auth_type === 'none' && item.transport === 'http' && url.href === sourceUrl;
      });
      assert(source, 'An established, exact, credential-free MCP source is required');
      const sourceDetail = await gw.mcpIntegrations.get(source.id);
      h.protect(sourceDetail);
      assert.equal(sourceDetail.url, sourceUrl);
      assert.equal(sourceDetail.auth_type, 'none');
      assert.equal(
        sourceDetail.secret_mappings?.length ?? 0,
        0,
        'Unresolved source secret mappings are not copied',
      );
      await exerciseOwnedMcp(
        context,
        { url: source.url, configurations: sourceDetail.configurations },
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
