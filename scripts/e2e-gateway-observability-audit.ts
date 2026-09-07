/** @internal Read-only confirmation of retained synthetic log/feedback records; not deletion. */
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { AIGatewayClient } from '../src/index.js';
import { loadLiveCredentials } from './live-credentials.js';
import { LiveHarness, writePrivateReport } from './e2e/harness.js';

const credentials = loadLiveCredentials();
const harness = new LiveHarness();
const traceFile = 'artifacts/e2e/observability-feedback-traces.json';
const feedbackTraces: Record<string, string> = existsSync(traceFile)
  ? JSON.parse(readFileSync(traceFile, 'utf8'))
  : {};
type Fixture = { resource: string; id: string; name: string };
const fixtures = [
  ...new Map(
    readdirSync('artifacts/e2e')
      .filter((name) => name.startsWith('fixtures-') && name.endsWith('.json'))
      .flatMap((name) => JSON.parse(readFileSync(`artifacts/e2e/${name}`, 'utf8')) as Fixture[])
      .filter((f) =>
        ['gateway.log-audit-record', 'gateway.feedback-audit-record'].includes(f.resource),
      )
      .map((f) => [`${f.resource}:${f.id}`, f]),
  ).values(),
];
try {
  const gateway = new AIGatewayClient({ numRetries: 0 });
  await harness.check('observability-audit.dev-auth-control', () =>
    gateway.workspaces.get('ws-develo-71f8d8'),
  );
  const recent = await gateway.telemetry.logs({
    workspaceSlug: 'ws-develo-71f8d8',
    days: 1,
    pageSize: 100,
  });
  for (const fixture of fixtures) {
    await harness.check(`${fixture.resource}:${fixture.id}`, async () => {
      assert(fixture.name.startsWith('sdk-e2e-inference-'));
      if (fixture.resource === 'gateway.log-audit-record') {
        const page = await gateway.telemetry.logs({
          workspaceSlug: 'ws-develo-71f8d8',
          days: 1,
          traceId: fixture.id,
        });
        assert(page.data.records.some((row) => row.trace_id === fixture.id));
        return { state: 'retained-synthetic-log-no-delete-api' };
      }
      const trace = feedbackTraces[fixture.id];
      const candidates = trace
        ? await gateway.telemetry.logs({
            workspaceSlug: 'ws-develo-71f8d8',
            days: 1,
            traceId: trace,
          })
        : recent;
      const row = candidates.data.records.find((row) =>
        JSON.stringify(row.feedback).includes(fixture.id),
      );
      assert(row, 'Owned feedback must be independently visible in the SCM log record');
      const tagIndex = row.metadataKey.indexOf('sdk_e2e');
      assert(tagIndex >= 0 && row.metadataValue[tagIndex] === fixture.name);
      const ownedFeedback = row.feedback.find(
        (item): item is { id: string; value: number; weight: number } =>
          !!item && typeof item === 'object' && 'id' in item && item.id === fixture.id,
      );
      assert(ownedFeedback, 'Exact owned feedback ID must be present');
      assert.equal(ownedFeedback.value, 0, 'Synthetic feedback must retain its neutral score');
      assert.equal(ownedFeedback.weight, 0, 'Synthetic feedback must retain zero weight');
      // Preserve the exact observed trace relationship so later audits do not depend on
      // the SCM collection's capped most-recent page or guess identifiers from metadata.
      feedbackTraces[fixture.id] = row.trace_id;
      writePrivateReport(traceFile, feedbackTraces);
      harness.captureResponseShape('owned-feedback.in-scm-log', row.feedback);
      return { state: 'retained-synthetic-feedback-no-delete-api', value: 0, weight: 0 };
    });
  }
} catch (error) {
  await harness.check('observability-audit.prerequisites', async () => {
    throw error;
  });
} finally {
  credentials.verifyUnchanged();
  harness.finish('gateway-observability-audit', true);
}
