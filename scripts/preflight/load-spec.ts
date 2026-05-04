import SwaggerParser from '@apidevtools/swagger-parser';
import type { OpenAPIV3 } from 'openapi-types';

/**
 * @internal
 * Load + dereference an OpenAPI 3.x YAML/JSON spec and return a map from component schema name
 * to the inlined JSON Schema. All `$ref`s are resolved so callers can compare flat shapes.
 */
export async function loadSpec(path: string): Promise<Map<string, OpenAPIV3.SchemaObject>> {
  const api = (await SwaggerParser.dereference(path)) as OpenAPIV3.Document;
  const schemas = api.components?.schemas ?? {};
  const map = new Map<string, OpenAPIV3.SchemaObject>();
  for (const [name, schema] of Object.entries(schemas)) {
    map.set(name, schema as OpenAPIV3.SchemaObject);
  }
  return map;
}
