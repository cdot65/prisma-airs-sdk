/**
 * Pagination + search options shared by every list endpoint across the OAuth domains.
 * Sub-clients extend this with endpoint-specific filter fields and merge their additions
 * into the params record returned by {@link serializeListing}.
 */
export interface ListingOptions {
  /** Number of records to skip from the start. */
  skip?: number;
  /** Max records to return. */
  limit?: number;
  /** Free-text search filter. */
  search?: string;
}

/**
 * @internal
 * Serialize the canonical listing fields into a string-keyed params record. Extra fields on
 * the input are ignored — callers add their own endpoint-specific filters to the result.
 */
export function serializeListing(opts?: ListingOptions): Record<string, string> {
  const params: Record<string, string> = {};
  if (opts?.skip !== undefined) params.skip = String(opts.skip);
  if (opts?.limit !== undefined) params.limit = String(opts.limit);
  if (opts?.search !== undefined) params.search = opts.search;
  return params;
}
