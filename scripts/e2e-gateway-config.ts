/** @internal Run the existing gateway suite using only the read-only CLI config. */
import { loadLiveCredentials } from './live-credentials.js';
import { LiveHarness } from './e2e/harness.js';
const source = loadLiveCredentials();
const h = new LiveHarness();
try {
  process.env.AI_GATEWAY_E2E_LOG_LEVEL = 'normal';
  const { main } = await import('./smoke-ai-gateway.js');
  const results = await main();
  for (const result of results)
    h.results.push({
      name: result.name,
      status: result.ok ? 'PASS' : 'FAIL',
      durationMs: result.durationMs,
      ...(result.errorType ? { errorType: result.errorType } : {}),
      ...(result.statusCode ? { statusCode: result.statusCode } : {}),
    });
} catch (error) {
  await h.check('harness.unexpected', async () => {
    throw error;
  });
} finally {
  source.verifyUnchanged();
  h.finish('gateway-read', true);
}
