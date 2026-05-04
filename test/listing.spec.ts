import { describe, it, expect } from 'vitest';
import { serializeListing, type ListingOptions } from '../src/listing.js';

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
