import { z } from 'zod';
import { AISecSDKException, ErrorType } from '../errors.js';
import { request } from '../http/request.js';
import {
  GatewayModelPricingConfigSchema,
  type GatewayModelPricingConfig,
} from '../models/ai-gateway-model-pricing.js';
import { gatewayPathSegment } from './runtime-wire.js';

/** Explicit public catalog configuration. No SCM or inference credentials are accepted or inferred. */
export interface AIGatewayModelPricingClientOptions {
  /** Public catalog base URL, e.g. https://api.portkey.ai (without /v1). No implicit default. */
  endpoint: string;
  /** Per-attempt deadline including response reads; defaults to 60 seconds. */
  timeoutMs?: number;
  /** Optional read retries, 0–5. Defaults to zero. */
  numRetries?: number;
  /** Optional caller-owned transport, for explicit proxy/custom network integration. */
  fetch?: typeof globalThis.fetch;
}

/** Cancellation and deadline for an individual unauthenticated pricing lookup. */
export interface GatewayModelPricingRequestOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}

// Node timers overflow above this bound, unexpectedly turning a long deadline into ~1 ms.
const positiveInteger = z.number().int().positive().max(2_147_483_647);
const optionsSchema = z
  .object({
    endpoint: z.string().min(1),
    timeoutMs: positiveInteger.optional(),
    numRetries: z.number().int().min(0).max(5).optional(),
    fetch: z.custom<typeof globalThis.fetch>((value) => typeof value === 'function').optional(),
  })
  .strict();
const requestOptionsSchema = z
  .object({
    signal: z.custom<AbortSignal>((value) => value instanceof AbortSignal).optional(),
    timeoutMs: positiveInteger.optional(),
  })
  .strict();

/**
 * Unauthenticated public model-pricing catalog, isolated from SCM and gateway runtime clients.
 * Prices are upstream catalog data, not effective tenant billing or Prisma cost telemetry.
 * No formula evaluation, price conversion, caching, default provider or model is performed.
 * @example
 * ```ts
 * const pricing = new AIGatewayModelPricingClient({ endpoint: 'https://api.portkey.ai' });
 * const config = await pricing.get('openai', 'text-embedding-3-small');
 * console.log(config.currency, config.pay_as_you_go?.request_token?.price); // cents/token
 * ```
 */
export class AIGatewayModelPricingClient {
  private readonly baseUrl: string;
  private readonly defaults: AIGatewayModelPricingClientOptions;

  constructor(options: AIGatewayModelPricingClientOptions) {
    const parsed = optionsSchema.safeParse(options);
    if (!parsed.success)
      throw new AISecSDKException(
        'Invalid public pricing client options',
        ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      );
    let url: URL;
    try {
      url = new URL(parsed.data.endpoint);
    } catch {
      throw new AISecSDKException(
        'Pricing endpoint must be an absolute URL',
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
        'Pricing endpoint requires HTTPS (HTTP only on loopback), without credentials, query or fragment',
        ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      );
    this.baseUrl = url.href.replace(/\/+$/, '');
    this.defaults = parsed.data;
  }

  /**
   * Read one provider/model's public catalog rates and unevaluated calculation expressions.
   * @example `await pricing.get('openai', 'gpt-5.6-terra', { signal: controller.signal });`
   */
  async get(
    provider: string,
    model: string,
    options: GatewayModelPricingRequestOptions = {},
  ): Promise<GatewayModelPricingConfig> {
    const parsed = requestOptionsSchema.safeParse(options);
    if (!parsed.success)
      throw new AISecSDKException(
        'Invalid public pricing request options',
        ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      );
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `/model-configs/pricing/${gatewayPathSegment(provider)}/${gatewayPathSegment(model)}`,
      responseSchema: GatewayModelPricingConfigSchema,
      headers: { Accept: 'application/json' },
      auth: { prepare: async (prepared) => prepared },
      redirect: 'error',
      omitDebugBody: true,
      fetch: this.defaults.fetch,
      numRetries: this.defaults.numRetries ?? 0,
      timeoutMs: parsed.data.timeoutMs ?? this.defaults.timeoutMs ?? 60_000,
      signal: parsed.data.signal,
    });
  }
}
