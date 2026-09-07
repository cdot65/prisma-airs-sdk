/** @internal Anchor generated patches to this checkout, not the caller's working directory. */
import { fileURLToPath } from 'node:url';
import { resolve, sep } from 'node:path';
const root = fileURLToPath(new URL('../../', import.meta.url));
export function emitPatch(destination: string, content: string): void {
  const target = resolve(root, destination);
  if (!target.startsWith(resolve(root) + sep))
    throw new Error('Generated patch must stay within the SDK checkout');
  console.log(
    `*** Begin Patch\n*** Add File: ${target}\n${content
      .replace(/\n+$/, '')
      .split('\n')
      .map((line) => '+' + line)
      .join('\n')}\n*** End Patch`,
  );
}
