/** @internal Fail-closed public projections of the two read-only dashboard examples. */
import { z } from 'zod';

export const dashboardExampleNames = [
  'mgmt-dashboard-overview',
  'mgmt-dashboard-sessions',
] as const;
export type DashboardExampleName = (typeof dashboardExampleNames)[number];
const count = z.number().int().nonnegative();
const overview = z.tuple([
  z
    .object({
      receivedItems: count,
      pagination: z.object({ limit: count, skip: count, total_items: count }).strict(),
    })
    .strict(),
  z.object({ typedItems: count }).strict(),
]);
const sessions = z.tuple([
  z
    .object({
      rankedApps: count,
      trendBuckets: count,
      sessionBuckets: count,
      returnedApps: count,
      sessionPageItems: count,
      totalSessions: count,
    })
    .strict(),
  z
    .object({
      sessionActions: count,
      transactionStatus: z.enum(['passed', 'violated']),
      tokens: count,
    })
    .strict(),
]);

export function parseDashboardExampleOutput(name: DashboardExampleName, stdout: string) {
  if (stdout.length > 16_384) throw new Error('Dashboard example output exceeds the review limit');
  const lines: unknown = stdout
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line));
  // A missing transaction does not certify the complete session drill-down example.
  return (name === 'mgmt-dashboard-overview' ? overview : sessions).parse(lines);
}
