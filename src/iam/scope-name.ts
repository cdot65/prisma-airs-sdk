/** Characters SCM's own generated suffixes use (`ws_truffles_ggolfu`, `ws_production_bx7qw0`). */
const SUFFIX_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';
const SUFFIX_LENGTH = 6;

/**
 * Generate a workspace scope name the way Strata Cloud Manager does: `ws_<name>_<suffix>`, where
 * `<name>` is the workspace display name lower-cased with every non-alphanumeric run collapsed to
 * `_`, and `<suffix>` is six random lowercase alphanumerics.
 *
 * Scope names are tenant-unique and immutable, so the suffix keeps repeated display names
 * (`Production`, `production`, `Production 2`) from colliding without a lookup.
 *
 * @param workspaceName - The workspace display name the scope will grant access to.
 * @returns A fresh scope name. Pure apart from the random suffix; never contacts SCM.
 * @example
 * ```ts
 * import { generateWorkspaceScopeName } from '@cdot65/prisma-airs-sdk';
 *
 * generateWorkspaceScopeName('Truffles'); // => 'ws_truffles_k3x9qa'
 * generateWorkspaceScopeName('Recipe Gen (EU)'); // => 'ws_recipe_gen_eu_7mz01b'
 * ```
 */
export function generateWorkspaceScopeName(workspaceName: string): string {
  const stem = workspaceName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  const bytes = new Uint8Array(SUFFIX_LENGTH);
  globalThis.crypto.getRandomValues(bytes);
  let suffix = '';
  for (const byte of bytes) suffix += SUFFIX_ALPHABET[byte % SUFFIX_ALPHABET.length];
  return `ws_${stem || 'workspace'}_${suffix}`;
}
