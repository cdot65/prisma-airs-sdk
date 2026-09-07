/** @internal Metadata-only prompt/resource/template verification on an owned MCP server. */
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { AIGatewayClient, GatewayMcpServerCapabilityItem } from '../../src/index.js';
import type { LiveHarness } from './harness.js';

export const metadataKinds = ['prompt', 'resource', 'resource_template'] as const;
export type MetadataKind = (typeof metadataKinds)[number];
export type MetadataIdentity = { name: string; identity: string };

/** Record schema locations only; never copy values, messages or arbitrary property names. */
export function metadataValidationIssues(
  error: unknown,
): { path: (string | number)[]; code: string; expected: string }[] {
  if (!error || typeof error !== 'object' || !('issues' in error) || !Array.isArray(error.issues))
    return [];
  const fields = new Set([
    'resources',
    'resourceTemplates',
    'prompts',
    'name',
    'uri',
    'uriTemplate',
    'description',
    'mimeType',
    'size',
    '_meta',
    'annotations',
    'icons',
    'arguments',
  ]);
  const types = new Set(['number', 'string', 'object', 'array', 'boolean']);
  return error.issues
    .slice(0, 30)
    .filter((issue) => issue && typeof issue === 'object' && Array.isArray(issue.path))
    .map((issue) => ({
      path: issue.path
        .slice(0, 10)
        .map((part: unknown) =>
          typeof part === 'number' && Number.isSafeInteger(part) && part >= 0
            ? part
            : typeof part === 'string' && fields.has(part)
              ? part
              : '<field>',
        ),
      code: issue.code === 'invalid_type' ? 'invalid_type' : 'other',
      expected: types.has(issue.expected) ? (issue.expected as string) : 'other',
    }));
}

/** MCP permits 405 for anonymous session termination; do not mislabel it as deletion. */
export function anonymousSessionTermination(
  status: number | undefined,
): 'confirmed' | 'server-controlled' {
  assert(
    status !== undefined && ((status >= 200 && status < 300) || status === 405),
    'Anonymous session termination was neither confirmed nor explicitly unsupported',
  );
  return status === 405 ? 'server-controlled' : 'confirmed';
}

export function metadataIdentities(
  kind: MetadataKind,
  items: readonly Record<string, unknown>[],
  nextCursor?: string,
): MetadataIdentity[] {
  assert(!nextCursor, 'This bounded fixture requires complete, unpaginated metadata discovery');
  const identities = items.map((item) => {
    const identity =
      kind === 'prompt' ? item.name : kind === 'resource' ? item.uri : item.uriTemplate;
    assert(typeof item.name === 'string' && item.name.length > 0, 'Missing metadata name/identity');
    assert(typeof identity === 'string' && identity.length > 0, 'Missing protocol identity');
    return { name: item.name, identity };
  });
  assert.equal(
    new Set(identities.map((item) => item.identity)).size,
    identities.length,
    'Duplicate protocol identity',
  );
  return identities;
}

export function matchMetadataCapability(
  kind: MetadataKind,
  capability: GatewayMcpServerCapabilityItem,
  identities: readonly MetadataIdentity[],
): MetadataIdentity | undefined {
  if (capability.type !== kind || capability.enabled !== true || !capability.name) return;
  const explicit =
    kind === 'resource'
      ? capability.uri
      : kind === 'resource_template'
        ? capability.uri_template
        : undefined;
  const matches = identities.filter((item) =>
    explicit != null
      ? item.identity === explicit
      : item.name === capability.name || item.identity === capability.name,
  );
  return matches.length === 1 ? matches[0] : undefined;
}

export async function listMcpMetadata(
  client: Client,
  kind: MetadataKind,
  timeout = 20_000,
): Promise<MetadataIdentity[]> {
  const options = { timeout, maxTotalTimeout: timeout };
  if (kind === 'prompt') {
    const result = await client.listPrompts({}, options);
    return metadataIdentities(kind, result.prompts, result.nextCursor);
  }
  if (kind === 'resource') {
    const result = await client.listResources({}, options);
    return metadataIdentities(kind, result.resources, result.nextCursor);
  }
  const result = await client.listResourceTemplates({}, options);
  return metadataIdentities(kind, result.resourceTemplates, result.nextCursor);
}

export async function exerciseMcpMetadata(options: {
  harness: LiveHarness;
  management: AIGatewayClient;
  client: Client;
  serverId: string;
  assertOwned: () => Promise<unknown>;
  observations: Record<string, unknown>;
}): Promise<void> {
  const { harness: h, management: gw, client, serverId, assertOwned, observations } = options;
  const selected: {
    kind: MetadataKind;
    name: string;
    identity: string;
    baseline: MetadataIdentity[];
  }[] = [];
  const variants: Record<
    string,
    {
      runtimeBaseline: number;
      scmTotal: number;
      scmStates: boolean[];
      runtimeStates: boolean[];
      runtimeCounts: number[];
    }
  > = {};
  observations.variants = variants;
  const discovery: Record<string, Record<string, unknown>> = {};
  observations.discovery = discovery;
  for (const kind of metadataKinds) {
    discovery[kind] = {};
    const baseline = await h.check(`mcp.metadata.${kind}.list-without-execution`, async () => {
      try {
        const result = await listMcpMetadata(client, kind);
        discovery[kind].runtimeCount = result.length;
        assert(result.length > 0, 'Upstream must expose this metadata variant');
        return result;
      } catch (error) {
        discovery[kind].validationIssues = metadataValidationIssues(error);
        throw error;
      }
    });
    if (!baseline) {
      await h.check(`mcp.metadata.${kind}.SCM-inventory-only`, async () => {
        const result = await gw.mcpServers.getCapabilities(serverId, {
          page: 1,
          page_size: 500,
          type: kind,
        });
        discovery[kind].scmTotal = result.total;
        assert.equal(result.data?.length, result.total);
        assert(!result.has_more);
        return { count: result.total };
      });
      continue;
    }
    const match = await h.check(`mcp.metadata.${kind}.match-populated-SCM-capability`, async () => {
      for (let attempt = 0; attempt < 10; attempt++) {
        const result = await gw.mcpServers.getCapabilities(serverId, {
          page: 1,
          page_size: 500,
          type: kind,
        });
        const rows = result.data ?? [];
        discovery[kind].scmTotal = result.total;
        discovery[kind].scmAttempts = attempt + 1;
        assert.equal(rows.length, result.total, 'SCM inventory must be complete');
        assert(!result.has_more, 'SCM inventory must not have another page');
        for (const capability of rows) {
          const identity = matchMetadataCapability(kind, capability, baseline);
          if (identity)
            return { name: capability.name!, identity: identity.identity, scmTotal: rows.length };
        }
        if (attempt < 9) await delay(2000);
      }
      throw new Error('No enabled SCM capability matched this runtime metadata variant');
    });
    if (!match) continue;
    selected.push({ kind, name: match.name, identity: match.identity, baseline });
    variants[kind] = {
      runtimeBaseline: baseline.length,
      scmTotal: match.scmTotal,
      scmStates: [],
      runtimeStates: [],
      runtimeCounts: [baseline.length],
    };
  }
  // Exercise only positively matched owned variants. Earlier failed checks stay failures;
  // observations identify the exact selected kinds and cannot certify the missing variants.
  observations.selectedKinds = selected.map((item) => item.kind);
  if (selected.length === 0) return;
  for (const enabled of [false, true]) {
    const updated = await h.check(
      `mcp.metadata.bulk-${enabled ? 'enable' : 'disable'}-owned`,
      async () => {
        await assertOwned();
        await gw.mcpServers.updateCapabilities(serverId, {
          capabilities: selected.map(({ kind, name }) => ({ name, type: kind, enabled })),
        });
        for (const item of selected) {
          const result = await gw.mcpServers.getCapabilities(serverId, {
            page: 1,
            page_size: 500,
            type: item.kind,
          });
          assert.equal(result.data?.length, result.total);
          assert(!result.has_more);
          assert.equal(
            result.data?.find((row) => row.type === item.kind && row.name === item.name)?.enabled,
            enabled,
          );
          variants[item.kind].scmStates.push(enabled);
        }
        return true;
      },
    );
    if (!updated) return;
    const enforced = await h.check(
      `mcp.metadata.runtime-${enabled ? 'visible' : 'hidden'}`,
      async () => {
        const started = Date.now();
        const deadline = started + 330_000;
        while (Date.now() < deadline) {
          const current = new Map<MetadataKind, Set<string>>();
          for (const item of selected) {
            const timeout = Math.min(20_000, deadline - Date.now());
            assert(timeout > 0, 'MCP metadata propagation deadline exceeded');
            current.set(
              item.kind,
              new Set(
                (await listMcpMetadata(client, item.kind, timeout)).map((row) => row.identity),
              ),
            );
          }
          const visibility = selected.map((item) => ({
            kind: item.kind,
            visible: current.get(item.kind)!.has(item.identity),
            count: current.get(item.kind)!.size,
          }));
          console.log(
            JSON.stringify({
              phase: 'mcp.metadata-propagation',
              desired: enabled,
              elapsedMs: Date.now() - started,
              visibility,
            }),
          );
          if (visibility.every((item) => item.visible === enabled)) {
            for (const item of selected) {
              const visible = current.get(item.kind)!;
              for (const prior of item.baseline)
                if (prior.identity !== item.identity)
                  assert(
                    visible.has(prior.identity),
                    'An unrelated metadata capability disappeared',
                  );
              variants[item.kind].runtimeStates.push(enabled);
              variants[item.kind].runtimeCounts.push(visible.size);
            }
            return { visible: enabled, variants: visibility };
          }
          await delay(Math.min(30_000, Math.max(0, deadline - Date.now())));
        }
        throw new Error('Runtime metadata visibility did not reflect owned capability settings');
      },
    );
    if (!enforced) return;
  }
}
