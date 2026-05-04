/**
 * @internal
 * JSON-Schema-shaped object subset used by the pre-flight differ. Both `zod-to-json-schema`
 * output and dereferenced OpenAPI components fit this shape after light normalization.
 */
export interface JsonSchema {
  type?: string | string[];
  required?: string[];
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  enum?: unknown[];
  nullable?: boolean;
  [k: string]: unknown;
}

/** Kinds of drift the pre-flight detects. */
export type DriftKind =
  | 'missing-required-field'
  | 'extra-required-field'
  | 'type-mismatch'
  | 'extra-field';

/** A single drift finding, suitable for printing or aggregating into a report. */
export interface DriftFinding {
  schemaName: string;
  path: string;
  kind: DriftKind;
  expected?: string;
  actual?: string;
  message: string;
}

function effectiveType(s: JsonSchema): string | undefined {
  if (Array.isArray(s.type)) {
    const nonNull = s.type.filter((t) => t !== 'null');
    return nonNull[0];
  }
  return s.type;
}

function typesCompatible(a: string | undefined, b: string | undefined): boolean {
  if (a === undefined || b === undefined) return true;
  if (a === b) return true;
  // OpenAPI uses integer; Zod tends to use number — treat as compatible
  if ((a === 'integer' || a === 'number') && (b === 'integer' || b === 'number')) return true;
  return false;
}

/**
 * @internal
 * Compare a Zod-derived JSON Schema (`zod`) against an OpenAPI-derived JSON Schema (`openapi`)
 * and return drift findings. Recurses into shared object properties.
 *
 * Asymmetry: Zod is allowed to omit *optional* OpenAPI fields (passthrough handles them at
 * runtime). Required fields and shared field types are checked strictly.
 */
export function diffSchemas(
  zod: JsonSchema,
  openapi: JsonSchema,
  name: string,
  basePath = '$',
): DriftFinding[] {
  const findings: DriftFinding[] = [];
  const zType = effectiveType(zod);
  const oType = effectiveType(openapi);

  if (!typesCompatible(zType, oType)) {
    findings.push({
      schemaName: name,
      path: basePath,
      kind: 'type-mismatch',
      expected: oType,
      actual: zType,
      message: `${name} ${basePath}: type mismatch (expected ${oType}, got ${zType})`,
    });
    return findings;
  }

  if (zType === 'object' && oType === 'object') {
    const zReq = new Set(zod.required ?? []);
    const oReq = new Set(openapi.required ?? []);
    for (const r of oReq) {
      if (!zReq.has(r)) {
        findings.push({
          schemaName: name,
          path: `${basePath}.${r}`,
          kind: 'missing-required-field',
          message: `${name} ${basePath}: missing required field ${r}`,
        });
      }
    }
    for (const r of zReq) {
      if (!oReq.has(r)) {
        findings.push({
          schemaName: name,
          path: `${basePath}.${r}`,
          kind: 'extra-required-field',
          message: `${name} ${basePath}: ${r} required in Zod but optional in OpenAPI`,
        });
      }
    }

    const zProps = zod.properties ?? {};
    const oProps = openapi.properties ?? {};
    for (const [pName, pSchema] of Object.entries(zProps)) {
      if (!(pName in oProps)) {
        findings.push({
          schemaName: name,
          path: `${basePath}.${pName}`,
          kind: 'extra-field',
          message: `${name} ${basePath}: property ${pName} not in OpenAPI`,
        });
      } else {
        findings.push(...diffSchemas(pSchema, oProps[pName], name, `${basePath}.${pName}`));
      }
    }
  }

  return findings;
}
