/** @internal Full-source operation threshold, distinct from live workflow acceptance. */
import { specSources, type DomainInventory } from './inventory.js';

/** Never drop an unavailable family or average one source's gaps into another source. */
export function fullOperationAcceptance(domains: readonly DomainInventory[]) {
  const expected = [...specSources.map(([plane]) => plane), 'gateway'].sort();
  const actual = domains.map((domain) => domain.plane).sort();
  if (actual.length !== expected.length || actual.some((plane, index) => plane !== expected[index]))
    throw new Error('Full acceptance requires exactly the supplied source planes');

  const requiredPercentage = 99;
  const sources = domains.map((domain) => {
    const total = domain.operations.length;
    const implemented = domain.operations.filter(
      (operation) => operation.implementations.length > 0,
    ).length;
    const minimumImplemented = Math.ceil((total * requiredPercentage) / 100);
    return {
      plane: domain.plane,
      file: domain.file,
      sha256: domain.sha256,
      implemented,
      total,
      percentage: total > 0 ? (implemented / total) * 100 : null,
      minimumImplemented,
      additionalRequired: Math.max(0, minimumImplemented - implemented),
      passed: total > 0 && implemented >= minimumImplemented,
    };
  });
  return { requiredPercentage, passed: sources.every((source) => source.passed), sources };
}
