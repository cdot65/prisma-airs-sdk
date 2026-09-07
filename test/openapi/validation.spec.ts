import Ajv from 'ajv';
import { describe, expect, it } from 'vitest';
import { specimen, variants, type Schema } from '../../scripts/openapi/conformance.js';
import { mutations } from '../../scripts/openapi/negative-conformance.js';
import { resolveValidator } from '../../scripts/openapi/validators.js';
import { untypedFields } from './typed-fields.js';

interface Contract {
  direction: 'request' | 'response';
  validator: string;
  operations: string[];
  schema: Schema;
}
interface Fixture {
  source: string;
  sha256: string;
  contracts: Contract[];
}
const fixtures = import.meta.glob('./validation/*.json', {
  eager: true,
  import: 'default',
}) as Record<string, Fixture>;

/** Restore only local JSON pointers; no filesystem or network resolution is possible in CI. */
function restoreReferences(root: Schema): Schema {
  const copies = new Map<Schema, Schema>();
  function visit(schema: Schema): Schema {
    if (typeof schema.$ref === 'string') {
      if (!schema.$ref.startsWith('#'))
        throw new Error('Only local schema references are permitted');
      let resolved: unknown = root;
      for (const part of schema.$ref.slice(2).split('/').filter(Boolean))
        resolved = (resolved as Record<string, unknown>)[
          part.replaceAll('~1', '/').replaceAll('~0', '~')
        ];
      return visit(resolved as Schema);
    }
    const existing = copies.get(schema);
    if (existing) return existing;
    const result = { ...schema };
    copies.set(schema, result);
    if (schema.properties)
      result.properties = Object.fromEntries(
        Object.entries(schema.properties).map(([name, child]) => [name, visit(child)]),
      );
    if (schema.items) result.items = visit(schema.items);
    if (typeof schema.additionalProperties === 'object')
      result.additionalProperties = visit(schema.additionalProperties);
    for (const key of ['oneOf', 'anyOf', 'allOf'] as const)
      if (schema[key]) result[key] = schema[key].map(visit);
    return result;
  }
  return visit(root);
}

describe('independent OpenAPI request/response validation', () => {
  it('includes all seven AIRS source planes plus gateway runtime contracts', () =>
    expect(new Set(Object.values(fixtures).map((f) => f.source)).size).toBe(8));
  for (const fixture of Object.values(fixtures))
    describe(fixture.source, () => {
      const ajv = new Ajv({
        allErrors: true,
        nullable: true,
        unknownFormats: 'ignore',
        logger: false,
        validateSchema: false,
      });
      for (const contract of fixture.contracts) {
        const validator = resolveValidator(contract.validator);
        const schema = restoreReferences(contract.schema);
        describe(`${contract.direction} ${contract.validator}`, () => {
          it('explicitly models every declared nested field', () => {
            expect(validator).toBeDefined();
            expect(untypedFields(schema, [validator!])).toEqual([]);
          });
          for (const sample of variants(schema))
            it(`accepts ${sample.label}`, () => {
              expect(validator, 'The endpoint must have a concrete validator').toBeDefined();
              const parsed = validator!.safeParse(sample.value);
              expect(
                parsed.success,
                parsed.success ? '' : JSON.stringify(parsed.error.issues),
              ).toBe(true);
            });
          if (contract.direction === 'request') {
            const valid = ajv.compile(contract.schema);
            const base = specimen(schema, true);
            it('uses an independently valid base request', () =>
              expect(valid(base), ajv.errorsText(valid.errors)).toBe(true));
            const seen = new Set<string>();
            for (const sample of mutations(schema, base)) {
              const encoded = JSON.stringify(sample.value);
              if (seen.has(encoded) || valid(sample.value)) continue;
              seen.add(encoded);
              it(`rejects or normalizes invalid ${sample.path || '<root>'}: ${sample.constraint}`, () => {
                expect(valid(sample.value), 'Mutation must violate the source contract').toBe(
                  false,
                );
                const parsed = validator!.safeParse(sample.value);
                expect(
                  !parsed.success || valid(parsed.data),
                  'Invalid input must never become an invalid outgoing body',
                ).toBe(true);
              });
            }
          }
        });
      }
    });
});
