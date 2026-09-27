/** @internal Official Gateway plane-aware inventory and separately retained legacy Portkey path inventory. */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import SwaggerParser from '@apidevtools/swagger-parser';
import { collectCallSites, normalizePath, type DomainInventory } from './inventory.js';
import {
  gatewayBindings,
  officialGatewayOperations,
  type GatewayDocument,
} from './gateway-routing.js';

export async function gatewayInventory(): Promise<DomainInventory> {
  const file =
    process.env.GATEWAY_OPENAPI_FILE ??
    '/home/cdot/development/others/ai-gateway-openapi/openapi.yaml';
  const spec = await SwaggerParser.dereference(file);
  const calls = collectCallSites().filter((c) => c.plane === 'gateway');
  const operations =
    spec.info.title === 'Prisma AIRS AI Gateway API'
      ? officialGatewayOperations(
          spec as GatewayDocument,
          calls,
          gatewayBindings(
            readFileSync(new URL('../../src/ai-gateway/client.ts', import.meta.url), 'utf8'),
          ),
        )
      : Object.entries(spec.paths ?? {}).flatMap(([path, item]) =>
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
    contractFamily:
      spec.info.title === 'Prisma AIRS AI Gateway API' ? 'official-gateway' : 'legacy-gateway',
    file,
    sha256: createHash('sha256').update(readFileSync(file)).digest('hex'),
    components: Object.keys(('components' in spec && spec.components?.schemas) || {}).length,
    operations,
  };
}
