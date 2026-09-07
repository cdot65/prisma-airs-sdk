/** @internal Read the CLI credential configuration without modifying it or logging secrets. */
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

export function loadLiveCredentials(path = join(homedir(), '.prisma-airs', 'config.json')) {
  const original = readFileSync(path);
  const data = JSON.parse(original.toString('utf8')) as Record<string, unknown>;
  const fields = {
    mgmtClientId: 'PANW_MGMT_CLIENT_ID',
    mgmtClientSecret: 'PANW_MGMT_CLIENT_SECRET',
    mgmtTsgId: 'PANW_MGMT_TSG_ID',
    airsApiKey: 'PANW_AI_SEC_API_KEY',
  } as const;
  for (const [key, envName] of Object.entries(fields)) {
    const value = data[key];
    if (typeof value !== 'string' || !value.trim()) throw new Error(`Missing config field: ${key}`);
    process.env[envName] = value;
  }
  // This harness must not accidentally select credentials inherited from another tenant.
  for (const prefix of ['PANW_AI_GW', 'PANW_MODEL_SEC', 'PANW_RED_TEAM']) {
    process.env[`${prefix}_CLIENT_ID`] = process.env.PANW_MGMT_CLIENT_ID;
    process.env[`${prefix}_CLIENT_SECRET`] = process.env.PANW_MGMT_CLIENT_SECRET;
    process.env[`${prefix}_TSG_ID`] = process.env.PANW_MGMT_TSG_ID;
  }
  delete process.env.PANW_AI_SEC_API_TOKEN;
  // Keep live debug bodies out of validation artifacts regardless of the launching shell.
  delete process.env.PANW_AI_SEC_DEBUG;
  const digest = (value: Buffer) => createHash('sha256').update(value).digest('hex');
  return {
    verifyUnchanged() {
      if (digest(readFileSync(path)) !== digest(original)) {
        throw new Error('The read-only credential source changed during validation');
      }
    },
  };
}
