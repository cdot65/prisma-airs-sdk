import { afterEach, describe, expect, it } from 'vitest';
import { blockedImageFormat, checkDocImageInputs } from '../../scripts/check-doc-image-inputs.js';
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const directories: string[] = [];
function fixture(): string {
  const directory = mkdtempSync(join(tmpdir(), 'sdk-doc-image-guard-'));
  directories.push(directory);
  return directory;
}
afterEach(() => {
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true });
});

describe('documentation image parser guard', () => {
  it.each([
    ['69636e730000001000000000', 'ICNS'],
    ['0000000c4a584c200d0a870a', 'JPEG XL container'],
    ['ff0a00000000000000000000', 'JPEG XL codestream'],
    ['000000006674797068656963', 'ISO-BMFF (HEIF/AVIF)'],
    ['000000006674797061766966', 'ISO-BMFF (HEIF/AVIF)'],
  ])('rejects dangerous content regardless of extension: %s', (hex, name) => {
    expect(blockedImageFormat(Buffer.from(hex, 'hex'))).toBe(name);
  });
  it.each([
    '',
    '89504e470d0a1a0a00000000',
    'ffd8ffe000104a4649460001',
    '524946460000000057454250',
    '3c7376672077696474683d22',
  ])('allows unrelated input signatures: %s', (hex) => {
    expect(blockedImageFormat(Buffer.from(hex, 'hex'))).toBeUndefined();
  });
  it('walks source inputs while excluding generated and dependency trees', () => {
    const directory = fixture();
    mkdirSync(join(directory, 'docs'));
    writeFileSync(join(directory, 'docs', 'guide.md'), '# A guide');
    writeFileSync(join(directory, 'image.png'), Buffer.from('89504e470d0a1a0a', 'hex'));
    for (const ignored of ['node_modules', 'build', '.docusaurus', '.git']) {
      mkdirSync(join(directory, ignored));
      writeFileSync(join(directory, ignored, 'blocked.png'), Buffer.from('ff0a', 'hex'));
    }
    expect(checkDocImageInputs(directory)).toBe(2);
  });
  it('rejects a blocked format disguised as a documentation file', () => {
    const directory = fixture();
    writeFileSync(join(directory, 'not-an-image.md'), Buffer.from('ff0a', 'hex'));
    expect(() => checkDocImageInputs(directory)).toThrow('Blocked JPEG XL codestream');
  });
  it('rejects symlinks rather than following inputs outside the reviewed tree', () => {
    const directory = fixture();
    writeFileSync(join(directory, 'guide.md'), '# A guide');
    symlinkSync(join(directory, 'guide.md'), join(directory, 'linked.md'));
    expect(() => checkDocImageInputs(directory)).toThrow('documentation symlink');
  });
});
