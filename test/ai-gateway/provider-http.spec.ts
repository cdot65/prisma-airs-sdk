import { describe, expect, it, vi } from 'vitest';
import { File } from 'node:buffer';
import { AIGatewayInferenceClient } from '../../src/ai-gateway/inference-client.js';
import { gatewayMultipart } from '../../src/ai-gateway/runtime-wire.js';
import { ErrorType } from '../../src/errors.js';

const connection = { endpoint: 'https://gateway.test/v1', apiKey: 'offline-runtime-key' };
const model = '@provider/compatible-model';
const upload = new Blob([new Uint8Array([0, 255, 128, 10])], { type: 'application/octet-stream' });
const imageResponse = { created: 1, data: [{ b64_json: 'AA==', revised_prompt: 'synthetic' }] };
const categories = [
  'hate',
  'hate/threatening',
  'harassment',
  'harassment/threatening',
  'self-harm',
  'self-harm/intent',
  'self-harm/instructions',
  'sexual',
  'sexual/minors',
  'violence',
  'violence/graphic',
];
const cases = [
  {
    method: 'createImage',
    path: '/images/generations',
    body: { model, prompt: 'Synthetic', n: 1 },
    response: imageResponse,
  },
  {
    method: 'createImageEdit',
    path: '/images/edits',
    body: { model, image: upload, prompt: 'Synthetic' },
    response: imageResponse,
    multipart: true,
  },
  {
    method: 'createImageVariation',
    path: '/images/variations',
    body: { model, image: upload },
    response: imageResponse,
    multipart: true,
  },
  {
    method: 'createSpeech',
    path: '/audio/speech',
    body: { model, input: 'Synthetic', voice: 'alloy' },
    response: new Uint8Array([0, 255, 128, 10]),
    binary: true,
  },
  {
    method: 'createTranscription',
    path: '/audio/transcriptions',
    body: { model, file: upload },
    response: { text: 'Synthetic' },
    multipart: true,
  },
  {
    method: 'createTranslation',
    path: '/audio/translations',
    body: { model, file: upload },
    response: { text: 'Synthetic' },
    multipart: true,
  },
  {
    method: 'createModeration',
    path: '/moderations',
    body: { model, input: ['Synthetic'] },
    response: {
      id: 'modr-owned',
      model,
      results: [
        {
          flagged: false,
          categories: Object.fromEntries(categories.map((name) => [name, false])),
          category_scores: Object.fromEntries(categories.map((name) => [name, 0])),
        },
      ],
    },
  },
  {
    method: 'createRerank',
    path: '/rerank',
    body: { model, query: 'Synthetic', documents: ['One', { text: 'Two' }] },
    response: { object: 'list', model, results: [{ index: 0, relevance_score: 0.8 }] },
  },
  {
    method: 'createOcr',
    path: '/ocr',
    body: { model, document: { type: 'image_url', image_url: 'data:image/png;base64,AA==' } },
    response: { model, pages: [{ index: 0, markdown: 'Synthetic' }] },
  },
] as const;

// Dynamic lookup deliberately allows a failing-first test before new methods exist.
function invoke(client: AIGatewayInferenceClient, method: string, body: unknown, options?: object) {
  return (
    client as unknown as Record<string, (body: unknown, options?: object) => Promise<unknown>>
  )[method](body, options);
}

describe('experimental provider HTTP contracts (offline; not live certification)', () => {
  for (const item of cases)
    describe(item.method, () => {
      it('uses the explicit runtime route/auth and preserves native response data', async () => {
        const fetch = vi
          .fn()
          .mockImplementation(
            async () =>
              new Response(
                'binary' in item
                  ? item.response
                  : JSON.stringify({ ...item.response, provider_extension: true }),
              ),
          );
        const client = new AIGatewayInferenceClient({ ...connection, fetch });
        const result = await invoke(client, item.method, item.body, {
          headers: { 'x-portkey-provider': '@provider' },
        });
        expect(result).toEqual(
          'binary' in item ? item.response : { ...item.response, provider_extension: true },
        );
        expect(fetch).toHaveBeenCalledOnce();
        const [url, init] = fetch.mock.calls[0];
        expect(url).toBe(connection.endpoint + item.path);
        expect(init.method).toBe('POST');
        expect(init.redirect).toBe('error');
        const headers = new Headers(init.headers);
        expect(headers.get('x-portkey-api-key')).toBe(connection.apiKey);
        expect(headers.get('x-portkey-provider')).toBe('@provider');
        expect(headers.has('authorization')).toBe(false);
        expect(headers.has('x-tsg-id')).toBe(false);
        if ('multipart' in item) {
          expect(headers.has('content-type')).toBe(false);
          expect(init.body).toBeInstanceOf(FormData);
          for (const [key, value] of Object.entries(item.body)) {
            const part = (init.body as FormData).get(key);
            if (value instanceof Blob)
              expect(new Uint8Array(await (part as Blob).arrayBuffer())).toEqual(
                new Uint8Array(await value.arrayBuffer()),
              );
            else expect(part).toBe(String(value));
          }
        } else {
          expect(headers.get('content-type')).toBe('application/json');
          expect(JSON.parse(init.body)).toEqual(item.body);
        }
      });
      it('rejects unsupported fields without fetch', async () => {
        const fetch = vi.fn();
        const client = new AIGatewayInferenceClient({ ...connection, fetch });
        await expect(
          invoke(client, item.method, { ...item.body, unsupported: 'private-value' }),
        ).rejects.toMatchObject({ errorType: ErrorType.USER_REQUEST_PAYLOAD_ERROR });
        expect(fetch).not.toHaveBeenCalled();
      });
      it.each([null, undefined])('rejects a missing body (%j) without fetch', async (body) => {
        const fetch = vi.fn();
        const client = new AIGatewayInferenceClient({ ...connection, fetch });
        await expect(invoke(client, item.method, body)).rejects.toMatchObject({
          errorType: ErrorType.USER_REQUEST_PAYLOAD_ERROR,
        });
        expect(fetch).not.toHaveBeenCalled();
      });
      it('does not retry a provider error by default', async () => {
        const fetch = vi
          .fn()
          .mockImplementation(async () => new Response('temporary', { status: 503 }));
        const client = new AIGatewayInferenceClient({ ...connection, fetch });
        await expect(invoke(client, item.method, item.body)).rejects.toMatchObject({
          statusCode: 503,
        });
        expect(fetch).toHaveBeenCalledOnce();
      });
      it('preserves caller cancellation before dispatch', async () => {
        const fetch = vi.fn();
        const client = new AIGatewayInferenceClient({ ...connection, fetch });
        const controller = new AbortController();
        const reason = new Error('cancelled');
        controller.abort(reason);
        await expect(
          invoke(client, item.method, item.body, { signal: controller.signal }),
        ).rejects.toBe(reason);
        expect(fetch).not.toHaveBeenCalled();
      });
      if (!('binary' in item))
        it('rejects a malformed successful JSON envelope', async () => {
          const fetch = vi.fn().mockResolvedValue(new Response('{}'));
          const client = new AIGatewayInferenceClient({ ...connection, fetch });
          await expect(invoke(client, item.method, item.body)).rejects.toMatchObject({
            errorType: ErrorType.RESPONSE_VALIDATION,
          });
        });
    });
  for (const method of ['createTranscription', 'createTranslation']) {
    it.each(['text', 'srt', 'vtt'])(`${method} preserves %s output`, async (response_format) => {
      const text = 'WEBVTT\n\n00:00.000 --> 00:01.000\nSynthetic\n';
      const fetch = vi.fn().mockResolvedValue(new Response(text));
      const client = new AIGatewayInferenceClient({ ...connection, fetch });
      expect(await invoke(client, method, { model, file: upload, response_format })).toBe(text);
    });
    it(`${method} validates verbose fields instead of falling through to simple JSON`, async () => {
      const fetch = vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ text: 'Synthetic', language: 4, duration: 1 })),
        );
      const client = new AIGatewayInferenceClient({ ...connection, fetch });
      await expect(
        invoke(client, method, { model, file: upload, response_format: 'verbose_json' }),
      ).rejects.toMatchObject({ errorType: ErrorType.RESPONSE_VALIDATION });
    });
    it.each([1, '1'])(`${method} preserves duration %j in verbose JSON`, async (duration) => {
      const response = { text: 'Synthetic', language: 'english', duration };
      const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(response)));
      const client = new AIGatewayInferenceClient({ ...connection, fetch });
      expect(
        await invoke(client, method, { model, file: upload, response_format: 'verbose_json' }),
      ).toEqual(response);
    });
  }
  it('does not double-suffix already bracketed multipart array names', () => {
    const form = gatewayMultipart({
      'timestamp_granularities[]': ['word', 'segment'],
      plain: ['a', 'b'],
    });
    expect(form.getAll('timestamp_granularities[]')).toEqual(['word', 'segment']);
    expect(form.has('timestamp_granularities[][]')).toBe(false);
    expect(form.getAll('plain[]')).toEqual(['a', 'b']);
  });
  it('preserves File names and fetch-owned multipart boundaries in a serialized request', async () => {
    const file = new File([new Uint8Array([0, 255, 128, 10])], 'synthetic.wav', {
      type: 'audio/wav',
    });
    const form = gatewayMultipart({ file, 'timestamp_granularities[]': ['word', 'segment'] });
    const request = new Request(connection.endpoint + '/audio/transcriptions', {
      method: 'POST',
      body: form,
    });
    expect(request.headers.get('content-type')).toMatch(/^multipart\/form-data; boundary=/);
    const parsed = await request.formData();
    const uploaded = parsed.get('file') as File;
    expect(uploaded.name).toBe('synthetic.wav');
    expect(uploaded.type).toBe('audio/wav');
    expect(new Uint8Array(await uploaded.arrayBuffer())).toEqual(
      new Uint8Array(await file.arrayBuffer()),
    );
    expect(parsed.getAll('timestamp_granularities[]')).toEqual(['word', 'segment']);
  });
  it('sends transcription granularities as repeated exact declared names', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ text: 'Synthetic', language: 'english', duration: 1 })),
      );
    const client = new AIGatewayInferenceClient({ ...connection, fetch });
    await invoke(client, 'createTranscription', {
      model,
      file: upload,
      response_format: 'verbose_json',
      'timestamp_granularities[]': ['word', 'segment'],
    });
    expect((fetch.mock.calls[0][1].body as FormData).getAll('timestamp_granularities[]')).toEqual([
      'word',
      'segment',
    ]);
  });
});
