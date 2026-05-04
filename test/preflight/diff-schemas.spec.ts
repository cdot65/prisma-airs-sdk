import { describe, it, expect } from 'vitest';
import { diffSchemas } from '../../scripts/preflight/diff-schemas.js';
import type { JsonSchema } from '../../scripts/preflight/diff-schemas.js';

const openapi: JsonSchema = {
  type: 'object',
  required: ['id', 'name'],
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    count: { type: 'integer' },
  },
};

describe('diffSchemas — happy path', () => {
  it('returns no findings when schemas match', () => {
    const zod: JsonSchema = {
      type: 'object',
      required: ['id', 'name'],
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        count: { type: 'integer' },
      },
    };
    expect(diffSchemas(zod, openapi, 'Item')).toEqual([]);
  });

  it('returns no findings when Zod has fewer optional fields than OpenAPI', () => {
    // Zod is allowed to be a subset for non-required fields (passthrough handles extras)
    const zod: JsonSchema = {
      type: 'object',
      required: ['id', 'name'],
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
      },
    };
    expect(diffSchemas(zod, openapi, 'Item')).toEqual([]);
  });
});

describe('diffSchemas — required-field drift', () => {
  it('flags when Zod is missing a field OpenAPI marks as required', () => {
    const zod: JsonSchema = {
      type: 'object',
      required: ['id'],
      properties: { id: { type: 'string' } },
    };
    const findings = diffSchemas(zod, openapi, 'Item');
    expect(
      findings.some((f) => f.kind === 'missing-required-field' && f.path.includes('name')),
    ).toBe(true);
  });

  it('flags when Zod has a required field OpenAPI does not require', () => {
    const zod: JsonSchema = {
      type: 'object',
      required: ['id', 'name', 'count'],
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        count: { type: 'integer' },
      },
    };
    const findings = diffSchemas(zod, openapi, 'Item');
    expect(
      findings.some((f) => f.kind === 'extra-required-field' && f.path.includes('count')),
    ).toBe(true);
  });
});

describe('diffSchemas — type drift', () => {
  it('flags primitive type mismatch on a shared field', () => {
    const zod: JsonSchema = {
      type: 'object',
      required: ['id', 'name'],
      properties: {
        id: { type: 'integer' }, // wrong
        name: { type: 'string' },
      },
    };
    const findings = diffSchemas(zod, openapi, 'Item');
    expect(findings.some((f) => f.kind === 'type-mismatch' && f.path.includes('id'))).toBe(true);
  });

  it('treats integer and number as compatible', () => {
    const zod: JsonSchema = {
      type: 'object',
      required: ['id', 'name'],
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        count: { type: 'number' }, // OpenAPI says integer
      },
    };
    expect(diffSchemas(zod, openapi, 'Item')).toEqual([]);
  });
});

describe('diffSchemas — phantom fields', () => {
  it('flags a field present in Zod but not in OpenAPI', () => {
    const zod: JsonSchema = {
      type: 'object',
      required: ['id', 'name'],
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        ghost: { type: 'string' }, // not in OpenAPI
      },
    };
    const findings = diffSchemas(zod, openapi, 'Item');
    expect(findings.some((f) => f.kind === 'extra-field' && f.path.includes('ghost'))).toBe(true);
  });
});

describe('diffSchemas — top-level type mismatch', () => {
  it('flags when one is object and the other is array', () => {
    const zod: JsonSchema = { type: 'array', items: { type: 'string' } };
    const findings = diffSchemas(zod, openapi, 'Item');
    expect(findings.some((f) => f.kind === 'type-mismatch' && f.path === '$')).toBe(true);
  });
});

describe('diffSchemas — output shape', () => {
  it('every finding includes schemaName', () => {
    const zod: JsonSchema = { type: 'object', required: [], properties: {} };
    const findings = diffSchemas(zod, openapi, 'Bag');
    for (const f of findings) {
      expect(f.schemaName).toBe('Bag');
      expect(typeof f.message).toBe('string');
      expect(f.message.length).toBeGreaterThan(0);
    }
  });
});
