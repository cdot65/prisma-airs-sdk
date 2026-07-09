import { describe, it, expect } from 'vitest';
import type { OpenAPIV3 } from 'openapi-types';
import { resolveOpenApiName, NAME_SUFFIXES } from '../../scripts/preflight/resolve-name.js';

const obj: OpenAPIV3.SchemaObject = { type: 'object' };

describe('resolveOpenApiName', () => {
  it('matches by bare name when present', () => {
    const map = new Map([['Item', obj]]);
    expect(resolveOpenApiName('Item', map)?.matchedName).toBe('Item');
  });

  it('falls back to <Name>Object suffix', () => {
    const map = new Map([['DbsEntryObject', obj]]);
    expect(resolveOpenApiName('DbsEntry', map)?.matchedName).toBe('DbsEntryObject');
  });

  it('falls back to <Name>Schema suffix (upstream components named *Schema)', () => {
    const map = new Map([['LanguageOptionSchema', obj]]);
    expect(resolveOpenApiName('LanguageOption', map)?.matchedName).toBe('LanguageOptionSchema');
  });

  it('prefers bare name over a suffixed alternate when both exist', () => {
    const map = new Map([
      ['Item', obj],
      ['ItemObject', obj],
    ]);
    expect(resolveOpenApiName('Item', map)?.matchedName).toBe('Item');
  });

  it('returns undefined when nothing matches', () => {
    expect(resolveOpenApiName('Nope', new Map())).toBeUndefined();
  });

  it('returns the schema object on match', () => {
    const map = new Map([['Item', obj]]);
    expect(resolveOpenApiName('Item', map)?.schema).toBe(obj);
  });

  it('NAME_SUFFIXES starts with empty string', () => {
    expect(NAME_SUFFIXES[0]).toBe('');
  });
});
