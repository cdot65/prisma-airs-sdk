#!/usr/bin/env tsx
/**
 * @internal
 * Run the read-only AI Gateway live suite with credentials loaded from 1Password.
 * Credential values remain in process memory and are never printed or written to disk.
 */
import { execFileSync } from 'node:child_process';

const vault = process.env.OP_AI_GATEWAY_VAULT ?? 'Prisma AIRS Harness';
const item = process.env.OP_AI_GATEWAY_ITEM ?? 'Prisma AIRS Runtime Credentials - calvin';

type LogLevel = 'quiet' | 'normal' | 'verbose';

function parseLogLevel(argv: string[]): LogLevel {
  const index = argv.indexOf('--log-level');
  if (index === -1) return 'normal';
  const value = argv[index + 1];
  if (value === 'quiet' || value === 'normal' || value === 'verbose') return value;
  throw new Error('--log-level must be quiet, normal, or verbose');
}

const credentialFields = {
  PANW_MGMT_CLIENT_ID: 'PANW_MGMT_CLIENT_ID',
  PANW_MGMT_CLIENT_SECRET: 'PANW_MGMT_CLIENT_SECRET',
  PANW_MGMT_TSG_ID: 'PANW_MGMT_TSG_ID',
} as const;

export function readOnePasswordField(label: string): string {
  const value = execFileSync(
    'op',
    ['item', 'get', item, '--vault', vault, '--fields', `label=${label}`, '--reveal'],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] },
  ).trim();
  if (!value) throw new Error(`1Password field ${label} is empty`);
  return value;
}

async function main(): Promise<void> {
  const logLevel = parseLogLevel(process.argv.slice(2));
  process.env.AI_GATEWAY_E2E_LOG_LEVEL = logLevel;
  if (logLevel !== 'quiet') {
    console.log(`[e2e] Loading SCM credentials from 1Password item "${item}" in "${vault}"`);
  }
  for (const [envName, label] of Object.entries(credentialFields)) {
    if (!process.env[envName]) {
      process.env[envName] = readOnePasswordField(label);
      if (logLevel === 'verbose') console.log(`[e2e] Loaded ${envName}`);
    } else if (logLevel === 'verbose') {
      console.log(`[e2e] Using existing ${envName}`);
    }
  }
  if (logLevel !== 'quiet') console.log('[e2e] Starting read-only AI Gateway checks...');
  const { main: runSmokeSuite } = await import('./smoke-ai-gateway.js');
  const results = await runSmokeSuite();
  const failures = results.filter((result) => !result.ok);
  if (failures.length > 0) {
    throw new Error(`${failures.length} of ${results.length} AI Gateway read checks failed`);
  }
}

main().catch((error: unknown) => {
  console.error('E2E suite failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
