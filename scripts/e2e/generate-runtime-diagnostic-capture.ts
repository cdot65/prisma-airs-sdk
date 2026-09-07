/** @internal Publish only checked result counters/names, never upstream errors or resource IDs. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { emitPatch } from '../openapi/emit-patch.js';
import type { LiveResult } from './harness.js';
import { runtimeDiagnosticSuites } from './report-suites.js';

const evidence = runtimeDiagnosticSuites.map((suite) => {
  const report = JSON.parse(
    readFileSync(new URL(`../../artifacts/e2e/${suite}.json`, import.meta.url), 'utf8'),
  ) as {
    startedAt: string;
    finishedAt: string;
    credentialsUnchanged: boolean;
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    results: LiveResult[];
  };
  assert.equal(report.credentialsUnchanged, true);
  assert.equal(report.total, report.results.length);
  assert.equal(report.total, report.passed + report.failed + report.skipped);
  for (const [status, count] of [
    ['PASS', report.passed],
    ['FAIL', report.failed],
    ['SKIP', report.skipped],
  ] as const)
    assert.equal(report.results.filter((r) => r.status === status).length, count);
  let transport: Record<string, unknown> | undefined;
  if (suite === 'gateway-runtime-authoring') {
    const boundary = JSON.parse(
      readFileSync(
        new URL('../../artifacts/e2e/gateway-authoring-boundary.json', import.meta.url),
        'utf8',
      ),
    ) as {
      startedAt: string;
      checkedAt: string;
      observations: {
        providerHeader: boolean;
        status: number;
        successful: boolean;
        missingProviderOrConfig: boolean;
      }[];
    };
    assert.equal(boundary.startedAt, report.startedAt);
    const without = boundary.observations.filter((row) => !row.providerHeader);
    const withProvider = boundary.observations.filter((row) => row.providerHeader);
    assert.equal(without.length, 9, 'Review authoring prose if request variants change');
    assert.equal(withProvider.length, 4);
    assert(
      without.every((row) => row.status === 400 && row.missingProviderOrConfig && !row.successful),
    );
    assert(
      withProvider.every(
        (row) => row.status === 404 && !row.successful && !row.missingProviderOrConfig,
      ),
    );
    assert.equal(report.passed, 2);
    assert.equal(report.failed, 13);
    assert.equal(report.total, 15);
    transport = {
      observedAt: boundary.checkedAt,
      withoutProvider: { requests: without.length, httpStatus: 400, missingProviderOrConfig: true },
      withPrescribedProvider: { requests: withProvider.length, httpStatus: 404, successful: 0 },
      authoringAvailabilityEstablished: false,
    };
  }
  if (suite === 'gateway-realtime') {
    const observation = JSON.parse(
      readFileSync(
        new URL('../../artifacts/e2e/gateway-realtime-evidence.json', import.meta.url),
        'utf8',
      ),
    ) as Record<string, unknown>;
    transport = Object.fromEntries(
      [
        'outcome',
        'upgraded',
        'statusCode',
        'sessionCreated',
        'closed',
        'eventTypes',
        'clientEventsSent',
        'errorCode',
        'modelErrorReported',
      ].map((key) => [key, observation[key]]),
    );
    assert.deepEqual(
      transport,
      {
        outcome: 'server-error',
        upgraded: true,
        statusCode: 101,
        sessionCreated: false,
        closed: true,
        eventTypes: ['error'],
        clientEventsSent: 0,
        errorCode: 'invalid_model',
        modelErrorReported: true,
      },
      'Review realtime prose before publishing a changed observation',
    );
    assert.equal(report.passed, 3);
    assert.equal(report.failed, 1);
    assert.equal(report.total, 4);
  }
  if (suite === 'gateway-realtime-sdk') {
    const observation = JSON.parse(
      readFileSync(
        new URL('../../artifacts/e2e/gateway-realtime-sdk-observations.json', import.meta.url),
        'utf8',
      ),
    ) as Record<string, unknown>;
    assert.equal(observation.finishedAt, report.finishedAt);
    transport = Object.fromEntries(
      [
        'statusCode',
        'sessionCreated',
        'socketClosed',
        'eventTypes',
        'clientEventsSent',
        'errorCode',
      ].map((key) => [key, observation[key]]),
    );
    assert.deepEqual(
      transport,
      {
        statusCode: 101,
        sessionCreated: false,
        socketClosed: true,
        eventTypes: ['error'],
        clientEventsSent: 0,
        errorCode: 'invalid_model',
      },
      'Review typed realtime prose if the provider result changes',
    );
    assert.equal(report.passed, 4);
    assert.equal(report.failed, 1);
    assert.equal(report.total, 5);
  }
  return {
    suite,
    finishedAt: report.finishedAt,
    passed: report.passed,
    failed: report.failed,
    skipped: report.skipped,
    total: report.total,
    ...(transport ? { transport } : {}),
    results: report.results.map(({ name, status, statusCode }) => {
      assert(
        /^(observability-details\.|observability-sdk\.|legacy-completions\.|prompt-runtime\.|realtime\.|realtime-sdk\.|runtime-authoring\.|provider-http\.|deployment-diagnostics\.|cleanup\.realtime-sdk\.|cleanup\.runtime-key\.retired)[a-z0-9.-]*$/.test(
          name,
        ),
      );
      return { name, status, ...(statusCode === undefined ? {} : { statusCode }) };
    }),
  };
});
const details = evidence.find((report) => report.suite === 'gateway-observability-details-sdk');
assert(details);
assert.equal(details.passed, 3, 'Review typed-detail example prose if controls change');
assert.equal(details.failed, 2);
assert.equal(details.total, 5);
for (const name of ['observability-sdk.log-detail', 'observability-sdk.feedback-update-neutral']) {
  const result: { name: string; status: string; statusCode?: number } | undefined =
    details.results.find((entry) => entry.name === name);
  assert.equal(result?.status, 'FAIL', 'Review typed-detail example prose if the service recovers');
  assert.equal(result?.statusCode, 500);
}
const providerRuns = evidence.filter((report) => report.suite.startsWith('gateway-provider-http'));
assert.equal(providerRuns.length, 2);
for (const report of providerRuns) {
  assert.equal(
    report.passed,
    2,
    'Review the provider-example prose if the observed result changes',
  );
  assert.equal(report.failed, 9);
  assert.equal(report.total, 11);
  assert.equal(
    report.results.find((result) => result.name === 'provider-http.model-auth-control')?.status,
    'PASS',
  );
  assert.equal(
    report.results.find((result) => result.name === 'cleanup.runtime-key.retired')?.status,
    'PASS',
  );
}
assert.deepEqual(
  providerRuns[0].results,
  providerRuns[1].results,
  'Raw and SDK provider outcomes diverged; investigate before publishing example prose',
);
for (const family of ['gateway-legacy-completions', 'gateway-prompt-runtime'] as const) {
  const raw = evidence.find((report) => report.suite === family)!;
  const sdk = evidence.find((report) => report.suite === `${family}-sdk`)!;
  assert(raw && sdk, 'Both raw and SDK diagnostics must be available');
  assert.deepEqual(raw.results, sdk.results, 'Review prose when raw and SDK outcomes diverge');
  assert.equal(sdk.passed, 2);
  assert.equal(sdk.failed, family === 'gateway-prompt-runtime' ? 2 : 1);
  assert.equal(sdk.skipped, family === 'gateway-prompt-runtime' ? 0 : 1);
  assert.equal(sdk.total, 4);
  for (const result of sdk.results.filter((result) => result.status === 'FAIL'))
    assert.equal(result.statusCode, 404, 'Review legacy/prompt prose if the status changes');
}
emitPatch('artifacts/examples/gateway-runtime-diagnostics.json', JSON.stringify(evidence, null, 2));
