/**
 * Pagination + search options shared by every list endpoint across the OAuth domains.
 * Sub-clients extend this with endpoint-specific filter fields and merge their additions
 * into the params record returned by the internal `serializeListing` helper.
 */
export interface ListingOptions {
  /** Number of records to skip from the start. */
  skip?: number;
  /** Max records to return. */
  limit?: number;
  /** Free-text search filter. */
  search?: string;
}

/** A page returned to the generic pagination helper. */
export interface PaginationPage<T, Cursor> {
  /** Records in this page. */
  items: T[];
  /** Cursor for the next page. Omit when this is the last page. */
  next?: Cursor;
}

/** Options controlling collection of an async listing. */
export interface CollectAllOptions {
  /** Maximum records to collect. Defaults to 10,000. Use `0` for no limit. */
  max?: number;
}

/**
 * Yield records from a cursor-based page fetcher until it has no next cursor.
 *
 * @example
 * ```ts
 * import { collectAll, paginate } from '@cdot65/prisma-airs-sdk';
 * const records = await collectAll(paginate(async (offset: number) => {
 *   const page = await api.list({ offset, limit: 100 });
 *   return { items: page.items, next: page.next_offset };
 * }, 0));
 * ```
 */
export async function* paginate<T, Cursor>(
  fetchPage: (cursor: Cursor) => Promise<PaginationPage<T, Cursor>>,
  initialCursor: Cursor,
): AsyncGenerator<T> {
  let cursor = initialCursor;
  const seen = new Set<Cursor>();
  while (true) {
    if (seen.has(cursor)) throw new Error('Pagination returned a repeated cursor');
    seen.add(cursor);
    const page = await fetchPage(cursor);
    yield* page.items;
    if (page.next === undefined) return;
    cursor = page.next;
  }
}

/**
 * Collect an async listing into an array with a runaway-walk safety cap.
 *
 * @example
 * ```ts
 * import { collectAll } from '@cdot65/prisma-airs-sdk';
 * const firstThousand = await collectAll(client.listAllIter(), { max: 1_000 });
 * ```
 */
export async function collectAll<T>(
  iterable: AsyncIterable<T>,
  opts: CollectAllOptions = {},
): Promise<T[]> {
  const max = opts.max ?? 10_000;
  if (!Number.isSafeInteger(max) || max < 0)
    throw new RangeError('max must be a non-negative integer');
  const items: T[] = [];
  for await (const item of iterable) {
    items.push(item);
    // Stop before asking the iterator for another item (which may fetch another page).
    if (max > 0 && items.length >= max) break;
  }
  return items;
}

/** @internal Options shared by all-page dialect adapters. */
export interface WalkAllOptions extends CollectAllOptions {
  limit?: number;
}

/** @internal Walk a skip/limit API using its normalized total when available. */
export function collectSkipPages<T>(
  fetchPage: (skip: number, limit: number) => Promise<{ items: T[]; total?: number | null }>,
  opts: WalkAllOptions = {},
): Promise<T[]> {
  const limit = opts.limit ?? 50;
  assertPageSize(limit, 'limit');
  return collectAll(
    paginate(async (skip: number) => {
      const page = await fetchPage(skip, limit);
      const next = skip + page.items.length;
      const hasMore =
        page.items.length > 0 &&
        (page.total == null ? page.items.length === limit : next < page.total);
      return { items: page.items, next: hasMore ? next : undefined };
    }, 0),
    { max: opts.max },
  );
}

/** @internal Walk a zero-indexed Spring page/size API until its `last` page. */
export function collectSpringPages<T>(
  fetchPage: (page: number, size: number) => Promise<{ items: T[]; last: boolean }>,
  opts: { size?: number; max?: number } = {},
): Promise<T[]> {
  const size = opts.size ?? 50;
  assertPageSize(size, 'size');
  return collectAll(
    paginate(async (page: number) => {
      const result = await fetchPage(page, size);
      if (!result.last && result.items.length === 0) {
        throw new Error('Pagination returned an empty non-final page');
      }
      return { items: result.items, next: result.last ? undefined : page + 1 };
    }, 0),
    { max: opts.max },
  );
}

/** @internal Reject invalid page sizes before starting a network walk. */
function assertPageSize(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive integer`);
  }
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
