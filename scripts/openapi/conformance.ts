/** @internal Exercise SDK response validators with independently sourced OpenAPI examples. */
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ZodType } from 'zod';
import { inventory, root } from './inventory.js';
import { requestSchemaName, resolveValidator } from './validators.js';
import { loadContractSpec } from './compatibility.js';

export type Schema = {
  [key: string]: unknown;
  type?: string;
  properties?: Record<string, Schema>;
  required?: string[];
  items?: Schema;
  anyOf?: Schema[];
  oneOf?: Schema[];
  allOf?: Schema[];
  enum?: unknown[];
  const?: unknown;
  example?: unknown;
  minimum?: number;
  minLength?: number;
  minItems?: number;
  format?: string;
  additionalProperties?: boolean | Schema;
  nullable?: boolean;
  maximum?: number;
  maxLength?: number;
};

function mergeBranch(parent: Schema, branch: Schema): Schema {
  const result = { ...parent, ...branch };
  delete result.anyOf;
  delete result.oneOf;
  if (branch.anyOf) result.anyOf = branch.anyOf;
  if (branch.oneOf) result.oneOf = branch.oneOf;
  if (parent.properties || branch.properties)
    result.properties = { ...parent.properties, ...branch.properties };
  if (parent.required || branch.required)
    result.required = [...new Set([...(parent.required ?? []), ...(branch.required ?? [])])];
  return result;
}

/** @internal Resolve object inheritance before generating required-only or field variants.
 * Required names can be declared in a different allOf member from their properties.
 */
export function inheritedObject(schema: Schema, ancestors = new Set<Schema>()): Schema {
  if (!schema.allOf || ancestors.has(schema)) return schema;
  const next = new Set(ancestors).add(schema);
  const parts = schema.allOf.map((part) => inheritedObject(part, next));
  if (
    !parts.every(
      (part) =>
        (part.type === 'object' || part.properties) && !part.allOf && !part.anyOf && !part.oneOf,
    )
  )
    return schema;
  const own = { ...schema };
  delete own.allOf;
  return {
    ...Object.assign({}, ...parts),
    ...own,
    type: 'object',
    properties: Object.assign({}, ...parts.map((part) => part.properties), own.properties),
    required: [
      ...new Set([...parts.flatMap((part) => part.required ?? []), ...(own.required ?? [])]),
    ],
  };
}

/** @internal Deterministic boundary specimens: required-only and all declared fields. */
export function specimen(
  schema: Schema,
  full: boolean,
  ancestors: Set<Schema> = new Set(),
): unknown {
  const original = schema;
  schema = inheritedObject(schema);
  if ('const' in schema) return schema.const;
  if (schema.enum?.length) return schema.enum[0];
  if (schema.type === 'null') return null;
  const next = new Set(ancestors).add(original);
  next.add(schema);
  const choices = schema.oneOf ?? schema.anyOf;
  if (choices?.length) {
    const candidate = choices.find((s) => s.type !== 'null' && !ancestors.has(s)) ?? choices[0];
    return specimen(mergeBranch(schema, candidate), full, next);
  }
  if (schema.allOf) {
    const parts = schema.allOf.map((s) => specimen(s, full, next));
    return parts.every((part) => part && typeof part === 'object' && !Array.isArray(part))
      ? Object.assign({}, ...parts)
      : parts[0];
  }
  if (schema.type === 'object' || schema.properties) {
    const props = Object.entries(schema.properties ?? {}).filter(
      ([name, child]) => (full || schema.required?.includes(name)) && !ancestors.has(child),
    );
    return Object.fromEntries(props.map(([key, child]) => [key, specimen(child, full, next)]));
  }
  if (schema.type === 'array') {
    if (schema.items && ancestors.has(schema.items)) {
      if ((schema.minItems ?? 0) > 0)
        throw new Error('Cannot generate a finite specimen for this required recursive array');
      return [];
    }
    const length = schema.minItems ?? (full && schema.items ? 1 : 0);
    return Array.from({ length }, () => (schema.items ? specimen(schema.items, full, next) : null));
  }
  if (schema.type === 'integer' || schema.type === 'number') return schema.minimum ?? 1;
  if (schema.type === 'boolean') return false;
  if (schema.type === 'string') {
    if (schema.format === 'uuid') return '550e8400-e29b-41d4-a716-446655440000';
    if (schema.format === 'date-time') return '2026-09-06T00:00:00Z';
    if (schema.format === 'date') return '2026-09-06';
    if (schema.format === 'uri' || schema.format === 'url') return 'https://example.test';
    if (schema.format === 'email') return 'test@example.test';
    return 'x'.repeat(Math.max(1, schema.minLength ?? 1));
  }
  return {};
}

/** @internal Vary every nested union, enum and nullable field independently, without a Cartesian explosion. */
export function variants(
  schema: Schema,
  ancestors = new Set<Schema>(),
): { label: string; value: unknown }[] {
  if (ancestors.has(schema)) return [];
  const next = new Set(ancestors).add(schema);
  schema = inheritedObject(schema);
  next.add(schema);
  const results = [
    { label: 'required-only', value: specimen(schema, false) },
    { label: 'all-fields', value: specimen(schema, true) },
  ];
  if (schema.nullable) results.push({ label: 'nullable', value: null });
  if (schema.enum)
    for (const value of schema.enum) results.push({ label: `enum:${String(value)}`, value });
  if (schema.type === 'string' && schema.maxLength !== undefined && !schema.format && !schema.enum)
    results.push({ label: 'maxLength', value: 'x'.repeat(schema.maxLength) });
  if ((schema.type === 'integer' || schema.type === 'number') && schema.maximum !== undefined)
    results.push({ label: 'maximum', value: schema.maximum });
  const choices = schema.anyOf ?? schema.oneOf;
  if (choices)
    for (const [i, branch] of choices.entries())
      for (const variant of variants(mergeBranch(schema, branch), next))
        results.push({ label: `branch[${i}].${variant.label}`, value: variant.value });
  else if (schema.type === 'array' && schema.items) {
    for (const variant of variants(schema.items, next))
      results.push({
        label: `[].${variant.label}`,
        value: Array.from({ length: Math.max(1, schema.minItems ?? 1) }, () => variant.value),
      });
  } else if (schema.properties) {
    const base = specimen(schema, true) as Record<string, unknown>;
    for (const [key, child] of Object.entries(schema.properties))
      for (const variant of variants(child, next))
        results.push({
          label: `${key}.${variant.label}`,
          value: { ...base, [key]: variant.value },
        });
  }
  const seen = new Set<string>();
  return results.filter((result) => {
    const key = JSON.stringify(result.value);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function checkConformance(
  direction: 'response' | 'request' = 'response',
  exhaustive = false,
  corrected = true,
) {
  const domains = await inventory();
  const results = [];
  for (const domain of domains) {
    const spec = await loadContractSpec(
      join(process.env.AIRS_OPENAPI_DIR ?? join(root, 'schemas'), domain.file),
      domain.plane,
      corrected,
    );
    for (const operation of domain.operations) {
      const op = (spec.paths?.[operation.path] as Record<string, unknown>)?.[
        operation.method.toLowerCase()
      ] as {
        requestBody?: { content?: Record<string, { schema?: Schema }> };
        responses?: Record<string, { content?: Record<string, { schema?: Schema }> }>;
      };
      for (const call of operation.implementations) {
        const schemaName = direction === 'request' ? requestSchemaName(call) : call.responseSchema;
        const validator = resolveValidator(schemaName);
        for (const [status, response] of Object.entries(
          direction === 'request' ? { request: op.requestBody ?? {} } : (op.responses ?? {}),
        )) {
          if (direction === 'response' && !/^2\d\d$/.test(status)) continue;
          const schema = response.content?.['application/json']?.schema;
          if (!schema) continue;
          if (!(validator instanceof ZodType)) {
            results.push({
              plane: domain.plane,
              operation: `${operation.method} ${operation.path}`,
              member: call.member,
              schema: schemaName,
              status,
              specimen: 'missing-validator',
              ok: false,
              issues: [
                {
                  path: '',
                  code: 'missing_validator',
                  message: 'Documented JSON body has no resolvable SDK validator',
                },
              ],
            });
            continue;
          }
          const specimens = exhaustive
            ? variants(schema)
            : [false, true].map((full) => ({
                label: full ? 'all-fields' : 'required-only',
                value: specimen(schema, full),
              }));
          for (const sample of specimens) {
            const parsed = validator.safeParse(sample.value);
            results.push({
              plane: domain.plane,
              operation: `${operation.method} ${operation.path}`,
              member: call.member,
              schema: schemaName,
              status,
              specimen: sample.label,
              ok: parsed.success,
              issues: parsed.success
                ? []
                : parsed.error.issues.map((issue) => ({
                    path: issue.path.join('.'),
                    code: issue.code,
                    message: issue.message,
                  })),
            });
          }
        }
      }
    }
  }
  return results;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const direction = process.argv.includes('--requests') ? 'request' : 'response';
  const results = await checkConformance(
    direction,
    process.argv.includes('--variants'),
    !process.argv.includes('--raw'),
  );
  if (process.argv.includes('--json')) console.log(JSON.stringify(results, null, 2));
  else {
    console.log(
      `${results.filter((r) => r.ok).length}/${results.length} OpenAPI ${direction} specimens accepted`,
    );
    for (const result of results.filter((r) => !r.ok)) console.log(JSON.stringify(result));
  }
  if (results.some((r) => !r.ok)) process.exitCode = 1;
}
