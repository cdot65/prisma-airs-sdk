import { describe, expect, it } from 'vitest';
import snapshot from './fixtures/live-responses.json';
import { resolveValidator } from '../../scripts/openapi/validators.js';

describe('redacted live SCM response regressions', () => {
  it('retains broad lifecycle evidence rather than one happy-path response', () =>
    expect(snapshot.fixtures.length).toBeGreaterThan(40));
  for (const [index, fixture] of snapshot.fixtures.entries())
    it(`${index}: ${fixture.method} ${fixture.path}`, () => {
      const schema = resolveValidator(fixture.validator);
      expect(schema, fixture.validator).toBeDefined();
      const result = schema!.safeParse(fixture.body);
      expect(result.success, result.success ? '' : JSON.stringify(result.error.issues)).toBe(true);
    });
});
