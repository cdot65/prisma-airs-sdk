/** @internal Official Gateway route matching. An operation is not implemented by a same-path call on another plane. */
import ts from 'typescript';
import type { CallSite } from './inventory.js';

export type GatewayPlane = 'runtime' | 'control' | 'admin' | 'public';
type Binding = Record<string, GatewayPlane>;
export interface GatewayParameter {
  name: string;
  in: string;
  schema?: { enum?: unknown[] };
}
export interface GatewayOperation {
  operationId?: string;
  parameters?: GatewayParameter[];
  servers?: { url: string }[];
}
export interface GatewayDocument {
  servers?: { url: string }[];
  paths?: Record<
    string,
    {
      servers?: { url: string }[];
      parameters?: GatewayParameter[];
      [key: string]: unknown;
    }
  >;
}

/** Resolve the actual composition root's data/admin constructor bindings without executing SDK code. */
export function gatewayBindings(source: string): Map<string, Binding> {
  const tree = ts.createSourceFile('client.ts', source, ts.ScriptTarget.Latest, true);
  const result = new Map<string, Binding>();
  const variables = new Map<string, ts.Expression>();
  const collect = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer)
      variables.set(node.name.text, node.initializer);
    ts.forEachChild(node, collect);
  };
  collect(tree);
  const endpoint = (node: ts.Expression, seen = new Set<string>()): GatewayPlane | undefined => {
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken
    )
      return endpoint(node.right, seen);
    if (!ts.isIdentifier(node) || seen.has(node.text)) return undefined;
    if (node.text === 'DEFAULT_AI_GW_DATA_ENDPOINT') return 'control';
    if (node.text === 'DEFAULT_AI_GW_ADMIN_ENDPOINT') return 'admin';
    const value = variables.get(node.text);
    return value ? endpoint(value, new Set(seen).add(node.text)) : undefined;
  };
  const options = (node: ts.Expression, seen = new Set<string>()): Binding => {
    if (ts.isIdentifier(node)) {
      const value = variables.get(node.text);
      return value && !seen.has(node.text) ? options(value, new Set(seen).add(node.text)) : {};
    }
    const binding: Binding = {};
    if (ts.isObjectLiteralExpression(node)) {
      for (const property of node.properties) {
        if (ts.isSpreadAssignment(property))
          Object.assign(binding, options(property.expression, seen));
        if (ts.isPropertyAssignment(property)) {
          const name = property.name.getText(tree);
          const plane = endpoint(property.initializer);
          if (plane) binding[name] = plane;
          else delete binding[name];
        }
      }
    }
    return binding;
  };
  const visit = (node: ts.Node) => {
    if (ts.isNewExpression(node) && node.arguments?.[0]) {
      const binding = options(node.arguments[0]);
      if (Object.keys(binding).length) result.set(node.expression.getText(tree), binding);
    }
    ts.forEachChild(node, visit);
  };
  visit(tree);
  return result;
}

/** Unknown or dynamic routing earns no match; caller-configurable runtime/public endpoints stay distinct. */
export function gatewayCallPlane(
  call: CallSite,
  bindings: Map<string, Binding>,
): GatewayPlane | undefined {
  const runtimeClasses = ['AIGatewayInferenceClient', 'AIGatewayRuntimeResourcesClient'];
  if (
    runtimeClasses.includes(call.className ?? '') &&
    call.gatewayOptionSpreads?.some((spread) => /^this\.runtimeRequestOptions\(/.test(spread))
  )
    return 'runtime';
  if (call.className === 'AIGatewayModelPricingClient' && call.gatewayBaseUrl === 'this.baseUrl')
    return 'public';
  const property = /^this\.(?:options\.)?(\w+)$/.exec(call.gatewayBaseUrl ?? '')?.[1];
  return property ? bindings.get(call.className ?? '')?.[property] : undefined;
}

/** Join by OpenAPI append semantics, not URL relative-resolution (which drops base path prefixes). */
export function gatewayServerRoute(
  server: string,
  path: string,
): { plane: GatewayPlane; path: string } | undefined {
  let url: URL;
  try {
    url = new URL(server);
  } catch {
    return undefined;
  }
  if (url.username || url.password || url.search || url.hash || server.includes('{'))
    return undefined;
  const fullPath = url.pathname.replace(/\/$/, '') + path;
  if (url.origin === 'https://api.apps.paloaltonetworks.com') {
    for (const [prefix, plane] of [
      ['/ai_gw/admin/v2', 'admin'],
      ['/ai_gw/v2', 'control'],
    ] as const)
      if (fullPath.startsWith(prefix + '/')) return { plane, path: fullPath.slice(prefix.length) };
    return undefined;
  }
  if (url.origin === 'https://api.portkey.ai' && url.pathname === '/')
    return { plane: 'public', path };
  if (
    ['https://aigw.portkey.ai', 'https://self-hosted-gateway-url.example.com'].includes(
      url.origin,
    ) &&
    url.pathname.replace(/\/$/, '') === '/v1'
  )
    return { plane: 'runtime', path };
  return undefined;
}

/** Finite subtype alternatives must all be implemented. Preserve unconstrained parameter segments. */
export function gatewayRouteVariants(path: string, parameters: GatewayParameter[]): string[] {
  let variants = [path];
  for (const match of path.matchAll(/\{([^}]+)\}/g)) {
    const values = parameters.find((p) => p.in === 'path' && p.name === match[1])?.schema?.enum;
    if (!values) continue;
    if (
      !values.length ||
      values.some((value) => typeof value !== 'string' || /[/{}?#]/.test(value))
    )
      throw new Error('Invalid gateway path enum');
    if (variants.length * values.length > 128)
      throw new Error('Gateway path enum expansion exceeds 128 variants');
    variants = variants.flatMap((variant) =>
      values.map((value) => variant.replace(match[0], String(value))),
    );
  }
  return variants;
}

function sameRoute(spec: string, implementation: string): boolean {
  const left = spec.split('/');
  const right = implementation.split('/');
  return (
    left.length === right.length &&
    left.every((segment, i) =>
      /^\{[^}]+\}$/.test(segment) ? /^\{[^}]+\}$/.test(right[i]) : segment === right[i],
    )
  );
}

/** Match all declared server alternatives and parameter variants; no plane or variant gets averaged away. */
export function officialGatewayOperations(
  spec: GatewayDocument,
  calls: CallSite[],
  bindings: Map<string, Binding>,
) {
  return Object.entries(spec.paths ?? {}).flatMap(([path, item]) =>
    Object.entries(item)
      .filter(([method]) =>
        ['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace'].includes(method),
      )
      .map(([method, raw]) => {
        const operation = raw as GatewayOperation;
        const parameters = new Map((item.parameters ?? []).map((p) => [`${p.in}:${p.name}`, p]));
        for (const p of operation.parameters ?? []) parameters.set(`${p.in}:${p.name}`, p);
        const variants = gatewayRouteVariants(path, [...parameters.values()]);
        const servers = operation.servers ?? item.servers ?? spec.servers ?? [];
        const groups = servers.flatMap((server) =>
          variants.map((variant) => {
            const route = gatewayServerRoute(server.url, variant);
            return route
              ? calls.filter(
                  (call) =>
                    call.plane === 'gateway' &&
                    call.method === method.toUpperCase() &&
                    gatewayCallPlane(call, bindings) === route.plane &&
                    sameRoute(route.path, call.path),
                )
              : [];
          }),
        );
        return {
          method: method.toUpperCase(),
          path,
          operationId: operation.operationId,
          implementations:
            groups.length && groups.every((group) => group.length)
              ? [...new Set(groups.flat())]
              : [],
        };
      }),
  );
}
