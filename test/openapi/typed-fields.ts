import { z } from 'zod';
import type { Schema } from '../../scripts/openapi/conformance.js';

function branches(schema: z.ZodTypeAny): z.ZodTypeAny[] {
  if (
    schema instanceof z.ZodOptional ||
    schema instanceof z.ZodNullable ||
    schema instanceof z.ZodDefault
  )
    return branches(schema._def.innerType);
  if (schema instanceof z.ZodEffects) return branches(schema.innerType());
  if (schema instanceof z.ZodLazy) return branches(schema.schema);
  if (schema instanceof z.ZodUnion) return schema.options.flatMap(branches);
  if (schema instanceof z.ZodIntersection)
    return [...branches(schema._def.left), ...branches(schema._def.right)];
  return [schema];
}

/** A permissive response parser must not silently replace declared types with unknown/any. */
export function untypedFields(
  wire: Schema,
  validators: z.ZodTypeAny[],
  path = '',
  ancestors = new Set<Schema>(),
): string[] {
  if (ancestors.has(wire)) return [];
  const next = new Set(ancestors).add(wire);
  const sdk = validators.flatMap(branches);
  const gaps: string[] = [];
  for (const choice of wire.allOf ?? wire.anyOf ?? wire.oneOf ?? [])
    gaps.push(...untypedFields(choice, sdk, path, next));
  if (wire.type === 'array' && wire.items) {
    let arrays = sdk.filter((s): s is z.ZodArray<z.ZodTypeAny> => s instanceof z.ZodArray);
    if (wire.items.type === 'array') {
      const nested = arrays.filter((s) => branches(s.element).some((v) => v instanceof z.ZodArray));
      if (nested.length) arrays = nested;
    }
    gaps.push(
      ...untypedFields(
        wire.items,
        arrays.map((s) => s.element),
        `${path}[]`,
        next,
      ),
    );
  }
  const objects = sdk.filter((s): s is z.AnyZodObject => s instanceof z.ZodObject);
  for (const [field, child] of Object.entries(wire.properties ?? {})) {
    const fullPath = path ? `${path}.${field}` : field;
    const candidates = objects
      .map((s) => s.shape[field] as z.ZodTypeAny | undefined)
      .filter((s): s is z.ZodTypeAny => !!s);
    const declaresType = !!(
      child.type ||
      child.oneOf ||
      child.anyOf ||
      child.allOf ||
      child.properties ||
      child.enum
    );
    if (
      !candidates.length ||
      (declaresType &&
        !candidates
          .flatMap(branches)
          .some((s) => !(s instanceof z.ZodUnknown) && !(s instanceof z.ZodAny)))
    )
      gaps.push(fullPath);
    else gaps.push(...untypedFields(child, candidates, fullPath, next));
  }
  return gaps;
}
