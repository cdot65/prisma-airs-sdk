/** @internal Count modeled properties in operation responses, including nested arrays and unions. */
import { z } from 'zod';
import { isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inventory, root, type DomainInventory } from './inventory.js';
import type { Schema } from './conformance.js';
import * as models from '../../src/models/index.js';
import { requestSchemaName, resolveValidator } from './validators.js';
import { loadContractSpec } from './compatibility.js';

const names = new Map<z.ZodTypeAny, string>();
for (const [name, value] of Object.entries(models))
  if (value instanceof z.ZodType) names.set(value, name);
function branches(schema: z.ZodTypeAny): z.ZodTypeAny[] {
  // This custom predicate has a concrete exported JSON-object type and rejects non-objects.
  // Its Zod implementation uses ZodAny internally; that does not make its public contract `any`.
  if (schema === models.GatewayJsonObjectSchema) return [z.record(models.GatewayJsonValueSchema)];
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
export interface FieldFinding {
  owner: string;
  field: string;
  schema: Schema;
  operation: string;
}
export async function fieldCoverage(
  direction: 'response' | 'request' = 'response',
  corrected = true,
  domains?: DomainInventory[],
) {
  let total = 0;
  let modeled = 0;
  const missing = new Map<string, FieldFinding>();
  const opaque = new Map<string, Schema[]>();
  for (const domain of domains ?? (await inventory())) {
    const spec = await loadContractSpec(
      isAbsolute(domain.file)
        ? domain.file
        : join(process.env.AIRS_OPENAPI_DIR ?? join(root, 'schemas'), domain.file),
      domain.plane,
      corrected,
    );
    for (const op of domain.operations) {
      const operation = (spec.paths?.[op.path] as Record<string, unknown>)?.[
        op.method.toLowerCase()
      ] as {
        requestBody?: { content?: Record<string, { schema?: Schema }> };
        responses?: Record<string, { content?: Record<string, { schema?: Schema }> }>;
      };
      for (const call of op.implementations) {
        const schemaName = direction === 'response' ? call.responseSchema : requestSchemaName(call);
        const validator = resolveValidator(schemaName) ?? z.unknown();
        const visited = new Map<Schema, Set<z.ZodTypeAny>>();
        const visit = (wire: Schema, sdk: z.ZodTypeAny, owner: string) => {
          const seen = visited.get(wire) ?? new Set<z.ZodTypeAny>();
          if (seen.has(sdk)) return;
          seen.add(sdk);
          visited.set(wire, seen);
          const sdkBranches = branches(sdk);
          if (
            sdkBranches.every(
              (branch) =>
                branch instanceof z.ZodUnknown ||
                branch instanceof z.ZodAny ||
                branch instanceof z.ZodRecord,
            )
          ) {
            const shapes = opaque.get(owner) ?? [];
            if (!shapes.includes(wire)) shapes.push(wire);
            opaque.set(owner, shapes);
          }
          if (wire.allOf) {
            for (const part of wire.allOf) visit(part, sdk, owner);
            return;
          }
          if (wire.oneOf || wire.anyOf) {
            for (const part of wire.oneOf ?? wire.anyOf ?? []) visit(part, sdk, owner);
            return;
          }
          if (wire.type === 'array' && wire.items) {
            let arrays = sdkBranches.filter(
              (s): s is z.ZodArray<z.ZodTypeAny> => s instanceof z.ZodArray,
            );
            // A union can intentionally accept both legacy flat and documented nested arrays.
            // Compare the documented nesting only to branches representing that wire shape.
            if (wire.items.type === 'array') {
              const nested = arrays.filter((s) =>
                branches(s.element).some((b) => b instanceof z.ZodArray),
              );
              if (nested.length) arrays = nested;
            }
            if (!arrays.length) visit(wire.items, z.unknown(), owner + '[]');
            const elements = arrays.map((branch) => branch.element);
            if (elements.length) {
              // A union of arrays is an alternative, not a requirement for each array's
              // elements to implement every sibling alternative (Responses input/output).
              const element =
                elements.length === 1
                  ? elements[0]
                  : z.union(elements as [z.ZodTypeAny, z.ZodTypeAny, ...z.ZodTypeAny[]]);
              visit(wire.items, element, names.get(element) ?? owner + '[]');
            }
          }
          if (wire.properties) {
            const objects = sdkBranches.filter(
              (s): s is z.AnyZodObject => s instanceof z.ZodObject,
            );
            // Keep every branch's field type. A null-only variant must not overwrite a
            // sibling's object type (for example CLARA's null language vs language metadata).
            const alternatives: Record<string, z.ZodTypeAny[]> = {};
            for (const object of objects)
              for (const [key, value] of Object.entries(object.shape)) {
                const candidates = alternatives[key] ?? [];
                if (!candidates.includes(value as z.ZodTypeAny))
                  candidates.push(value as z.ZodTypeAny);
                alternatives[key] = candidates;
              }
            const shape = Object.fromEntries(
              Object.entries(alternatives).map(([key, candidates]) => [
                key,
                candidates.length === 1
                  ? candidates[0]
                  : z.union(candidates as [z.ZodTypeAny, z.ZodTypeAny, ...z.ZodTypeAny[]]),
              ]),
            ) as Record<string, z.ZodTypeAny>;
            const objectName = (objects[0] && names.get(objects[0])) ?? names.get(sdk) ?? owner;
            for (const [field, value] of Object.entries(wire.properties)) {
              total++;
              const declaresType = !!(
                value.type ||
                value.oneOf ||
                value.anyOf ||
                value.allOf ||
                value.properties ||
                value.enum
              );
              const typed =
                shape[field] &&
                (!declaresType ||
                  branches(shape[field]).some(
                    (branch) => !(branch instanceof z.ZodUnknown) && !(branch instanceof z.ZodAny),
                  ));
              if (typed) {
                modeled++;
                visit(value, shape[field], names.get(shape[field]) ?? `${objectName}.${field}`);
              } else {
                missing.set(`${objectName}:${field}`, {
                  owner: objectName,
                  field,
                  schema: value,
                  operation: `${op.method} ${op.path}`,
                });
                visit(value, z.unknown(), `${objectName}.${field}`);
              }
            }
          }
        };
        if (direction === 'request') {
          const wire = operation.requestBody?.content?.['application/json']?.schema;
          if (wire) visit(wire, validator, schemaName ?? `${call.source}:${call.member}`);
        } else
          for (const [status, response] of Object.entries(operation.responses ?? {})) {
            const wire = response.content?.['application/json']?.schema;
            if (/^2\d\d$/.test(status) && wire)
              visit(wire, validator, schemaName ?? `${call.source}:${call.member}`);
          }
      }
    }
  }
  return {
    total,
    modeled,
    percentage: total ? (modeled / total) * 100 : 0,
    missing: [...missing.values()],
    opaque,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const direction = process.argv.includes('--requests') ? 'request' : 'response';
  const report = await fieldCoverage(direction, !process.argv.includes('--raw'));
  console.log(
    `Typed ${direction} properties: ${report.modeled}/${report.total} (${report.percentage.toFixed(2)}%); unique gaps: ${report.missing.length}`,
  );
  for (const item of report.missing)
    console.log(`${item.owner}.${item.field}: ${JSON.stringify(item.schema)}`);
}
