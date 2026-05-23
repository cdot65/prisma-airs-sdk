import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { jsonNullable } from '../../src/models/dlp-json-nullable.js';

describe('jsonNullable()', () => {
  it('accepts the inner value', () => {
    const schema = jsonNullable(z.string());
    const r = schema.safeParse('hello');
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toBe('hello');
  });

  it('accepts null (used to clear a field via merge-patch)', () => {
    const schema = jsonNullable(z.string());
    const r = schema.safeParse(null);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toBeNull();
  });

  it('accepts undefined (field omitted entirely)', () => {
    const schema = jsonNullable(z.string());
    const r = schema.safeParse(undefined);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toBeUndefined();
  });

  it('rejects the wrong inner type', () => {
    const schema = jsonNullable(z.string());
    const r = schema.safeParse(42);
    expect(r.success).toBe(false);
  });

  it('round-trips through JSON.stringify preserving null semantics', () => {
    const PatchBody = z.object({
      description: jsonNullable(z.string()),
      tags: jsonNullable(z.array(z.string())),
    });

    // Clear `description`, keep `tags` unchanged (omit).
    const body: z.infer<typeof PatchBody> = { description: null };
    const wire = JSON.parse(JSON.stringify(body));
    const r = PatchBody.safeParse(wire);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.description).toBeNull();
      expect(r.data.tags).toBeUndefined();
    }
  });

  it('composes with nested array inner', () => {
    const schema = jsonNullable(z.array(z.number()));
    expect(schema.safeParse([1, 2, 3]).success).toBe(true);
    expect(schema.safeParse(null).success).toBe(true);
    expect(schema.safeParse([1, 'bad']).success).toBe(false);
  });
});
