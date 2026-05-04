import type { OpenAPIV3 } from 'openapi-types';

/**
 * @internal
 * Suffixes tried in order when mapping a Zod `<Name>Schema` to an OpenAPI component name.
 * Empty string first so a direct match wins over any suffixed alternate.
 */
export const NAME_SUFFIXES = [
  '',
  'Object',
  'Response',
  'Request',
  'Result',
  'Detail',
  'List',
  'Item',
];

/**
 * @internal
 * Try each `NAME_SUFFIXES` entry against `specMap` and return the first match. Returns
 * `undefined` if no suffix matches — caller treats those as local helpers.
 */
export function resolveOpenApiName(
  shortName: string,
  specMap: Map<string, OpenAPIV3.SchemaObject>,
): { matchedName: string; schema: OpenAPIV3.SchemaObject } | undefined {
  for (const suffix of NAME_SUFFIXES) {
    const candidate = `${shortName}${suffix}`;
    const hit = specMap.get(candidate);
    if (hit) return { matchedName: candidate, schema: hit };
  }
  return undefined;
}
