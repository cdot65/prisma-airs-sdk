/** @internal Bounded provider-route probes without substituting the prescribed inference model. */
import assert from 'node:assert/strict';
import { File } from 'node:buffer';
import { AIGatewayInferenceClient, AISecSDKException, ErrorType } from '../src/index.js';
import * as models from '../src/models/ai-gateway-inference.js';
import { runtimeSuite } from './e2e/gateway-runtime.js';
import { syntheticPng, syntheticWav } from './e2e/runtime-media-fixtures.js';

const sdkMode = process.argv.includes('--sdk');
await runtimeSuite(
  sdkMode ? 'gateway-provider-http-sdk' : 'gateway-provider-http',
  async ({ harness, endpoint, apiKey }) => {
    assert.equal(endpoint, 'https://airs.cdot.io/v1');
    const headers = { 'x-portkey-api-key': apiKey, 'x-portkey-provider': '@openai' };
    const sdk = new AIGatewayInferenceClient({ endpoint, apiKey, numRetries: 0 });
    const sdkRequest = (path: string, body: Record<string, unknown>) => {
      const options = {
        headers: { 'x-portkey-provider': '@openai' },
        signal: AbortSignal.timeout(20_000),
      };
      switch (path) {
        case '/images/generations':
          return sdk.createImage(
            models.GatewayInferenceInputCreateImageRequestSchema.parse(body),
            options,
          );
        case '/images/edits':
          return sdk.createImageEdit(
            models.GatewayInferenceInputCreateImageEditRequestSchema.parse(body),
            options,
          );
        case '/images/variations':
          return sdk.createImageVariation(
            models.GatewayInferenceInputCreateImageVariationRequestSchema.parse(body),
            options,
          );
        case '/audio/speech':
          return sdk.createSpeech(
            models.GatewayInferenceInputCreateSpeechRequestSchema.parse(body),
            options,
          );
        case '/audio/transcriptions':
          return sdk.createTranscription(
            models.GatewayInferenceInputCreateTranscriptionRequestSchema.parse(body),
            options,
          );
        case '/audio/translations':
          return sdk.createTranslation(
            models.GatewayInferenceInputCreateTranslationRequestSchema.parse(body),
            options,
          );
        case '/moderations':
          return sdk.createModeration(
            models.GatewayInferenceInputCreateModerationRequestSchema.parse(body),
            options,
          );
        case '/rerank':
          return sdk.createRerank(
            models.GatewayInferenceInputCreateRerankRequestSchema.parse(body),
            options,
          );
        case '/ocr':
          return sdk.createOcr(
            models.GatewayInferenceInputCreateOcrRequestSchema.parse(body),
            options,
          );
        default:
          throw new Error('Unrecognized provider probe');
      }
    };
    const control = await harness.check('provider-http.model-auth-control', async () => {
      const response = await fetch(endpoint + '/models/gpt-5.6-terra', {
        headers,
        redirect: 'error',
        signal: AbortSignal.timeout(20_000),
      });
      assert.equal(response.status, 200);
      const body = (await response.json()) as { id?: string };
      assert.equal(body.id, 'gpt-5.6-terra');
      return true;
    });
    assert(control, 'A positive model/authentication control is required');
    const model = '@openai/gpt-5.6-terra';
    const image = new File([syntheticPng()], 'synthetic.png', { type: 'image/png' });
    const audio = new File([syntheticWav()], 'synthetic.wav', { type: 'audio/wav' });
    const imageData =
      'data:image/png;base64,' + Buffer.from(await image.arrayBuffer()).toString('base64');
    const probes: {
      path: string;
      body: Record<string, unknown>;
      multipart?: boolean;
      binary?: boolean;
    }[] = [
      {
        path: '/images/generations',
        body: {
          model,
          prompt: 'A plain white square.',
          n: 1,
          size: '256x256',
          response_format: 'b64_json',
        },
      },
      {
        path: '/images/edits',
        multipart: true,
        body: {
          model,
          image,
          prompt: 'Keep the square plain white.',
          n: 1,
          size: '256x256',
          response_format: 'b64_json',
        },
      },
      {
        path: '/images/variations',
        multipart: true,
        body: { model, image, n: 1, size: '256x256', response_format: 'b64_json' },
      },
      {
        path: '/audio/speech',
        binary: true,
        body: { model, input: 'Ready.', voice: 'alloy', response_format: 'wav' },
      },
      {
        path: '/audio/transcriptions',
        multipart: true,
        body: { model, file: audio, response_format: 'json' },
      },
      {
        path: '/audio/translations',
        multipart: true,
        body: { model, file: audio, response_format: 'json' },
      },
      { path: '/moderations', body: { model, input: 'The garden is peaceful.' } },
      {
        path: '/rerank',
        body: {
          model,
          query: 'Where is Paris?',
          documents: ['Paris is in France.', 'Berlin is in Germany.'],
          top_n: 1,
        },
      },
      {
        path: '/ocr',
        body: { model, document: { type: 'image_url', image_url: imageData }, image_limit: 1 },
      },
    ];
    for (const probe of probes) {
      await harness.check('provider-http' + probe.path.replaceAll('/', '.'), async () => {
        if (sdkMode) {
          const result = await sdkRequest(probe.path, probe.body);
          if (probe.binary) {
            assert(result instanceof Uint8Array && result.byteLength > 0);
            return { bytes: result.byteLength };
          }
          assert(result && typeof result === 'object');
          harness.captureResponseShape(probe.path + '.response', result);
          return true;
        }
        const form = new FormData();
        if (probe.multipart)
          for (const [name, value] of Object.entries(probe.body)) {
            if (value instanceof Blob)
              form.append(name, value, name === 'image' ? 'synthetic.png' : 'synthetic.wav');
            else form.append(name, String(value));
          }
        const response = await fetch(endpoint + probe.path, {
          method: 'POST',
          headers: {
            ...headers,
            ...(probe.multipart ? {} : { 'Content-Type': 'application/json' }),
          },
          body: probe.multipart ? form : JSON.stringify(probe.body),
          redirect: 'error',
          signal: AbortSignal.timeout(20_000),
        });
        if (!response.ok) {
          const text = await response.text();
          let value: unknown = text;
          try {
            value = JSON.parse(text);
          } catch {
            /* Store only structure, never upstream error values. */
          }
          harness.captureResponseShape(probe.path + '.error', value);
          console.log(
            JSON.stringify({
              diagnostic: probe.path,
              status: response.status,
              incompatibleModelOrProvider:
                /model.*(?:not.*(?:support|found)|invalid)|unsupported.*(?:model|provider)|provider.*not.*support/i.test(
                  text,
                ),
            }),
          );
          throw new AISecSDKException(
            'Prescribed-model provider HTTP probe failed',
            response.status >= 500 ? ErrorType.SERVER_SIDE_ERROR : ErrorType.CLIENT_SIDE_ERROR,
            { statusCode: response.status },
          );
        }
        if (probe.binary) {
          const bytes = new Uint8Array(await response.arrayBuffer());
          assert(bytes.length > 0);
          return { bytes: bytes.length, contentType: response.headers.get('content-type') };
        }
        const value: unknown = await response.json();
        assert(value && typeof value === 'object');
        harness.captureResponseShape(probe.path + '.response', value);
        return true;
      });
    }
  },
);
