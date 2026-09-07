/** @internal Management read/CRUD workflows. Mutations require --writes and use owned fixtures only. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { loadLiveCredentials } from './live-credentials.js';
import { LiveHarness } from './e2e/harness.js';
import { ManagementClient, Scanner, Content, init } from '../src/index.js';

const credentials = loadLiveCredentials();
const h = new LiveHarness();
const client = new ManagementClient({ numRetries: 0 });
const tag = `sdk-e2e-${randomUUID().slice(0, 8)}`;
const actor = 'sdk-e2e@example.invalid';
try {
  const profiles = await h.check('profiles.listForToken', () =>
    client.profiles.listForToken({ limit: 100 }),
  );
  await h.check('topics.listForToken', () => client.topics.listForToken({ limit: 100 }));
  const keys = await h.check('apiKeys.listForToken', () =>
    client.apiKeys.listForToken({ limit: 100 }),
  );
  await h.check('customerApps.listForToken', () =>
    client.customerApps.listForToken({ limit: 100 }),
  );
  await h.check('deploymentProfiles.list', () => client.deploymentProfiles.list());
  await h.check('dlpProfiles.list', () => client.dlpProfiles.list());
  if (process.argv.includes('--writes')) {
    const source = profiles?.ai_profiles.find((p) => p.active && p.policy);
    assert(source, 'An existing active policy is needed to create a safe test clone');
    const body = {
      profile_name: tag,
      active: true,
      policy: source.policy,
      created_by: actor,
      updated_by: actor,
    };
    const profile = await h.check('profiles.create', () => client.profiles.create(body));
    if (profile?.profile_id) {
      const id = profile.profile_id;
      h.own('management.profile', id, tag);
      h.defer('profiles.delete', () => client.profiles.delete(id));
      await h.check('profiles.get', async () =>
        assert.equal((await client.profiles.get(id)).profile_id, id),
      );
      await h.check('profiles.getByName', async () =>
        assert.equal((await client.profiles.getByName(tag)).profile_id, id),
      );
      await h.check('profiles.update', async () => {
        const updated = await client.profiles.update(id, {
          ...body,
          profile_name: `${tag}-updated`,
          revision: profile.revision,
        });
        if (updated.profile_id && updated.profile_id !== id) {
          h.own('management.profile', updated.profile_id, `${tag}-updated`);
          h.defer('profiles.delete.updated-revision', () =>
            client.profiles.delete(updated.profile_id!),
          );
        }
        assert.equal(updated.profile_name, `${tag}-updated`);
      });
      init({ numRetries: 0 });
      await h.check('profiles.scan-integration', () =>
        new Scanner().syncScan(
          { profile_id: id },
          new Content({ prompt: 'Hello, this is a benign SDK integration check.' }),
          { numRetries: 0 },
        ),
      );
    }
    const topicBody = {
      topic_name: `${tag}-topic`,
      description: 'Benign questions about rainbow colors for SDK integration testing.',
      examples: [
        'What colors are in a rainbow?',
        'Name the colors of a rainbow.',
        'Why do rainbows have several colors?',
      ],
      active: true,
      created_by: actor,
      updated_by: actor,
    };
    const topic = await h.check('topics.create', () => client.topics.create(topicBody));
    if (topic?.topic_id) {
      const id = topic.topic_id;
      h.own('management.topic', id, topicBody.topic_name);
      h.defer('topics.forceDeleteWithAudit', () => client.topics.forceDeleteWithAudit(id, actor));
      await h.check('topics.get', async () =>
        assert.equal((await client.topics.get(id)).topic_id, id),
      );
      await h.check('topics.getByName', async () =>
        assert.equal((await client.topics.getByName(topicBody.topic_name)).topic_id, id),
      );
      await h.check('topics.update', () =>
        client.topics.update(id, {
          ...topicBody,
          description: 'Updated benign rainbow color topic for SDK integration testing.',
          revision: topic.revision,
        }),
      );
    }
    const sourceKey = keys?.api_keys?.find((k) => !k.revoked && k.auth_code);
    if (sourceKey) {
      h.protect(sourceKey);
      const keyName = `${tag}-key`;
      const key = await h.check('apiKeys.create', () =>
        client.apiKeys.create({
          api_key_name: keyName,
          auth_code: sourceKey.auth_code,
          dp_name: sourceKey.dp_name,
          cust_app: `${tag}-app`,
          cust_env: 'test',
          cust_cloud_provider: 'other',
          cust_ai_agent_framework: 'other',
          revoked: false,
          created_by: actor,
          rotation_time_interval: 1,
          rotation_time_unit: 'days',
        }),
      );
      if (key) {
        h.own('management.api-key', key.api_key_id, keyName);
        h.defer('apiKeys.delete', () => client.apiKeys.delete(keyName, actor));
        // API-key cust_app is not necessarily a registered customer-app resource.
        // Resolve an owned app before attempting mutation or scheduling cleanup.
        const apps = await h.check('customerApps.list.after-key-create', () =>
          client.customerApps.listForToken({ limit: 100 }),
        );
        const app = apps?.customer_apps?.find((app) => app.customer_appId === `${tag}-app`);
        if (app?.customer_appId) {
          const appId = app.customer_appId;
          h.own('management.customer-app', appId, `${tag}-app`);
          h.defer('customerApps.delete', () => client.customerApps.delete(appId, actor));
          await h.check('customerApps.get', () => client.customerApps.get(appId));
          await h.check('customerApps.update', () =>
            client.customerApps.update(appId, { ...app, environment: 'test', updated_by: actor }),
          );
        } else
          h.skip(
            'customerApps.write-workflow',
            'API-key creation did not register a customer app; existing apps are not modified.',
          );
        await h.check('apiKeys.regenerate', () =>
          client.apiKeys.regenerate(key.api_key_id, {
            rotation_time_interval: 1,
            rotation_time_unit: 'days',
            updated_by: actor,
          }),
        );
      }
    } else
      h.skip(
        'apiKeys.lifecycle',
        'No licensed source auth code available; no existing key is modified.',
      );
  } else
    h.skip(
      'management.write-workflows',
      'Pass --writes to create and clean up disposable fixtures.',
    );
} catch (error) {
  await h.check('harness.unexpected', async () => {
    throw error;
  });
} finally {
  await h.cleanup();
  credentials.verifyUnchanged();
  h.finish('management', true);
}
