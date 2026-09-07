import { describe, expect, it } from 'vitest';
import { specimen, variants, type Schema } from '../../scripts/openapi/conformance.js';

describe('recursive OpenAPI specimens', () => {
  it('terminates optional recursive arrays with an empty array, never invalid null children', () => {
    const operation: Schema = { type: 'object', properties: {} };
    const choice: Schema = {
      anyOf: [operation, { type: 'object', properties: { value: { type: 'string' } } }],
    };
    operation.properties!.operands = { type: 'array', items: choice };
    for (const sample of [
      specimen(operation, true),
      ...variants(operation).map((item) => item.value),
    ])
      expect(JSON.stringify(sample)).not.toContain('null');
  });

  it('rejects a recursive minimum that cannot terminate instead of fabricating a specimen', () => {
    const loop: Schema = { type: 'array', minItems: 1 };
    loop.items = loop;
    expect(() => specimen(loop, true)).toThrow('recursive array');
  });
});
