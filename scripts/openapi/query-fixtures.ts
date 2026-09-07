/** @internal Query specimens and wire expectations derived from OpenAPI, not SDK serialization. */
import { specimen, type Schema } from './conformance.js';

export type QueryParameter = {
  name: string;
  in: string;
  required?: boolean;
  schema: Schema;
  style?: string;
  explode?: boolean;
};

const uuid = '550e8400-e29b-41d4-a716-446655440000';

/** @internal Exercise multiplicity: single-item arrays cannot distinguish form encodings. */
export function querySpecimen(parameter: QueryParameter): unknown {
  if (/uuid|_id$/.test(parameter.name) && parameter.schema.type === 'string') return uuid;
  const schema = parameter.schema;
  const array =
    schema.type === 'array'
      ? schema
      : [...(schema.anyOf ?? []), ...(schema.oneOf ?? [])].find(
          (branch) => branch.type === 'array',
        );
  if (!array) return specimen(schema, true);
  const item = array.items ?? {};
  const first = /^(scan|report)_ids$/.test(parameter.name) ? uuid : specimen(item, true);
  const second = item.enum?.[1] ?? first;
  const count = Math.max(2, array.minItems ?? 0);
  if (typeof array.maxItems === 'number' && count > array.maxItems)
    throw new Error(`Query ${parameter.name} cannot exercise a multi-item array`);
  return Array.from({ length: count }, (_, index) => (index === 0 ? first : second));
}

/** @internal OpenAPI form defaults to explode=true; explicit false uses one comma-delimited value.
 * https://spec.openapis.org/oas/v3.0.3.html#parameter-object
 * Unsupported future styles fail the audit rather than silently borrowing the SDK's behavior.
 */
export function queryWireValues(parameter: QueryParameter, value: unknown): string[] {
  if ((parameter.style ?? 'form') !== 'form')
    throw new Error(`Unsupported query style for ${parameter.name}: ${parameter.style}`);
  if (!Array.isArray(value)) {
    if (value !== null && typeof value === 'object')
      throw new Error(`Object query serialization is not modeled for ${parameter.name}`);
    return [String(value)];
  }
  const values = value.map(String);
  return parameter.explode === false ? [values.join(',')] : values;
}
