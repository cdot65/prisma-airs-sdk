/** @internal Live CLI request-builder compatibility on disposable profiles and topics only. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { ManagementClient, AISecSDKException, ErrorType } from '../src/index.js';
import { loadLiveCredentials } from './live-credentials.js';
import { LiveHarness } from './e2e/harness.js';

const run = promisify(execFile);
const credentials = loadLiveCredentials();
const h = new LiveHarness();
const mgmt = new ManagementClient({ numRetries: 0 });
const tag = `sdk-cli-e2e-${randomUUID().slice(0, 8)}`;
const actor = 'sdk-e2e@example.invalid';
const ownedProfiles = new Set<string>();
const topicName = `${tag}-topic`;
const ownedTopics = new Set<string>();
async function discoverTopics() {
  const topics = (await mgmt.topics.listAll()).filter((t) => t.topic_name === topicName);
  for (const topic of topics) {
    const id = topic.topic_id;
    assert(id, 'Owned topic returned no identifier');
    if (ownedTopics.has(id)) continue;
    ownedTopics.add(id);
    h.own('management.topic', id, topicName);
    h.defer('topics.ensure-retired', async () => {
      try {
        await mgmt.topics.get(id);
      } catch (e) {
        if (
          e instanceof AISecSDKException &&
          e.errorType === ErrorType.USER_REQUEST_PAYLOAD_ERROR &&
          e.message.includes('Topic not found:')
        )
          return;
        throw e;
      }
      await mgmt.topics.forceDeleteWithAudit(id, actor);
    });
  }
  return topics;
}
async function discoverProfiles() {
  const profiles = (await mgmt.profiles.listAll({ latest: false })).filter(
    (p) => p.profile_name === tag,
  );
  for (const p of profiles) {
    const id = p.profile_id;
    assert(id, 'Owned profile returned no identifier');
    if (ownedProfiles.has(id)) continue;
    ownedProfiles.add(id);
    h.own('management.profile', id, tag);
    h.defer('profiles.ensure-retired', async () => {
      try {
        await mgmt.profiles.get(id);
      } catch (e) {
        if (
          e instanceof AISecSDKException &&
          e.errorType === ErrorType.USER_REQUEST_PAYLOAD_ERROR &&
          e.message.includes('Profile not found:')
        )
          return;
        throw e;
      }
      await mgmt.profiles.delete(id);
    });
  }
  return profiles;
}
try {
  assert(process.argv.includes('--writes'), 'Pass --writes for disposable CLI fixtures');
  const directory = process.env.CLI_COMPAT_DIR;
  assert(directory, 'Set CLI_COMPAT_DIR to the isolated CLI with the packed SDK installed');
  const command = async (args: string[]) => {
    try {
      const result = await run(
        process.execPath,
        [resolve(directory, 'dist/cli/index.js'), ...args],
        {
          cwd: directory,
          timeout: 45_000,
          maxBuffer: 2_000_000,
          env: {
            ...process.env,
            PRISMA_AIRS_CONFIG_PATH: join(homedir(), '.prisma-airs/config.json'),
            PANW_AI_SEC_NUM_RETRIES: '0',
            PANW_AI_SEC_TIMEOUT_MS: '20000',
            NO_COLOR: '1',
          },
        },
      );
      assert(result.stdout.trim(), 'CLI returned no confirmation');
      return { exitCode: 0, outputPresent: true };
    } catch (error) {
      throw new Error(
        `CLI command failed; exit code ${(error as { code?: number }).code ?? 'unknown'}`,
      );
    }
  };
  await h.check('cli.profiles.create.flags', () =>
    command(['runtime', 'profiles', 'create', '--name', tag, '--prompt-injection', 'block']),
  );
  const profiles = await discoverProfiles();
  if (profiles.length) {
    await h.check('cli.profiles.get.json', () =>
      command(['runtime', 'profiles', 'get', tag, '--output', 'json']),
    );
    await h.check('cli.profiles.update.flags', () =>
      command(['runtime', 'profiles', 'update', tag, '--prompt-injection', 'alert']),
    );
    await discoverProfiles();
    await h.check('cli.profiles.scan.benign', () =>
      command(['runtime', 'scan', '--profile', tag, 'Hello, a benign CLI-owned profile check.']),
    );
    await h.check('cli.profiles.delete.owned', () =>
      command(['runtime', 'profiles', 'delete', tag, '--force', '--updated-by', actor]),
    );
  } else
    h.skip('cli.profiles.dependent-workflows', 'Profile creation did not yield an owned resource.');
  const topicArgs = [
    'runtime',
    'topics',
    'create',
    '--name',
    topicName,
    '--description',
    'Benign questions about the colors of a rainbow.',
    '--examples',
    'What colors are in a rainbow?',
    'Name the colors in a rainbow.',
    '--output',
    'json',
  ];
  await h.check('cli.topics.create.flags', () => command(topicArgs));
  const topic = (await discoverTopics())[0];
  if (topic) {
    const topicId = topic.topic_id;
    assert(topicId, 'Owned topic returned no identifier');
    await h.check('cli.topics.get.json', () =>
      command(['runtime', 'topics', 'get', topicName, '--output', 'json']),
    );
    await h.check('cli.topics.upsert.flags', () => command(topicArgs));
    await discoverTopics();
    await h.check('cli.topics.delete.owned', () =>
      command(['runtime', 'topics', 'delete', topicId, '--force', '--updated-by', actor]),
    );
  } else
    h.skip('cli.topics.dependent-workflows', 'Topic creation did not yield an owned resource.');
} catch (error) {
  await h.check('harness.unexpected', async () => {
    throw error;
  });
} finally {
  await h.cleanup();
  credentials.verifyUnchanged();
  h.finish('cli-writes', true);
}
