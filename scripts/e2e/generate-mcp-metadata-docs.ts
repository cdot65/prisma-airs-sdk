/** @internal Render reviewed actual MCP metadata results, including failures, into examples. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = new URL('../../', import.meta.url);
export function mcpMetadataSection(): string {
  const read = (name: string) =>
    JSON.parse(readFileSync(new URL(`artifacts/e2e/${name}.json`, root), 'utf8'));
  const suite = read('gateway-mcp-metadata');
  const observed = read('gateway-mcp-metadata-observations');
  const audit = read('gateway-mcp-fixture-audit');
  const runtime = read('gateway-mcp-runtime-diagnostics');
  assert.equal(suite.credentialsUnchanged, true);
  assert.equal(suite.total, suite.results.length);
  for (const [status, count] of [
    ['PASS', suite.passed],
    ['FAIL', suite.failed],
    ['SKIP', suite.skipped],
  ])
    assert.equal(
      suite.results.filter((item: { status: string }) => item.status === status).length,
      count,
    );
  assert.equal(suite.passed, 18);
  assert.equal(suite.failed, 2);
  assert.equal(suite.skipped, 0);
  assert.deepEqual(
    suite.results
      .filter((item: { status: string }) => item.status === 'FAIL')
      .map((item: { name: string }) => item.name),
    [
      'mcp.metadata.resource.list-without-execution',
      'mcp.metadata.resource_template.match-populated-SCM-capability',
    ],
  );
  assert.equal(observed.finishedAt, suite.finishedAt);
  assert.equal(observed.passed, false);
  assert.deepEqual(observed.selectedKinds, ['prompt']);
  assert.deepEqual(observed.variants.prompt.scmStates, [false, true]);
  assert.deepEqual(observed.variants.prompt.runtimeStates, [false, true]);
  assert.deepEqual(observed.variants.prompt.runtimeCounts, [6, 5, 6]);
  for (const field of ['toolsInvoked', 'promptsRetrieved', 'resourcesRead'])
    assert.equal(observed[field], 0);
  assert.equal(observed.discovery.resource.scmTotal, 11);
  assert.equal(observed.discovery.resource_template.runtimeCount, 3);
  assert.equal(observed.discovery.resource_template.scmTotal, 0);
  assert.equal(observed.discovery.resource_template.scmAttempts, 10);
  assert.equal(observed.discovery.resource.validationIssues.length, 11);
  for (const issue of observed.discovery.resource.validationIssues) {
    assert.deepEqual(
      [issue.path[0], issue.path[2], issue.code, issue.expected],
      ['resources', 'name', 'invalid_type', 'string'],
    );
  }
  assert.equal(observed.preflight.sessionTerminationStatus, 405);
  assert.equal(observed.preflight.sessionRetirement, 'server-controlled');
  assert.equal(audit.credentialsUnchanged, true);
  assert.equal(audit.failed, 0);
  assert.equal(audit.passed, audit.total);
  assert(Date.parse(audit.finishedAt) > Date.parse(suite.finishedAt));
  assert.equal(runtime.mutations, false);
  assert.equal(runtime.rawSourceRetained, false);
  assert.equal(runtime.replicas.length, 2);
  assert(
    runtime.replicas.every(
      (item: { resourceResultRemovesName: boolean; resourceTemplateDirectPassthrough: boolean }) =>
        item.resourceResultRemovesName && item.resourceTemplateDirectPassthrough,
    ),
  );
  const evidence = {
    finishedAt: suite.finishedAt,
    passed: suite.passed,
    failed: suite.failed,
    skipped: suite.skipped,
    credentialsUnchanged: suite.credentialsUnchanged,
    anonymousPreflight: {
      finishedAt: observed.preflight.finishedAt,
      prompt: observed.preflight.prompt,
      resource: observed.preflight.resource,
      resource_template: observed.preflight.resource_template,
      sessionTerminationStatus: observed.preflight.sessionTerminationStatus,
      sessionRetirement: observed.preflight.sessionRetirement,
    },
    discovery: observed.discovery,
    selectedKinds: observed.selectedKinds,
    variants: observed.variants,
    toolsInvoked: observed.toolsInvoked,
    promptsRetrieved: observed.promptsRetrieved,
    resourcesRead: observed.resourcesRead,
    independentFixtureAudit: {
      finishedAt: audit.finishedAt,
      passed: audit.passed,
      failed: audit.failed,
    },
    runtimeDiagnosis: runtime,
  };
  const section = `## MCP prompt, resource and template verification

Captured **${suite.finishedAt}**: **${suite.passed} pass / ${suite.failed} fail / ${suite.skipped} skip**, with unchanged credentials. This source-checkout test uses one disposable dev-only integration/server and service key. The [World Monitor upstream](https://github.com/koala73/worldmonitor/blob/main/public/mcp-server.md) allows anonymous metadata discovery; no upstream account, identity forwarding, model call, tool execution, prompt retrieval or resource-content read is involved.

Prompt capability updates pass: SCM and runtime both observe disable/re-enable, with **6 → 5 → 6** visible prompts and unrelated prompts preserved. The test allows the Gateway's natural cache expiry rather than flushing shared caches. Resource discovery fails official MCP validation because all eleven returned resources lack their required \`name\`; SCM separately contains eleven resource capabilities. All three resource templates are visible at runtime, but SCM remains empty after ten bounded inventory reads. Neither resource variant is live-certified.

A read-only inspection of both deployed **2.20.0** replicas ties these observations to the same hashed bundle: the resource-filter response mapping removes \`name\`, and template discovery directly forwards upstream without the capability synchronization used for prompts/resources. No gateway image, policy, cache or infrastructure configuration was changed. The SDK does not fabricate missing names or infer template-update support from a successful list response.

The anonymous upstream returns **HTTP 405** for session DELETE. That is allowed by the [MCP session-management specification](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#session-management); the report records **server-controlled** retirement, not confirmed deletion. The first preflight incorrectly required 2xx and stopped before loading SCM credentials; that failed attempt is retained. Local transports are closed. Gateway-owned fixture cleanup and the later independent **${audit.passed}/${audit.total}** inventory audit pass, including prior public/synthetic/metadata attempts and implicit servers.

<details>
<summary>Actual MCP metadata results and field-level diagnostics</summary>

\`\`\`json
${JSON.stringify(evidence, null, 2)}
\`\`\`

</details>

Reproduce with \`npx tsx scripts/e2e-gateway-mcp-metadata.ts --writes\`, followed by \`npx tsx scripts/e2e-gateway-mcp-fixture-audit.ts\`, using the documented process-only DNS accommodation. The metadata command exits nonzero for the two failures. \`scripts/e2e-gateway-mcp-runtime-diagnostics.ts\` performs the hash-bound, read-only deployment inspection. These are verification tools, not new OpenAPI operations; SDK **0.25.0**, CLI **4.4.0**, direct Gateway **138/242** and the full-scope **5/10** assessment are unchanged.

`;
  return section;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const section = mcpMetadataSection();
  const destination = new URL('docs-site/docs/guides/examples.mdx', root);
  const original = readFileSync(destination, 'utf8');
  const start = original.indexOf('## MCP prompt, resource and template verification');
  const anchor = '## AI Gateway inference output';
  const end = original.indexOf(anchor);
  assert(end >= 0 && (start < 0 || start < end));
  const previous = original.slice(start >= 0 ? start : end, end) + anchor;
  console.log(
    `*** Begin Patch\n*** Update File: ${fileURLToPath(destination)}\n@@\n${previous
      .split('\n')
      .map((line) => '-' + line)
      .join('\n')}\n${(section + anchor)
      .split('\n')
      .map((line) => '+' + line)
      .join('\n')}\n*** End Patch`,
  );
}
