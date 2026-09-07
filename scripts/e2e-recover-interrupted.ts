/** @internal Retire only fixtures from explicitly selected, interrupted test journals. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { AIGatewayClient, RedTeamClient, AISecSDKException } from '../src/index.js';
import { loadLiveCredentials } from './live-credentials.js';
import { LiveHarness } from './e2e/harness.js';
import { deleteSyntheticKubeObject, syntheticKubeKind } from './e2e/synthetic-mcp-kubernetes.js';

const source = loadLiveCredentials();
const h = new LiveHarness();
const gw = new AIGatewayClient({ numRetries: 0 });
const rt = new RedTeamClient({ numRetries: 0 });
type Fixture = { resource: string; id: string; name: string };
const journals = process.argv.slice(2).filter((arg) => arg !== '--writes');
assert(
  process.argv.includes('--writes') && journals.length,
  'Pass --writes and exact journal basenames',
);
const fixtures = journals.flatMap((name) => {
  assert(/^fixtures-[0-9TZ.:-]+\.json$/.test(name), 'Expected a fixture journal basename');
  return JSON.parse(readFileSync(`artifacts/e2e/${name}`, 'utf8')) as Fixture[];
});
const absent = (error: unknown) => error instanceof AISecSDKException && error.statusCode === 404;
async function retire(f: Fixture, read: () => Promise<unknown>, remove: () => Promise<unknown>) {
  let row: Record<string, unknown>;
  try {
    row = (await read()) as Record<string, unknown>;
  } catch (error) {
    if (absent(error)) return { state: 'already-absent' };
    throw error;
  }
  const name = row.name ?? row.description;
  assert(typeof name === 'string' && name.startsWith(f.name), 'Ownership name mismatch');
  if (row.is_archived === true || row.archive === true || row.active === false)
    return { state: 'already-retired' };
  await remove();
  return { state: 'retired' };
}
try {
  for (const f of [...fixtures].reverse()) {
    const kind = syntheticKubeKind(f.resource);
    if (kind) {
      await h.check(`recover.${f.resource}:${f.id}`, () =>
        deleteSyntheticKubeObject(kind, f.name, f.id),
      );
      continue;
    }
    const runtimeMcpFixture =
      ['gateway.service-api-key', 'gateway.mcp-integration', 'gateway.mcp-server'].includes(
        f.resource,
      ) && /^sdk-e2e-inference-[a-f0-9]{8}(?:-(?:mcp|integration))?$/.test(f.name);
    assert(
      /^sdk-e2e-[a-f0-9]{8}$/.test(f.name) || runtimeMcpFixture,
      'Only uniquely named SDK fixtures may be retired',
    );
    await h.check(`recover.${f.resource}:${f.id}`, async () => {
      switch (f.resource) {
        case 'gateway.service-api-key':
          return retire(
            f,
            async () => {
              const key = await gw.apiKeys.getService(f.id);
              h.protect(key);
              return key;
            },
            () => gw.apiKeys.deleteService(f.id),
          );
        case 'red-team.scan-audit-record': {
          const row = await rt.scans.get(f.id);
          assert.equal(row.name, f.name);
          if (!['COMPLETED', 'FAILED', 'ABORTED'].includes(row.status ?? ''))
            await rt.scans.abort(f.id);
          return { state: 'terminal-or-aborted-audit-record' };
        }
        case 'red-team.prompt': {
          const parent = fixtures.find(
            (p) => p.resource === 'red-team.prompt-set' && p.name === f.name,
          );
          assert(parent, 'Owned prompt-set journal is required');
          try {
            await rt.customAttacks.getPrompt(parent.id, f.id);
          } catch (e) {
            if (absent(e)) return;
            throw e;
          }
          return rt.customAttacks.deletePrompt(parent.id, f.id);
        }
        case 'red-team.prompt-set':
          return retire(
            f,
            () => rt.customAttacks.getPromptSet(f.id),
            () => rt.customAttacks.archivePromptSet(f.id, { archive: true }),
          );
        case 'red-team.target':
          return retire(
            f,
            () => rt.targets.get(f.id),
            () => rt.targets.delete(f.id),
          );
        case 'red-team.adapter':
          return retire(
            f,
            () => rt.adapters.get(f.id),
            () => rt.adapters.delete(f.id),
          );
        case 'gateway.log-export-audit-record': {
          const row = await gw.logExports.get(f.id);
          assert(row.description?.startsWith(f.name));
          if (row.status === 'in_progress') await gw.logExports.cancel(f.id);
          return { state: 'non-running-audit-record' };
        }
        case 'gateway.guardrail':
          return retire(
            f,
            () => gw.guardrails.get(f.id),
            () => gw.guardrails.delete(f.id),
          );
        case 'gateway.mcp-server':
          return retire(
            f,
            () => gw.mcpServers.get(f.id),
            () => gw.mcpServers.delete(f.id),
          );
        case 'gateway.mcp-integration': {
          // SCM can return 403 for deleted integration IDs. Only a complete active
          // inventory can prove absence; never interpret the denial as deletion.
          const inventory = await gw.mcpIntegrations.list();
          assert.equal(inventory.data.length, inventory.total, 'Incomplete integration inventory');
          const current = inventory.data.find((item) => item.id === f.id);
          if (!current) return { state: 'absent-from-complete-inventory' };
          return retire(
            f,
            async () => current,
            () => gw.mcpIntegrations.delete(f.id),
          );
        }
        case 'gateway.rate-policy':
          return retire(
            f,
            () => gw.rateLimits.get(f.id),
            () => gw.rateLimits.delete(f.id),
          );
        case 'gateway.usage-policy':
          return retire(
            f,
            () => gw.usageLimits.get(f.id),
            () => gw.usageLimits.delete(f.id),
          );
        default:
          throw new Error(
            'Unsupported recovery resource; review its lifecycle before adding a handler',
          );
      }
    });
  }
} finally {
  source.verifyUnchanged();
  h.finish('recover-interrupted', true);
}
