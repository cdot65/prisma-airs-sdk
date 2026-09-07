/** @internal Read-only, hash-bound inspection of deployed MCP resource handling; no raw source retained. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { writePrivateReport } from './e2e/harness.js';

const kubectl = (args: string[]) =>
  execFileSync('kubectl', args, { encoding: 'utf8', timeout: 20_000, maxBuffer: 1024 * 1024 });
const inventory = JSON.parse(
  kubectl(['get', 'pods', '-n', 'airs-gw', '-l', 'app.kubernetes.io/name=airs-gw', '-o', 'json']),
) as {
  items: { metadata: { name: string }; spec: { containers: { name: string; image: string }[] } }[];
};
// The chart's name label also selects Redis. Only the established Gateway container
// belongs to this source inspection; do not execute application diagnostics in Redis.
const gatewayPods = inventory.items.filter((pod) =>
  pod.spec.containers.some((container) => container.name === 'airs-gw'),
);
assert.equal(
  gatewayPods.length,
  2,
  'Re-review the deployment before inspecting a changed replica set',
);
const inspect = `const fs = require('fs'), crypto = require('crypto');
const source = fs.readFileSync('/app/build/start-server.js', 'utf8');
console.log(JSON.stringify({
  sha256: crypto.createHash('sha256').update(source).digest('hex'),
  resourceFilterReplacesNameWithUri: source.includes('t.resources.map((e=>({...e,name:e.uri})))'),
  resourceResultRemovesName: source.includes('t.resources=n.map((({name:e,...t})=>t))'),
  resourceTemplateDirectPassthrough: source.includes('"resources/templates/list":()=>this.upstream.listResourceTemplates(e.params)'),
  resourceTemplateSyncTypeLiteralPresent: source.includes('type:"resource_template"')
}));`;
const replicas = gatewayPods.map((pod, index) => {
  const container = pod.spec.containers.find((item) => item.name === 'airs-gw');
  assert.equal(container?.image, 'registry.portkey.ai/airsgw/gateway_enterprise:2.20.0');
  const evidence = JSON.parse(
    kubectl([
      'exec',
      '-n',
      'airs-gw',
      pod.metadata.name,
      '-c',
      'airs-gw',
      '--',
      'node',
      '-e',
      inspect,
    ]),
  );
  assert.equal(evidence.sha256, 'b2710c4f6a580a5a1bb525695f942175e4698d61a0c90ba066c48f93490f6331');
  assert.equal(evidence.resourceFilterReplacesNameWithUri, true);
  assert.equal(evidence.resourceResultRemovesName, true);
  assert.equal(evidence.resourceTemplateDirectPassthrough, true);
  assert.equal(evidence.resourceTemplateSyncTypeLiteralPresent, false);
  return { replica: index + 1, imageVersion: '2.20.0', ...evidence };
});
const report = {
  checkedAt: new Date().toISOString(),
  mutations: false,
  credentialsLoaded: false,
  rawSourceRetained: false,
  replicas,
};
writePrivateReport('artifacts/e2e/gateway-mcp-runtime-diagnostics.json', report);
console.log(JSON.stringify(report));
