import { describe, it, expect } from 'vitest';
import { generateWorkspaceScopeName } from '../../src/iam/scope-name.js';

describe('generateWorkspaceScopeName', () => {
  it('matches the SCM shape: ws_<stem>_<6 lowercase alphanumerics>', () => {
    expect(generateWorkspaceScopeName('truffles')).toMatch(/^ws_truffles_[a-z0-9]{6}$/);
  });

  it('lower-cases and collapses non-alphanumeric runs to a single underscore', () => {
    expect(generateWorkspaceScopeName('Recipe Gen (EU) -- v2')).toMatch(
      /^ws_recipe_gen_eu_v2_[a-z0-9]{6}$/,
    );
  });

  it('never yields leading/trailing underscores in the stem, and survives an empty stem', () => {
    expect(generateWorkspaceScopeName('  ___  ')).toMatch(/^ws_workspace_[a-z0-9]{6}$/);
    expect(generateWorkspaceScopeName('!!prod!!')).toMatch(/^ws_prod_[a-z0-9]{6}$/);
  });

  it('produces distinct names for the same input', () => {
    const names = new Set(Array.from({ length: 20 }, () => generateWorkspaceScopeName('x')));
    expect(names.size).toBeGreaterThan(1);
  });
});
