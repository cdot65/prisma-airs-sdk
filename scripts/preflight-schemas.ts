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
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';
import { ZodType } from 'zod';
import zodToJsonSchema from 'zod-to-json-schema';
import type { OpenAPIV3 } from 'openapi-types';
import { loadSpec } from './preflight/load-spec.js';
import { diffSchemas, type DriftFinding, type JsonSchema } from './preflight/diff-schemas.js';
import { resolveOpenApiName } from './preflight/resolve-name.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SPECS_DIR = join(ROOT, 'specs');
const MODELS_DIR = join(ROOT, 'src', 'models');

interface ModelSchema {
  exportName: string;
  shortName: string;
  schema: ZodType;
  sourceFile: string;
}

async function loadAllSpecs(): Promise<Map<string, OpenAPIV3.SchemaObject>> {
  const entries = await readdir(SPECS_DIR);
  const merged = new Map<string, OpenAPIV3.SchemaObject>();
  const collisions: string[] = [];
  for (const file of entries) {
    if (!file.endsWith('.yaml') && !file.endsWith('.yml')) continue;
    const path = join(SPECS_DIR, file);
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
  findings: DriftFinding[];
  unmatchedZodSchemas: { exportName: string; sourceFile: string }[];
  totalZod: number;
  totalSpec: number;
  matched: number;
}

async function runPreflight(): Promise<PreflightReport> {
  const [specMap, models] = await Promise.all([loadAllSpecs(), loadAllModels()]);
  const findings: DriftFinding[] = [];
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
    findings.push(...diffSchemas(zodJson, resolved.schema as JsonSchema, resolved.matchedName));
  }

  return {
    findings,
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

  if (report.findings.length === 0) {
    console.log('[preflight] No drift detected.');
    return;
  }

  console.log(`[preflight] Drift findings: ${report.findings.length}`);
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
