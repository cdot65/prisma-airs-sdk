import { describe, expect, it } from 'vitest';
import { collectCallSites, normalizePath } from '../../scripts/openapi/inventory.js';
import gateway from './gateway-manifest.json';
import { gatewayDisposition } from '../../scripts/openapi/gateway-status.js';
import { querySpecimen, queryWireValues } from '../../scripts/openapi/query-fixtures.js';

const sources = import.meta.glob('./fixtures/*.json', { eager: true, import: 'default' }) as Record<
  string,
  {
    source: string;
    sha256: string;
    cases: {
      method: string;
      path: string;
      call: { plane: string; source: string; member: string };
    }[];
  }
>;
const calls = collectCallSites();
describe('pinned operation inventory', () => {
  it('keeps retired OpenAI routes as gaps without reducing the denominator or replacing Responses', () => {
    const retired = gateway.operations.filter((op) =>
      /^\/(assistants|threads)(\/|$)/.test(op.path),
    );
    expect(retired).toHaveLength(23);
    expect(retired.every((op) => op.status === 'runtime-retired-upstream')).toBe(true);
    expect(gatewayDisposition('POST', '/responses', true).status).toBe('direct-contract');
    expect(gatewayDisposition('GET', '/assistants', true).status).toBe('direct-contract');
  });
  it('uses an independent exact query-serialization oracle with multi-item arrays', () => {
    const parameter = {
      name: 'status',
      in: 'query',
      schema: { type: 'array', items: { type: 'string', enum: ['ONLINE', 'OFFLINE'] } },
    };
    const values = querySpecimen(parameter);
    expect(values).toEqual(['ONLINE', 'OFFLINE']);
    expect(queryWireValues(parameter, values)).toEqual(['ONLINE', 'OFFLINE']);
    expect(queryWireValues({ ...parameter, explode: true }, values)).toEqual(['ONLINE', 'OFFLINE']);
    expect(queryWireValues({ ...parameter, explode: false }, values)).toEqual(['ONLINE,OFFLINE']);
    expect(queryWireValues(parameter, false)).toEqual(['false']);
    expect(queryWireValues(parameter, 0)).toEqual(['0']);
    expect(() => queryWireValues({ ...parameter, style: 'deepObject' }, values)).toThrow(
      'Unsupported query style',
    );
    expect(() => queryWireValues(parameter, {})).toThrow('Object query serialization');
    expect(
      querySpecimen({ ...parameter, schema: { anyOf: [parameter.schema, { type: 'null' }] } }),
    ).toEqual(values);
    expect(querySpecimen({ name: 'enabled', in: 'query', schema: { type: 'boolean' } })).toBe(
      false,
    );
    expect(() =>
      querySpecimen({ ...parameter, schema: { ...parameter.schema, maxItems: 1 } }),
    ).toThrow('multi-item array');
  });
  it('retains all 149 AIRS operations in transport coverage', () => {
    const operations = Object.values(sources)
      .flatMap((s) => s.cases)
      .filter((c) => c.call.plane !== 'gateway');
    expect(
      new Set(operations.map((c) => `${c.call.plane}:${c.method}:${normalizePath(c.path)}`)).size,
    ).toBe(149);
    for (const op of operations)
      expect(
        calls.some(
          (c) =>
            c.plane === op.call.plane &&
            c.method === op.method &&
            normalizePath(c.path) === normalizePath(op.path) &&
            c.member === op.call.member,
        ),
      ).toBe(true);
    for (const source of Object.values(sources)) expect(source.sha256).toMatch(/^[a-f0-9]{64}$/);
  });
  it('keeps all 242 upstream gateway operations visible, including gaps', () => {
    expect(gateway.operations).toHaveLength(242);
    expect(new Set(gateway.operations.map((op) => `${op.method}:${op.path}`)).size).toBe(242);
    for (const op of gateway.operations) {
      const direct = calls.some(
        (c) =>
          c.plane === 'gateway' &&
          c.method === op.method &&
          normalizePath(c.path) === normalizePath(op.path),
      );
      expect(gatewayDisposition(op.method, op.path, direct).status).toBe(op.status);
    }
    expect(gateway.operations.filter((o) => o.status === 'direct-contract')).toHaveLength(137);
  });
});
