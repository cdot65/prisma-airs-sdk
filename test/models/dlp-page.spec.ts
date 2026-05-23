import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { pageSchema, PageableObjectSchema, SortObjectSchema } from '../../src/models/dlp-page.js';

const ItemSchema = z.object({ id: z.string(), name: z.string() });

const samplePage = {
  content: [
    { id: 'p1', name: 'Pattern 1' },
    { id: 'p2', name: 'Pattern 2' },
  ],
  empty: false,
  first: true,
  last: false,
  number: 0,
  numberOfElements: 2,
  pageable: {
    offset: 0,
    pageNumber: 0,
    pageSize: 20,
    paged: true,
    unpaged: false,
    sort: { empty: true, sorted: false, unsorted: true },
  },
  size: 20,
  sort: { empty: true, sorted: false, unsorted: true },
  totalElements: 47,
  totalPages: 3,
};

describe('pageSchema()', () => {
  it('parses a full Spring-style Page payload', () => {
    const schema = pageSchema(ItemSchema);
    const r = schema.safeParse(samplePage);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.content).toHaveLength(2);
      expect(r.data.totalElements).toBe(47);
      expect(r.data.content[0].name).toBe('Pattern 1');
    }
  });

  it('parses an empty page', () => {
    const schema = pageSchema(ItemSchema);
    const r = schema.safeParse({
      content: [],
      empty: true,
      first: true,
      last: true,
      number: 0,
      numberOfElements: 0,
      size: 20,
      totalElements: 0,
      totalPages: 0,
    });
    expect(r.success).toBe(true);
  });

  it('rejects invalid item shape', () => {
    const schema = pageSchema(ItemSchema);
    const r = schema.safeParse({
      ...samplePage,
      content: [{ id: 1, name: 'bad-id' }],
    });
    expect(r.success).toBe(false);
  });

  it('passes through unknown envelope fields', () => {
    const schema = pageSchema(ItemSchema);
    const r = schema.safeParse({ ...samplePage, server_added_field: 'ok' });
    expect(r.success).toBe(true);
  });
});

describe('PageableObjectSchema', () => {
  it('parses standalone pageable block', () => {
    const r = PageableObjectSchema.safeParse({
      offset: 40,
      pageNumber: 2,
      pageSize: 20,
      paged: true,
      unpaged: false,
    });
    expect(r.success).toBe(true);
  });
});

describe('SortObjectSchema', () => {
  it('parses standalone sort block', () => {
    const r = SortObjectSchema.safeParse({ empty: true, sorted: false, unsorted: true });
    expect(r.success).toBe(true);
  });
});
