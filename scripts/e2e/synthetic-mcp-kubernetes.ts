/** @internal Exact-name, UID-preconditioned lifecycle for four disposable AIRS test resources. */
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { gzipSync } from 'node:zlib';
import { build } from 'tsup';
import { LiveHarness, writePrivateReport } from './harness.js';

const namespace = 'airs-gw';
const image =
  'registry.portkey.ai/airsgw/gateway_enterprise@sha256:1afc527536e0bfd1f93deabb14e38296eb0f6e878a364e881a35f8ec74b0f5c8';
const labelKey = 'prisma-airs-sdk.io/mcp-fixture';
const kinds = {
  ConfigMap: { version: 'v1', resource: 'configmaps', base: '/api/v1' },
  NetworkPolicy: {
    version: 'networking.k8s.io/v1',
    resource: 'networkpolicies',
    base: '/apis/networking.k8s.io/v1',
  },
  Service: { version: 'v1', resource: 'services', base: '/api/v1' },
  Pod: { version: 'v1', resource: 'pods', base: '/api/v1' },
} as const;
type Kind = keyof typeof kinds;
export function syntheticKubeKind(resource: string): Kind | undefined {
  const match = /^kubernetes\.synthetic-mcp\.(ConfigMap|NetworkPolicy|Service|Pod)$/.exec(resource);
  return match?.[1] as Kind | undefined;
}
type ObjectRecord = {
  apiVersion: string;
  kind: Kind;
  metadata: { name: string; namespace: string; labels: Record<string, string>; uid?: string };
  [key: string]: unknown;
};

export function syntheticMcpManifests(name: string, bundle: Buffer): ObjectRecord[] {
  assert.match(name, /^sdk-e2e-mcp-[0-9a-f]{8}$/);
  assert(
    bundle.length > 0 && bundle.length <= 700_000,
    'Fixture bundle must fit the bounded ConfigMap',
  );
  const labels = { [labelKey]: name };
  const object = (kind: Kind, fields: Record<string, unknown>): ObjectRecord => ({
    apiVersion: kinds[kind].version,
    kind,
    metadata: { name, namespace, labels },
    ...fields,
  });
  return [
    object('ConfigMap', {
      immutable: true,
      binaryData: { 'server.cjs.gz': bundle.toString('base64') },
    }),
    object('NetworkPolicy', {
      spec: {
        podSelector: { matchLabels: labels },
        policyTypes: ['Ingress', 'Egress'],
        egress: [],
        ingress: [
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
        ],
      },
    }),
    object('Service', {
      spec: {
        type: 'ClusterIP',
        selector: labels,
        ports: [{ name: 'mcp', port: 8080, targetPort: 8080, protocol: 'TCP' }],
      },
    }),
    object('Pod', {
      spec: {
        automountServiceAccountToken: false,
        restartPolicy: 'Never',
        activeDeadlineSeconds: 600,
        terminationGracePeriodSeconds: 5,
        securityContext: {
          runAsNonRoot: true,
          runAsUser: 10001,
          runAsGroup: 10001,
          seccompProfile: { type: 'RuntimeDefault' },
        },
        imagePullSecrets: [{ name: 'airsgatewayregistrycredentials' }],
        containers: [
          {
            name: 'fixture',
            image,
            imagePullPolicy: 'IfNotPresent',
            command: [
              'node',
              '-e',
              "const M=require('module');const m=new M('/fixture/server.cjs');m.filename='/fixture/server.cjs';m._compile(require('zlib').gunzipSync(require('fs').readFileSync('/fixture/server.cjs.gz')).toString(),'server.cjs');",
            ],
            env: [{ name: 'MCP_FIXTURE_HOST', value: `${name}.${namespace}.svc.cluster.local` }],
            ports: [{ containerPort: 8080, name: 'mcp' }],
            resources: {
              requests: { cpu: '100m', memory: '96Mi' },
              limits: { cpu: '250m', memory: '192Mi' },
            },
            securityContext: {
              allowPrivilegeEscalation: false,
              readOnlyRootFilesystem: true,
              capabilities: { drop: ['ALL'] },
            },
            volumeMounts: [{ name: 'fixture', mountPath: '/fixture', readOnly: true }],
            readinessProbe: {
              httpGet: { path: '/healthz', port: 8080 },
              initialDelaySeconds: 2,
              periodSeconds: 2,
              timeoutSeconds: 1,
              failureThreshold: 15,
            },
          },
        ],
        volumes: [{ name: 'fixture', configMap: { name, defaultMode: 0o444 } }],
      },
    }),
  ];
}

export function assertSyntheticKubeIdentity(
  object: ObjectRecord,
  kind: Kind,
  name: string,
  uid?: string,
) {
  assert.match(name, /^sdk-e2e-mcp-[0-9a-f]{8}$/);
  assert.equal(object.kind, kind);
  assert.equal(object.apiVersion, kinds[kind].version);
  assert.equal(object.metadata.namespace, namespace);
  assert.equal(object.metadata.name, name);
  assert.equal(object.metadata.labels[labelKey], name);
  assert.match(object.metadata.uid ?? '', /^[0-9a-f-]{36}$/);
  if (uid) assert.equal(object.metadata.uid, uid);
}

async function kubectl(args: string[], input?: unknown): Promise<string> {
  return new Promise((resolveResult, reject) => {
    const child = execFile(
      '/home/cdot/.local/share/cli-bin/kubectl',
      ['--request-timeout=20s', ...args],
      { timeout: 30_000, maxBuffer: 2 * 1024 * 1024, windowsHide: true },
      (error, stdout) => {
        if (error)
          reject(new Error(`Bounded kubectl ${args[0]} failed (${error.code ?? 'unknown'})`));
        else resolveResult(stdout);
      },
    );
    child.stdin?.on('error', () => {});
    child.stdin?.end(input === undefined ? undefined : JSON.stringify(input));
  });
}
export async function getSyntheticKubeObject(
  kind: Kind,
  name: string,
): Promise<ObjectRecord | undefined> {
  assert.match(name, /^sdk-e2e-mcp-[0-9a-f]{8}$/);
  const data = await kubectl([
    'get',
    kinds[kind].resource,
    name,
    '-n',
    namespace,
    '--ignore-not-found',
    '-o',
    'json',
  ]);
  return data.trim() ? (JSON.parse(data) as ObjectRecord) : undefined;
}
export async function deleteSyntheticKubeObject(
  kind: Kind,
  name: string,
  uid?: string,
): Promise<void> {
  const current = await getSyntheticKubeObject(kind, name);
  if (!current) return;
  assertSyntheticKubeIdentity(current, kind, name, uid);
  // kubectl RawDelete passes stdin as the DELETE body; UID prevents deleting a replacement.
  await kubectl(
    [
      'delete',
      `--raw=${kinds[kind].base}/namespaces/${namespace}/${kinds[kind].resource}/${name}`,
      '-f',
      '-',
    ],
    {
      apiVersion: 'v1',
      kind: 'DeleteOptions',
      gracePeriodSeconds: 5,
      propagationPolicy: 'Foreground',
      preconditions: { uid: current.metadata.uid },
    },
  );
  for (let attempt = 0; attempt < 15; attempt++) {
    if (!(await getSyntheticKubeObject(kind, name))) return;
    await delay(1000);
  }
  throw new Error('Owned Kubernetes resource deletion was not confirmed');
}

export async function createSyntheticMcpUpstream(harness: LiveHarness, tag: string) {
  assert(process.argv.includes('--writes'), 'Synthetic infrastructure requires --writes');
  assert.match(tag, /^sdk-e2e-inference-[0-9a-f]{8}$/);
  const name = `sdk-e2e-mcp-${tag.slice(-8)}`;
  const directory = resolve('artifacts/e2e/mcp-bundle', name);
  await build({
    entry: { server: 'scripts/e2e/synthetic-mcp-entry.ts' },
    outDir: directory,
    format: ['cjs'],
    platform: 'node',
    target: 'node18',
    bundle: true,
    noExternal: [/.*/],
    minify: true,
    sourcemap: false,
    clean: false,
    silent: true,
    dts: false,
  });
  const bundle = gzipSync(readFileSync(resolve(directory, 'server.cjs')), { level: 9 });
  const manifests = syntheticMcpManifests(name, bundle);
  const journal = {
    name,
    namespace,
    image,
    resources: manifests.map((item) => ({
      kind: item.kind,
      name,
      uid: undefined as string | undefined,
    })),
  };
  const journalPath = `artifacts/e2e/mcp-kubernetes-${name}.json`;
  writePrivateReport(journalPath, journal);
  for (const [index, manifest] of manifests.entries()) {
    assert.equal(
      await getSyntheticKubeObject(manifest.kind, name),
      undefined,
      'Fixture target already exists',
    );
    await kubectl(['create', '--dry-run=server', '-f', '-', '-o', 'json'], manifest);
    // Register before creation so an ambiguous create response is safely reconciled by exact name/label.
    harness.defer(`kubernetes.${manifest.kind}.deleted`, () =>
      deleteSyntheticKubeObject(manifest.kind, name, journal.resources[index].uid),
    );
    const created = JSON.parse(
      await kubectl(['create', '-f', '-', '-o', 'json'], manifest),
    ) as ObjectRecord;
    assertSyntheticKubeIdentity(created, manifest.kind, name);
    journal.resources[index].uid = created.metadata.uid;
    writePrivateReport(journalPath, journal);
    harness.own(`kubernetes.synthetic-mcp.${manifest.kind}`, created.metadata.uid!, name);
  }
  for (let attempt = 0; attempt < 45; attempt++) {
    const pod = await getSyntheticKubeObject('Pod', name);
    assert(pod);
    assertSyntheticKubeIdentity(pod, 'Pod', name, journal.resources[3].uid);
    const status = pod.status as
      | { phase?: string; conditions?: { type: string; status: string }[] }
      | undefined;
    assert(status?.phase !== 'Failed', 'Synthetic fixture pod failed');
    if (status?.conditions?.some((item) => item.type === 'Ready' && item.status === 'True'))
      return {
        name,
        url: `http://${name}.${namespace}.svc.cluster.local:8080/mcp`,
        podUid: pod.metadata.uid!,
      };
    await delay(2000);
  }
  throw new Error('Synthetic fixture did not become ready within 90 seconds');
}

export async function syntheticMcpMetrics(name: string, uid: string) {
  const pod = await getSyntheticKubeObject('Pod', name);
  assert(pod);
  assertSyntheticKubeIdentity(pod, 'Pod', name, uid);
  const data = await kubectl([
    'exec',
    name,
    '-n',
    namespace,
    '-c',
    'fixture',
    '--',
    'node',
    '-e',
    "fetch('http://127.0.0.1:8080/healthz',{signal:AbortSignal.timeout(5000)}).then(r=>r.text()).then(t=>process.stdout.write(t)).catch(()=>process.exit(1))",
  ]);
  const metrics = JSON.parse(data) as {
    initialize: number;
    toolsList: number;
    forbiddenToolCalls: number;
  };
  for (const value of Object.values(metrics)) assert(Number.isSafeInteger(value) && value >= 0);
  assert.equal(
    metrics.forbiddenToolCalls,
    0,
    'Unexpected tool execution attempt reached the upstream',
  );
  return metrics;
}
