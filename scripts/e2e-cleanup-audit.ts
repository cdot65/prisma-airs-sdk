/** @internal Read-only verification of every journaled live fixture. Never deletes unknown resources. */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import {
  AIGatewayClient,
  ManagementClient,
  ModelSecurityClient,
  RedTeamClient,
  AISecSDKException,
  ErrorType,
} from '../src/index.js';
import { loadLiveCredentials } from './live-credentials.js';
import { LiveHarness } from './e2e/harness.js';
const credentials = loadLiveCredentials();
const h = new LiveHarness();
const mgmt = new ManagementClient({ numRetries: 0 });
const ms = new ModelSecurityClient({ numRetries: 0 });
const rt = new RedTeamClient({ numRetries: 0 });
const gw = new AIGatewayClient({ numRetries: 0 });
type Fixture = { resource: string; id: string; name: string };
const journals = readdirSync('artifacts/e2e')
  .filter((n) => n.startsWith('fixtures-') && n.endsWith('.json'))
  .map((n) => JSON.parse(readFileSync(`artifacts/e2e/${n}`, 'utf8')) as Fixture[]);
const fixtures = [...new Map(journals.flat().map((f) => [`${f.resource}:${f.id}`, f])).values()];
const retired = async (
  read: () => Promise<unknown>,
  accept?: (r: Record<string, unknown>) => boolean,
) => {
  try {
    const result = (await read()) as Record<string, unknown>;
    assert(
      accept?.(result) ||
        result.is_archived === true ||
        result.is_tombstone === true ||
        result.archive === true ||
        result.active === false ||
        result.status === 'archived' ||
        result.status === 'ARCHIVED',
      'Journaled fixture is still active',
    );
    return { state: 'archived-or-inactive' };
  } catch (error) {
    if (
      error instanceof AISecSDKException &&
      (error.statusCode === 404 ||
        (error.errorType === ErrorType.USER_REQUEST_PAYLOAD_ERROR &&
          /(?:Profile|Topic) not found: /.test(error.message)))
    )
      return { state: 'not-found' };
    throw error;
  }
};
try {
  const ownedProfileNames = new Set(
    fixtures.filter((f) => f.resource === 'management.profile').map((f) => f.name),
  );
  const ownedTopicNames = new Set(
    fixtures.filter((f) => f.resource === 'management.topic').map((f) => f.name),
  );
  await h.check('management.implicit-profile-revisions', async () => {
    const profiles = await mgmt.profiles.listAll({ latest: false });
    assert(
      !profiles.some((p) => ownedProfileNames.has(p.profile_name) && p.active !== false),
      'An active owned profile revision remains',
    );
  });
  await h.check('management.implicit-topic-revisions', async () => {
    const topics = await mgmt.topics.listAll();
    assert(
      !topics.some((t) => ownedTopicNames.has(t.topic_name) && t.active !== false),
      'An active owned topic revision remains',
    );
  });
  const keys: { api_key_id: string; revoked: boolean }[] = [];
  let offset: number | undefined;
  const offsets = new Set<number>();
  do {
    const page = await mgmt.apiKeys.listForToken({ limit: 100, offset });
    keys.push(...(page.api_keys ?? []));
    offset = page.next_offset;
    if (offset !== undefined && offset !== 0) {
      assert(!offsets.has(offset), 'API key pagination stalled');
      offsets.add(offset);
    }
  } while (offset !== undefined && offset !== 0);
  const gatewayIntegrations = await gw.integrations.list();
  const mcpIntegrations = await gw.mcpIntegrations.list();
  for (const list of [gatewayIntegrations, mcpIntegrations])
    assert.equal(list.data.length, list.total, 'Active integration inventory must be complete');
  const workspaceInventory = await gw.workspaces.list();
  const serviceKeys: { id: string }[] = [];
  for (const workspace of workspaceInventory.data) {
    const list = await gw.apiKeys.listService({ workspaceId: workspace.id });
    assert.equal(list.data.length, list.total, 'Service key inventory must be complete');
    serviceKeys.push(...list.data);
  }
  const apps: { customer_appId: string }[] = [];
  offset = undefined;
  offsets.clear();
  do {
    const page = await mgmt.customerApps.listForToken({ limit: 100, offset });
    apps.push(...(page.customer_apps ?? []));
    offset = page.next_offset;
    if (offset !== undefined && offset !== 0) {
      assert(!offsets.has(offset));
      offsets.add(offset);
    }
  } while (offset !== undefined && offset !== 0);
  const absentFrom = (rows: { id: string; status?: string }[], id: string) => {
    assert(
      !rows.some((row) => row.id === id && row.status !== 'archived'),
      'Owned fixture remains in the complete active inventory',
    );
    return { state: 'absent-from-complete-active-inventory' };
  };
  const tasks = fixtures.map((f) => async () => {
    const name = `${f.resource}:${f.id}`;
    await h.check(name, async () => {
      switch (f.resource) {
        case 'management.profile':
          return retired(() => mgmt.profiles.get(f.id));
        case 'management.topic':
          return retired(() => mgmt.topics.get(f.id));
        case 'management.api-key':
          assert(!keys.some((k) => k.api_key_id === f.id && !k.revoked));
          return { state: 'absent-or-revoked' };
        case 'management.customer-app':
          assert(!apps.some((app) => app.customer_appId === f.id));
          return { state: 'absent-from-complete-token-inventory' };
        case 'model-security.group':
          return retired(() => ms.securityGroups.get(f.id));
        case 'model-security.custom-rule':
          return retired(() => ms.customRules.get(f.id));
        case 'red-team.target':
          return retired(() => rt.targets.get(f.id));
        case 'red-team.adapter':
          return retired(() => rt.adapters.get(f.id));
        case 'red-team.prompt-set':
          return retired(() => rt.customAttacks.getPromptSet(f.id));
        case 'red-team.prompt': {
          const set = fixtures.find(
            (s) => s.resource === 'red-team.prompt-set' && s.name === f.name,
          );
          assert(set, 'Prompt set ownership must be resolvable');
          return retired(() => rt.customAttacks.getPrompt(set.id, f.id));
        }
        case 'gateway.usage-policy':
          return retired(() => gw.usageLimits.get(f.id));
        case 'gateway.rate-policy':
          return retired(() => gw.rateLimits.get(f.id));
        case 'gateway.secret-reference':
          return retired(() => gw.secretReferences.get(f.id));
        case 'gateway.mcp-integration':
          return absentFrom(mcpIntegrations.data, f.id);
        case 'gateway.mcp-server':
          return retired(() => gw.mcpServers.get(f.id));
        case 'gateway.guardrail':
          return retired(() => gw.guardrails.get(f.id));
        case 'gateway.config':
          return retired(() => gw.configs.get(f.id));
        case 'gateway.integration':
          return absentFrom(gatewayIntegrations.data, f.id);
        case 'gateway.provider':
          return retired(() => gw.providers.get(f.id));
        case 'gateway.service-api-key':
          return absentFrom(serviceKeys, f.id);
        case 'gateway.runtime.files':
        case 'gateway.runtime.vector_stores':
        case 'gateway.runtime.batch-audit-record':
        case 'gateway.runtime.responses': {
          const report = JSON.parse(
            readFileSync('artifacts/e2e/cleanup-runtime-audit.json', 'utf8'),
          ) as { failed: number; results: { name: string; status: string }[] };
          assert.equal(report.failed, 0, 'Runtime cleanup audit must pass');
          assert(
            report.results.some((result) => result.name === name && result.status === 'PASS'),
            'Runtime fixture requires a fresh-key cleanup verification',
          );
          return {
            state:
              f.resource === 'gateway.runtime.batch-audit-record'
                ? 'verified-terminal-audit-record-by-runtime-audit'
                : 'verified-absent-by-runtime-audit',
          };
        }
        case 'gateway.workspace':
          return retired(() => gw.workspaces.get(f.id, { plane: 'admin' }));
        case 'gateway.log-export-audit-record': {
          const value = await gw.logExports.get(f.id);
          assert.notEqual(value.status, 'in_progress');
          return { state: 'retained-audit-record-not-running' };
        }
        case 'gateway.feedback-audit-record':
        case 'gateway.log-audit-record': {
          const report = JSON.parse(
            readFileSync('artifacts/e2e/gateway-observability-audit.json', 'utf8'),
          ) as {
            credentialsUnchanged: boolean;
            results: { name: string; status: string }[];
          };
          assert.equal(report.credentialsUnchanged, true);
          assert(
            report.results.some((result) => result.name === name && result.status === 'PASS'),
            'Synthetic observability record requires independent SCM visibility verification',
          );
          return { state: 'retained-synthetic-observability-record-no-delete-api' };
        }
        case 'red-team.scan-audit-record': {
          const value = await rt.scans.get(f.id);
          assert(
            value.status && ['COMPLETED', 'FAILED', 'CANCELLED', 'ABORTED'].includes(value.status),
          );
          return { state: 'retained-terminal-job' };
        }
        case 'model-security.scan-audit-record':
          await ms.scans.get(f.id);
          return { state: 'retained-synthetic-scan-audit' };
        case 'red-team.network-broker-audit-record': {
          const channel = await rt.networkBroker.getChannel(f.id);
          assert.equal(channel.name, f.name);
          assert.equal(channel.status, 'DRAFT');
          assert.equal(channel.connected_clients_count ?? 0, 0);
          return { state: 'retained-draft-no-delete-api' };
        }
        case 'dlp.pattern':
          return retired(
            () => mgmt.dlp.dataPatterns.get(f.id),
            (row) => row.status === 'deleted',
          );
        case 'dlp.dictionary':
          return retired(
            () => mgmt.dlp.dictionaries.get(f.id),
            (row) => row.status === 'deleted',
          );
        case 'dlp.profile':
          return retired(
            () => mgmt.dlp.dataProfiles.get(f.id),
            (row) => row.profile_status === 'deleted',
          );
        default:
          throw new Error(`No cleanup verifier for ${f.resource}`);
      }
    });
  });
  // Bounded parallelism keeps the audit quick without flooding service quotas.
  let next = 0;
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      while (next < tasks.length) await tasks[next++]();
    }),
  );
  const mcpParents = new Set(
    fixtures.filter((f) => f.resource === 'gateway.mcp-integration').map((f) => f.id),
  );
  for (const workspace of (await gw.workspaces.list()).data)
    await h.check(`gateway.implicit-mcp-servers:${workspace.id}`, async () => {
      let page = 0;
      for (;;) {
        const result = await gw.mcpServers.list({
          workspace_id: workspace.id,
          current_page: page++,
          page_size: 100,
        });
        const rows = result.data ?? [];
        const active = rows.filter(
          (row) => mcpParents.has(String(row.mcp_integration_id)) && row.status !== 'archived',
        );
        assert.equal(
          active.length,
          0,
          'Implicit servers attached to owned deleted integrations remain active',
        );
        if (rows.length < 100) break;
        assert(page < 100, 'MCP server pagination did not terminate');
      }
      return { state: 'no-active-owned-implicit-servers' };
    });
} catch (error) {
  await h.check('harness.unexpected', async () => {
    throw error;
  });
} finally {
  credentials.verifyUnchanged();
  h.finish('cleanup-audit', true);
}
