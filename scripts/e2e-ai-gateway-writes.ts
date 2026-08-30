#!/usr/bin/env tsx
/**
 * @internal
 * Opt-in AI Gateway write conformance suite.
 *
 * The suite creates one disposable config, verifies partial/config replacement behavior and a
 * routing round-trip, then hard-deletes it in `finally`. Its regular-integration binding probes
 * are idempotent: they reuse an existing target-workspace binding and send its current enabled
 * state with override disabled. No organisation settings are mutated.
 */
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {
  AI_GATEWAY_REDACTED,
  AIGatewayClient,
  AISecSDKException,
  ErrorType,
  GatewayRoutingConfigSchema,
  redactAIGatewaySecrets,
} from '../src/index.js';
import { readOnePasswordItemFields } from './onepassword-fields.js';

type LogLevel = 'quiet' | 'normal' | 'verbose';

export interface WriteConformanceOptions {
  execute: boolean;
  allowMutation: boolean;
  workspaceRef?: string;
  integrationId?: string;
  logLevel: LogLevel;
}

export function parseWriteConformanceArgs(argv: string[]): WriteConformanceOptions {
  const options: WriteConformanceOptions = {
    execute: false,
    allowMutation: false,
    logLevel: 'normal',
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--execute') options.execute = true;
    else if (arg === '--allow-mutation') options.allowMutation = true;
    else if (arg === '--workspace') options.workspaceRef = requiredValue(argv, ++index, arg);
    else if (arg === '--integration-id') options.integrationId = requiredValue(argv, ++index, arg);
    else if (arg === '--log-level') {
      const value = requiredValue(argv, ++index, arg);
      if (value !== 'quiet' && value !== 'normal' && value !== 'verbose') {
        throw new Error('--log-level must be quiet, normal, or verbose');
      }
      options.logLevel = value;
    } else throw new Error(`Unknown argument: ${arg}`);
  }

  if (options.execute !== options.allowMutation) {
    throw new Error('Live writes require both --execute and --allow-mutation');
  }
  if (options.execute && !options.workspaceRef) {
    throw new Error('Live writes require --workspace <id-or-slug>');
  }
  return options;
}

function requiredValue(argv: string[], index: number, flag: string): string {
  const value = argv[index];
  if (!value || value.startsWith('--')) throw new Error(`${flag} requires a value`);
  return value;
}

interface WorkspaceBindingRead {
  id: string;
  enabled: boolean;
}

interface IntegrationWorkspaceRead {
  workspaces: WorkspaceBindingRead[];
  global_workspace_access: { enabled: boolean };
}

export async function selectBoundIntegration(
  integrationIds: readonly string[],
  workspaceId: string,
  workspaceSlug: string,
  getWorkspaces: (integrationId: string) => Promise<IntegrationWorkspaceRead>,
): Promise<{
  integrationId: string;
  binding: WorkspaceBindingRead;
  globalEnabled: boolean;
}> {
  for (const integrationId of integrationIds) {
    try {
      const current = await getWorkspaces(integrationId);
      const binding = current.workspaces.find(
        ({ id }) => id === workspaceId || id === workspaceSlug,
      );
      if (binding) {
        return {
          integrationId,
          binding: { id: binding.id, enabled: binding.enabled },
          globalEnabled: current.global_workspace_access.enabled,
        };
      }
    } catch {
      // A tenant can contain provider integrations whose binding sub-resource is unavailable.
    }
  }
  throw new Error('No regular integration already bound to the selected workspace');
}

function loadCredentials(): void {
  const vault = process.env.OP_AI_GATEWAY_VAULT ?? 'Prisma AIRS Harness';
  const item = process.env.OP_AI_GATEWAY_ITEM ?? 'Prisma AIRS Runtime Credentials - calvin';
  const fields = [
    ['PANW_MGMT_CLIENT_ID', 'PANW_MGMT_CLIENT_ID'],
    ['PANW_MGMT_CLIENT_SECRET', 'PANW_MGMT_CLIENT_SECRET'],
    ['PANW_MGMT_TSG_ID', 'PANW_MGMT_TSG_ID'],
  ] as const;
  const missing = fields.filter(([envName]) => !process.env[envName]);
  const loaded =
    missing.length > 0
      ? readOnePasswordItemFields(
          item,
          vault,
          missing.map(([, label]) => label),
        )
      : {};
  for (const [envName, label] of fields) {
    if (process.env[envName]) continue;
    process.env[envName] = loaded[label];
  }
}

function collectPrimitiveStrings(value: unknown, output: string[]): void {
  if (typeof value === 'string') output.push(value);
  else if (Array.isArray(value)) {
    for (const item of value) collectPrimitiveStrings(item, output);
  } else if (value && typeof value === 'object') {
    for (const item of Object.values(value)) collectPrimitiveStrings(item, output);
  }
}

function collectRedactedStrings(raw: unknown, safe: unknown, output: string[]): void {
  if (safe === AI_GATEWAY_REDACTED) {
    collectPrimitiveStrings(raw, output);
    return;
  }
  if (Array.isArray(raw) && Array.isArray(safe)) {
    for (let index = 0; index < raw.length; index += 1) {
      collectRedactedStrings(raw[index], safe[index], output);
    }
  } else if (raw && safe && typeof raw === 'object' && typeof safe === 'object') {
    for (const key of Object.keys(raw as Record<string, unknown>)) {
      collectRedactedStrings(
        (raw as Record<string, unknown>)[key],
        (safe as Record<string, unknown>)[key],
        output,
      );
    }
  }
}

async function verifyLiveProviderDebugRedaction(
  gw: AIGatewayClient,
  workspaceId: string,
): Promise<void> {
  const providers = await gw.providers.list({ workspaceId });
  const provider = providers.data[0];
  if (!provider)
    throw new Error('Debug redaction gate requires a provider in the target workspace');

  const previousDebug = process.env.PANW_AI_SEC_DEBUG;
  const originalConsoleError = console.error;
  const debugLines: string[] = [];
  process.env.PANW_AI_SEC_DEBUG = '1';
  console.error = (...args: unknown[]) => {
    debugLines.push(args.map(String).join(' '));
  };

  let detail: unknown;
  try {
    detail = await gw.providers.get(provider.id);
  } finally {
    console.error = originalConsoleError;
    if (previousDebug === undefined) delete process.env.PANW_AI_SEC_DEBUG;
    else process.env.PANW_AI_SEC_DEBUG = previousDebug;
  }

  const redacted = redactAIGatewaySecrets('providers.get', detail, 'response');
  if (JSON.stringify(redacted) === JSON.stringify(detail)) {
    throw new Error('Live provider response did not exercise any marked secret field');
  }
  const secretValues: string[] = [];
  collectRedactedStrings(detail, redacted, secretValues);
  const debugOutput = debugLines.join('\n');
  if (!debugOutput.includes(AI_GATEWAY_REDACTED)) {
    throw new Error('Debug output did not contain the expected redaction marker');
  }
  for (const secret of secretValues.filter((value) => value.length >= 8)) {
    if (debugOutput.includes(secret))
      throw new Error('A marked provider secret reached debug output');
  }
}

function print(options: WriteConformanceOptions, message: string): void {
  if (options.logLevel !== 'quiet') console.log(`[write-e2e] ${message}`);
}

export async function runWriteConformance(options: WriteConformanceOptions): Promise<void> {
  if (!options.execute || !options.allowMutation || !options.workspaceRef) {
    print(
      options,
      'Dry run only. Re-run with --execute --allow-mutation --workspace <id-or-slug>.',
    );
    return;
  }

  loadCredentials();
  const gw = new AIGatewayClient();
  const workspaces = await gw.workspaces.list({ plane: 'admin' });
  const workspace = workspaces.data.find(
    ({ id, slug }) => id === options.workspaceRef || slug === options.workspaceRef,
  );
  if (!workspace) throw new Error('Selected active workspace was not found on the admin plane');

  const integrationRows = await gw.integrations.list();
  const candidateIds = options.integrationId
    ? [options.integrationId]
    : integrationRows.data.map(({ id }) => id);
  const bound = await selectBoundIntegration(candidateIds, workspace.id, workspace.slug, (id) =>
    gw.integrations.getWorkspaces(id),
  );

  let configId: string | undefined;
  const name = `sdk-conformance-${randomUUID().slice(0, 8)}`;
  try {
    const created = await gw.configs.create({
      name,
      workspace_id: workspace.id,
      config: { cache: { max_age: 60, mode: 'simple' }, retry: { attempts: 2 } },
    });
    configId = created.id;
    print(options, 'Created disposable routing config.');

    try {
      await gw.configs.update(configId, {} as never);
      throw new Error('Empty config update unexpectedly passed local validation');
    } catch (error) {
      if (
        !(error instanceof AISecSDKException) ||
        error.errorType !== ErrorType.USER_REQUEST_PAYLOAD_ERROR
      ) {
        throw error;
      }
    }

    await gw.configs.update(configId, { name: `${name}-updated` });
    const renamed = await gw.configs.get(configId);
    if (renamed.name !== `${name}-updated`) {
      throw new Error('Name-only config update did not round-trip');
    }
    print(options, 'Verified config update does not require workspace_id or config.');

    await gw.configs.update(configId, {
      config: { cache: { max_age: 120, mode: 'simple' }, retry: { attempts: 3 } },
    });
    const updated = await gw.configs.get(configId);
    const routing = GatewayRoutingConfigSchema.parse(JSON.parse(updated.config));
    if (routing.retry?.attempts !== 3 || routing.cache?.max_age !== 120) {
      throw new Error('Replacement routing config did not round-trip');
    }
    print(options, 'Verified typed routing config replacement and read-back.');

    const baseBindingBody = {
      workspaces: [bound.binding],
      override_existing_workspace_access: false,
    } as const;
    await gw.integrations.setWorkspaces(bound.integrationId, {
      ...baseBindingBody,
      global_workspace_access: { enabled: bound.globalEnabled },
    });
    print(options, 'Verified idempotent regular integration binding object.');

    await verifyLiveProviderDebugRedaction(gw, workspace.id);
    print(options, 'Verified live provider response secrets are absent from SDK debug output.');
  } finally {
    if (configId) {
      await gw.configs.delete(configId);
      print(options, 'Deleted disposable routing config.');
    }
  }
}

async function main(): Promise<void> {
  const options = parseWriteConformanceArgs(process.argv.slice(2));
  await runWriteConformance(options);
}

const invokedDirectly = process.argv[1] === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  main().catch((error: unknown) => {
    console.error('Write conformance failed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
