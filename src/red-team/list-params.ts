import type { RedTeamListOptions } from './scans-client.js';

/**
 * Convert Red Team list options into a string-keyed params record for query strings.
 * @param opts - Optional pagination and search options.
 * @returns Record of string key-value pairs.
 */
export function buildRedTeamListParams(opts?: RedTeamListOptions): Record<string, string> {
  const params: Record<string, string> = {};
  if (opts?.skip !== undefined) params.skip = String(opts.skip);
  if (opts?.limit !== undefined) params.limit = String(opts.limit);
  if (opts?.search !== undefined) params.search = opts.search;
  return params;
}
