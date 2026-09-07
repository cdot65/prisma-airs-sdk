/** @internal Independently verify that invalid OpenAPI request specimens are rejected.
 * Ajv first proves each mutation invalid; alternate union branches cannot create false failures.
 */
import Ajv from 'ajv';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inventory, root } from './inventory.js';
import { loadContractSpec } from './compatibility.js';
import { specimen, type Schema } from './conformance.js';
import { requestSchemaName, resolveValidator } from './validators.js';

const escape = (value: string) => value.replaceAll('~', '~0').replaceAll('/', '~1');
/** Preserve recursive schema identity as JSON references that Ajv can compile. */
export function withReferences(
  schema: Schema,
  pointer = '#',
  seen = new Map<Schema, string>(),
): Schema {
  const existing = seen.get(schema);
  if (existing) return { $ref: existing };
  seen.set(schema, pointer);
  const result = { ...schema };
  if (schema.properties)
    result.properties = Object.fromEntries(
      Object.entries(schema.properties).map(([key, child]) => [
        key,
        withReferences(child, `${pointer}/properties/${escape(key)}`, seen),
      ]),
    );
  if (schema.items) result.items = withReferences(schema.items, `${pointer}/items`, seen);
  if (schema.additionalProperties && typeof schema.additionalProperties === 'object')
    result.additionalProperties = withReferences(
      schema.additionalProperties,
      `${pointer}/additionalProperties`,
      seen,
    );
  for (const key of ['anyOf', 'oneOf', 'allOf'] as const)
    if (schema[key])
      result[key] = schema[key].map((child, index) =>
        withReferences(child, `${pointer}/${key}/${index}`, seen),
      );
  return result;
}
type Mutation = { path: string; constraint: string; value: unknown };
export function mutations(
  schema: Schema,
  value: unknown,
  ancestors = new Set<Schema>(),
): Mutation[] {
  if (ancestors.has(schema)) return [];
  const next = new Set(ancestors).add(schema);
  const results: Mutation[] = [];
  const add = (constraint: string, replacement: unknown) =>
    results.push({ path: '', constraint, value: replacement });
  if (schema.type) add('type', schema.type === 'string' ? 123 : 'invalid-type');
  if (schema.enum) add('enum', '__INVALID_ENUM__');
  if (schema.type === 'integer') add('integer', 1.5);
  if (schema.minimum !== undefined) add('minimum', schema.minimum - 1);
  if (schema.maximum !== undefined) add('maximum', schema.maximum + 1);
  if (schema.minLength && schema.minLength > 0) add('minLength', 'x'.repeat(schema.minLength - 1));
  if (schema.maxLength !== undefined && schema.maxLength < 100_000)
    add('maxLength', 'x'.repeat(schema.maxLength + 1));
  if (schema.minItems && schema.minItems > 0) add('minItems', []);
  if (schema.format === 'uuid' || schema.format === 'date-time' || schema.format === 'email')
    add('format', 'invalid-format');
  if (schema.properties && value && typeof value === 'object' && !Array.isArray(value)) {
    const object = value as Record<string, unknown>;
    for (const key of schema.required ?? []) {
      const replacement = { ...object };
      delete replacement[key];
      results.push({ path: key, constraint: 'required', value: replacement });
    }
    for (const [key, child] of Object.entries(schema.properties)) {
      if (!(key in object)) continue;
      for (const variant of mutations(child, object[key], next))
        results.push({
          ...variant,
          path: key + (variant.path ? '.' + variant.path : ''),
          value: { ...object, [key]: variant.value },
        });
    }
  }
  if (schema.items && Array.isArray(value) && value.length)
    for (const variant of mutations(schema.items, value[0], next))
      results.push({
        ...variant,
        path: '[0]' + (variant.path ? '.' + variant.path : ''),
        value: [variant.value, ...value.slice(1)],
      });
  for (const child of schema.anyOf ?? schema.oneOf ?? schema.allOf ?? [])
    results.push(...mutations(child, value, next));
  return results;
}

export async function negativeConformance() {
  const ajv = new Ajv({
    allErrors: true,
    nullable: true,
    unknownFormats: 'ignore',
    logger: false,
    validateSchema: false,
  });
  const results: {
    plane: string;
    operation: string;
    schema?: string;
    path: string;
    constraint: string;
    ok: boolean;
    normalized?: boolean;
  }[] = [];
  for (const domain of await inventory()) {
    const spec = await loadContractSpec(
      join(process.env.AIRS_OPENAPI_DIR ?? join(root, 'schemas'), domain.file),
      domain.plane,
    );
    for (const operation of domain.operations) {
      const op = (spec.paths?.[operation.path] as Record<string, unknown>)[
        operation.method.toLowerCase()
      ] as { requestBody?: { content?: Record<string, { schema?: Schema }> } };
      const schema = op.requestBody?.content?.['application/json']?.schema;
      if (!schema) continue;
      const valid = ajv.compile(withReferences(schema));
      const base = specimen(schema, true);
      if (!valid(base))
        throw new Error(
          `Base specimen is not valid OpenAPI: ${operation.method} ${operation.path}: ${ajv.errorsText(valid.errors)}`,
        );
      const seen = new Set<string>();
      for (const mutation of mutations(schema, base)) {
        const encoded = JSON.stringify(mutation.value);
        if (seen.has(encoded) || valid(mutation.value)) continue;
        seen.add(encoded);
        for (const call of operation.implementations) {
          const name = requestSchemaName(call);
          const validator = resolveValidator(name);
          const parsed = validator?.safeParse(mutation.value);
          // Input defaults/transforms are valid only when the actual outgoing body satisfies OpenAPI.
          const normalized = parsed?.success === true && valid(parsed.data) === true;
          results.push({
            plane: domain.plane,
            operation: `${operation.method} ${operation.path}`,
            schema: name,
            path: mutation.path,
            constraint: mutation.constraint,
            ok: !!parsed && (!parsed.success || normalized),
            ...(normalized ? { normalized: true } : {}),
          });
        }
      }
    }
  }
  return results;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const results = await negativeConformance();
  console.log(
    `${results.filter((r) => r.ok).length}/${results.length} invalid OpenAPI request specimens rejected or normalized to valid wire payloads (${results.filter((r) => r.normalized).length} normalized)`,
  );
  for (const result of results.filter((r) => !r.ok)) console.log(JSON.stringify(result));
  if (results.some((r) => !r.ok)) process.exitCode = 1;
}
