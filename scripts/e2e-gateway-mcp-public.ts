/** @internal Gateway discovery with a documented public metadata-only upstream; no tool calls. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runtimeSuite } from './e2e/gateway-runtime.js';
import { exerciseOwnedMcp } from './e2e/owned-mcp.js';
import { observeGatewayFixtures } from './e2e/gateway-fixtures.js';
import { writePrivateReport } from './e2e/harness.js';
import type { McpHttpObservation } from './e2e/mcp-discovery-fetch.js';

const suite = 'gateway-mcp-public';
assert.equal(process.env.E2E_GATEWAY_WORKSPACE ?? 'ws-develo-71f8d8', 'ws-develo-71f8d8');
// Official public/no-auth endpoint: https://learn.microsoft.com/en-us/training/support/mcp
// Empty configuration forwards no caller credentials, identity or custom headers upstream.
const source = { url: 'https://learn.microsoft.com/api/mcp', configurations: {} };
const http: McpHttpObservation[] = [];
const observations: Record<string, unknown> = {
  http,
  publicReferenceUpstream: true,
  toolsInvoked: 0,
};
const finishFixtures = observeGatewayFixtures(suite);
try {
  await runtimeSuite(suite, (context) => exerciseOwnedMcp(context, source, observations, http), {
    requiredScopes: ['mcp.invoke'],
  });
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
