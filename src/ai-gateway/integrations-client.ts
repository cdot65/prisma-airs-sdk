import { AI_GW_INTEGRATIONS_PATH, AI_GW_PROVIDER_CATALOG_PATH } from '../constants.js';
import { request } from '../http/request.js';
import type { AuthAdapter } from '../http/types.js';
import { assertUuid, assertNumericId, assertWorkspaceRef, assertLength } from '../validators.js';
import { AISecSDKException, ErrorType } from '../errors.js';
import {
  ListIntegrationsResponseSchema,
  GatewayIntegrationSchema,
  GatewayIntegrationModelsResponseSchema,
  GatewayIntegrationWorkspacesResponseSchema,
  GatewayWriteResponseSchema,
  ListCatalogProvidersResponseSchema,
  type ListCatalogProvidersResponse,
  type GatewayCatalogProvider,
  type ListIntegrationsResponse,
  type GatewayIntegration,
  type GatewayIntegrationModelsResponse,
  type GatewayIntegrationWorkspacesResponse,
  type GatewayWriteResponse,
} from '../models/ai-gateway.js';
import {
  GatewayIntegrationCreateRequestSchema,
  GatewayIntegrationModelsBulkUpdateRequestSchema,
  GatewayIntegrationUpdateRequestSchema,
  GatewayIntegrationWorkspacesBulkUpdateRequestSchema,
  type GatewayIntegrationCreateRequest,
  type GatewayIntegrationModelsBulkUpdateRequest,
  type GatewayIntegrationUpdateRequest,
  type GatewayIntegrationWorkspacesBulkUpdateRequest,
} from '../models/ai-gateway-requests.js';
import type { AIGatewaySubClientOptions } from './types.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Options for {@link customHostConfiguration}. */
export interface CustomHostConfigurationOptions {
  /** Full base URL of the OpenAI-compatible endpoint, including its API prefix. */
  host: string;
  /** Extra headers sent to that host on every request. */
  headers?: Record<string, string>;
}

/**
 * Build the `configurations` object that points a provider integration at a self-hosted or
 * OpenAI-compatible endpoint. Live-verified 2026-09-12 on `open-ai` and `x-ai`: the gateway
 * accepts `custom_host` only together with `provider_auth_type: 'apiKey'`, on both create and
 * update; `custom_headers` may be empty.
 * @param options - Host and optional headers.
 * @returns A configuration object for `integrations.create()` or `integrations.update()`.
 * @throws {AISecSDKException} When the host is not an absolute http(s) URL.
 * @example
 * ```ts
 * import { AIGatewayClient, customHostConfiguration } from '@cdot65/prisma-airs-sdk';
 * const gw = new AIGatewayClient();
 *
 * await gw.integrations.create({
 *   organisation_id: '1001464285',
 *   ai_provider_id: await gw.integrations.resolveProviderId('open-ai'),
 *   name: 'talos7',
 *   slug: 'talos7',
 *   key: process.env.QWEN_API_KEY,
 *   configurations: customHostConfiguration({
 *     host: 'http://qwen38-talos7.ai-inference.svc.cluster.local:8000/v1',
 *   }),
 * });
 * ```
 */
export function customHostConfiguration(options: CustomHostConfigurationOptions): {
  provider_auth_type: 'apiKey';
  custom_host: string;
  custom_headers: Record<string, string>;
} {
  let url: URL;
  try {
    url = new URL(options.host);
  } catch {
    throw new AISecSDKException(
      'custom host must be an absolute http(s) URL including its API prefix',
      ErrorType.USER_REQUEST_PAYLOAD_ERROR,
    );
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new AISecSDKException(
      'custom host must use http or https',
      ErrorType.USER_REQUEST_PAYLOAD_ERROR,
    );
  }
  return {
    provider_auth_type: 'apiKey',
    custom_host: options.host,
    custom_headers: { ...(options.headers ?? {}) },
  };
}

/** Client for AI Gateway organisation-level integrations (admin plane). */
export class AIGatewayIntegrationsClient {
  private readonly baseUrl: string;
  private readonly auth: AuthAdapter;
  private readonly numRetries: number;

  constructor(opts: AIGatewaySubClientOptions) {
    this.baseUrl = opts.baseUrl;
    this.auth = opts.auth;
    this.numRetries = opts.numRetries;
  }

  /** Remove explicitly named custom models from one integration.
   * Verified on an owned integration and custom model, 2026-09-06. Base models cannot be deleted.
   * @example `await gw.integrations.deleteModels('integration-slug', ['model-slug']);`
   */
  async deleteModels(integrationId: string, slugs: string[]): Promise<GatewayWriteResponse> {
    assertWorkspaceRef(integrationId, 'integrationId');
    assertLength(slugs.join(','), 1, 16384, 'slugs');
    for (const slug of slugs) {
      assertLength(slug, 1, 512, 'model slug');
      if (slug.includes(','))
        throw new AISecSDKException(
          'A model slug cannot contain a comma',
          ErrorType.USER_REQUEST_PAYLOAD_ERROR,
        );
    }
    return request({
      method: 'DELETE',
      baseUrl: this.baseUrl,
      path: `${AI_GW_INTEGRATIONS_PATH}/${encodeURIComponent(integrationId)}/models`,
      params: { slugs: slugs.join(',') },
      responseSchema: GatewayWriteResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * List the static provider catalog: every provider family an integration can bind to.
   * The catalog has no configuration-field metadata; it maps slugs such as `open-ai` or
   * `x-ai` to the `ai_provider_id` UUID a create needs.
   * @returns The catalog envelope (`success`, `data[]`).
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * const catalog = await gw.integrations.catalog();
   * // catalog.data.find((p) => p.slug === 'x-ai')?.id => '0a9635da-bd84-11ef-9c04-1235d6b0b075'
   * ```
   */
  async catalog(): Promise<ListCatalogProvidersResponse> {
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: AI_GW_PROVIDER_CATALOG_PATH,
      responseSchema: ListCatalogProvidersResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Turn a provider slug (`open-ai`, `x-ai`) or UUID into the `ai_provider_id` a create needs.
   * A UUID is returned unchanged without a request; a slug is matched case-insensitively
   * against {@link catalog}.
   * @param providerRef - Catalog slug or provider UUID.
   * @returns The provider UUID.
   * @throws {AISecSDKException} When the slug is not in the catalog (the message lists close matches).
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * const id = await gw.integrations.resolveProviderId('x-ai');
   * // id => '0a9635da-bd84-11ef-9c04-1235d6b0b075'
   * ```
   */
  async resolveProviderId(providerRef: string): Promise<string> {
    const wanted = providerRef.trim();
    if (UUID_PATTERN.test(wanted)) return wanted.toLowerCase();
    if (!wanted) {
      throw new AISecSDKException('provider is required', ErrorType.USER_REQUEST_PAYLOAD_ERROR);
    }
    const providers: GatewayCatalogProvider[] = (await this.catalog()).data;
    const match = providers.find((p) => p.slug.toLowerCase() === wanted.toLowerCase());
    if (match) return match.id;
    const needle = wanted.toLowerCase().replace(/[^a-z0-9]/g, '');
    const close = providers
      .map((p) => p.slug)
      .filter(
        (slug) =>
          slug.replace(/[^a-z0-9]/g, '').includes(needle) ||
          needle.includes(slug.replace(/[^a-z0-9]/g, '')),
      )
      .slice(0, 5);
    throw new AISecSDKException(
      `Unknown provider '${wanted}'${close.length ? `; did you mean ${close.join(', ')}?` : ''} (list slugs with integrations.catalog())`,
      ErrorType.USER_REQUEST_PAYLOAD_ERROR,
    );
  }

  /**
   * List organisation integrations.
   * @returns All provider integrations defined on the organisation.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * const ints = await gw.integrations.list();
   * // ints.data[0] => { name: 'openai-calvin', slug: 'openai-calvin', ... }
   * ```
   */
  async list(): Promise<ListIntegrationsResponse> {
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: AI_GW_INTEGRATIONS_PATH,
      responseSchema: ListIntegrationsResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Fetch one integration.
   * @param integrationId - Integration UUID.
   * @returns The integration record.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * const i = await gw.integrations.get('f6692544-3265-49be-9711-bbdcebc079e4');
   * // i.name => 'openai-calvin'
   * ```
   */
  async get(integrationId: string): Promise<GatewayIntegration> {
    assertUuid(integrationId, 'integrationId');
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${AI_GW_INTEGRATIONS_PATH}/${integrationId}`,
      responseSchema: GatewayIntegrationSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Create an integration.
   *
   * @remarks
   * `body.key` (the provider API key) is a live secret. SDK debug logs replace known
   * credential fields with `[REDACTED]`, but callers must still avoid logging the input object.
   *
   * @param body - Provider id, name, slug, and provider-specific configuration.
   * @returns The raw create response. Shape unverified against a live tenant — see the PRD.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * await gw.integrations.create({
   *   organisation_id: '1852583913',
   *   ai_provider_id: 'de7d7d50-31cd-11ee-b93b-0e06f1aa7f7c',
   *   name: 'openai-prod',
   *   slug: 'openai-prod',
   *   key: process.env.OPENAI_API_KEY,
   * });
   * ```
   */
  async create(body: GatewayIntegrationCreateRequest): Promise<GatewayWriteResponse> {
    assertUuid(body.ai_provider_id, 'ai_provider_id');
    return request({
      method: 'POST',
      baseUrl: this.baseUrl,
      path: AI_GW_INTEGRATIONS_PATH,
      body,
      requestSchema: GatewayIntegrationCreateRequestSchema,
      secretOperation: 'integrations.create',
      responseSchema: GatewayWriteResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Update an integration.
   * @param integrationId - Integration UUID.
   * @param body - One or more fields to update.
   * @returns The raw update response. Shape unverified against a live tenant — see the PRD.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * await gw.integrations.update('f6692544-3265-49be-9711-bbdcebc079e4', {
   *   name: 'openai-prod',
   *   description: 'Production OpenAI',
   * });
   * ```
   */
  async update(
    integrationId: string,
    body: GatewayIntegrationUpdateRequest,
  ): Promise<GatewayWriteResponse> {
    assertUuid(integrationId, 'integrationId');
    return request({
      method: 'PUT',
      baseUrl: this.baseUrl,
      path: `${AI_GW_INTEGRATIONS_PATH}/${integrationId}`,
      body,
      requestSchema: GatewayIntegrationUpdateRequestSchema,
      secretOperation: 'integrations.update',
      responseSchema: GatewayWriteResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Delete an integration.
   * @param integrationId - Integration UUID.
   * @param organisationId - The TSG as a numeric string; sent as a query param.
   * @returns Nothing — the API replies 200 with an empty body.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * await gw.integrations.delete('f6692544-3265-49be-9711-bbdcebc079e4', '1852583913');
   * ```
   */
  async delete(integrationId: string, organisationId: string): Promise<void> {
    assertUuid(integrationId, 'integrationId');
    assertNumericId(organisationId, 'organisationId');
    // The API returns 200 with an empty body. request() resolves to undefined whenever
    // no responseSchema is supplied, regardless of allowEmptyBody — so that flag is
    // intentionally omitted here rather than implying it does something.
    await request({
      method: 'DELETE',
      baseUrl: this.baseUrl,
      path: `${AI_GW_INTEGRATIONS_PATH}/${integrationId}`,
      params: { organisation_id: organisationId },
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Read which models this integration exposes.
   * @param integrationId - Integration UUID.
   * @returns Per-model enablement plus the `allow_all_models` flag.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * const m = await gw.integrations.getModels('f6692544-3265-49be-9711-bbdcebc079e4');
   * // m.models[0] => { slug: 'gpt-4', enabled: true }
   * ```
   */
  async getModels(integrationId: string): Promise<GatewayIntegrationModelsResponse> {
    assertUuid(integrationId, 'integrationId');
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${AI_GW_INTEGRATIONS_PATH}/${integrationId}/models`,
      responseSchema: GatewayIntegrationModelsResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Bulk-update model enablement for this integration.
   * @param integrationId - Integration UUID.
   * @param body - One or more model entries to update; omission is not documented as deletion.
   * @returns The raw response. Shape unverified against a live tenant — see the PRD.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * await gw.integrations.setModels('f6692544-3265-49be-9711-bbdcebc079e4', {
   *   models: [{ slug: 'gpt-4', enabled: true }, { slug: 'gpt-4-32k', enabled: false }],
   * });
   * ```
   */
  async setModels(
    integrationId: string,
    body: GatewayIntegrationModelsBulkUpdateRequest,
  ): Promise<GatewayWriteResponse> {
    assertUuid(integrationId, 'integrationId');
    return request({
      method: 'PUT',
      baseUrl: this.baseUrl,
      path: `${AI_GW_INTEGRATIONS_PATH}/${integrationId}/models`,
      body,
      requestSchema: GatewayIntegrationModelsBulkUpdateRequestSchema,
      responseSchema: GatewayWriteResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Read which workspaces may use this integration.
   *
   * @remarks
   * `global_workspace_access` is an **object** on this read, not a boolean, despite the
   * field name — `{ enabled, rate_limits, usage_limits }`. The corresponding write
   * ({@link setWorkspaces}) uses the same object shape.
   *
   * @param integrationId - Integration UUID.
   * @returns Bound workspaces plus the `global_workspace_access` object.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * const w = await gw.integrations.getWorkspaces('f6692544-3265-49be-9711-bbdcebc079e4');
   * // w.global_workspace_access => { enabled: false, rate_limits: null, usage_limits: null }
   * ```
   */
  async getWorkspaces(integrationId: string): Promise<GatewayIntegrationWorkspacesResponse> {
    assertUuid(integrationId, 'integrationId');
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${AI_GW_INTEGRATIONS_PATH}/${integrationId}/workspaces`,
      responseSchema: GatewayIntegrationWorkspacesResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Bulk-update which workspaces may use this integration.
   * @param integrationId - Integration UUID.
   * @param body - Workspace bindings, global-access settings, or explicit override behavior.
   * @returns The raw response. Shape unverified against a live tenant — see the PRD.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * await gw.integrations.setWorkspaces('f6692544-3265-49be-9711-bbdcebc079e4', {
   *   global_workspace_access: { enabled: true },
   * });
   * ```
   */
  async setWorkspaces(
    integrationId: string,
    body: GatewayIntegrationWorkspacesBulkUpdateRequest,
  ): Promise<GatewayWriteResponse> {
    assertUuid(integrationId, 'integrationId');
    return request({
      method: 'PUT',
      baseUrl: this.baseUrl,
      path: `${AI_GW_INTEGRATIONS_PATH}/${integrationId}/workspaces`,
      body,
      requestSchema: GatewayIntegrationWorkspacesBulkUpdateRequestSchema,
      responseSchema: GatewayWriteResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }
}
