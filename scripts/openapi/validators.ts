/** @internal Resolve the small declarative Zod expression subset used by endpoint call sites. */
import { z } from 'zod';
import ts from 'typescript';
import * as models from '../../src/models/index.js';
import type { CallSite } from './inventory.js';

export function resolveValidator(expression?: string): z.ZodTypeAny | undefined {
  if (!expression) return undefined;
  const direct = (models as Record<string, unknown>)[expression];
  if (direct instanceof z.ZodType) return direct;
  const array = /^z\.array\((.+)\)$/.exec(expression);
  if (array) {
    const element = resolveValidator(array[1]);
    return element ? z.array(element) : undefined;
  }
  const optional = /^(.+)\.optional\(\)$/.exec(expression);
  if (optional) return resolveValidator(optional[1])?.optional();
  if (expression === 'z.string()') return z.string();
  if (expression === 'z.unknown()') return z.unknown();
  if (expression === 'z.record(z.unknown())') return z.record(z.unknown());
  if (expression === 'z.object({}).passthrough()') return z.object({}).passthrough();
  const union = /^z\.union\(\[([\s\S]+)\]\)$/.exec(expression);
  if (union) {
    const options = union[1]
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
      .map(resolveValidator);
    if (options.length >= 2 && options.every((option): option is z.ZodTypeAny => !!option))
      return z.union(options as [z.ZodTypeAny, z.ZodTypeAny, ...z.ZodTypeAny[]]);
  }
  if (expression.includes('?')) {
    // Read the syntax only. Conditions are never executed by the contract auditor.
    const source = ts.createSourceFile('validator.ts', expression, ts.ScriptTarget.Latest, true);
    if (source.statements.length !== 1 || !ts.isExpressionStatement(source.statements[0]))
      return undefined;
    let node = source.statements[0].expression;
    while (ts.isParenthesizedExpression(node)) node = node.expression;
    if (ts.isConditionalExpression(node)) {
      const yes = resolveValidator(node.whenTrue.getText(source));
      const no = resolveValidator(node.whenFalse.getText(source));
      if (yes && no) return z.union([yes, no]);
    }
  }
  return undefined;
}

export function requestSchemaName(call: CallSite): string | undefined {
  if (call.requestSchema) return call.requestSchema;
  if (call.source === 'src/scan/scanner.ts') {
    if (call.member === 'syncScan') return 'ScanRequestSchema';
    if (call.member === 'asyncScan') return 'z.array(AsyncScanObjectSchema)';
  }
  if (call.member === 'getAccessToken' && call.source.endsWith('oauth-management.ts'))
    return 'ClientIdAndCustomerAppSchema';
  return call.requestType ? `${call.requestType}Schema` : undefined;
}
