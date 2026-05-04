import { describe, it, expect, beforeAll } from 'vitest';
import { writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadSpec } from '../../scripts/preflight/load-spec.js';

const fixture = `
openapi: 3.0.3
info:
  title: Test
  version: 1.0.0
paths: {}
components:
  schemas:
    Item:
      type: object
      required: [id, name]
      properties:
        id: { type: string }
        name: { type: string }
        count: { type: integer }
    Bag:
      type: object
      required: [items]
      properties:
        items:
          type: array
          items:
            $ref: '#/components/schemas/Item'
`;

let fixturePath: string;
let tmpDir: string;

describe('loadSpec', () => {
  beforeAll(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'preflight-'));
    fixturePath = join(tmpDir, 'fixture.yaml');
    await writeFile(fixturePath, fixture, 'utf-8');
  });

  it('returns a map of component schema names to JSON Schema', async () => {
    const map = await loadSpec(fixturePath);
    expect(map.size).toBeGreaterThanOrEqual(2);
    expect(map.has('Item')).toBe(true);
    expect(map.has('Bag')).toBe(true);
  });

  it('preserves required fields on each schema', async () => {
    const map = await loadSpec(fixturePath);
    const item = map.get('Item');
    expect(item?.required).toEqual(['id', 'name']);
  });

  it('dereferences $ref so nested schemas are inline', async () => {
    const map = await loadSpec(fixturePath);
    const bag = map.get('Bag');
    const items = (bag as { properties: { items: { items: unknown } } }).properties.items.items;
    expect(items).toMatchObject({ type: 'object', required: ['id', 'name'] });
  });

  it('throws on missing spec file', async () => {
    await expect(loadSpec('/nonexistent/path.yaml')).rejects.toThrow();
  });
});

describe('loadSpec — empty components', () => {
  it('returns empty map for spec with no components', async () => {
    const empty = `
openapi: 3.0.3
info: { title: Empty, version: 1.0.0 }
paths: {}
`;
    const path = join(tmpDir, 'empty.yaml');
    await writeFile(path, empty, 'utf-8');
    const map = await loadSpec(path);
    expect(map.size).toBe(0);
  });
});

describe('loadSpec cleanup', () => {
  it('removes tmpDir', async () => {
    await rm(tmpDir, { recursive: true, force: true });
    expect(true).toBe(true);
  });
});
