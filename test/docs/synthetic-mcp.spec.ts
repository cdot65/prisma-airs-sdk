import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { once } from 'node:events';
import { request as httpRequest } from 'node:http';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { syntheticMcpServer } from '../../scripts/e2e/synthetic-mcp-server.js';
import {
  syntheticMcpManifests,
  assertSyntheticKubeIdentity,
} from '../../scripts/e2e/synthetic-mcp-kubernetes.js';
import { discoveryFetch } from '../../scripts/e2e/mcp-discovery-fetch.js';

const name = 'sdk-e2e-mcp-1234abcd';
describe('synthetic MCP fixture boundaries', () => {
  afterEach(() => vi.unstubAllGlobals());
  it.each(['airs-gw', 'sdk-e2e-mcp-1234abcd.extra', '../sdk-e2e-mcp-1234abcd', ''])(
    'rejects an unowned Kubernetes name: %s',
    (value) => {
      expect(() => syntheticMcpManifests(value, Buffer.from('bundle'))).toThrow();
    },
  );
  it('bounds fixture bundle size', () => {
    expect(() => syntheticMcpManifests(name, Buffer.alloc(0))).toThrow();
    expect(() => syntheticMcpManifests(name, Buffer.alloc(700001))).toThrow();
  });
  it('permits no production selector, external service, credentials mount, egress or privileged pod', () => {
    const objects = syntheticMcpManifests(name, Buffer.from('bundle'));
    expect(objects.map((item) => item.kind)).toEqual([
      'ConfigMap',
      'NetworkPolicy',
      'Service',
      'Pod',
    ]);
    const policy = objects[1].spec as {
      podSelector: unknown;
      egress: unknown[];
      ingress: unknown[];
    };
    expect(policy.podSelector).toEqual({ matchLabels: { 'prisma-airs-sdk.io/mcp-fixture': name } });
    expect(policy.egress).toEqual([]);
    expect(policy.ingress).toEqual([
      {
        from: [
          {
            podSelector: {
              matchLabels: {
                'app.kubernetes.io/name': 'airs-gw',
                'app.kubernetes.io/instance': 'airs-gw',
              },
            },
          },
        ],
        ports: [{ protocol: 'TCP', port: 8080 }],
      },
    ]);
    const service = objects[2].spec as Record<string, unknown>;
    expect(service.type).toBe('ClusterIP');
    expect(service.externalIPs).toBeUndefined();
    const pod = objects[3].spec as {
      automountServiceAccountToken: boolean;
      activeDeadlineSeconds: number;
      containers: Record<string, unknown>[];
      volumes: unknown[];
      securityContext: Record<string, unknown>;
    };
    expect(pod.automountServiceAccountToken).toBe(false);
    expect(pod.activeDeadlineSeconds).toBe(600);
    expect(pod.securityContext.runAsNonRoot).toBe(true);
    expect(pod.containers[0].securityContext).toEqual({
      allowPrivilegeEscalation: false,
      readOnlyRootFilesystem: true,
      capabilities: { drop: ['ALL'] },
    });
    expect(pod.volumes).toEqual([{ name: 'fixture', configMap: { name, defaultMode: 0o444 } }]);
    expect(pod.containers[0].image).toMatch(/@sha256:[0-9a-f]{64}$/);
  });
  it.each(['kind', 'namespace', 'name', 'label', 'uid'])(
    'rejects changed %s before deletion',
    (field) => {
      const object = structuredClone(syntheticMcpManifests(name, Buffer.from('bundle'))[0]);
      const uid = '550e8400-e29b-41d4-a716-446655440000';
      object.metadata.uid = uid;
      assertSyntheticKubeIdentity(object, 'ConfigMap', name, uid);
      if (field === 'kind') object.kind = 'Pod';
      if (field === 'namespace') object.metadata.namespace = 'other';
      if (field === 'name') object.metadata.name = 'other';
      if (field === 'label') object.metadata.labels['prisma-airs-sdk.io/mcp-fixture'] = 'other';
      if (field === 'uid') object.metadata.uid = '550e8400-e29b-41d4-a716-446655440001';
      expect(() => assertSyntheticKubeIdentity(object, 'ConfigMap', name, uid)).toThrow();
    },
  );
  it.each(['existing', 'absent'])(
    'initializes and lists through the official client with %s global Web Crypto',
    async (availability) => {
      // A distinct object detects accidental replacement of a provided implementation.
      const existingCrypto = { randomUUID: () => webcrypto.randomUUID() };
      vi.stubGlobal('crypto', availability === 'existing' ? existingCrypto : undefined);
      const server = syntheticMcpServer('127.0.0.1');
      expect(globalThis.crypto).toBe(availability === 'existing' ? existingCrypto : webcrypto);
      server.listen(0, '127.0.0.1');
      await once(server, 'listening');
      const address = server.address();
      assert(address && typeof address === 'object');
      const endpoint = new URL(`http://127.0.0.1:${address.port}/mcp`);
      const client = new Client({ name: 'fixture-test', version: '1' }, { capabilities: {} });
      const transport = new StreamableHTTPClientTransport(endpoint, {
        fetch: discoveryFetch(endpoint, []),
      });
      try {
        await client.connect(transport, { timeout: 2000 });
        const result = await client.listTools({}, { timeout: 2000 });
        expect(result.tools.map((item) => item.name)).toEqual(['sdk_e2e_discovery_probe']);
        expect(transport.sessionId).toBeUndefined();
        const health = await (await fetch(new URL('/healthz', endpoint))).json();
        expect(health).toEqual({ initialize: 1, toolsList: 1, forbiddenToolCalls: 0 });
        const rejected = await fetch(endpoint, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 2,
            method: 'tools/call',
            params: { name: 'sdk_e2e_discovery_probe', arguments: {} },
          }),
        });
        expect(rejected.status).toBe(403);
        await rejected.body?.cancel();
        // Native fetch may normalize Host; issue the hostile header on the actual wire.
        const wrongHost = await new Promise<number | undefined>((resolve, reject) => {
          const request = httpRequest(
            endpoint,
            { headers: { host: 'unrelated.example' } },
            (response) => {
              response.resume();
              resolve(response.statusCode);
            },
          );
          request.on('error', reject);
          request.setTimeout(1000, () =>
            request.destroy(new Error('Host guard request timed out')),
          );
          request.end();
        });
        expect(wrongHost).toBe(403);
      } finally {
        await client.close();
        server.closeAllConnections();
        await new Promise<void>((resolve, reject) =>
          server.close((error) => (error ? reject(error) : resolve())),
        );
      }
    },
  );
});
