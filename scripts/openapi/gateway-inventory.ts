/** @internal Exact Portkey path inventory; SCM adapters/dispositions are reported separately. */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import SwaggerParser from '@apidevtools/swagger-parser';
import { collectCallSites, normalizePath, type DomainInventory } from './inventory.js';

export async function gatewayInventory(): Promise<DomainInventory> {
  const file =
    process.env.GATEWAY_OPENAPI_FILE ??
    '/home/cdot/development/others/ai-gateway-openapi/openapi.yaml';
  const spec = await SwaggerParser.parse(file);
  const calls = collectCallSites().filter((c) => c.plane === 'gateway');
  const operations = Object.entries(spec.paths ?? {}).flatMap(([path, item]) =>
    Object.entries(item ?? {})
      .filter(([method]) => ['get', 'post', 'put', 'patch', 'delete'].includes(method))
      .map(([method, operation]) => ({
        method: method.toUpperCase(),
        path,
        operationId: (operation as { operationId?: string }).operationId,
        implementations: calls.filter(
          (call) =>
            call.method === method.toUpperCase() &&
            normalizePath(call.path) === normalizePath(path),
        ),
      })),
  );
  return {
    plane: 'gateway',
    file,
    sha256: createHash('sha256').update(readFileSync(file)).digest('hex'),
    components: Object.keys(('components' in spec && spec.components?.schemas) || {}).length,
    operations,
  };
}
