/** @internal Emit a reviewable patch for newly declared response properties; never edit files. */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { fieldCoverage } from './fields.js';
import { root } from './inventory.js';
import type { Schema } from './conformance.js';

function expression(schema: Schema): string {
  if (schema.type === 'null') return 'z.null()';
  if (schema.const !== undefined) return `z.literal(${JSON.stringify(schema.const)})`;
  const variants = schema.anyOf ?? schema.oneOf;
  if (variants) {
    const values = [...new Set(variants.map(expression))];
    if (values.length === 1) return values[0];
    return `z.union([${values.join(', ')}])`;
  }
  if (schema.allOf)
    return schema.allOf.map(expression).reduce((a, b) => `z.intersection(${a}, ${b})`);
  if (schema.type === 'array')
    return `z.array(${schema.items ? expression(schema.items) : 'z.unknown()'})`;
  if (schema.type === 'object' || schema.properties) {
    if (!schema.properties && typeof schema.additionalProperties === 'object')
      return `z.record(${expression(schema.additionalProperties)})`;
    const fields = Object.entries(schema.properties ?? {}).map(
      ([key, value]) =>
        `${JSON.stringify(key)}: ${expression(value)}${schema.required?.includes(key) ? '' : '.optional()'}`,
    );
    return `z.object({${fields.join(', ')}}).passthrough()`;
  }
  if (schema.type === 'integer') return 'z.number().int()';
  if (schema.type === 'number') return 'z.number()';
  if (schema.type === 'boolean') return 'z.boolean()';
  if (schema.type === 'string') return 'z.string()';
  throw new Error(`Cannot represent schema: ${JSON.stringify(schema)}`);
}
const report = await fieldCoverage();
const byOwner = new Map<string, typeof report.missing>();
for (const field of report.missing) {
  // Upstream's misindented topic-list.items is a documented spec defect, not a wire field.
  if (field.owner === 'ModelProtectionItemSchema' && field.field === 'items') continue;
  const bucket = byOwner.get(field.owner) ?? [];
  bucket.push(field);
  byOwner.set(field.owner, bucket);
}
const patches: string[] = [];
const changes: string[] = [];
for (const name of readdirSync(join(root, 'src/models')).filter((name) => name.endsWith('.ts'))) {
  const file = join(root, 'src/models', name);
  const source = readFileSync(file, 'utf8');
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const edits: { start: number; value: string }[] = [];
  function visit(node: ts.Node) {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      byOwner.has(node.name.text)
    ) {
      let object: ts.ObjectLiteralExpression | undefined;
      const locate = (n: ts.Node) => {
        if (
          !object &&
          ts.isCallExpression(n) &&
          ts.isPropertyAccessExpression(n.expression) &&
          n.expression.name.text === 'object' &&
          n.arguments[0] &&
          ts.isObjectLiteralExpression(n.arguments[0])
        )
          object = n.arguments[0];
        if (!object) ts.forEachChild(n, locate);
      };
      locate(node.initializer);
      if (!object) throw new Error(`Cannot locate schema object: ${node.name.text}`);
      const fields = byOwner.get(node.name.text)!;
      const additions = fields
        .map((field) => {
          let value = expression(field.schema);
          if (field.field === 'connection_params') value = 'ConnectionParamsSchema.nullable()';
          if (field.field === 'auth_config') value = 'AuthConfigSchema.nullable()';
          if (field.field === 'adapter_variable_overrides')
            value = 'z.array(AdapterVarSchema).nullable()';
          changes.push(`${node.name.getText()}.${field.field}`);
          return `    ${JSON.stringify(field.field)}: ${value}.optional(),`;
        })
        .join('\n');
      edits.push({ start: object.getStart(tree) + 1, value: '\n' + additions });
      byOwner.delete(node.name.text);
    }
    ts.forEachChild(node, visit);
  }
  visit(tree);
  if (!edits.length) continue;
  let output = source;
  for (const edit of edits.sort((a, b) => b.start - a.start))
    output = output.slice(0, edit.start) + edit.value + output.slice(edit.start);
  patches.push(
    `*** Update File: ${file}\n@@\n` +
      source
        .split('\n')
        .map((line) => '-' + line)
        .join('\n') +
      '\n' +
      output
        .split('\n')
        .map((line) => '+' + line)
        .join('\n'),
  );
}
if (byOwner.size) throw new Error(`Unresolved owners: ${[...byOwner.keys()].join(', ')}`);
console.log(
  JSON.stringify({ changes, patch: '*** Begin Patch\n' + patches.join('\n') + '\n*** End Patch' }),
);
