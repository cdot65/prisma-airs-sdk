/** @internal Compare specification operations with actual request call sites, scoped by plane. */
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import SwaggerParser from '@apidevtools/swagger-parser';
import * as constants from '../../src/constants.js';

export const specSources = [
  ['scan', 'prisma-airs/scan/scan-service_latest.yaml'],
  ['management', 'prisma-airs/management/mgmt-service_latest.yaml'],
  ['model-data', 'prisma-airs-model-security/dataplane/data-plane.yml'],
  ['model-management', 'prisma-airs-model-security/management/mgmt-plane.yml'],
  ['redteam-data', 'prisma-airs-redteam/data-plane/dp-openapi.yaml'],
  ['redteam-management', 'prisma-airs-redteam/management/mp-openapi.yaml'],
  ['network-broker', 'prisma-airs-redteam/network-broker/AIRS-Red-Teaming-Network-Broker.yaml'],
] as const;
export const root = fileURLToPath(new URL('../../', import.meta.url));
export const normalizePath = (path: string) => path.replace(/\{[^}]+\}/g, '{}');

export interface CallSite {
  method: string;
  path: string;
  source: string;
  member: string;
  plane: string;
  responseSchema?: string;
  requestSchema?: string;
  requestType?: string;
  queryType?: string;
  className?: string;
  parameters?: { name: string; type: string }[];
}
export interface DomainInventory {
  plane: string;
  file: string;
  sha256: string;
  components: number;
  operations: { method: string; path: string; operationId?: string; implementations: CallSite[] }[];
}

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? files(join(dir, entry.name))
      : entry.name.endsWith('.ts')
        ? [join(dir, entry.name)]
        : [],
  );
}

export function collectCallSites(): CallSite[] {
  const result: CallSite[] = [];
  for (const file of files(join(root, 'src'))) {
    const source = relative(root, file);
    const tree = ts.createSourceFile(
      file,
      readFileSync(file, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
    );
    const classMethods = new Map<string, Map<string, ts.MethodDeclaration>>();
    for (const statement of tree.statements)
      if (ts.isClassDeclaration(statement) && statement.name)
        classMethods.set(
          statement.name.text,
          new Map(
            statement.members
              .filter(ts.isMethodDeclaration)
              .map((method) => [method.name.getText(tree), method]),
          ),
        );
    const substitute = (
      node: ts.Expression,
      bindings: Map<string, ts.Expression>,
    ): ts.Expression => {
      const seen = new Set<string>();
      while (ts.isIdentifier(node) && bindings.has(node.text) && !seen.has(node.text)) {
        seen.add(node.text);
        node = bindings.get(node.text)!;
      }
      return node;
    };
    const expression = (
      raw: ts.Expression,
      bindings = new Map<string, ts.Expression>(),
    ): string => {
      const node = substitute(raw, bindings);
      if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
      if (ts.isIdentifier(node))
        return String((constants as Record<string, unknown>)[node.text] ?? `{${node.text}}`);
      if (ts.isTemplateExpression(node))
        return (
          node.head.text +
          node.templateSpans
            .map((span) => expression(span.expression, bindings) + span.literal.text)
            .join('')
        );
      return `{${node.getText(tree)}}`;
    };
    const visit = (
      node: ts.Node,
      member = '',
      declaration?: ts.MethodDeclaration,
      className?: string,
      bindings = new Map<string, ts.Expression>(),
      stack = new Set<string>(),
    ) => {
      if (ts.isClassDeclaration(node)) className = node.name?.text;
      if (ts.isMethodDeclaration(node)) {
        member = node.name.getText(tree);
        declaration = node;
      }
      // Resolve gateway helper calls at their public call sites (API-key dialects, telemetry charts).
      // This is static AST substitution, never evaluation of SDK source.
      if (
        source.startsWith('src/ai-gateway/') &&
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        node.expression.expression.kind === ts.SyntaxKind.ThisKeyword
      ) {
        const helperName = node.expression.name.text;
        const helper = classMethods.get(className ?? '')?.get(helperName);
        const privateCaller = declaration?.modifiers?.some(
          (modifier) => modifier.kind === ts.SyntaxKind.PrivateKeyword,
        );
        if (!privateCaller && helper?.body && !stack.has(helperName)) {
          const next = new Map(bindings);
          helper.parameters.forEach((parameter, index) => {
            if (node.arguments[index])
              next.set(parameter.name.getText(tree), substitute(node.arguments[index], bindings));
          });
          visit(helper.body, member, declaration, className, next, new Set(stack).add(helperName));
        }
      }
      if (
        ts.isCallExpression(node) &&
        node.expression.getText(tree) === 'request' &&
        node.arguments[0] &&
        ts.isObjectLiteralExpression(node.arguments[0])
      ) {
        const props = new Map<string, ts.Expression>();
        for (const property of node.arguments[0].properties) {
          if (ts.isPropertyAssignment(property))
            props.set(property.name.getText(tree), property.initializer);
          if (ts.isShorthandPropertyAssignment(property))
            props.set(property.name.text, property.name);
        }
        const textOf = (value: ts.Expression | undefined) =>
          value && substitute(value, bindings).getText(tree);
        const bodyName = textOf(props.get('body'));
        const methodNode = props.get('method');
        const pathNode = props.get('path');
        if (
          methodNode &&
          pathNode &&
          !declaration?.modifiers?.some(
            (modifier) => modifier.kind === ts.SyntaxKind.PrivateKeyword,
          )
        ) {
          const base = props.get('baseUrl')?.getText(tree) ?? '';
          const plane = source.startsWith('src/scan/')
            ? 'scan'
            : source.startsWith('src/management/')
              ? 'management'
              : source.includes('model-security/')
                ? /security-|custom-rules/.test(source) || base.includes('mgmt')
                  ? 'model-management'
                  : 'model-data'
                : source.includes('red-team/network-broker')
                  ? 'network-broker'
                  : source.includes('red-team/')
                    ? /targets-client|adapters-client|custom-attacks-client|instances-client|eula-client/.test(
                        source,
                      ) || base.includes('mgmt')
                      ? 'redteam-management'
                      : 'redteam-data'
                    : source.includes('ai-gateway/')
                      ? 'gateway'
                      : 'other';
          result.push({
            method: expression(methodNode, bindings),
            path: expression(pathNode, bindings),
            source,
            member,
            plane,
            responseSchema: textOf(props.get('responseSchema')),
            requestSchema: textOf(props.get('requestSchema')),
            requestType: declaration?.parameters
              .find((p) => p.name.getText(tree) === bodyName)
              ?.type?.getText(tree),
            queryType: declaration?.parameters
              .find((p) => p.name.getText(tree) === 'opts')
              ?.type?.getText(tree),
            className,
            parameters: declaration?.parameters.map((p) => ({
              name: p.name.getText(tree),
              type: p.type?.getText(tree) ?? '',
            })),
          });
        }
      }
      ts.forEachChild(node, (child) =>
        visit(child, member, declaration, className, bindings, stack),
      );
    };
    visit(tree);
  }
  return result;
}

export async function inventory(): Promise<DomainInventory[]> {
  const calls = collectCallSites();
  const reports = [];
  for (const [plane, file] of specSources) {
    const path = join(process.env.AIRS_OPENAPI_DIR ?? join(root, 'schemas'), file);
    const spec = await SwaggerParser.parse(path);
    const operations = Object.entries(spec.paths ?? {}).flatMap(([route, item]) =>
      Object.entries(item ?? {})
        .filter(([method]) =>
          ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'].includes(method),
        )
        .map(([method, op]) => ({
          method: method.toUpperCase(),
          path: route,
          operationId: (op as { operationId?: string }).operationId,
          implementations: calls.filter(
            (call) =>
              call.plane === plane &&
              call.method === method.toUpperCase() &&
              normalizePath(call.path) === normalizePath(route),
          ),
        })),
    );
    reports.push({
      plane,
      file,
      sha256: createHash('sha256').update(readFileSync(path)).digest('hex'),
      components: Object.keys(('components' in spec && spec.components?.schemas) || {}).length,
      operations,
    });
  }
  return reports;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const report = await inventory();
  if (process.argv.includes('--json')) console.log(JSON.stringify(report, null, 2));
  else
    for (const domain of report) {
      const missing = domain.operations.filter((op) => op.implementations.length === 0);
      console.log(
        `${domain.plane}: ${domain.operations.length - missing.length}/${domain.operations.length}`,
      );
      for (const op of missing) console.log(`  MISSING ${op.method} ${op.path}`);
    }
}
