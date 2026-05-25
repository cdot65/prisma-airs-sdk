/**
 * @example coverage gate.
 *
 * Enumerates every public method and exported function in the SDK's public API
 * surface (via the TypeDoc reflection model) and reports any that lack an
 * `@example` JSDoc tag. Used to guarantee the generated API reference shows an
 * input/output example for every method.
 *
 * Usage:
 *   tsx scripts/check-example-coverage.ts            # exits 1 if any are missing
 *   tsx scripts/check-example-coverage.ts --warn-only # always exits 0
 */
import { fileURLToPath } from 'node:url';
import { Application, Comment, ReflectionKind, TSConfigReader, type Reflection } from 'typedoc';

/** Reflection kinds that must carry an `@example`. */
const TARGET_KINDS = ReflectionKind.Method | ReflectionKind.Function;

/** True if the reflection (or any of its call signatures) has an `@example` tag. */
function hasExample(refl: Reflection): boolean {
  const comments: Comment[] = [];
  if (refl.comment) comments.push(refl.comment);
  // Methods/functions usually carry their comment on the call signature.
  const sigs = (refl as { signatures?: { comment?: Comment }[] }).signatures;
  if (sigs) {
    for (const sig of sigs) {
      if (sig.comment) comments.push(sig.comment);
    }
  }
  return comments.some((c) => c.blockTags.some((t) => t.tag === '@example'));
}

/**
 * Convert the project with TypeDoc and return the fully-qualified names of every
 * public method/function missing an `@example`, sorted alphabetically.
 */
export async function findMethodsMissingExample(): Promise<string[]> {
  // Only use the tsconfig reader so the markdown-plugin options in typedoc.json
  // (which this script does not load) don't trip "unknown option" errors.
  const app = await Application.bootstrap(
    {
      entryPoints: ['src/index.ts'],
      excludeInternal: true,
      excludePrivate: true,
      excludeProtected: true,
      logLevel: 'Error',
    },
    [new TSConfigReader()],
  );
  const project = await app.convert();
  if (!project) {
    throw new Error('TypeDoc failed to convert the project');
  }
  const missing: string[] = [];
  for (const refl of project.getReflectionsByKind(TARGET_KINDS)) {
    // Skip members inherited from base classes (e.g. Error.captureStackTrace) —
    // they are not part of the SDK's authored API surface.
    if ((refl as { inheritedFrom?: unknown }).inheritedFrom) {
      continue;
    }
    if (!hasExample(refl)) {
      missing.push(refl.getFullName());
    }
  }
  return missing.sort((a, b) => a.localeCompare(b));
}

async function main(): Promise<void> {
  const warnOnly = process.argv.includes('--warn-only');
  const missing = await findMethodsMissingExample();
  if (missing.length === 0) {
    console.log('✓ @example coverage: every public method/function has an @example.');
    return;
  }
  console.error(`✗ ${missing.length} public method(s)/function(s) missing @example:`);
  for (const name of missing) {
    console.error(`  - ${name}`);
  }
  if (!warnOnly) {
    process.exit(1);
  }
}

const invokedDirectly = process.argv[1] === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  void main();
}
