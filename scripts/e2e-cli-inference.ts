/** @internal Spawn the built CLI with ephemeral in-memory credentials; config remains read-only. */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { accessSync, constants, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { isAbsolute } from 'node:path';
import { runtimeSuite } from './e2e/gateway-runtime.js';
import { cliReleaseSelection, verifyCliConsumer } from './e2e/cli-consumer.js';

let capturedChat: unknown;
const cli =
  process.env.E2E_CLI_ENTRY ?? '/home/cdot/development/cdot65/prisma-airs-cli/dist/cli/index.js';
// Installation is a prerequisite, not a live inference failure. Check it before creating a key.
assert(isAbsolute(cli), 'CLI entry must be absolute');
accessSync(cli, constants.R_OK);
const selection = cliReleaseSelection();
verifyCliConsumer(cli, selection);
const suiteName = `cli-inference${selection.suffix}`;
await runtimeSuite(suiteName, async ({ harness, endpoint, apiKey }) => {
  async function run(args: string[]) {
    return new Promise<{ code: number | null; stdout: string; stderr: string }>(
      (resolve, reject) => {
        const child = spawn(
          process.execPath,
          [
            '--import',
            fileURLToPath(new URL('./e2e/gateway-child-bootstrap.mjs', import.meta.url)),
            cli,
            'aigateway',
            'inference',
            ...args,
          ],
          {
            env: {
              ...process.env,
              PANW_AI_GW_INFERENCE_ENDPOINT: endpoint,
              PANW_AI_GW_INFERENCE_API_KEY: apiKey,
              PANW_AI_GW_INFERENCE_MODEL: '@openai/gpt-5.6-terra',
              PANW_AI_GW_EMBEDDING_MODEL: '@openai/text-embedding-3-small',
            },
            stdio: ['ignore', 'pipe', 'pipe'],
          },
        );
        let stdout = '';
        let stderr = '';
        const timer = setTimeout(() => {
          child.kill('SIGTERM');
          reject(new Error('CLI exceeded 60 seconds'));
        }, 60_000);
        child.stdout.on('data', (chunk: Buffer) => {
          stdout += chunk.toString();
          if (stdout.length > 1_048_576) {
            child.kill('SIGTERM');
            reject(new Error('CLI output exceeded test limit'));
          }
        });
        child.stderr.on('data', (chunk: Buffer) => {
          stderr += chunk.toString();
          if (stderr.length > 1_048_576) {
            child.kill('SIGTERM');
            reject(new Error('CLI error output exceeded test limit'));
          }
        });
        child.once('error', (error) => {
          clearTimeout(timer);
          reject(error);
        });
        child.once('close', (code) => {
          clearTimeout(timer);
          resolve({ code, stdout, stderr });
        });
      },
    );
  }
  for (const kind of ['chat', 'responses'] as const) {
    await harness.check(`cli.${kind}.json`, async () => {
      const result = await run([
        kind,
        'Reply with READY.',
        '--max-tokens',
        '128',
        '--output',
        'json',
      ]);
      assert.equal(result.code, 0, 'CLI inference did not exit successfully');
      assert(!result.stdout.includes(apiKey) && !result.stderr.includes(apiKey));
      const body = JSON.parse(result.stdout) as { object: string };
      assert.equal(body.object, kind === 'chat' ? 'chat.completion' : 'response');
      if (kind === 'chat')
        capturedChat = JSON.parse(
          JSON.stringify(body, (key, value) => (key === 'id' ? '<response-id>' : value)),
        );
      return { exitCode: result.code, parseableJson: true };
    });
    await harness.check(`cli.${kind}.stream-jsonl`, async () => {
      const result = await run([
        kind,
        'Reply with READY.',
        '--max-tokens',
        '128',
        '--stream',
        '--output',
        'json',
      ]);
      assert.equal(result.code, 0, 'CLI stream did not exit successfully');
      const events = result.stdout
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line) as { object?: string; type?: string });
      assert(events.length > 1);
      if (kind === 'chat')
        assert(events.every((event) => event.object === 'chat.completion.chunk'));
      else assert.equal(events.at(-1)?.type, 'response.completed');
      return { exitCode: result.code, eventCount: events.length, parseableJsonl: true };
    });
  }
  for (const encoding of ['float', 'base64'])
    await harness.check(`cli.embeddings.${encoding}`, async () => {
      const result = await run([
        'embeddings',
        'SDK CLI readiness check',
        '--dimensions',
        '32',
        '--encoding',
        encoding,
        '--output',
        'json',
      ]);
      assert.equal(result.code, 0);
      const body = JSON.parse(result.stdout) as { data: { embedding: number[] | string }[] };
      assert.equal(body.data.length, 1);
      if (encoding === 'float') {
        assert(Array.isArray(body.data[0].embedding));
        assert.equal(body.data[0].embedding.length, 32);
      } else assert.equal(Buffer.from(body.data[0].embedding as string, 'base64').byteLength, 128);
      return { exitCode: result.code, encoding, dimensions: 32 };
    });
  await harness.check('cli.validation.exit-2', async () => {
    const result = await run(['chat', 'hello', '--max-tokens', '-1', '--output', 'json']);
    assert.equal(result.code, 2);
    assert.equal(result.stdout, '');
    assert(!result.stderr.includes(apiKey));
    return { exitCode: result.code, emptyStdout: true };
  });
});
const suite = JSON.parse(readFileSync(`artifacts/e2e/${suiteName}.json`, 'utf8')) as {
  startedAt: string;
  finishedAt: string;
  passed: number;
  total: number;
  failed: number;
  credentialsUnchanged: boolean;
};
assert(
  capturedChat && suite.failed === 0 && suite.credentialsUnchanged,
  'Do not publish failed CLI output as verified',
);
mkdirSync('artifacts/examples', { recursive: true });
writeFileSync(
  `artifacts/examples/${suiteName}.json`,
  JSON.stringify(
    {
      capturedAt: suite.finishedAt,
      cliVersion: selection.cliVersion,
      sdkVersion: selection.sdkVersion,
      disclosure:
        'Actual built CLI JSON stdout from the passing live suite; response identifiers are redacted. No runtime key or configuration value is retained.',
      suite: { passed: suite.passed, total: suite.total },
      chat: capturedChat,
    },
    null,
    2,
  ) + '\n',
  { mode: 0o600 },
);
