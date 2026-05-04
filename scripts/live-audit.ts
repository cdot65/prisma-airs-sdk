#!/usr/bin/env tsx
/**
 * @internal
 * Live-tenant audit. Hits a representative set of read-only endpoints across the three
 * OAuth domains, classifies each result, and exits non-zero on any RESPONSE_VALIDATION.
 *
 * Usage (requires PANW_* env vars set for the tenants you want to probe):
 *   npm run audit:live
 *
 * Catches the class of bug pre-flight cannot see: real API responses that don't match
 * the Zod schemas. Pre-flight is Zod-vs-OpenAPI; this is API-vs-Zod.
 */
import {
  AISecSDKException,
  ErrorType,
  ManagementClient,
  ModelSecurityClient,
  RedTeamClient,
} from '../src/index.js';

interface Probe {
  domain: 'mgmt' | 'model-sec' | 'red-team';
  endpoint: string;
  call: () => Promise<unknown>;
}

interface Finding {
  domain: Probe['domain'];
  endpoint: string;
  status: 'ok' | 'schema-drift' | 'auth' | 'other-error';
  detail?: string;
}

const probes: Probe[] = [];

function tryBuild(name: string, fn: () => void): void {
  try {
    fn();
  } catch (err) {
    console.warn(`[live-audit] ${name}: skipped (${(err as Error).message})`);
  }
}

function buildManagementProbes(): void {
  tryBuild('ManagementClient', () => {
    const c = new ManagementClient();
    probes.push(
      { domain: 'mgmt', endpoint: 'profiles.list', call: () => c.profiles.list() },
      { domain: 'mgmt', endpoint: 'topics.list', call: () => c.topics.list() },
      { domain: 'mgmt', endpoint: 'apiKeys.list', call: () => c.apiKeys.list() },
      { domain: 'mgmt', endpoint: 'customerApps.list', call: () => c.customerApps.list() },
      { domain: 'mgmt', endpoint: 'dlpProfiles.list', call: () => c.dlpProfiles.list() },
      {
        domain: 'mgmt',
        endpoint: 'deploymentProfiles.list',
        call: () => c.deploymentProfiles.list(),
      },
      // The scan-logs query that surfaced #136. Use a small range to keep payloads small.
      {
        domain: 'mgmt',
        endpoint: 'scanLogs.query',
        call: () =>
          c.scanLogs.query({
            time_interval: 1,
            time_unit: 'hour',
            pageNumber: 1,
            pageSize: 10,
            filter: 'all',
          }),
      },
    );
  });
}

function buildModelSecurityProbes(): void {
  tryBuild('ModelSecurityClient', () => {
    const c = new ModelSecurityClient();
    probes.push(
      {
        domain: 'model-sec',
        endpoint: 'securityRules.list',
        call: () => c.securityRules.list(),
      },
      {
        domain: 'model-sec',
        endpoint: 'securityGroups.list',
        call: () => c.securityGroups.list(),
      },
      { domain: 'model-sec', endpoint: 'scans.list', call: () => c.scans.list({ limit: 10 }) },
      {
        domain: 'model-sec',
        endpoint: 'scans.getLabelKeys',
        call: () => c.scans.getLabelKeys({ limit: 10 }),
      },
    );
  });
}

function buildRedTeamProbes(): void {
  tryBuild('RedTeamClient', () => {
    const c = new RedTeamClient();
    probes.push(
      { domain: 'red-team', endpoint: 'scans.list', call: () => c.scans.list({ limit: 10 }) },
      { domain: 'red-team', endpoint: 'scans.getCategories', call: () => c.scans.getCategories() },
      { domain: 'red-team', endpoint: 'targets.list', call: () => c.targets.list({ limit: 10 }) },
      {
        domain: 'red-team',
        endpoint: 'targets.getTargetMetadata',
        call: () => c.targets.getTargetMetadata(),
      },
      {
        domain: 'red-team',
        endpoint: 'targets.getTargetTemplates',
        call: () => c.targets.getTargetTemplates(),
      },
      { domain: 'red-team', endpoint: 'eula.getStatus', call: () => c.eula.getStatus() },
      {
        domain: 'red-team',
        endpoint: 'customAttacks.listPromptSets',
        call: () => c.customAttacks.listPromptSets({ limit: 10 }),
      },
      {
        domain: 'red-team',
        endpoint: 'customAttacks.listActivePromptSets',
        call: () => c.customAttacks.listActivePromptSets(),
      },
      {
        domain: 'red-team',
        endpoint: 'customAttacks.getPropertyNames',
        call: () => c.customAttacks.getPropertyNames(),
      },
      { domain: 'red-team', endpoint: 'getQuota', call: () => c.getQuota() },
      {
        domain: 'red-team',
        endpoint: 'getDashboardOverview',
        call: () => c.getDashboardOverview(),
      },
    );
  });
}

async function runProbe(p: Probe): Promise<Finding> {
  try {
    await p.call();
    return { domain: p.domain, endpoint: p.endpoint, status: 'ok' };
  } catch (err) {
    if (err instanceof AISecSDKException) {
      switch (err.errorType) {
        case ErrorType.RESPONSE_VALIDATION:
          return {
            domain: p.domain,
            endpoint: p.endpoint,
            status: 'schema-drift',
            detail: err.message,
          };
        case ErrorType.OAUTH_ERROR:
        case ErrorType.MISSING_VARIABLE:
          return {
            domain: p.domain,
            endpoint: p.endpoint,
            status: 'auth',
            detail: err.message,
          };
        default:
          return {
            domain: p.domain,
            endpoint: p.endpoint,
            status: 'other-error',
            detail: err.message,
          };
      }
    }
    return {
      domain: p.domain,
      endpoint: p.endpoint,
      status: 'other-error',
      detail: (err as Error).message,
    };
  }
}

function printSection(title: string, findings: Finding[]): void {
  if (findings.length === 0) return;
  console.log(`\n[live-audit] ${title} (${findings.length}):`);
  for (const f of findings) {
    console.log(`  ${f.domain}.${f.endpoint}`);
    if (f.detail) {
      // Indent multi-line details for readability
      for (const line of f.detail.split('\n')) {
        console.log(`    ${line}`);
      }
    }
  }
}

async function main(): Promise<void> {
  buildManagementProbes();
  buildModelSecurityProbes();
  buildRedTeamProbes();

  if (probes.length === 0) {
    console.log(
      '[live-audit] No clients could be initialized (set PANW_* env vars). Nothing to probe.',
    );
    return;
  }

  console.log(`[live-audit] running ${probes.length} probes against the live tenant...`);

  const findings = await Promise.all(probes.map(runProbe));

  const tally = { ok: 0, 'schema-drift': 0, auth: 0, 'other-error': 0 };
  for (const f of findings) tally[f.status]++;

  console.log(
    `[live-audit] OK: ${tally.ok} | schema-drift: ${tally['schema-drift']} | auth: ${tally.auth} | other-error: ${tally['other-error']}`,
  );

  printSection(
    'Schema drift (API returned a shape Zod rejected — fix the schema)',
    findings.filter((f) => f.status === 'schema-drift'),
  );
  printSection(
    'Auth issues (these probes never reached the API)',
    findings.filter((f) => f.status === 'auth'),
  );
  printSection(
    'Other errors (4xx/5xx — usually empty tenant or permissions, not bugs)',
    findings.filter((f) => f.status === 'other-error'),
  );

  if (tally['schema-drift'] > 0) {
    process.exit(1);
  }
}

main().catch((err: unknown) => {
  console.error('[live-audit] Fatal error:', err);
  process.exit(2);
});
