import { describe, it, expect } from 'vitest';
import { findMethodsMissingExample } from '../../scripts/check-example-coverage.js';

describe('@example coverage', () => {
  it('every public method/function has an @example', async () => {
    const missing = await findMethodsMissingExample();
    expect(missing).toEqual([]);
  }, 60_000);
});
