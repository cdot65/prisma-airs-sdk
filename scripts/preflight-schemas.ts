#!/usr/bin/env tsx
/**
 * @internal
 * Pre-flight schema check.
 *
 * Loads every OpenAPI spec in `specs/`, every Zod `*Schema` export in `src/models/`, converts
 * the Zod schemas to JSON Schema, and compares them against the matching OpenAPI components.
 * Reports drift findings and exits non-zero unless `--warn-only` is passed.
 *
 * Usage:
 *   tsx scripts/preflight-schemas.ts            # strict — exit 1 on drift
 *   tsx scripts/preflight-schemas.ts --warn-only  # report drift, exit 0
 */
import { readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';
import { ZodType } from 'zod';
import zodToJsonSchema from 'zod-to-json-schema';
import type { OpenAPIV3 } from 'openapi-types';
import { loadSpec } from './preflight/load-spec.js';
import { diffSchemas, type DriftFinding, type JsonSchema } from './preflight/diff-schemas.js';
import { resolveOpenApiName } from './preflight/resolve-name.js';
import { isAllowlisted } from './preflight/allowlist.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SCHEMAS_DIR = join(ROOT, 'schemas');
const MODELS_DIR = join(ROOT, 'src', 'models');

interface ModelSchema {
  exportName: string;
  shortName: string;
  schema: ZodType;
  sourceFile: string;
}

/**
 * The exact OpenAPI spec files the SDK models, as paths under the gitignored `schemas/` alias
 * (symlinks to a local pan.dev `openapi-specs` checkout). Listed explicitly rather than globbed:
 * the alias tree also holds `-latest` duplicates and unmodeled specs (e.g. most of `dlp/`, whose
 * `Policy` component collides with the mgmt `Policy`) that would produce false drift.
 *
 * Keep this in sync with the Zod models in `src/models/`. This runs locally / pre-release only —
 * `schemas/` is gitignored, so preflight is not a CI gate (see CLAUDE.md).
 */
const MODELED_SPECS = [
  'prisma-airs/scan/scan-service_latest.yaml',
  'prisma-airs/management/mgmt-service_latest.yaml',
  'prisma-airs-model-security/dataplane/AIRS-Model-Security-DataPlane-latest.yaml',
  'prisma-airs-model-security/management/AIRS-Model-Security-Management.yaml',
  'prisma-airs-redteam/data-plane/dp-openapi.yaml',
  'prisma-airs-redteam/management/mp-openapi.yaml',
  'prisma-airs-redteam/network-broker/AIRS-Red-Teaming-Network-Broker.yaml',
  'dlp/DataFilteringProfiles.yaml',
  'dlp/DataPatterns.yaml',
  'dlp/DataProfiles.yaml',
  'dlp/Dictionaries.yaml',
];

function findSpecFiles(): string[] {
  if (!existsSync(SCHEMAS_DIR)) {
    throw new Error(
      `The 'schemas/' alias is missing. Preflight reads the gitignored 'schemas/' directory ` +
        `(symlinks to a local pan.dev openapi-specs checkout). Set it up before running preflight — see CLAUDE.md.`,
    );
  }
  return MODELED_SPECS.map((rel) => {
    const full = join(SCHEMAS_DIR, rel);
    if (!existsSync(full)) {
      throw new Error(`Missing modeled schema file under schemas/: ${rel}`);
    }
    return full;
  });
}

async function loadAllSpecs(): Promise<Map<string, OpenAPIV3.SchemaObject>> {
  const files = findSpecFiles();
  const merged = new Map<string, OpenAPIV3.SchemaObject>();
  const collisions: string[] = [];
  for (const path of files) {
    const map = await loadSpec(path);
    for (const [name, schema] of map) {
      if (merged.has(name)) {
        const existing = JSON.stringify(merged.get(name));
        const incoming = JSON.stringify(schema);
        if (existing !== incoming) {
          collisions.push(`${name} (defined in multiple specs with different shapes)`);
        }
      }
      merged.set(name, schema);
    }
  }
  for (const c of collisions) {
    console.warn(`[preflight] WARN: ${c}`);
  }
  return merged;
}

async function loadAllModels(): Promise<ModelSchema[]> {
  const entries = await readdir(MODELS_DIR);
  const out: ModelSchema[] = [];
  for (const file of entries) {
    if (!file.endsWith('.ts') || file === 'index.ts') continue;
    const sourceFile = join(MODELS_DIR, file);
    const mod = (await import(sourceFile)) as Record<string, unknown>;
    for (const [exportName, value] of Object.entries(mod)) {
      if (!exportName.endsWith('Schema')) continue;
      if (!(value instanceof ZodType)) continue;
      out.push({
        exportName,
        shortName: exportName.replace(/Schema$/, ''),
        schema: value,
        sourceFile,
      });
    }
  }
  return out;
}

interface PreflightReport {
  /** Drift findings the allowlist has not acknowledged. */
  findings: DriftFinding[];
  /** Drift findings explicitly allowlisted as expected divergence. */
  acknowledged: DriftFinding[];
  unmatchedZodSchemas: { exportName: string; sourceFile: string }[];
  totalZod: number;
  totalSpec: number;
  matched: number;
}

async function runPreflight(): Promise<PreflightReport> {
  const [specMap, models] = await Promise.all([loadAllSpecs(), loadAllModels()]);
  const allFindings: DriftFinding[] = [];
  const unmatched: { exportName: string; sourceFile: string }[] = [];
  let matched = 0;

  for (const m of models) {
    const resolved = resolveOpenApiName(m.shortName, specMap);
    if (!resolved) {
      unmatched.push({ exportName: m.exportName, sourceFile: m.sourceFile });
      continue;
    }
    matched++;
    const zodJson = zodToJsonSchema(m.schema, { target: 'openApi3' }) as JsonSchema;
    allFindings.push(...diffSchemas(zodJson, resolved.schema as JsonSchema, resolved.matchedName));
  }

  const findings: DriftFinding[] = [];
  const acknowledged: DriftFinding[] = [];
  for (const f of allFindings) {
    if (isAllowlisted(f)) acknowledged.push(f);
    else findings.push(f);
  }

  return {
    findings,
    acknowledged,
    unmatchedZodSchemas: unmatched,
    totalZod: models.length,
    totalSpec: specMap.size,
    matched,
  };
}

function printReport(report: PreflightReport): void {
  console.log(
    `[preflight] Zod schemas: ${report.totalZod} | OpenAPI components: ${report.totalSpec} | matched: ${report.matched}`,
  );

  if (report.unmatchedZodSchemas.length > 0) {
    console.log(
      `[preflight] Unmatched Zod schemas (no OpenAPI counterpart, likely local helpers): ${report.unmatchedZodSchemas.length}`,
    );
    for (const u of report.unmatchedZodSchemas) {
      console.log(`  - ${u.exportName}  (${relative(ROOT, u.sourceFile)})`);
    }
  }

  console.log(
    `[preflight] Acknowledged drift (allowlisted): ${report.acknowledged.length} | Unacknowledged: ${report.findings.length}`,
  );

  if (report.findings.length === 0) {
    console.log('[preflight] No unacknowledged drift.');
    return;
  }

  console.log(`\n[preflight] Unacknowledged drift findings:`);
  const bySchema = new Map<string, DriftFinding[]>();
  for (const f of report.findings) {
    const arr = bySchema.get(f.schemaName) ?? [];
    arr.push(f);
    bySchema.set(f.schemaName, arr);
  }
  for (const [schemaName, fs] of bySchema) {
    console.log(`\n  ${schemaName} (${fs.length}):`);
    for (const f of fs) {
      console.log(`    [${f.kind}] ${f.message}`);
    }
  }
}

async function main(): Promise<void> {
  const warnOnly = process.argv.includes('--warn-only');
  const report = await runPreflight();
  printReport(report);
  if (report.findings.length > 0 && !warnOnly) {
    process.exit(1);
  }
}

main().catch((err: unknown) => {
  console.error('[preflight] Fatal error:', err);
  process.exit(2);
});
