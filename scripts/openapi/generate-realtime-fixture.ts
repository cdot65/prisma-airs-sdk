/** @internal Freeze the upgrade/query/header contract independently of SDK transport code. */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { loadContractSpec } from './compatibility.js';
import { emitPatch } from './emit-patch.js';

const file =
  process.env.GATEWAY_OPENAPI_FILE ??
  '/home/cdot/development/others/ai-gateway-openapi/openapi.yaml';
const spec = await loadContractSpec(file, 'gateway');
const operation = (spec.paths?.['/realtime'] as { get?: Record<string, unknown> })?.get;
if (!operation || operation.operationId !== 'connectRealtime')
  throw new Error('Review changed realtime operation');
emitPatch(
  'test/openapi/realtime.json',
  JSON.stringify(
    {
      source: 'ai-gateway-openapi/openapi.yaml',
      sha256: createHash('sha256').update(readFileSync(file)).digest('hex'),
      method: 'GET',
      path: '/realtime',
      ...operation,
    },
    null,
    2,
  ) + '\n',
);
