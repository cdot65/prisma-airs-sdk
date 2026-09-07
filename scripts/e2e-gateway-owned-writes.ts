/** @internal Opt-in gateway lifecycle checks; never update existing tenant resources. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import {
  AIGatewayClient,
  GatewayRoutingConfigSchema,
  GatewayServiceApiKeyCreateRequestSchema,
} from '../src/index.js';
import { loadLiveCredentials } from './live-credentials.js';
import { LiveHarness } from './e2e/harness.js';
import { observeGatewayFixtures } from './e2e/gateway-fixtures.js';

const credentials = loadLiveCredentials();
const h = new LiveHarness();
const finishFixtures = observeGatewayFixtures('gateway-owned-writes');
const gw = new AIGatewayClient({ numRetries: 0 });
const tag = `sdk-e2e-${randomUUID().slice(0, 8)}`;
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const response = await originalFetch(input, init);
  // Retain structural evidence even when a 2xx response fails SDK validation.
  if (String(input).includes('/ai_gw/')) {
    try {
      h.captureResponseShape(
        `wire:${init?.method ?? 'GET'} ${new URL(String(input)).pathname}`,
        await response.clone().json(),
      );
    } catch {
      /* Empty responses have no JSON shape. */
    }
  }
  return response;
};
try {
  if (!process.argv.includes('--writes'))
    throw new Error('Pass --writes to authorize this owned-fixture suite');
  const workspace = (await gw.workspaces.list()).data[0];
  assert(workspace);
  const organisation_id = process.env.PANW_MGMT_TSG_ID!;
  const config = await h.check('configs.create', () =>
    gw.configs.create({
      name: tag,
      workspace_id: workspace.id,
      config: { cache: { mode: 'simple', max_age: 60 }, retry: { attempts: 2 } },
    }),
  );
  if (config) {
    h.own('gateway.config', config.id, tag);
    h.defer('configs.delete', () => gw.configs.delete(config.id));
    await h.check('configs.get', () => gw.configs.get(config.id));
    await h.check('configs.rename', () => gw.configs.update(config.id, { name: `${tag}-updated` }));
    await h.check('configs.replace-routing', () =>
      gw.configs.update(config.id, {
        config: { cache: { mode: 'simple', max_age: 120 }, retry: { attempts: 3 } },
      }),
    );
    await h.check('configs.assert-roundtrip', async () => {
      const value = await gw.configs.get(config.id);
      assert.equal(value.name, `${tag}-updated`);
      assert.equal(GatewayRoutingConfigSchema.parse(JSON.parse(value.config)).retry?.attempts, 3);
    });
    await h.check('configs.listVersions', () => gw.configs.listVersions(config.id));
  }
  const ownWorkspace = await h.check('workspaces.create', () =>
    gw.workspaces.create({ name: tag, scope_name: `ws_${tag.replaceAll('-', '_')}` }),
  );
  if (ownWorkspace) {
    h.own('gateway.workspace', ownWorkspace.id, tag);
    h.defer('workspaces.archive', () => gw.workspaces.delete(ownWorkspace.id));
    await h.check('workspaces.get.admin', () =>
      gw.workspaces.get(ownWorkspace.id, { plane: 'admin' }),
    );
    await h.check('workspaces.update', () =>
      gw.workspaces.update(ownWorkspace.id, {
        description: 'Updated disposable SDK conformance fixture',
      }),
    );
  }
  const source = (await gw.integrations.list()).data[0];
  if (source) {
    const integration = await h.check('integrations.create.synthetic-key', () =>
      gw.integrations.create({
        organisation_id,
        ai_provider_id: source.ai_provider_id,
        name: tag,
        slug: tag,
        key: `sdk-e2e-invalid-provider-key-${randomUUID()}`,
        create_default_provider: false,
      }),
    );
    const id = typeof integration?.id === 'string' ? integration.id : undefined;
    if (id) {
      h.own('gateway.integration', id, tag);
      h.defer('integrations.delete', () => gw.integrations.delete(id, organisation_id));
      await h.check('integrations.get.owned', () => gw.integrations.get(id));
      await h.check('integrations.update.owned', () =>
        gw.integrations.update(id, {
          description: 'Synthetic credential; no inference is performed',
        }),
      );
      const models = await h.check('integrations.getModels.owned', () =>
        gw.integrations.getModels(id),
      );
      const model = models?.models[0] ?? (await gw.integrations.getModels(source.id)).models[0];
      if (model) {
        await h.check('integrations.setModels.owned', () =>
          gw.integrations.setModels(id, {
            models: [{ slug: model.slug, enabled: false }],
            allow_all_models: false,
          }),
        );
        const customSlug = `${tag}-model`;
        const custom = await h.check('integrations.setModels.custom-owned', () =>
          gw.integrations.setModels(id, {
            models: [
              { slug: customSlug, enabled: false, is_custom: true, base_model_slug: model.slug },
            ],
            allow_all_models: false,
          }),
        );
        if (custom)
          await h.check('integrations.deleteModels.owned', () =>
            gw.integrations.deleteModels(id, [customSlug]),
          );
      } else h.skip('integrations.model-writes', 'The owned integration has no model catalog.');
      await h.check('integrations.setWorkspaces.owned', () =>
        gw.integrations.setWorkspaces(id, {
          workspaces: [{ id: workspace.id, enabled: true, create_default_provider: false }],
          global_workspace_access: { enabled: false },
          override_existing_workspace_access: false,
        }),
      );
      await h.check('integrations.getWorkspaces.owned', () => gw.integrations.getWorkspaces(id));
      const provider = await h.check('providers.create.owned', () =>
        gw.providers.create({
          workspace_id: workspace.id,
          integration_id: id,
          ai_provider_id: source.ai_provider_id,
          name: tag,
          slug: `${tag}-provider`,
        }),
      );
      if (provider) {
        h.own('gateway.provider', provider.id, tag);
        h.defer('providers.delete', () => gw.providers.delete(provider.id));
        await h.check('providers.get.owned', () => gw.providers.get(provider.id));
        await h.check('providers.update.owned', () =>
          gw.providers.update(provider.id, { note: 'Disposable SDK conformance fixture' }),
        );
      }
    }
  }
  const sourceKey = (await gw.apiKeys.listService({ workspaceId: workspace.id })).data[0];
  if (sourceKey) {
    h.protect(sourceKey);
    const key = await h.check('apiKeys.createService.owned', () =>
      gw.apiKeys.createService(
        GatewayServiceApiKeyCreateRequestSchema.parse({
          organisation_id,
          workspace_id: workspace.id,
          name: tag,
          type: sourceKey.type,
          scopes: sourceKey.scopes,
          expires_at: new Date(Date.now() + 3_600_000).toISOString(),
        }),
      ),
    );
    const id = typeof key?.id === 'string' ? key.id : undefined;
    if (id) {
      h.own('gateway.service-api-key', id, tag);
      h.defer('apiKeys.deleteService', () => gw.apiKeys.deleteService(id));
      await h.check('apiKeys.getService.owned', () => gw.apiKeys.getService(id));
      await h.check('apiKeys.updateService.owned', () =>
        gw.apiKeys.updateService(id, { name: `${tag}-updated` }),
      );
      await h.check('apiKeys.rotateService.owned', () => gw.apiKeys.rotateService(id));
    }
  } else h.skip('apiKeys.service-workflow', 'No source scope catalog was available.');
} catch (error) {
  await h.check('harness.unexpected', async () => {
    throw error;
  });
} finally {
  await h.cleanup();
  credentials.verifyUnchanged();
  h.finish('gateway-owned-writes', true);
  globalThis.fetch = originalFetch;
  finishFixtures();
}
