/** @internal Reject vulnerable image parser inputs before the Docusaurus build.
 * This mitigates repository image inputs; it does not patch the upstream package.
 * GHSA-w3rx-r6r6-pgpr and GHSA-5p2g-fcmc-qvqq remain tracked until upstream fixes land.
 */
import { closeSync, openSync, readSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function blockedImageFormat(header: Uint8Array): string | undefined {
  const bytes = Buffer.from(header);
  if (bytes.subarray(0, 4).toString('ascii') === 'icns') return 'ICNS';
  if (bytes.subarray(4, 8).toString('ascii') === 'JXL ') return 'JPEG XL container';
  if (bytes[0] === 0xff && bytes[1] === 0x0a) return 'JPEG XL codestream';
  // Reject ISO-BMFF containers before image-size's HEIF/AVIF box traversal runs.
  if (bytes.subarray(4, 8).toString('ascii') === 'ftyp') return 'ISO-BMFF (HEIF/AVIF)';
  return undefined;
}

export function checkDocImageInputs(directory: string): number {
  let checked = 0;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (['node_modules', 'build', '.docusaurus', '.git'].includes(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isSymbolicLink())
      throw new Error(`Review and replace documentation symlink: ${path}`);
    if (entry.isDirectory()) checked += checkDocImageInputs(path);
    else if (entry.isFile()) {
      const descriptor = openSync(path, 'r');
      const header = Buffer.alloc(12);
      try {
        const length = readSync(descriptor, header, 0, header.length, 0);
        const kind = blockedImageFormat(header.subarray(0, length));
        if (kind)
          throw new Error(
            `Blocked ${kind} documentation input: ${path}. Convert to PNG, JPEG, WebP or SVG before building.`,
          );
        checked++;
      } finally {
        closeSync(descriptor);
      }
    }
  }
  return checked;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const directory = fileURLToPath(new URL('../docs-site/', import.meta.url));
  console.log(
    `Documentation image guard: ${checkDocImageInputs(directory)} files checked by content signature.`,
  );
}
