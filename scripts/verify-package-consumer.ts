/** @internal Verify the tarball, installed consumer and source maps without importing source. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

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
for (const module of [esm, cjs]) {
  await verifyOAuthDeadline(module);
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
  };
  let authCalls = 0;
  const urls: string[] = [];
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async (input) => {
      urls.push(String(input));
      return new Response(
        JSON.stringify({
          success: true,
          data: { records: [], total: 0, avg: 0, isQuotaExceeded: false },
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
  } finally {
    globalThis.fetch = originalFetch;
  }
}
const bytes = readFileSync(archive);
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
    resolve(installed, '../../../type-smoke.ts'),
  ],
  { cwd: root, stdio: 'pipe' },
);
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
  telemetryFilterWireAndPreAuthValidationPassed: true,
  providerHttpFormatsAndMultipartPassed: true,
  legacyPromptJsonAndSsePassed: true,
  publicPricingNoAuthAndTypesPassed: true,
  oauthDeadlineAndRecoveryPassed: true,
  observabilityDetailsContractsPassed: true,
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
