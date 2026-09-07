import { AISecSDKException, ErrorType } from '../errors.js';
import { request } from '../http/request.js';
import { createEventStream, type GatewayStream } from '../http/event-stream.js';
import {
  openRealtime,
  type GatewayWebSocketFactory,
  type GatewayRealtimeConnection,
} from '../http/realtime.js';
import {
  GatewayRealtimeConnectRequestSchema,
  type GatewayRealtimeConnectRequest,
} from '../models/ai-gateway-realtime.js';
import type { AuthAdapter } from '../http/types.js';
import { AIGatewayRuntimeResourcesClient } from './runtime-resources-client.js';
import { gatewayPathSegment } from './runtime-wire.js';
import {
  GatewayInferenceInputCreateCompletionRequestSchema,
  GatewayInferenceCreateCompletionResponseSchema,
  GatewayInferenceInputCreatePromptCompletionRequestSchema,
  GatewayInferenceCreatePromptCompletionResponseSchema,
  GatewayInferenceCreatePromptCompletionStreamResponseSchema,
  GatewayInferenceInputCreatePromptRenderRequestSchema,
  GatewayInferenceCreatePromptRenderResponseSchema,
  type GatewayInferenceInputCreateCompletionRequest,
  type GatewayInferenceCreateCompletionResponse,
  type GatewayInferenceInputCreatePromptCompletionRequest,
  type GatewayInferenceCreatePromptCompletionResponse,
  type GatewayInferenceCreatePromptCompletionStreamResponse,
  type GatewayInferenceInputCreatePromptRenderRequest,
  type GatewayInferenceCreatePromptRenderResponse,
  GatewayInferenceInputCreateChatCompletionRequestSchema,
  GatewayInferenceCreateChatCompletionResponseSchema,
  GatewayInferenceCreateChatCompletionStreamResponseSchema,
  GatewayInferenceInputCreateEmbeddingRequestSchema,
  GatewayInferenceCreateEmbeddingResponseSchema,
  GatewayInferenceInputCreateResponseSchema,
  GatewayInferenceResponseSchema,
  GatewayInferenceResponseStreamEventSchema,
  type GatewayInferenceInputCreateResponse,
  type GatewayInferenceResponse,
  type GatewayInferenceResponseStreamEvent,
  type GatewayInferenceInputCreateChatCompletionRequest,
  type GatewayInferenceCreateChatCompletionResponse,
  type GatewayInferenceCreateChatCompletionStreamResponse,
  type GatewayInferenceInputCreateEmbeddingRequest,
  type GatewayInferenceCreateEmbeddingResponse,
} from '../models/ai-gateway-inference.js';

/** Chat request using provider-prefixed model IDs, without rewriting the caller's model.
 * @example `const body: GatewayChatCompletionRequest = { model: '@provider/model', messages: [{ role: 'user', content: 'Hello' }] };`
 */
export type GatewayChatCompletionRequest = GatewayInferenceInputCreateChatCompletionRequest;
/** A non-streaming chat completion.
 * @example `const result: GatewayChatCompletion = await inference.createChatCompletion(body);`
 */
export type GatewayChatCompletion = GatewayInferenceCreateChatCompletionResponse;
/** One validated streaming delta, including terminal usage-only chunks.
 * @example `for await (const chunk of stream) console.log(chunk.choices);`
 */
export type GatewayChatCompletionChunk = GatewayInferenceCreateChatCompletionStreamResponse;
/** Embedding request accepting text, batches of text, or token arrays.
 * @example `const body: GatewayEmbeddingRequest = { model: '@provider/embedding', input: 'Hello' };`
 */
export type GatewayEmbeddingRequest = GatewayInferenceInputCreateEmbeddingRequest;
/** Embedding output preserves the requested numeric-array or base64 representation.
 * @example `const result: GatewayEmbeddingResponse = await inference.createEmbedding(body);`
 */
export type GatewayEmbeddingResponse = GatewayInferenceCreateEmbeddingResponse;

/** Runtime connection options; no SCM OAuth credentials are accepted.
 * @example `new AIGatewayInferenceClient({ endpoint: 'https://gateway.example/v1', apiKey: process.env.PANW_AI_GW_INFERENCE_API_KEY });`
 */
export interface AIGatewayInferenceClientOptions {
  /** Full runtime base URL including its API prefix. Falls back to PANW_AI_GW_INFERENCE_ENDPOINT. */
  endpoint?: string;
  /** Runtime key sent as x-portkey-api-key. Falls back to PANW_AI_GW_INFERENCE_API_KEY. */
  apiKey?: string;
  /** Default total per-attempt deadline, including stream consumption. Default: 60,000 ms. */
  timeoutMs?: number;
  /** Explicit replay budget, 0–5. Default: 0 to avoid duplicate billable generations. */
  numRetries?: number;
  /** Maximum SSE event size, default 1 MiB. */
  maxEventBytes?: number;
  /** Optional caller-owned fetch implementation for explicit proxy/network integration. */
  fetch?: typeof globalThis.fetch;
}

/** Per-call cancellation, deadlines and provider/routing headers.
 * @example `await inference.createChatCompletion(body, { signal: controller.signal });`
 */
export interface GatewayInferenceRequestOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
  /** Opt-in retries may replay a billable generation; streams are never replayed after headers. */
  numRetries?: number;
  /** x-portkey-* routing/observability headers or OpenAI-Beta; authentication cannot be overridden. */
  headers?: Record<string, string>;
}

/** Explicit WebSocket transport and resource bounds. Realtime never inherits HTTP retries.
 * @example `const options: GatewayRealtimeOptions = { webSocketFactory: (url, options) => new WebSocket(url, options) };`
 */
export interface GatewayRealtimeOptions extends Omit<GatewayInferenceRequestOptions, 'numRetries'> {
  webSocketFactory: GatewayWebSocketFactory;
  handshakeTimeoutMs?: number;
  maxEventBytes?: number;
  maxBufferedEvents?: number;
  maxBufferedBytes?: number;
}

function positiveInteger(value: number, name: string): number {
  if (!Number.isSafeInteger(value) || value < 1)
    throw new AISecSDKException(
      `${name} must be a positive integer`,
      ErrorType.USER_REQUEST_PAYLOAD_ERROR,
    );
  return value;
}

/** Prisma gateway runtime inference, independent of management OAuth and SCM plane URLs.
 * @example
 * ```ts
 * const inference = new AIGatewayInferenceClient(); // PANW_AI_GW_INFERENCE_ENDPOINT / API_KEY
 * const result = await inference.createChatCompletion({
 *   model: '@provider/model', messages: [{ role: 'user', content: 'Hello' }],
 * });
 * console.log(result.choices[0].message.content);
 * ```
 */
export class AIGatewayInferenceClient extends AIGatewayRuntimeResourcesClient {
  private readonly baseUrl: string;
  private readonly auth: AuthAdapter;
  private readonly defaults: {
    timeoutMs: number;
    numRetries: number;
    maxEventBytes: number;
    fetch?: typeof globalThis.fetch;
  };

  constructor(options: AIGatewayInferenceClientOptions = {}) {
    super();
    const endpoint = options.endpoint ?? process.env.PANW_AI_GW_INFERENCE_ENDPOINT;
    const apiKey = options.apiKey ?? process.env.PANW_AI_GW_INFERENCE_API_KEY;
    if (!endpoint || !apiKey)
      throw new AISecSDKException(
        'Runtime inference requires endpoint and apiKey (PANW_AI_GW_INFERENCE_ENDPOINT / PANW_AI_GW_INFERENCE_API_KEY)',
        ErrorType.MISSING_VARIABLE,
      );
    let url: URL;
    try {
      url = new URL(endpoint);
    } catch {
      throw new AISecSDKException(
        'Inference endpoint must be an absolute URL',
        ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      );
    }
    if (
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      (url.protocol !== 'https:' &&
        !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)))
    )
      throw new AISecSDKException(
        'Inference endpoint requires HTTPS (HTTP is allowed only on loopback), without credentials, query or fragment',
        ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      );
    if (!apiKey.trim() || /[\r\n]/.test(apiKey))
      throw new AISecSDKException(
        'Inference apiKey must be a nonempty header value',
        ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      );
    this.baseUrl = url.href.replace(/\/+$/, '');
    // Keep the credential in a closure, not enumerable client/configuration properties.
    this.auth = {
      prepare: async (prepared) => ({
        ...prepared,
        headers: { ...prepared.headers, 'x-portkey-api-key': apiKey },
      }),
    };
    this.defaults = {
      timeoutMs: positiveInteger(options.timeoutMs ?? 60_000, 'timeoutMs'),
      maxEventBytes: positiveInteger(options.maxEventBytes ?? 1_048_576, 'maxEventBytes'),
      numRetries: options.numRetries ?? 0,
      fetch: options.fetch,
    };
    if (
      !Number.isInteger(this.defaults.numRetries) ||
      this.defaults.numRetries < 0 ||
      this.defaults.numRetries > 5
    )
      throw new AISecSDKException(
        'numRetries must be an integer from 0 to 5',
        ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      );
    if (options.fetch !== undefined && typeof options.fetch !== 'function')
      throw new AISecSDKException('fetch must be a function', ErrorType.USER_REQUEST_PAYLOAD_ERROR);
  }

  protected runtimeRequestOptions(options: GatewayInferenceRequestOptions) {
    const headers: Record<string, string> = {};
    for (const [name, value] of Object.entries(options.headers ?? {})) {
      if (
        (!/^x-portkey-[a-z0-9-]+$/i.test(name) && name.toLowerCase() !== 'openai-beta') ||
        name.toLowerCase() === 'x-portkey-api-key' ||
        typeof value !== 'string' ||
        /[\r\n]/.test(value)
      )
        throw new AISecSDKException(
          'Inference headers must be non-authentication x-portkey-* or OpenAI-Beta header values',
          ErrorType.USER_REQUEST_PAYLOAD_ERROR,
        );
      headers[name] = value;
    }
    return {
      baseUrl: this.baseUrl,
      auth: this.auth,
      numRetries: options.numRetries ?? this.defaults.numRetries,
      timeoutMs: options.timeoutMs ?? this.defaults.timeoutMs,
      signal: options.signal,
      fetch: this.defaults.fetch,
      headers,
      redirect: 'error' as const,
      omitDebugBody: true,
    };
  }

  /** Open a bounded realtime WebSocket on the explicitly configured gateway.
   * HTTP 101 proves an upgrade, not provider session readiness. Provider errors remain events.
   * @experimental The prescribed-model live probe upgrades, then returns invalid_model.
   * @example
   * ```ts
   * const connection = await inference.connectRealtime({ model: '@provider/model' }, {
   *   webSocketFactory: (url, options) => new WebSocket(url, options),
   * });
   * try { for await (const event of connection) console.log(event.type); }
   * finally { await connection.cancel(); }
   * ```
   */
  async connectRealtime(
    opts: GatewayRealtimeConnectRequest,
    options: GatewayRealtimeOptions,
  ): Promise<GatewayRealtimeConnection> {
    let params: GatewayRealtimeConnectRequest;
    try {
      params = GatewayRealtimeConnectRequestSchema.parse(opts);
    } catch {
      throw new AISecSDKException(
        'Invalid realtime query parameters',
        ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      );
    }
    if (!options || typeof options.webSocketFactory !== 'function')
      throw new AISecSDKException(
        'Realtime requires an explicit webSocketFactory',
        ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      );
    return openRealtime({
      ...this.runtimeRequestOptions(options),
      method: 'GET',
      path: '/realtime',
      params,
      webSocketFactory: options.webSocketFactory,
      handshakeTimeoutMs: options.handshakeTimeoutMs,
      maxEventBytes: options.maxEventBytes ?? this.defaults.maxEventBytes,
      maxBufferedEvents: options.maxBufferedEvents,
      maxBufferedBytes: options.maxBufferedBytes,
    });
  }

  /** Create a legacy text completion; stream=true returns a cancellable iterator.
   * @experimental The deployed route exists, but the prescribed model returns HTTP 404.
   * Outside stability guarantees until live-verified; the SDK never substitutes a model.
   * @example `await inference.createCompletion({ model: '@provider/compatible-model', prompt: 'Hello', max_tokens: 16 });`
   */
  createCompletion(
    body: GatewayInferenceInputCreateCompletionRequest & { stream: true },
    options?: GatewayInferenceRequestOptions,
  ): Promise<GatewayStream<GatewayInferenceCreateCompletionResponse>>;
  createCompletion(
    body: GatewayInferenceInputCreateCompletionRequest & { stream?: false | null },
    options?: GatewayInferenceRequestOptions,
  ): Promise<GatewayInferenceCreateCompletionResponse>;
  createCompletion(
    body: GatewayInferenceInputCreateCompletionRequest,
    options?: GatewayInferenceRequestOptions,
  ): Promise<
    | GatewayInferenceCreateCompletionResponse
    | GatewayStream<GatewayInferenceCreateCompletionResponse>
  >;
  async createCompletion(
    body: GatewayInferenceInputCreateCompletionRequest,
    options: GatewayInferenceRequestOptions = {},
  ): Promise<
    | GatewayInferenceCreateCompletionResponse
    | GatewayStream<GatewayInferenceCreateCompletionResponse>
  > {
    return request<
      | GatewayInferenceCreateCompletionResponse
      | GatewayStream<GatewayInferenceCreateCompletionResponse>
    >({
      ...this.runtimeRequestOptions(options),
      method: 'POST',
      path: '/completions',
      body,
      requestSchema: GatewayInferenceInputCreateCompletionRequestSchema,
      responseSchema: GatewayInferenceCreateCompletionResponseSchema,
      streamResponse:
        body?.stream === true
          ? (response, signal, dispose) =>
              createEventStream(
                response,
                GatewayInferenceCreateCompletionResponseSchema,
                signal,
                dispose,
                { maxEventBytes: this.defaults.maxEventBytes },
              )
          : undefined,
    });
  }

  /** Execute a saved prompt with variables and optional root-level parameter overrides.
   * @experimental Route and handler dispatch confirmed in the deployed gateway; no owned
   * template has been live-certified. Outside stability guarantees until live-verified.
   * JSON may be a native chat/text completion or the upstream status/headers/body wrapper.
   * Streaming emits native chat or legacy completion events, terminated by [DONE].
   * @example `await inference.createPromptCompletion('owned-prompt', { variables: { user_input: 'Hello' }, model: '@provider/model', max_completion_tokens: 16 });`
   */
  createPromptCompletion(
    promptId: string,
    body: GatewayInferenceInputCreatePromptCompletionRequest & { stream: true },
    options?: GatewayInferenceRequestOptions,
  ): Promise<GatewayStream<GatewayInferenceCreatePromptCompletionStreamResponse>>;
  createPromptCompletion(
    promptId: string,
    body: GatewayInferenceInputCreatePromptCompletionRequest & { stream?: false | null },
    options?: GatewayInferenceRequestOptions,
  ): Promise<GatewayInferenceCreatePromptCompletionResponse>;
  createPromptCompletion(
    promptId: string,
    body: GatewayInferenceInputCreatePromptCompletionRequest,
    options?: GatewayInferenceRequestOptions,
  ): Promise<
    | GatewayInferenceCreatePromptCompletionResponse
    | GatewayStream<GatewayInferenceCreatePromptCompletionStreamResponse>
  >;
  async createPromptCompletion(
    promptId: string,
    body: GatewayInferenceInputCreatePromptCompletionRequest,
    options: GatewayInferenceRequestOptions = {},
  ): Promise<
    | GatewayInferenceCreatePromptCompletionResponse
    | GatewayStream<GatewayInferenceCreatePromptCompletionStreamResponse>
  > {
    return request<
      | GatewayInferenceCreatePromptCompletionResponse
      | GatewayStream<GatewayInferenceCreatePromptCompletionStreamResponse>
    >({
      ...this.runtimeRequestOptions(options),
      method: 'POST',
      path: `/prompts/${gatewayPathSegment(promptId)}/completions`,
      body,
      requestSchema: GatewayInferenceInputCreatePromptCompletionRequestSchema,
      responseSchema: GatewayInferenceCreatePromptCompletionResponseSchema,
      streamResponse:
        body?.stream === true
          ? (response, signal, dispose) =>
              createEventStream(
                response,
                GatewayInferenceCreatePromptCompletionStreamResponseSchema,
                signal,
                dispose,
                { maxEventBytes: this.defaults.maxEventBytes },
              )
          : undefined,
    });
  }

  /** Render a saved prompt without making a completion request.
   * @experimental The deployed route is registered; successful rendering of an owned template
   * remains unverified. Outside stability guarantees until live-verified.
   * @example `await inference.createPromptRender('owned-prompt', { variables: { user_input: 'Hello' } });`
   */
  async createPromptRender(
    promptId: string,
    body: GatewayInferenceInputCreatePromptRenderRequest,
    options: GatewayInferenceRequestOptions = {},
  ): Promise<GatewayInferenceCreatePromptRenderResponse> {
    return request({
      ...this.runtimeRequestOptions(options),
      method: 'POST',
      path: `/prompts/${gatewayPathSegment(promptId)}/render`,
      body,
      requestSchema: GatewayInferenceInputCreatePromptRenderRequestSchema,
      responseSchema: GatewayInferenceCreatePromptRenderResponseSchema,
    });
  }

  /** Create a chat completion. stream=true returns a cancellable async iterator.
   * @example `const result = await inference.createChatCompletion({ model: '@provider/model', messages: [{ role: 'user', content: 'Hello' }] });`
   */
  createChatCompletion(
    body: GatewayChatCompletionRequest & { stream: true },
    options?: GatewayInferenceRequestOptions,
  ): Promise<GatewayStream<GatewayChatCompletionChunk>>;
  createChatCompletion(
    body: GatewayChatCompletionRequest & { stream?: false | null },
    options?: GatewayInferenceRequestOptions,
  ): Promise<GatewayChatCompletion>;
  createChatCompletion(
    body: GatewayChatCompletionRequest,
    options?: GatewayInferenceRequestOptions,
  ): Promise<GatewayChatCompletion | GatewayStream<GatewayChatCompletionChunk>>;
  async createChatCompletion(
    body: GatewayChatCompletionRequest,
    options: GatewayInferenceRequestOptions = {},
  ): Promise<GatewayChatCompletion | GatewayStream<GatewayChatCompletionChunk>> {
    return request<GatewayChatCompletion | GatewayStream<GatewayChatCompletionChunk>>({
      ...this.runtimeRequestOptions(options),
      method: 'POST',
      path: '/chat/completions',
      body,
      requestSchema: GatewayInferenceInputCreateChatCompletionRequestSchema,
      responseSchema: GatewayInferenceCreateChatCompletionResponseSchema,
      streamResponse:
        body?.stream === true
          ? (response, signal, dispose) =>
              createEventStream(
                response,
                GatewayInferenceCreateChatCompletionStreamResponseSchema,
                signal,
                dispose,
                { maxEventBytes: this.defaults.maxEventBytes },
              )
          : undefined,
    });
  }

  /** Create embeddings without converting base64 output to a different wire representation.
   * @example `const result = await inference.createEmbedding({ model: '@provider/embedding', input: 'Hello', encoding_format: 'float' });`
   */
  async createEmbedding(
    body: GatewayEmbeddingRequest,
    options: GatewayInferenceRequestOptions = {},
  ): Promise<GatewayEmbeddingResponse> {
    return request({
      ...this.runtimeRequestOptions(options),
      method: 'POST',
      path: '/embeddings',
      body,
      requestSchema: GatewayInferenceInputCreateEmbeddingRequestSchema,
      responseSchema: GatewayInferenceCreateEmbeddingResponseSchema,
    });
  }

  /** Create a Responses API result, or a cancellable stream of typed lifecycle events.
   * @example `const result = await inference.createResponse({ model: '@provider/model', input: 'Hello', store: false });`
   */
  createResponse(
    body: GatewayInferenceInputCreateResponse & { stream: true },
    options?: GatewayInferenceRequestOptions,
  ): Promise<GatewayStream<GatewayInferenceResponseStreamEvent>>;
  createResponse(
    body: GatewayInferenceInputCreateResponse & { stream?: false | null },
    options?: GatewayInferenceRequestOptions,
  ): Promise<GatewayInferenceResponse>;
  createResponse(
    body: GatewayInferenceInputCreateResponse,
    options?: GatewayInferenceRequestOptions,
  ): Promise<GatewayInferenceResponse | GatewayStream<GatewayInferenceResponseStreamEvent>>;
  async createResponse(
    body: GatewayInferenceInputCreateResponse,
    options: GatewayInferenceRequestOptions = {},
  ): Promise<GatewayInferenceResponse | GatewayStream<GatewayInferenceResponseStreamEvent>> {
    return request<GatewayInferenceResponse | GatewayStream<GatewayInferenceResponseStreamEvent>>({
      ...this.runtimeRequestOptions(options),
      method: 'POST',
      path: '/responses',
      body,
      requestSchema: GatewayInferenceInputCreateResponseSchema,
      responseSchema: GatewayInferenceResponseSchema,
      streamResponse:
        body?.stream === true
          ? (response, signal, dispose) =>
              createEventStream(
                response,
                GatewayInferenceResponseStreamEventSchema,
                signal,
                dispose,
                {
                  maxEventBytes: this.defaults.maxEventBytes,
                  isTerminal: (event) =>
                    ['response.completed', 'response.failed', 'response.incomplete'].includes(
                      event.type,
                    ),
                },
              )
          : undefined,
    });
  }
}
