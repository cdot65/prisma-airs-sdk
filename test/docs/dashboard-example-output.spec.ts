import { describe, expect, it } from 'vitest';
import { parseDashboardExampleOutput } from '../../scripts/e2e/dashboard-example-output.js';

const first = { receivedItems: 1, pagination: { limit: 25, skip: 0, total_items: 1 } };
const output = (value: unknown) =>
  `${JSON.stringify(value)}\n${JSON.stringify({ typedItems: 1 })}\n`;
describe('reviewed dashboard example output', () => {
  it('preserves actual counts including zero without recording identities', () => {
    expect(parseDashboardExampleOutput('mgmt-dashboard-overview', output(first))).toEqual([
      first,
      { typedItems: 1 },
    ]);
  });
  it.each([
    { ...first, secret: 'do-not-publish' },
    { ...first, pagination: { ...first.pagination, access_token: 'do-not-publish' } },
    { ...first, receivedItems: -1 },
    { ...first, receivedItems: 'one' },
  ])('rejects unreviewed or malformed output %j', (value) => {
    expect(() => parseDashboardExampleOutput('mgmt-dashboard-overview', output(value))).toThrow();
  });
  it('requires a completed session drill-down and a reviewed non-sensitive status', () => {
    const summary = {
      rankedApps: 3,
      trendBuckets: 10,
      sessionBuckets: 10,
      returnedApps: 25,
      sessionPageItems: 25,
      totalSessions: 822,
    };
    const transaction = { sessionActions: 1, transactionStatus: 'passed', tokens: 13 };
    const encode = (value: unknown) => `${JSON.stringify(summary)}\n${JSON.stringify(value)}`;
    expect(parseDashboardExampleOutput('mgmt-dashboard-sessions', encode(transaction))).toEqual([
      summary,
      transaction,
    ]);
    expect(() =>
      parseDashboardExampleOutput('mgmt-dashboard-sessions', JSON.stringify(summary)),
    ).toThrow();
    expect(() =>
      parseDashboardExampleOutput(
        'mgmt-dashboard-sessions',
        encode({ ...transaction, transactionStatus: 'private-value' }),
      ),
    ).toThrow();
  });
  it('rejects non-JSON and oversized output', () => {
    expect(() => parseDashboardExampleOutput('mgmt-dashboard-overview', 'not-json')).toThrow();
    expect(() =>
      parseDashboardExampleOutput('mgmt-dashboard-overview', ' '.repeat(16_385)),
    ).toThrow();
  });
});
