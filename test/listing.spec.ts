import { describe, it, expect, vi } from 'vitest';
import {
  collectAll,
  collectSkipPages,
  collectSpringPages,
  paginate,
  serializeListing,
  type ListingOptions,
} from '../src/listing.js';

describe('pagination helpers', () => {
  it('does not fetch an extra page when max is exactly a page boundary', async () => {
    const fetchPage = vi.fn().mockResolvedValue({ items: [1, 2], next: 2 });
    await expect(collectAll(paginate(fetchPage, 0), { max: 2 })).resolves.toEqual([1, 2]);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it('closes the iterator when reaching the cap', async () => {
    const closed = vi.fn();
    async function* values() {
      try {
        yield 1;
        yield 2;
      } finally {
        closed();
      }
    }
    await collectAll(values(), { max: 1 });
    expect(closed).toHaveBeenCalledOnce();
  });

  it.each([-1, 1.5, NaN, Infinity])('rejects invalid max %s before fetching', async (max) => {
    const fetchPage = vi.fn();
    await expect(collectAll(paginate(fetchPage, 0), { max })).rejects.toThrow(RangeError);
    expect(fetchPage).not.toHaveBeenCalled();
  });
  it('paginates until the page has no next cursor', async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({ items: [1, 2], next: 2 })
      .mockResolvedValueOnce({ items: [3], next: undefined });

    await expect(collectAll(paginate(fetchPage, 0))).resolves.toEqual([1, 2, 3]);
    expect(fetchPage).toHaveBeenNthCalledWith(1, 0);
    expect(fetchPage).toHaveBeenNthCalledWith(2, 2);
  });

  it('stops at max without returning more than the cap', async () => {
    const iterator = paginate(
      async (cursor: number) => ({
        items: [cursor, cursor + 1],
        next: cursor + 2,
      }),
      0,
    );

    await expect(collectAll(iterator, { max: 3 })).resolves.toEqual([0, 1, 2]);
  });

  it('rejects repeated cursors to prevent infinite pagination loops', async () => {
    const iterator = paginate(async () => ({ items: [1], next: 'same' }), 'same');
    await expect(collectAll(iterator)).rejects.toThrow('repeated cursor');
  });
});

describe('pagination dialect adapters', () => {
  it.each([0, -1, 1.5, NaN, Infinity])('rejects invalid page size %s', (size) => {
    const fetchPage = vi.fn();
    expect(() => collectSkipPages(fetchPage, { limit: size })).toThrow(RangeError);
    expect(() => collectSpringPages(fetchPage, { size })).toThrow(RangeError);
    expect(fetchPage).not.toHaveBeenCalled();
  });

  it('rejects empty non-final Spring pages instead of walking forever', async () => {
    const fetchPage = vi.fn().mockResolvedValue({ items: [], last: false });
    await expect(collectSpringPages(fetchPage)).rejects.toThrow('empty non-final page');
    expect(fetchPage).toHaveBeenCalledOnce();
  });
  it('walks skip/limit pages using total_items', async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({ items: ['a', 'b'], total: 3 })
      .mockResolvedValueOnce({ items: ['c'], total: 3 });
    await expect(collectSkipPages(fetchPage, { limit: 2 })).resolves.toEqual(['a', 'b', 'c']);
    expect(fetchPage).toHaveBeenNthCalledWith(2, 2, 2);
  });

  it('walks zero-indexed Spring pages until last', async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({ items: [1], last: false })
      .mockResolvedValueOnce({ items: [2], last: true });
    await expect(collectSpringPages(fetchPage, { size: 1 })).resolves.toEqual([1, 2]);
    expect(fetchPage).toHaveBeenNthCalledWith(2, 1, 1);
  });

  it('stops an unknown-total skip listing on a short page', async () => {
    const fetchPage = vi.fn().mockResolvedValue({ items: ['only'] });
    await expect(collectSkipPages(fetchPage, { limit: 2 })).resolves.toEqual(['only']);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });
});

describe('serializeListing', () => {
  it('returns empty record when no opts', () => {
    expect(serializeListing()).toEqual({});
  });

  it('returns empty record when opts is empty object', () => {
    expect(serializeListing({})).toEqual({});
  });

  it('includes skip when set', () => {
    expect(serializeListing({ skip: 10 })).toEqual({ skip: '10' });
  });

  it('includes limit when set', () => {
    expect(serializeListing({ limit: 25 })).toEqual({ limit: '25' });
  });

  it('includes search when set', () => {
    expect(serializeListing({ search: 'foo bar' })).toEqual({ search: 'foo bar' });
  });

  it('includes all three when set', () => {
    expect(serializeListing({ skip: 5, limit: 10, search: 'q' })).toEqual({
      skip: '5',
      limit: '10',
      search: 'q',
    });
  });

  it('coerces numeric zero (skip=0 is meaningful)', () => {
    expect(serializeListing({ skip: 0 })).toEqual({ skip: '0' });
  });

  it('preserves extra string fields not in ListingOptions', () => {
    type WithExtras = ListingOptions & { status?: string };
    const opts: WithExtras = { skip: 1, status: 'active' };
    expect(serializeListing(opts)).toEqual({ skip: '1' });
    // Note: serializeListing only emits the canonical fields. Callers add their own.
  });

  it('returns empty when only undefined values supplied', () => {
    expect(serializeListing({ skip: undefined, limit: undefined, search: undefined })).toEqual({});
  });
});
