/** @internal Verify the tarball, installed consumer and source maps without importing source. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import WebSocket, { WebSocketServer } from 'ws';
import { once } from 'node:events';
import type { AIGatewayInferenceClient } from '../src/index.js';
import type { ManagementClient } from '../src/index.js';

const root = fileURLToPath(new URL('../', import.meta.url));
assert(process.argv[2], 'Pass the installed package root, not a source checkout');
const installed = resolve(process.argv[2]);
const version = (
  JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as { version: string }
).version;
const archive = resolve(root, `artifacts/package/cdot65-prisma-airs-sdk-${version}.tgz`);
const files = [
  'LICENSE',
  'README.md',
  'dist/index.cjs',
  'dist/index.cjs.map',
  'dist/index.d.cts',
  'dist/index.d.ts',
  'dist/index.js',
  'dist/index.js.map',
  'package.json',
];
assert.deepEqual(
  execFileSync('tar', ['-tzf', archive], { encoding: 'utf8' }).trim().split('\n').sort(),
  files.map((file) => `package/${file}`).sort(),
  'Unexpected or missing packaged files',
);
for (const file of files) {
  const expected = readFileSync(resolve(root, file));
  assert(expected.equals(readFileSync(resolve(installed, file))), `Stale installed file: ${file}`);
  assert(
    expected.equals(
      execFileSync('tar', ['-xOf', archive, `package/${file}`], { maxBuffer: 32_000_000 }),
    ),
    `Stale archive file: ${file}`,
  );
}
const sources = new Set<string>();
for (const file of files.filter((file) => file.endsWith('.map'))) {
  const map = JSON.parse(readFileSync(resolve(installed, file), 'utf8')) as {
    sources: string[];
    sourcesContent: string[];
  };
  assert.equal(map.sources.length, map.sourcesContent.length);
  map.sources.forEach((source, index) => {
    const path = resolve(dirname(resolve(root, file)), source);
    assert(path.startsWith(resolve(root, 'src') + '/'), 'Unexpected source-map source');
    assert.equal(
      readFileSync(path, 'utf8'),
      map.sourcesContent[index],
      `Stale bundled source: ${source}`,
    );
    sources.add(path);
  });
}
const esm = (await import(pathToFileURL(resolve(installed, 'dist/index.js')).href)) as Record<
  string,
  unknown
>;
const cjs = createRequire(import.meta.url)(resolve(installed, 'dist/index.cjs')) as Record<
  string,
  unknown
>;
assert.deepEqual(Object.keys(esm).sort(), Object.keys(cjs).sort(), 'ESM/CommonJS exports differ');
async function verifyOAuthDeadline(module: Record<string, unknown>): Promise<void> {
  const OAuth = module.OAuthClient as new (options: object) => {
    getToken(): Promise<string>;
    getTokenInfo(): { hasToken: boolean };
  };
  const originalFetch = globalThis.fetch;
  let releaseHeaders!: (response: Response) => void;
  let releaseBody!: (value: unknown) => void;
  const pendingHeaders = new Promise<Response>((resolve) => {
    releaseHeaders = resolve;
  });
  const pendingBody = new Promise<unknown>((resolve) => {
    releaseBody = resolve;
  });
  let recover = false;
  let calls = 0;
  let refreshes = 0;
  const signals: AbortSignal[] = [];
  const token = (value: string) => ({ access_token: value, expires_in: 3600 });
  let watchdog: ReturnType<typeof setTimeout> | undefined;
  try {
    globalThis.fetch = (input, init) => {
      calls++;
      assert(String(input).startsWith('https://oauth.offline.test/'));
      assert(init?.signal);
      signals.push(init.signal);
      if (recover) return Promise.resolve(new Response(JSON.stringify(token('offline-current'))));
      if (String(input).endsWith('/headers')) return pendingHeaders;
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => pendingBody,
        body: null,
      } as unknown as Response);
    };
    const options = {
      clientId: 'offline',
      clientSecret: 'offline',
      tsgId: '123456',
      onTokenRefresh: () => {
        refreshes++;
      },
    };
    const headers = new OAuth({ ...options, tokenEndpoint: 'https://oauth.offline.test/headers' });
    const body = new OAuth({ ...options, tokenEndpoint: 'https://oauth.offline.test/body' });
    const started = performance.now();
    const results = await Promise.race([
      Promise.allSettled([
        headers.getToken(),
        headers.getToken(),
        body.getToken(),
        body.getToken(),
      ]),
      new Promise<never>((_resolve, reject) => {
        watchdog = setTimeout(
          () => reject(new Error('Packed OAuth deadline did not release waiters')),
          35_000,
        );
      }),
    ]);
    assert(performance.now() - started >= 29_000, 'Packed OAuth deadline fired prematurely');
    assert.equal(calls, 2, 'Concurrent packed refreshes were not deduplicated');
    assert(signals.every((signal) => signal.aborted));
    for (const result of results) {
      assert.equal(result.status, 'rejected');
      if (result.status !== 'rejected') throw new Error('Unreachable fulfilled OAuth timeout');
      assert.equal(
        result.reason.errorType,
        (module.ErrorType as Record<string, string>).OAUTH_ERROR,
      );
      assert(String(result.reason).includes('Token request timed out'));
    }
    assert.equal(headers.getTokenInfo().hasToken, false);
    assert.equal(body.getTokenInfo().hasToken, false);
    assert.equal(refreshes, 0);
    recover = true;
    assert.deepEqual(await Promise.all([headers.getToken(), body.getToken()]), [
      'offline-current',
      'offline-current',
    ]);
    releaseHeaders(new Response(JSON.stringify(token('offline-late'))));
    releaseBody(token('offline-late'));
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.deepEqual(await Promise.all([headers.getToken(), body.getToken()]), [
      'offline-current',
      'offline-current',
    ]);
    assert.equal(calls, 4);
    assert.equal(refreshes, 2);
  } finally {
    clearTimeout(watchdog);
    releaseHeaders(new Response('{}'));
    releaseBody({});
    globalThis.fetch = originalFetch;
  }
}
async function verifyDashboard(module: Record<string, unknown>): Promise<void> {
  const beforeFetch = globalThis.fetch;
  const Client = module.ManagementClient as typeof ManagementClient;
  const urls: URL[] = [];
  const content = {
    report_id: 'report',
    scan_id: 'scan',
    sub_scan_req_id: 0,
    transaction_id: 'transaction',
    scan_contents: { response: 'synthetic', future: true },
  };
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    urls.push(url);
    assert.equal(url.hostname, 'dashboard.offline.test');
    if (url.pathname === '/token')
      return new Response(JSON.stringify({ access_token: 'synthetic', expires_in: 3600 }));
    const headers = new Headers(init?.headers);
    assert.equal(headers.get('authorization'), 'Bearer synthetic');
    assert.equal(headers.get('x-tsg-id'), '123');
    return new Response(JSON.stringify(content));
  };
  try {
    const client = new Client({
      clientId: 'synthetic',
      clientSecret: 'synthetic',
      tsgId: '123',
      apiEndpoint: 'https://management.offline.test',
      dashboardEndpoint: 'https://dashboard.offline.test/aisec',
      tokenEndpoint: 'https://dashboard.offline.test/token',
      numRetries: 0,
    });
    for (const method of [
      'applicationsOverview',
      'application',
      'applicationViolationBreakdown',
      'topApplicationsViolations',
      'applicationsViolationsTrend',
      'appsList',
      'sessionsChart',
      'sessionsOverview',
      'session',
      'sessionTransaction',
      'scanContent',
    ]) {
      const dashboard = client.dashboard as unknown as Record<string, unknown>;
      assert.equal(typeof dashboard[method], 'function');
      assert.equal(typeof dashboard[`${method}Raw`], 'function');
    }
    const query = { scanId: 'scan', scanSubReqId: 0 };
    assert.deepEqual(await client.dashboard.scanContentRaw(query), content);
    assert.deepEqual(await client.dashboard.scanContent(query), content);
    assert.equal(urls.length, 3, 'Shared OAuth token must be reused');
    assert.equal(urls[1].pathname, '/aisec/v1/mgmt/reports/scancontent');
    assert.equal(urls[1].searchParams.get('scan_sub_req_id'), '0');
    await assert.rejects(client.dashboard.scanContent({ scanId: 'scan', scanSubReqId: -1 }));
    assert.equal(urls.length, 3, 'Invalid query must not authenticate or fetch');
    assert.equal(module.SDK_VERSION, version);
  } finally {
    globalThis.fetch = beforeFetch;
  }
}
for (const module of [esm, cjs]) {
  await verifyDashboard(module);
  await verifyOAuthDeadline(module);
  const RealtimeClient = module.AIGatewayInferenceClient as typeof AIGatewayInferenceClient;
  const server = new WebSocketServer({ port: 0, host: '127.0.0.1', perMessageDeflate: false });
  await once(server, 'listening');
  const address = server.address();
  assert(address && typeof address !== 'string');
  let verifiedUpgrade = false;
  server.on('connection', (socket, request) => {
    verifiedUpgrade =
      request.url === '/v1/realtime?model=%40openai%2Fgpt-5.6-terra' &&
      request.headers['x-portkey-api-key'] === 'offline-runtime-key' &&
      request.headers.authorization === undefined;
    socket.send(JSON.stringify({ type: 'session.created', session: { id: 'offline-session' } }));
    socket.on('message', (data) =>
      socket.send(JSON.stringify({ type: 'session.updated', echoed: JSON.parse(String(data)) })),
    );
  });
  try {
    const realtime = await new RealtimeClient({
      endpoint: `http://127.0.0.1:${address.port}/v1`,
      apiKey: 'offline-runtime-key',
    }).connectRealtime(
      { model: '@openai/gpt-5.6-terra' },
      { timeoutMs: 3000, webSocketFactory: (url, options) => new WebSocket(url, options) },
    );
    try {
      assert(verifiedUpgrade);
      assert.equal((await realtime.next()).value.type, 'session.created');
      realtime.send({
        type: 'session.update',
        session: { instructions: 'Synthetic loopback only' },
      });
      assert.equal((await realtime.next()).value.type, 'session.updated');
    } finally {
      await realtime.cancel();
    }
  } finally {
    for (const socket of server.clients) socket.terminate();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
  const Pricing = module.AIGatewayModelPricingClient as new (options: object) => {
    get(provider: string, model: string): Promise<unknown>;
  };
  let pricingCalls = 0;
  const pricingBody = {
    currency: 'USD',
    pay_as_you_go: { request_token: { price: 0.003 } },
    future: true,
  };
  const publicPricing = new Pricing({
    endpoint: 'https://public.offline.test',
    fetch: async (url: string, init: RequestInit) => {
      pricingCalls++;
      assert.equal(url, 'https://public.offline.test/model-configs/pricing/provider%2Fa/model%2Fb');
      assert.equal(init.method, 'GET');
      assert.equal(init.redirect, 'error');
      const headers = new Headers(init.headers);
      for (const key of ['authorization', 'x-tsg-id', 'x-portkey-api-key'])
        assert.equal(headers.has(key), false);
      return new Response(JSON.stringify(pricingBody));
    },
  });
  await assert.rejects(publicPricing.get('.', 'model'), {
    errorType: (module.ErrorType as Record<string, string>).USER_REQUEST_PAYLOAD_ERROR,
  });
  assert.equal(pricingCalls, 0);
  assert.deepEqual(await publicPricing.get('provider/a', 'model/b'), pricingBody);
  assert.equal(pricingCalls, 1);
  const Gateway = module.AIGatewayClient as new (options: object) => {
    secretReferences: Record<string, unknown>;
  };
  const gateway = new Gateway({ clientId: 'offline', clientSecret: 'offline', tsgId: '123456' });
  for (const method of ['list', 'create', 'get', 'update', 'delete'])
    assert.equal(
      typeof gateway.secretReferences[method],
      'function',
      `Missing packaged secret-reference method: ${method}`,
    );
  const Client = module.AIGatewayInferenceClient as new (
    options: object,
  ) => Record<string, unknown>;
  const client = new Client({ endpoint: 'https://offline.test/v1', apiKey: 'offline-key' });
  for (const method of [
    'createFeedback',
    'createLogs',
    'updateFeedback',
    'getLog',
    'createFineTuningJob',
    'listPaginatedFineTuningJobs',
    'retrieveFineTuningJob',
    'cancelFineTuningJob',
    'listFineTuningEvents',
    'listFineTuningJobCheckpoints',
    'createImage',
    'createImageEdit',
    'createImageVariation',
    'createSpeech',
    'createTranscription',
    'createTranslation',
    'createModeration',
    'createRerank',
    'createOcr',
    'createCompletion',
    'createPromptCompletion',
    'createPromptRender',
  ])
    assert.equal(typeof client[method], 'function', `Missing packaged method: ${method}`);
  const detailCalls: { url: URL; init: RequestInit }[] = [];
  const detailResponse = {
    _id: null,
    organisation_id: null,
    created_at: null,
    request: { url: 'https://example.invalid', method: 'GET', portkeyHeaders: {} },
    response: { status: 200, responseTime: 1, lastUsedOptionJsonPath: '$' },
    future: { retained: true },
  };
  const details = new Client({
    endpoint: 'https://offline.test/v1',
    apiKey: 'offline-key',
    fetch: async (raw: string, init: RequestInit) => {
      detailCalls.push({ url: new URL(raw), init });
      const headers = new Headers(init.headers);
      assert.equal(headers.get('x-portkey-api-key'), 'offline-key');
      for (const name of ['authorization', 'x-tsg-id', 'x-portkey-provider'])
        assert.equal(headers.has(name), false);
      assert.equal(init.redirect, 'error');
      return new Response(
        JSON.stringify(init.method === 'PUT' ? { status: 'success' } : detailResponse),
      );
    },
  }) as unknown as {
    getLog(id: string, query?: object): Promise<unknown>;
    updateFeedback(id: string, body: object): Promise<unknown>;
  };
  const invalidInput = {
    errorType: (module.ErrorType as Record<string, string>).USER_REQUEST_PAYLOAD_ERROR,
  };
  await assert.rejects(details.getLog('owned-log', { path_format: 'v2' }), invalidInput);
  await assert.rejects(details.getLog('owned-log', { created_at: 'not-a-date' }), invalidInput);
  await assert.rejects(details.updateFeedback('not-a-uuid', { value: 0 }), invalidInput);
  await assert.rejects(
    details.updateFeedback('550e8400-e29b-41d4-a716-446655440000', { value: 11 }),
    invalidInput,
  );
  assert.equal(detailCalls.length, 0);
  const detailQuery = {
    path_format: 'v2',
    created_at: '2026-09-07T00:00:00.000+02:00',
    type: 'hooks',
  };
  assert.deepEqual(await details.getLog('owned/log', detailQuery), detailResponse);
  assert.equal(detailCalls[0].url.pathname, '/v1/logs/owned%2Flog');
  assert.deepEqual(Object.fromEntries(detailCalls[0].url.searchParams), detailQuery);
  assert.equal(detailCalls[0].init.method, 'GET');
  assert.equal(detailCalls[0].init.body, undefined);
  const update = { value: 0, weight: 0, metadata: { synthetic: true } };
  assert.deepEqual(await details.updateFeedback('550e8400-e29b-41d4-a716-446655440000', update), {
    status: 'success',
  });
  assert.equal(detailCalls[1].url.pathname, '/v1/feedback/550e8400-e29b-41d4-a716-446655440000');
  assert.equal(detailCalls[1].init.method, 'PUT');
  assert.deepEqual(JSON.parse(detailCalls[1].init.body as string), update);
  assert.equal(detailCalls.length, 2);
  for (const probe of [
    {
      method: 'createSpeech',
      path: '/audio/speech',
      body: { model: '@offline/model', input: 'Synthetic', voice: 'alloy' },
      response: new Uint8Array([0, 255, 128, 10]),
    },
    {
      method: 'createTranscription',
      path: '/audio/transcriptions',
      body: {
        model: '@offline/model',
        file: new Blob(['offline']),
        response_format: 'text',
        'timestamp_granularities[]': ['word', 'segment'],
      },
      response: 'Synthetic\n',
    },
    {
      method: 'createTranslation',
      path: '/audio/translations',
      body: {
        model: '@offline/model',
        file: new Blob(['offline']),
        response_format: 'verbose_json',
      },
      response: { text: 'Synthetic', language: 'english', duration: 1 },
    },
  ]) {
    let calls = 0;
    const media = new Client({
      endpoint: 'https://offline.test/v1',
      apiKey: 'offline-key',
      fetch: async (url: string, init: RequestInit) => {
        calls++;
        assert.equal(url, 'https://offline.test/v1' + probe.path);
        const headers = new Headers(init.headers);
        assert.equal(headers.get('x-portkey-api-key'), 'offline-key');
        assert.equal(headers.has('authorization'), false);
        assert.equal(headers.has('x-tsg-id'), false);
        if ('file' in probe.body) {
          assert(init.body instanceof FormData);
          assert.equal(headers.has('content-type'), false);
          assert.equal(await (init.body.get('file') as Blob).text(), 'offline');
          if (probe.method === 'createTranscription')
            assert.deepEqual(init.body.getAll('timestamp_granularities[]'), ['word', 'segment']);
        } else assert.deepEqual(JSON.parse(init.body as string), probe.body);
        return new Response(
          probe.response instanceof Uint8Array || typeof probe.response === 'string'
            ? probe.response
            : JSON.stringify(probe.response),
        );
      },
    });
    const invoke = media[probe.method] as (body: unknown) => Promise<unknown>;
    assert.deepEqual(await invoke.call(media, probe.body), probe.response);
    assert.equal(calls, 1);
  }
  const legacy = {
    id: 'cmpl-offline',
    object: 'text_completion',
    created: 1,
    model: '@offline/model',
    choices: [{ index: 0, text: 'Synthetic', logprobs: null, finish_reason: 'stop' }],
  };
  const chat = {
    id: 'chatcmpl-offline',
    object: 'chat.completion',
    created: 1,
    model: '@offline/model',
    choices: [
      { index: 0, message: { role: 'assistant', content: 'Synthetic' }, finish_reason: 'stop' },
    ],
  };
  const legacyChunk = {
    ...legacy,
    usage: null,
    choices: [{ ...legacy.choices[0], finish_reason: null }],
  };
  const chatChunk = {
    id: 'chatcmpl-offline',
    object: 'chat.completion.chunk',
    created: 1,
    model: '@offline/model',
    choices: [{ index: 0, delta: { content: 'Synthetic' }, finish_reason: null }],
  };
  for (const probe of [
    {
      method: 'createCompletion',
      path: '/completions',
      body: { model: '@offline/model', prompt: 'Synthetic' },
      response: legacy,
    },
    {
      method: 'createCompletion',
      path: '/completions',
      body: { model: '@offline/model', prompt: 'Synthetic', stream: true },
      response: legacyChunk,
    },
    {
      method: 'createPromptCompletion',
      path: '/prompts/owned%2Fprompt/completions',
      body: { variables: {}, max_completion_tokens: 16 },
      response: chat,
      id: 'owned/prompt',
    },
    {
      method: 'createPromptCompletion',
      path: '/prompts/owned%2Fprompt/completions',
      body: { variables: {}, stream: true },
      response: chatChunk,
      id: 'owned/prompt',
    },
    {
      method: 'createPromptRender',
      path: '/prompts/owned%2Fprompt/render',
      body: { variables: {} },
      response: { success: true, data: { model: '@offline/model', prompt: 'Synthetic' } },
      id: 'owned/prompt',
    },
  ]) {
    let calls = 0;
    const streaming = 'stream' in probe.body && probe.body.stream === true;
    const runtime = new Client({
      endpoint: 'https://offline.test/v1',
      apiKey: 'offline-key',
      fetch: async (url: string, init: RequestInit) => {
        calls++;
        assert.equal(url, 'https://offline.test/v1' + probe.path);
        assert.deepEqual(JSON.parse(init.body as string), probe.body);
        assert.equal(new Headers(init.headers).get('x-portkey-api-key'), 'offline-key');
        assert.equal(new Headers(init.headers).has('authorization'), false);
        return new Response(
          streaming
            ? `data: ${JSON.stringify(probe.response)}\n\ndata: [DONE]\n\n`
            : JSON.stringify(probe.response),
          { headers: { 'Content-Type': streaming ? 'text/event-stream' : 'application/json' } },
        );
      },
    });
    const invoke = runtime[probe.method] as (...args: unknown[]) => Promise<unknown>;
    const result = await invoke.call(runtime, ...('id' in probe ? [probe.id] : []), probe.body);
    if (streaming) {
      const events = [];
      for await (const event of result as AsyncIterable<unknown>) events.push(event);
      assert.deepEqual(events, [probe.response]);
    } else assert.deepEqual(result, probe.response);
    assert.equal(calls, 1);
  }
  const Telemetry = module.AIGatewayTelemetryClient as new (options: object) => {
    requests(options: object): Promise<unknown>;
    cost(options: object): Promise<unknown>;
    tokens(options: object): Promise<unknown>;
    groupBy(dimension: string, options: object): Promise<unknown>;
    byStatusCode(options: object): Promise<unknown>;
    byUser(options: object): Promise<unknown>;
    latency(options: object): Promise<{
      data: { total: number | null; p50: number | null; p90: number | null; p99: number | null };
    }>;
  };
  const filtersSchema = module.AIGatewayChartFiltersSchema as {
    parse(input: unknown): unknown;
    safeParse(input: unknown): { success: boolean };
  };
  assert.deepEqual(filtersSchema.parse({ statusCodes: [200, 446], costMax: 0.125 }), {
    statusCodes: [200, 446],
    costMax: 0.125,
  });
  assert.equal(filtersSchema.safeParse({ totalUnitsMin: 2, totalUnitsMax: 1 }).success, false);
  assert.equal(filtersSchema.safeParse({ workspaceSlug: 'ws-dev' }).success, false);
  let authCalls = 0;
  const urls: string[] = [];
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async (input) => {
      urls.push(String(input));
      if (
        new URL(String(input)).pathname.startsWith('/logs/groups/') &&
        !new URL(String(input)).pathname.endsWith('/users')
      ) {
        return new Response(
          JSON.stringify({ object: 'list', is_quota_exceeded: false, total: 0, data: [] }),
        );
      }
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            records: [],
            total: String(input).includes('/latency?') ? null : 0,
            avg: 0,
            p50: null,
            p90: null,
            p99: null,
            total_request_units: 0,
            total_response_units: 0,
            isQuotaExceeded: false,
          },
        }),
      );
    };
    const telemetry = new Telemetry({
      baseUrl: 'https://offline.test',
      tsgId: '123456',
      numRetries: 0,
      auth: {
        prepare: async (request: unknown) => {
          authCalls++;
          return request;
        },
      },
    });
    await assert.rejects(telemetry.requests({ workspaceSlug: 'ws-dev', days: NaN }), {
      errorType: (module.ErrorType as Record<string, string>).USER_REQUEST_PAYLOAD_ERROR,
    });
    assert.equal(authCalls, 0);
    assert.equal(urls.length, 0);
    await telemetry.requests({
      workspaceSlug: 'ws-dev',
      traceId: 'owned-trace',
      metadata: { tag: 'a+b&c' },
    });
    assert.equal(authCalls, 1);
    assert.equal(urls.length, 1);
    const url = new URL(urls[0]);
    assert.equal(url.searchParams.get('traceId'), 'owned-trace');
    assert.equal(url.searchParams.has('trace_id'), false);
    assert.deepEqual(JSON.parse(url.searchParams.get('metadata')!), { tag: 'a+b&c' });
    for (const metric of ['requests', 'cost', 'tokens', 'latency'] as const) {
      const before: number = authCalls;
      await assert.rejects(telemetry[metric]({ workspaceSlug: 'ws-dev', metadata: { count: 1 } }), {
        errorType: (module.ErrorType as Record<string, string>).USER_REQUEST_PAYLOAD_ERROR,
      });
      assert.equal(authCalls, before);
      await assert.rejects(
        telemetry[metric]({ workspaceSlug: 'ws-dev', totalUnitsMin: 2, totalUnitsMax: 1 }),
        {
          errorType: (module.ErrorType as Record<string, string>).USER_REQUEST_PAYLOAD_ERROR,
        },
      );
      assert.equal(authCalls, before);
      const result = await telemetry[metric]({
        workspaceSlug: 'ws-dev',
        traceId: 'owned-trace',
        metadata: { tag: 'a+b&c' },
        statusCodes: [200, 446],
        apiKeyIds: ['11111111-1111-4111-8111-111111111111'],
        aiOrgModels: ['openai__gpt-5.6-terra'],
        totalUnitsMin: 0,
        totalUnitsMax: 42,
        costMin: 0,
        costMax: 0.125,
      });
      const filtered = new URL(urls.at(-1)!);
      assert.equal(filtered.pathname, `/logs/charts/${metric}`);
      assert.equal(filtered.searchParams.get('traceId'), 'owned-trace');
      assert.deepEqual(JSON.parse(filtered.searchParams.get('metadata')!), { tag: 'a+b&c' });
      assert.equal(filtered.searchParams.get('statusCode'), '200,446');
      assert.equal(filtered.searchParams.get('apiKeyIds'), '11111111-1111-4111-8111-111111111111');
      assert.equal(filtered.searchParams.get('aiOrgModel'), 'openai__gpt-5.6-terra');
      assert.equal(filtered.searchParams.get('totalUnitsMin'), '0');
      assert.equal(filtered.searchParams.get('totalUnitsMax'), '42');
      assert.equal(filtered.searchParams.get('costMin'), '0');
      assert.equal(filtered.searchParams.get('costMax'), '0.125');
      if (metric === 'latency') {
        const data = (result as { data: Record<string, unknown> }).data;
        for (const field of ['total', 'p50', 'p90', 'p99']) assert.equal(data[field], null);
      }
    }
    for (const dimension of [
      'ai_service',
      'model',
      'api_key',
      'provider',
      'status_code',
      'users',
    ]) {
      const call = (options: object) =>
        dimension === 'users'
          ? telemetry.byUser(options)
          : dimension === 'status_code'
            ? telemetry.byStatusCode(options)
            : telemetry.groupBy(dimension, options);
      const before: number = authCalls;
      const beforeRequests: number = urls.length;
      for (const invalid of [
        { metadata: { count: 1 } },
        { costMin: 2, costMax: 1 },
        { statusCodes: [] },
      ]) {
        await assert.rejects(call({ workspaceSlug: 'ws-dev', ...invalid }), {
          errorType: (module.ErrorType as Record<string, string>).USER_REQUEST_PAYLOAD_ERROR,
        });
      }
      assert.equal(authCalls, before);
      assert.equal(urls.length, beforeRequests);
      await call({
        workspaceSlug: 'ws-dev',
        traceId: 'owned+a&b',
        metadata: { tag: 'a+b&c' },
        statusCodes: [418, 200],
        apiKeyIds: ['11111111-1111-4111-8111-111111111111'],
        aiOrgModels: ['openai__model'],
        totalUnitsMin: 0,
        totalUnitsMax: 42,
        costMin: 0,
        costMax: 0.125,
        ...(dimension === 'users' ? {} : { columns: ['cost', 'total_tokens'] }),
      });
      const grouped = new URL(urls.at(-1)!);
      assert.equal(grouped.pathname, `/logs/groups/${dimension}`);
      assert.equal(grouped.searchParams.get('traceId'), 'owned+a&b');
      assert.equal(grouped.searchParams.get('metadata'), '{"tag":"a+b&c"}');
      assert.equal(grouped.searchParams.get('statusCode'), '418,200');
      assert.equal(grouped.searchParams.get('apiKeyIds'), '11111111-1111-4111-8111-111111111111');
      assert.equal(grouped.searchParams.get('aiOrgModel'), 'openai__model');
      assert.equal(grouped.searchParams.get('totalUnitsMin'), '0');
      assert.equal(grouped.searchParams.get('totalUnitsMax'), '42');
      assert.equal(grouped.searchParams.get('costMin'), '0');
      assert.equal(grouped.searchParams.get('costMax'), '0.125');
      assert.equal(
        grouped.searchParams.get('columns'),
        dimension === 'users' ? null : 'cost,total_tokens',
      );
      assert.equal(authCalls, before + 1);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
}
const bytes = readFileSync(archive);
// Resolve the actual installed package from a sibling, never this checkout's TS aliases.
// The specimen is version controlled; callers cannot substitute an empty passing file.
const typeDirectory = mkdtempSync(resolve(installed, '../../../.prisma-airs-sdk-types-'));
try {
  const specimen = resolve(typeDirectory, 'type-smoke.ts');
  writeFileSync(specimen, readFileSync(resolve(root, 'scripts/fixtures/package-type-smoke.ts')), {
    flag: 'wx',
    mode: 0o600,
  });
  execFileSync(
    process.execPath,
    [
      resolve(root, 'node_modules/typescript/bin/tsc'),
      '--noEmit',
      '--strict',
      '--skipLibCheck',
      '--target',
      'ES2022',
      '--module',
      'NodeNext',
      specimen,
    ],
    { cwd: root, stdio: 'pipe' },
  );
} finally {
  rmSync(typeDirectory, { recursive: true, force: true });
}
const report = {
  checkedAt: new Date().toISOString(),
  nodeVersion: process.version,
  version,
  archive,
  installed,
  sha256: createHash('sha256').update(bytes).digest('hex'),
  bytes: bytes.byteLength,
  verifiedPayloadFiles: files,
  installedPayloadIdentical: true,
  sourceMapVerifiedSourceFiles: sources.size,
  runtimeExports: Object.keys(esm).length,
  formats: ['ESM', 'CommonJS'],
  strictNodeNextTypesPassed: true,
  dashboardExportsZeroIndexAndPreAuthPassed: true,
  typeSpecimenSha256: createHash('sha256')
    .update(readFileSync(resolve(root, 'scripts/fixtures/package-type-smoke.ts')))
    .digest('hex'),
  telemetryFilterWireAndPreAuthValidationPassed: true,
  telemetryGroupFilterWireAndPreAuthValidationPassed: true,
  providerHttpFormatsAndMultipartPassed: true,
  legacyPromptJsonAndSsePassed: true,
  publicPricingNoAuthAndTypesPassed: true,
  oauthDeadlineAndRecoveryPassed: true,
  observabilityDetailsContractsPassed: true,
  realtimeNativeWebSocketBothFormatsPassed: true,
  passed: true,
};
mkdirSync(resolve(root, 'artifacts/package'), { recursive: true });
writeFileSync(
  resolve(
    root,
    process.argv.includes('--matrix')
      ? `artifacts/package/verification-node${process.versions.node.split('.')[0]}.json`
      : 'artifacts/package/verification.json',
  ),
  JSON.stringify(report, null, 2) + '\n',
);
console.log(JSON.stringify(report));
