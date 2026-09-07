/** @internal Live typed CRUD of an owned unbound reference, with pre-validation ownership capture. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { AIGatewayClient, AISecSDKException } from '../src/index.js';
import { DEFAULT_AI_GW_ADMIN_ENDPOINT } from '../src/constants.js';
import { loadLiveCredentials } from './live-credentials.js';
import { LiveHarness } from './e2e/harness.js';
import { observeGatewayFixtures } from './e2e/gateway-fixtures.js';

const credentials = loadLiveCredentials();
const h = new LiveHarness();
const finishFixtures = observeGatewayFixtures('gateway-secret-references');
const fetchWithFixtures = globalThis.fetch;
const gw = new AIGatewayClient({ numRetries: 0 });
const name = `sdk-e2e-secret-${randomUUID().slice(0, 8)}`;
const output: Record<string, unknown> = {};
let ownedId: string | undefined;
globalThis.fetch = async (input, init) => {
  const response = await fetchWithFixtures(input, init);
  if (
    String(input) === `${DEFAULT_AI_GW_ADMIN_ENDPOINT}/secret-references` &&
    init?.method === 'POST' &&
    response.ok
  ) {
    const raw = (await response.clone().json()) as { id?: unknown };
    if (typeof raw.id === 'string' && /^[0-9a-f-]{36}$/i.test(raw.id)) {
      ownedId = raw.id;
      const id = raw.id;
      h.own('gateway.secret-reference', id, name);
      h.defer('secretReferences.delete-and-confirm', async () => {
        output.deleted = await gw.secretReferences.delete(id);
        try {
          await gw.secretReferences.get(id);
        } catch (error) {
          if (error instanceof AISecSDKException && error.statusCode === 404) {
            output.confirmedNotFound = true;
            return;
          }
          throw error;
        }
        throw new Error('Owned reference is still accessible after deletion');
      });
    }
  }
  return response;
};
try {
  assert(process.argv.includes('--writes'), 'Pass --writes to run owned reference CRUD');
  const workspace = await gw.workspaces.get('ws-develo-71f8d8');
  assert.equal(workspace.slug, 'ws-develo-71f8d8');
  await h.check('secretReferences.list', async () => {
    const result = await gw.secretReferences.list({ current_page: 0, page_size: 1 });
    assert(Array.isArray(result.data));
    assert.equal(typeof result.total, 'number');
    return result;
  });
  const created = await h.check('secretReferences.create.unbound', async () => {
    const result = await gw.secretReferences.create({
      organisation_id: process.env.PANW_MGMT_TSG_ID!,
      name,
      slug: name,
      description:
        'Disposable SDK fixture. Invalid synthetic credentials; never resolved or bound.',
      manager_type: 'aws_sm',
      auth_config: {
        aws_auth_type: 'accessKey',
        aws_access_key_id: 'AKIA0000000000000000',
        aws_secret_access_key: 'sdk-e2e-invalid-secret-manager-credential',
        aws_region: 'us-east-1',
      },
      secret_path: `${name}/never-resolve`,
      allow_all_workspaces: false,
      allowed_workspaces: [workspace.id],
      tags: { sdk_fixture: name },
    });
    assert.equal(result.id, ownedId);
    assert.equal(result.slug, name);
    output.created = {
      id: '<owned-reference-id>',
      slug: '<owned-reference-slug>',
      object: result.object,
    };
    return result;
  });
  assert(created?.id && ownedId, 'The owned reference must be created before dependent checks');
  const id = created.id;
  await h.check('secretReferences.get.owned', async () => {
    const result = await gw.secretReferences.get(id);
    assert.equal(result.id, id);
    assert.equal(result.name, name);
    assert.equal(result.manager_type, 'aws_sm');
    assert.equal(result.allow_all_workspaces, false);
    output.retrieved = {
      manager_type: result.manager_type,
      allow_all_workspaces: result.allow_all_workspaces,
      secret_key: result.secret_key,
      auth_config: '[REDACTED]',
    };
    return result;
  });
  await h.check('secretReferences.list.filtered-owned', async () => {
    const result = await gw.secretReferences.list({
      current_page: 0,
      page_size: 20,
      manager_type: 'aws_sm',
      search: name,
      tags: JSON.stringify({ sdk_fixture: name }),
    });
    assert.equal(result.total, 1);
    assert.equal(result.data?.length, 1);
    assert.equal(result.data[0].id, id);
    output.filtered = { object: result.object, total: result.total };
    return result;
  });
  await h.check('secretReferences.update.owned', async () => {
    const result = await gw.secretReferences.update(id, {
      description: 'Updated disposable SDK secret-reference fixture',
    });
    output.updated = result;
    return result;
  });
  await h.check('secretReferences.get.updated-by-slug', async () => {
    const result = await gw.secretReferences.get(name);
    assert.equal(result.id, id);
    assert.equal(result.description, 'Updated disposable SDK secret-reference fixture');
    return result;
  });
} catch (error) {
  await h.check('harness.prerequisites', async () => {
    throw error;
  });
} finally {
  await h.cleanup();
  finishFixtures();
  credentials.verifyUnchanged();
  h.finish('gateway-secret-references', true);
  const report = JSON.parse(
    readFileSync('artifacts/e2e/gateway-secret-references.json', 'utf8'),
  ) as { finishedAt: string; passed: number; total: number; failed: number };
  mkdirSync('artifacts/examples', { recursive: true, mode: 0o700 });
  writeFileSync(
    'artifacts/examples/gateway-secret-references.json',
    JSON.stringify(
      {
        capturedAt: report.finishedAt,
        credentialsUnchanged: true,
        disclosure:
          'Actual SDK lifecycle output, projected to non-secret fields. Owned identifiers replaced; auth_config omitted in full. Invalid synthetic AWS credentials only. No integration binding or external secret resolution was attempted.',
        suite: { passed: report.passed, total: report.total, failed: report.failed },
        output,
      },
      null,
      2,
    ) + '\n',
    { mode: 0o600 },
  );
}
