/** @internal Exercise an explicit built CLI against the packed SDK without logging its data. */
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { loadLiveCredentials } from './live-credentials.js';
import { LiveHarness } from './e2e/harness.js';
import { AIGatewayClient, ManagementClient } from '../src/index.js';
import { cliReleaseSelection, verifyCliConsumer } from './e2e/cli-consumer.js';
const run = promisify(execFile);
const selection = cliReleaseSelection();
const credentials = loadLiveCredentials();
const h = new LiveHarness();
try {
  const directory = process.env.CLI_COMPAT_DIR;
  assert(directory, 'Set CLI_COMPAT_DIR to the isolated CLI checkout');
  const cli = resolve(directory, 'dist/cli/index.js');
  if (selection.suffix) verifyCliConsumer(cli, selection);
  const workspace = await new AIGatewayClient({ numRetries: 0 }).workspaces.get('ws-develo-71f8d8');
  const profile = (
    await new ManagementClient({ numRetries: 0 }).profiles.listForToken({ limit: 100 })
  ).ai_profiles.find((p) => p.active);
  assert(workspace && profile);
  const commands: [string, string[]][] = [
    ['runtime.profiles', ['runtime', 'profiles', 'list', '--limit', '1']],
    ['runtime.topics', ['runtime', 'topics', 'list', '--limit', '1']],
    ['model-security.groups', ['model-security', 'groups', 'list', '--limit', '1']],
    ['model-security.rules', ['model-security', 'rules', 'list', '--limit', '1']],
    ['redteam.jobs', ['redteam', 'list', '--limit', '1']],
    ['redteam.languages', ['redteam', 'languages']],
    ['gateway.workspaces', ['aigateway', 'workspaces', 'list']],
    ['gateway.configs', ['aigateway', 'configs', 'list', '--workspace', workspace.id]],
    ['gateway.guardrails', ['aigateway', 'guardrails', 'list', '--workspace', workspace.id]],
    ['gateway.integrations', ['aigateway', 'integrations', 'list']],
    [
      'gateway.telemetry',
      ['aigateway', 'telemetry', 'requests', '--workspace', workspace.slug, '--days', '1'],
    ],
  ];
  const env = {
    ...process.env,
    PRISMA_AIRS_CONFIG_PATH: join(homedir(), '.prisma-airs/config.json'),
    PANW_AI_SEC_NUM_RETRIES: '0',
    PANW_AI_SEC_TIMEOUT_MS: '20000',
    NO_COLOR: '1',
  };
  for (const [name, args] of commands)
    await h.check(`cli.${name}`, async () => {
      try {
        const result = await run(process.execPath, [cli, ...args, '--output', 'json'], {
          cwd: directory,
          env,
          timeout: 45_000,
          maxBuffer: 10_000_000,
        });
        assert(result.stdout.trim(), 'CLI returned no data');
        const parsed = JSON.parse(result.stdout);
        assert(parsed !== null);
        return { jsonParsed: true, exitCode: 0 };
      } catch (error) {
        // Child-process errors embed stdout/stderr, which may contain protected API data.
        const code = (error as { code?: unknown }).code;
        throw new Error(
          `CLI check failed; exit code ${typeof code === 'number' || typeof code === 'string' ? code : 'unknown'}`,
        );
      }
    });
  await h.check('cli.runtime.scan.benign', async () => {
    try {
      const result = await run(
        process.execPath,
        [
          cli,
          'runtime',
          'scan',
          '--profile',
          profile.profile_name,
          'Hello, this is a benign SDK CLI integration check.',
        ],
        { cwd: directory, env, timeout: 45_000, maxBuffer: 1_000_000 },
      );
      assert(result.stdout.trim());
      return { exitCode: 0, outputPresent: true };
    } catch (error) {
      throw new Error(
        `CLI benign scan failed; exit code ${(error as { code?: number }).code ?? 'unknown'}`,
      );
    }
  });
} catch (error) {
  await h.check('harness.unexpected', async () => {
    throw error;
  });
} finally {
  credentials.verifyUnchanged();
  h.finish(`cli${selection.suffix}`, true);
}
