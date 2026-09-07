import { describe, expect, it } from 'vitest';
import { resolveValidator } from '../../scripts/openapi/validators.js';

describe('static conditional response-schema analysis', () => {
  it('models both response variants without evaluating the condition', () => {
    const schema = resolveValidator('throwIfExecuted() ? z.string() : z.array(z.string())');
    expect(schema).toBeDefined();
    expect(schema!.safeParse('text').success).toBe(true);
    expect(schema!.safeParse(['text']).success).toBe(true);
    expect(schema!.safeParse(42).success).toBe(false);
  });
  it('parses optional chaining in a format selector', () => {
    const schema = resolveValidator(
      "body?.response_format === 'verbose_json' ? z.string() : z.array(z.string())",
    );
    expect(schema!.safeParse('text').success).toBe(true);
    expect(schema!.safeParse(['text']).success).toBe(true);
  });
  it('does not count a selector with an unresolved branch', () => {
    expect(resolveValidator('condition ? MissingSchema : z.string()')).toBeUndefined();
  });
  it('does not accept trailing statements as a schema expression', () => {
    expect(
      resolveValidator('condition ? z.string() : z.array(z.string()); anotherStatement()'),
    ).toBeUndefined();
  });
});
