import Ajv from 'ajv';
import { describe, expect, it, vi } from 'vitest';
import { specimen, variants, type Schema } from '../../scripts/openapi/conformance.js';
import { mutations } from '../../scripts/openapi/negative-conformance.js';
import { resolveValidator } from '../../scripts/openapi/validators.js';
import { AIGatewayInferenceClient } from '../../src/ai-gateway/inference-client.js';
import { untypedFields } from './typed-fields.js';
import fixture from './provider-multipart.json';
import manifest from './gateway-manifest.json';

describe('independent frozen provider multipart contracts', () => {
  it('pins all four uploads to the audited source hash', () => {
    expect(fixture.sha256).toBe(manifest.sha256);
    expect(fixture.cases).toHaveLength(4);
  });
  for (const contract of fixture.cases)
    describe(contract.method, () => {
      const schema = contract.schema as Schema;
      const validator = resolveValidator(contract.validator)!;
      const binary = Object.entries(schema.properties ?? {})
        .filter(([, field]) => field.format === 'binary')
        .map(([name]) => name);
      const upload = new Blob([new Uint8Array([0, 255, 128, 10])], {
        type: 'application/octet-stream',
      });
      // Only declared binary strings become Blob. Wrong-type negative mutations stay wrong-type.
      const native = (value: unknown): unknown => {
        if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
        return Object.fromEntries(
          Object.entries(value).map(([name, field]) => [
            name,
            binary.includes(name) && typeof field === 'string' ? upload : field,
          ]),
        );
      };
      const ajv = new Ajv({
        allErrors: true,
        nullable: true,
        unknownFormats: 'ignore',
        logger: false,
        validateSchema: false,
      });
      const valid = ajv.compile(schema);
      const base = specimen(schema, true);
      it('models every non-binary property and identifies the binary parts explicitly', () => {
        expect(binary.length).toBeGreaterThan(0);
        expect(
          untypedFields(
            {
              ...schema,
              properties: Object.fromEntries(
                Object.entries(schema.properties ?? {}).filter(([name]) => !binary.includes(name)),
              ),
            },
            [validator],
          ),
        ).toEqual([]);
      });
      it('uses an independently valid base', () =>
        expect(valid(base), ajv.errorsText(valid.errors)).toBe(true));
      for (const sample of variants(schema))
        it(`accepts ${sample.label}`, () => {
          const result = validator.safeParse(native(sample.value));
          expect(result.success, result.success ? '' : JSON.stringify(result.error.issues)).toBe(
            true,
          );
        });
      for (const name of binary)
        it.each(['not-a-blob', {}, 1, false])(`rejects non-Blob ${name}: %j`, (value) => {
          expect(validator.safeParse({ ...(native(base) as object), [name]: value }).success).toBe(
            false,
          );
        });
      const seen = new Set<string>();
      for (const sample of mutations(schema, base)) {
        const encoded = JSON.stringify(sample.value);
        if (seen.has(encoded) || valid(sample.value)) continue;
        seen.add(encoded);
        it(`rejects invalid ${sample.path || '<root>'}: ${sample.constraint}`, () => {
          expect(valid(sample.value)).toBe(false);
          expect(validator.safeParse(native(sample.value)).success).toBe(false);
        });
      }
      it('encodes the complete schema specimen with exact form names and upload bytes', async () => {
        const body = validator.parse(native(base)) as Record<string, unknown>;
        // Exercise JSON mode here; separate provider tests cover all audio response formats.
        if (contract.path.startsWith('/audio/')) body.response_format = 'json';
        const response = contract.path.startsWith('/audio/')
          ? { text: 'Synthetic' }
          : { created: 1, data: [{ b64_json: 'AA==' }] };
        const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(response)));
        const client = new AIGatewayInferenceClient({
          endpoint: 'https://gateway.test/v1',
          apiKey: 'offline',
          fetch,
        });
        await (client as unknown as Record<string, (body: unknown) => Promise<unknown>>)[
          contract.method
        ](body);
        expect(fetch).toHaveBeenCalledOnce();
        const [url, init] = fetch.mock.calls[0];
        expect(url).toBe(`https://gateway.test/v1${contract.path}`);
        expect(new Headers(init.headers).has('content-type')).toBe(false);
        const form = init.body as FormData;
        const expectedNames: string[] = [];
        for (const [name, value] of Object.entries(body)) {
          if (value === null || value === undefined) continue;
          const key = Array.isArray(value) && !name.endsWith('[]') ? `${name}[]` : name;
          const values = Array.isArray(value) ? value : [value];
          expectedNames.push(...values.map(() => key));
          const parts = form.getAll(key);
          expect(parts).toHaveLength(values.length);
          for (let index = 0; index < values.length; index++) {
            const item = values[index];
            if (item instanceof Blob)
              expect(new Uint8Array(await (parts[index] as Blob).arrayBuffer())).toEqual(
                new Uint8Array(await item.arrayBuffer()),
              );
            else
              expect(parts[index]).toBe(
                typeof item === 'object' ? JSON.stringify(item) : String(item),
              );
          }
        }
        expect([...form.keys()].sort()).toEqual(expectedNames.sort());
      });
    });
});
