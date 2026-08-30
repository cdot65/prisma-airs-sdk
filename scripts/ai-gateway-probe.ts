#!/usr/bin/env tsx
/**
 * @internal
 * Opt-in AI Gateway route conformance probe.
 *
 * The candidate ledger is informed by Portkey OpenAPI, but every request is sent through
 * Prisma's existing SCM endpoints and OAuth + x-tsg-id authentication. The command is a dry
 * run unless --execute is supplied, and non-GET operations additionally require
 * --allow-mutation.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import {
  AI_GW_ADMIN_ENDPOINT,
  AI_GW_DATA_ENDPOINT,
  DEFAULT_AI_GW_ADMIN_ENDPOINT,
  DEFAULT_AI_GW_DATA_ENDPOINT,
} from '../src/constants.js';
import { OAuthAuth } from '../src/http/auth/oauth.js';
import { TsgHeaderAuth } from '../src/http/auth/tsg-header.js';
import type { AuthAdapter, PreparedRequest } from '../src/http/types.js';
import { resolveOAuthConfig } from '../src/oauth-config.js';

export type AIGatewayProbePlane = 'data' | 'admin';
export type AIGatewayProbeMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type AIGatewayProbeStatus = 'proposed' | 'verified' | 'divergent' | 'unavailable';
export type AIGatewayProbeOutcome =
  | 'dry-run'
  | 'verified'
  | 'unauthenticated'
  | 'unauthorized'
  | 'route-divergent'
  | 'client-error'
  | 'server-error';

export interface AIGatewayProbeOperation {
  id: string;
  resource: string;
  method: AIGatewayProbeMethod;
  pathTemplate: string;
  plane: AIGatewayProbePlane;
  status: AIGatewayProbeStatus;
  source: {
    repository: 'portkey-openapi';
    commit: string;
    operationId: string;
  };
}

const PORTKEY_OPENAPI_COMMIT = '9d7eca77222db12623c044a862b5873cae758956';

/** Candidate operations. Presence in this ledger does not mean SCM support is confirmed. */
export const AI_GATEWAY_PROBE_OPERATIONS: readonly AIGatewayProbeOperation[] = [
  candidate(
    'configs.listVersions',
    'configs',
    'GET',
    '/configs/{configId}/versions',
    'data',
    'listConfigVersions',
    'verified',
  ),
  candidate(
    'guardrails.update',
    'guardrails',
    'PUT',
    '/guardrails/{guardrailId}',
    'data',
    'updateGuardrail',
    'verified',
  ),
  candidate(
    'providers.get',
    'providers',
    'GET',
    '/providers/{providerId}',
    'data',
    'GET /providers/{slug}',
    'verified',
  ),
  candidate(
    'providers.update',
    'providers',
    'PUT',
    '/providers/{providerId}',
    'data',
    'PUT /providers/{slug}',
    'verified',
  ),
  candidate(
    'deployments.update',
    'deployments',
    'PUT',
    '/deployments/{deploymentId}',
    'admin',
    'updateDeployment',
    'verified',
  ),
  candidate(
    'deployments.ping',
    'deployments',
    'GET',
    '/deployments/{deploymentId}/ping',
    'admin',
    'pingDeployment',
    'verified',
  ),
  candidate(
    'mcpIntegrations.get',
    'mcp-integrations',
    'GET',
    '/mcp-integrations/{mcpIntegrationId}',
    'admin',
    'McpIntegrations_retrieve',
    'verified',
  ),
  candidate(
    'mcpIntegrations.update',
    'mcp-integrations',
    'PUT',
    '/mcp-integrations/{mcpIntegrationId}',
    'admin',
    'McpIntegrations_update',
    'verified',
  ),
  candidate(
    'mcpIntegrations.delete',
    'mcp-integrations',
    'DELETE',
    '/mcp-integrations/{mcpIntegrationId}',
    'admin',
    'McpIntegrations_delete',
    'verified',
  ),
  candidate(
    'mcpIntegrations.getCapabilities',
    'mcp-integrations',
    'GET',
    '/mcp-integrations/{mcpIntegrationId}/capabilities',
    'admin',
    'McpIntegrationCapabilities_list',
    'verified',
  ),
  candidate(
    'mcpIntegrations.setWorkspaces',
    'mcp-integrations',
    'PUT',
    '/mcp-integrations/{mcpIntegrationId}/workspaces',
    'admin',
    'McpIntegrationWorkspaces_bulkUpdate',
    'verified',
  ),
  candidate(
    'mcpIntegrations.setCapabilities',
    'mcp-integrations',
    'PUT',
    '/mcp-integrations/{mcpIntegrationId}/capabilities',
    'admin',
    'McpIntegrationCapabilities_bulkUpdate',
    'verified',
  ),
  candidate(
    'mcpIntegrations.getMetadata',
    'mcp-integrations',
    'GET',
    '/mcp-integrations/{mcpIntegrationId}/metadata',
    'admin',
    'McpIntegrationMetadata_retrieve',
    'verified',
  ),
  candidate(
    'apiKeys.get',
    'api-keys',
    'GET',
    '/api-keys/{keyId}',
    'data',
    'GET /api-keys/{id}',
    'divergent',
  ),
  candidate(
    'apiKeys.delete',
    'api-keys',
    'DELETE',
    '/api-keys/{keyId}',
    'data',
    'DELETE /api-keys/{id}',
    'divergent',
  ),
  candidate(
    'apiKeys.rotate',
    'api-keys',
    'POST',
    '/api-keys/{keyId}/rotate',
    'data',
    'POST /api-keys/{id}/rotate',
    'divergent',
  ),
  candidate(
    'apiKeys.getService',
    'api-keys',
    'GET',
    '/api-keys/service/{keyId}',
    'data',
    'GET /api-keys/{id}',
    'verified',
  ),
  candidate(
    'apiKeys.getUser',
    'api-keys',
    'GET',
    '/api-keys/user/{keyId}',
    'data',
    'GET /api-keys/{id}',
    'verified',
  ),
  candidate(
    'apiKeys.deleteService',
    'api-keys',
    'DELETE',
    '/api-keys/service/{keyId}',
    'data',
    'DELETE /api-keys/{id}',
    'verified',
  ),
  candidate(
    'apiKeys.deleteUser',
    'api-keys',
    'DELETE',
    '/api-keys/user/{keyId}',
    'data',
    'DELETE /api-keys/{id}',
    'verified',
  ),
  candidate(
    'apiKeys.rotateService',
    'api-keys',
    'POST',
    '/api-keys/service/{keyId}/rotate',
    'data',
    'POST /api-keys/{id}/rotate',
    'verified',
  ),
  candidate(
    'apiKeys.rotateUser',
    'api-keys',
    'POST',
    '/api-keys/user/{keyId}/rotate',
    'data',
    'POST /api-keys/{id}/rotate',
    'verified',
  ),
];

function candidate(
  id: string,
  resource: string,
  method: AIGatewayProbeMethod,
  pathTemplate: string,
  plane: AIGatewayProbePlane,
  operationId: string,
  status: AIGatewayProbeStatus = 'proposed',
): AIGatewayProbeOperation {
  return {
    id,
    resource,
    method,
    pathTemplate,
    plane,
    status,
    source: { repository: 'portkey-openapi', commit: PORTKEY_OPENAPI_COMMIT, operationId },
  };
}

export interface AIGatewayProbeTransportResponse {
  status: number;
  headers: Record<string, string>;
  body: unknown;
}

export interface AIGatewayProbeTransport {
  send(request: {
    plane: AIGatewayProbePlane;
    method: AIGatewayProbeMethod;
    path: string;
    body?: unknown;
  }): Promise<AIGatewayProbeTransportResponse>;
}

export interface AIGatewayProbeRecord {
  operationId: string;
  source: AIGatewayProbeOperation['source'];
  method: AIGatewayProbeMethod;
  path: string;
  plane: AIGatewayProbePlane;
  outcome: AIGatewayProbeOutcome;
  verifiedAt: string;
  evidence?: AIGatewayProbeTransportResponse;
}

export interface RunAIGatewayProbeOptions {
  variables?: Record<string, string>;
  body?: unknown;
  dryRun?: boolean;
  allowMutation?: boolean;
  transport: AIGatewayProbeTransport;
  now?: () => Date;
}

const SENSITIVE_KEY = /^(authorization|proxy-authorization|x-tsg-id)$/i;
const SENSITIVE_KEY_COMPONENT =
  /(?:^|[-_])(?:api[-_]?key|key|token|secret|credential|password)(?:$|[-_])/i;

/** Recursively remove common credential and tenant fields from recorded probe evidence. */
export function redactProbeValue(value: unknown, key?: string): unknown {
  if (key && isSensitiveKey(key)) return '[REDACTED]';
  if (Array.isArray(value)) return value.map((item) => redactProbeValue(item));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([entryKey, entryValue]) => [
        entryKey,
        redactProbeValue(entryValue, entryKey),
      ]),
    );
  }
  return value;
}

function isSensitiveKey(key: string): boolean {
  const normalized = key.replace(/([a-z0-9])([A-Z])/g, '$1_$2');
  return SENSITIVE_KEY.test(normalized) || SENSITIVE_KEY_COMPONENT.test(normalized);
}

/** Run one candidate probe and return a JSON-serializable, redacted evidence record. */
export async function runAIGatewayProbe(
  operation: AIGatewayProbeOperation,
  options: RunAIGatewayProbeOptions,
): Promise<AIGatewayProbeRecord> {
  const path = resolvePath(operation.pathTemplate, options.variables ?? {});
  const verifiedAt = (options.now ?? (() => new Date()))().toISOString();
  const base = {
    operationId: operation.id,
    source: operation.source,
    method: operation.method,
    path,
    plane: operation.plane,
    verifiedAt,
  };

  if (options.dryRun) return { ...base, outcome: 'dry-run' };
  if (operation.method !== 'GET' && !options.allowMutation) {
    throw new Error(`Mutation probe ${operation.id} requires allowMutation: true`);
  }

  const response = await options.transport.send({
    plane: operation.plane,
    method: operation.method,
    path,
    body: options.body,
  });
  return {
    ...base,
    outcome: classifyStatus(response.status),
    evidence: redactProbeValue(response) as AIGatewayProbeTransportResponse,
  };
}

function resolvePath(pathTemplate: string, variables: Record<string, string>): string {
  return pathTemplate.replace(/\{([^}]+)\}/g, (_match, name: string) => {
    const value = variables[name];
    if (!value) throw new Error(`Missing path variable: ${name}`);
    return encodeURIComponent(value);
  });
}

function classifyStatus(status: number): AIGatewayProbeOutcome {
  if (status >= 200 && status < 300) return 'verified';
  if (status === 401) return 'unauthenticated';
  if (status === 403) return 'unauthorized';
  if (status === 404) return 'route-divergent';
  if (status >= 500) return 'server-error';
  return 'client-error';
}

/** Create a transport using the SDK's normal SCM endpoints and authentication chain. */
export function createScmProbeTransport(): AIGatewayProbeTransport {
  const dataEndpoint = process.env[AI_GW_DATA_ENDPOINT] ?? DEFAULT_AI_GW_DATA_ENDPOINT;
  const adminEndpoint = process.env[AI_GW_ADMIN_ENDPOINT] ?? DEFAULT_AI_GW_ADMIN_ENDPOINT;
  const { oauthClient, tsgId } = resolveOAuthConfig({
    baseUrl: dataEndpoint,
    primaryEnvPrefix: 'PANW_AI_GW',
    fallbackEnvPrefix: 'PANW_MGMT',
  });
  const auth: AuthAdapter = new TsgHeaderAuth(new OAuthAuth(oauthClient), tsgId);

  return {
    async send(probe): Promise<AIGatewayProbeTransportResponse> {
      const baseUrl = probe.plane === 'data' ? dataEndpoint : adminEndpoint;
      const url = new URL(`${baseUrl.replace(/\/+$/, '')}${probe.path}`);
      const headers: Record<string, string> = { 'service-name': 'api' };
      const bodyText = probe.body === undefined ? undefined : JSON.stringify(probe.body);
      if (bodyText !== undefined) headers['Content-Type'] = 'application/json';
      const prepared: PreparedRequest = { method: probe.method, url, headers, bodyText };
      const request = await auth.prepare(prepared);
      const response = await fetch(request.url, {
        method: request.method,
        headers: request.headers,
        body: request.bodyText,
      });
      const text = await response.text();
      let body: unknown = undefined;
      if (text) {
        try {
          body = JSON.parse(text);
        } catch {
          body = text;
        }
      }
      return { status: response.status, headers: safeResponseHeaders(response.headers), body };
    },
  };
}

function safeResponseHeaders(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};
  for (const name of ['content-type', 'x-correlation-id', 'x-opa-decision', 'x-request-id']) {
    const value = headers.get(name);
    if (value !== null) result[name] = value;
  }
  return result;
}

interface CliOptions {
  list: boolean;
  execute: boolean;
  allowMutation: boolean;
  operationId?: string;
  variables: Record<string, string>;
  bodyFile?: string;
  outputFile?: string;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = { list: false, execute: false, allowMutation: false, variables: {} };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--list') options.list = true;
    else if (arg === '--execute') options.execute = true;
    else if (arg === '--allow-mutation') options.allowMutation = true;
    else if (arg === '--operation') options.operationId = requiredValue(argv, ++index, arg);
    else if (arg === '--body-file') options.bodyFile = requiredValue(argv, ++index, arg);
    else if (arg === '--output') options.outputFile = requiredValue(argv, ++index, arg);
    else if (arg === '--var') {
      const assignment = requiredValue(argv, ++index, arg);
      const separator = assignment.indexOf('=');
      if (separator < 1) throw new Error('--var requires name=value');
      options.variables[assignment.slice(0, separator)] = assignment.slice(separator + 1);
    } else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function requiredValue(argv: string[], index: number, flag: string): string {
  const value = argv[index];
  if (!value || value.startsWith('--')) throw new Error(`${flag} requires a value`);
  return value;
}

async function main(argv = process.argv.slice(2)): Promise<void> {
  const options = parseArgs(argv);
  if (options.list) {
    console.log(JSON.stringify(AI_GATEWAY_PROBE_OPERATIONS, null, 2));
    return;
  }
  if (!options.operationId)
    throw new Error('Use --operation <id>, or --list to inspect candidates');
  const operation = AI_GATEWAY_PROBE_OPERATIONS.find(({ id }) => id === options.operationId);
  if (!operation) throw new Error(`Unknown operation: ${options.operationId}`);
  const body = options.bodyFile
    ? (JSON.parse(await readFile(options.bodyFile, 'utf8')) as unknown)
    : undefined;
  const record = await runAIGatewayProbe(operation, {
    variables: options.variables,
    body,
    dryRun: !options.execute,
    allowMutation: options.allowMutation,
    transport: options.execute ? createScmProbeTransport() : { send: async () => never() },
  });
  const output = `${JSON.stringify(record, null, 2)}\n`;
  if (options.outputFile) await writeFile(options.outputFile, output, { mode: 0o600 });
  else process.stdout.write(output);
}

function never(): never {
  throw new Error('Dry-run transport must not execute');
}

const invokedDirectly = process.argv[1] === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
