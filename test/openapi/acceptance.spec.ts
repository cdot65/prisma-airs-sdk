import { describe, expect, it } from 'vitest';
import { fullOperationAcceptance } from '../../scripts/openapi/acceptance.js';
import { specSources, type DomainInventory } from '../../scripts/openapi/inventory.js';
import gateway from './gateway-manifest.json';

const domain = (plane: string, implemented = 1, total = implemented): DomainInventory => ({
  plane,
  file: `${plane}.yaml`,
  sha256: 'a'.repeat(64),
  components: 0,
  operations: Array.from({ length: total }, (_, index) => ({
    method: 'GET',
    path: `/resource/${index}`,
    implementations:
      index < implemented
        ? [{ method: 'GET', path: `/resource/${index}`, source: 'test', member: 'get', plane }]
        : [],
  })),
});
const sources = () => specSources.map(([plane]) => domain(plane));

describe('full supplied-source operation acceptance', () => {
  it('requires 99% separately for every source, including the entire gateway denominator', () => {
    const result = fullOperationAcceptance([...sources(), domain('gateway', 138, 242)]);
    expect(result.passed).toBe(false);
    expect(result.requiredPercentage).toBe(99);
    expect(result.sources.at(-1)).toEqual({
      plane: 'gateway',
      file: 'gateway.yaml',
      sha256: 'a'.repeat(64),
      implemented: 138,
      total: 242,
      percentage: (138 / 242) * 100,
      minimumImplemented: 240,
      additionalRequired: 102,
      passed: false,
    });
  });

  it.each([239, 240, 242])('applies the unrounded threshold at %i of 242', (implemented) => {
    const result = fullOperationAcceptance([...sources(), domain('gateway', implemented, 242)]);
    expect(result.passed).toBe(implemented >= 240);
  });

  it('does not let large gateway coverage conceal a missing AIRS operation', () => {
    const airs = sources();
    airs[0] = domain('scan', 3, 4);
    expect(fullOperationAcceptance([...airs, domain('gateway', 242)]).passed).toBe(false);
  });

  it('fails an empty source rather than treating a zero denominator as complete', () => {
    const result = fullOperationAcceptance([...sources(), domain('gateway', 0, 0)]);
    expect(result.passed).toBe(false);
    expect(result.sources.at(-1)?.percentage).toBeNull();
  });

  it('rejects missing, repeated or unexpected source inventories', () => {
    expect(() => fullOperationAcceptance(sources())).toThrow('source planes');
    expect(() =>
      fullOperationAcceptance([...sources(), domain('gateway'), domain('gateway')]),
    ).toThrow('source planes');
    expect(() => fullOperationAcceptance([...sources(), domain('substitute')])).toThrow(
      'source planes',
    );
  });

  it('retains retired, unverified and adapted operations from the frozen gateway ledger', () => {
    const inventory = domain('gateway', 0, 0);
    inventory.operations = gateway.operations.map((operation) => ({
      method: operation.method,
      path: operation.path,
      implementations:
        operation.status === 'direct-contract'
          ? domain('gateway').operations[0].implementations
          : [],
    }));
    const result = fullOperationAcceptance([...sources(), inventory]);
    expect(result.sources.at(-1)?.total).toBe(242);
    expect(result.sources.at(-1)?.implemented).toBe(138);
    expect(result.passed).toBe(false);
  });
});
