import { z } from 'zod';
import {
  RED_TEAM_TARGET_PATH,
  RED_TEAM_TARGET_VALIDATE_AUTH_PATH,
  RED_TEAM_TEMPLATE_PATH,
} from '../constants.js';
import { request } from '../http/request.js';
import type { AuthAdapter } from '../http/types.js';
import { serializeListing } from '../listing.js';
import { assertUuid } from '../validators.js';
import {
  TargetResponseSchema,
  TargetListSchema,
  TargetProfileResponseSchema,
  TargetAuthValidationResponseSchema,
  TargetTemplateCollectionSchema,
  BaseResponseSchema,
  type TargetCreateRequest,
  type TargetUpdateRequest,
  type TargetContextUpdate,
  type TargetResponse,
  type TargetList,
  type TargetProbeRequest,
  type TargetProfileResponse,
  type TargetAuthValidationRequest,
  type TargetAuthValidationResponse,
  type TargetTemplateCollection,
  type BaseResponse,
} from '../models/red-team.js';
import type { RedTeamListOptions } from './scans-client.js';

/** Target list filter options. */
export interface TargetListOptions extends RedTeamListOptions {
  target_type?: string;
  status?: string;
}

/** Options for target create/update operations. */
export interface TargetOperationOptions {
  /** Validate the target connection before saving. */
  validate?: boolean;
}

/** @internal */
export interface RedTeamTargetsClientOptions {
  baseUrl: string;
  auth: AuthAdapter;
  numRetries: number;
}

/** Client for Red Team management plane target operations. */
export class RedTeamTargetsClient {
  private readonly baseUrl: string;
  private readonly auth: AuthAdapter;
  private readonly numRetries: number;

  constructor(opts: RedTeamTargetsClientOptions) {
    this.baseUrl = opts.baseUrl;
    this.auth = opts.auth;
    this.numRetries = opts.numRetries;
  }

  /**
   * Create a new target.
   * @param body - Target creation request body.
   * @param opts - Optional operation options (e.g. validate connection).
   * @returns The created target response.
   * @example
   * ```ts
   * import { RedTeamClient } from '@cdot65/prisma-airs-sdk';
   * const rt = new RedTeamClient();
   *
   * const target = await rt.targets.create(
   *   {
   *     name: 'prod-chatbot',
   *     target_type: 'API',
   *     connection_params: {
   *       api_endpoint: 'https://api.openai.com/v1/responses',
   *       response_key: 'output[0].content[0].text',
   *     },
   *   },
   *   { validate: true },
   * );
   * // target =>
   * // { uuid: '550e8400-...', name: 'prod-chatbot', status: 'VALIDATED', active: true, validated: true }
   * ```
   */
  async create(body: TargetCreateRequest, opts?: TargetOperationOptions): Promise<TargetResponse> {
    const params: Record<string, string> = {};
    if (opts?.validate !== undefined) params.validate = String(opts.validate);

    return request({
      method: 'POST',
      baseUrl: this.baseUrl,
      path: RED_TEAM_TARGET_PATH,
      body,
      params: Object.keys(params).length > 0 ? params : undefined,
      responseSchema: TargetResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * List targets with optional filters.
   * @param opts - Optional pagination, search, and filter options.
   * @returns The paginated list of targets.
   * @example
   * ```ts
   * import { RedTeamClient } from '@cdot65/prisma-airs-sdk';
   * const rt = new RedTeamClient();
   *
   * const targets = await rt.targets.list({ limit: 10, target_type: 'API' });
   * // targets =>
   * // { pagination: { total_items: 4 }, data: [{ uuid: '550e8400-...', name: 'prod-chatbot', status: 'READY' }] }
   * ```
   */
  async list(opts?: TargetListOptions): Promise<TargetList> {
    const params = serializeListing(opts);
    if (opts?.target_type !== undefined) params.target_type = opts.target_type;
    if (opts?.status !== undefined) params.status = opts.status;

    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: RED_TEAM_TARGET_PATH,
      params,
      responseSchema: TargetListSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Get a target by UUID.
   * @param uuid - The target UUID.
   * @returns The target response.
   * @example
   * ```ts
   * import { RedTeamClient } from '@cdot65/prisma-airs-sdk';
   * const rt = new RedTeamClient();
   *
   * const target = await rt.targets.get('550e8400-e29b-41d4-a716-446655440000');
   * // target =>
   * // { uuid: '550e8400-...', name: 'prod-chatbot', status: 'READY', active: true, validated: true }
   * ```
   */
  async get(uuid: string): Promise<TargetResponse> {
    assertUuid(uuid, 'target uuid');
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_TARGET_PATH}/${uuid}`,
      responseSchema: TargetResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Update a target.
   * @param uuid - The target UUID.
   * @param body - Target update request body.
   * @param opts - Optional operation options (e.g. validate connection).
   * @returns The updated target response.
   * @example
   * ```ts
   * import { RedTeamClient } from '@cdot65/prisma-airs-sdk';
   * const rt = new RedTeamClient();
   *
   * const target = await rt.targets.update(
   *   '550e8400-e29b-41d4-a716-446655440000',
   *   { name: 'prod-chatbot-v2' },
   *   { validate: false },
   * );
   * // target =>
   * // { uuid: '550e8400-...', name: 'prod-chatbot-v2', status: 'READY', updated_at: '2026-03-08T10:00:00Z' }
   * ```
   */
  async update(
    uuid: string,
    body: TargetUpdateRequest,
    opts?: TargetOperationOptions,
  ): Promise<TargetResponse> {
    assertUuid(uuid, 'target uuid');
    const params: Record<string, string> = {};
    if (opts?.validate !== undefined) params.validate = String(opts.validate);

    return request({
      method: 'PUT',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_TARGET_PATH}/${uuid}`,
      body,
      params: Object.keys(params).length > 0 ? params : undefined,
      responseSchema: TargetResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Delete a target.
   * @param uuid - The target UUID.
   * @returns The delete response.
   * @example
   * ```ts
   * import { RedTeamClient } from '@cdot65/prisma-airs-sdk';
   * const rt = new RedTeamClient();
   *
   * const result = await rt.targets.delete('550e8400-e29b-41d4-a716-446655440000');
   * // result =>
   * // { message: 'ok', status: 200 }
   * ```
   */
  async delete(uuid: string): Promise<BaseResponse | undefined> {
    assertUuid(uuid, 'target uuid');
    return request<BaseResponse | undefined>({
      method: 'DELETE',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_TARGET_PATH}/${uuid}`,
      responseSchema: BaseResponseSchema.optional(),
      allowEmptyBody: true,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Run profiling probes on a target.
   * @param body - The probe request body.
   * @returns The target response after probing.
   * @example
   * ```ts
   * import { RedTeamClient } from '@cdot65/prisma-airs-sdk';
   * const rt = new RedTeamClient();
   *
   * const target = await rt.targets.probe({
   *   name: 'prod-chatbot',
   *   uuid: '550e8400-e29b-41d4-a716-446655440000',
   *   probe_fields: ['multi_turn', 'rate_limit'],
   * });
   * // target =>
   * // { uuid: '550e8400-...', name: 'prod-chatbot', status: 'READY', validated: true }
   * ```
   */
  async probe(body: TargetProbeRequest): Promise<TargetResponse> {
    return request({
      method: 'POST',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_TARGET_PATH}/probe`,
      body,
      responseSchema: TargetResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Get profiling results for a target.
   * @param uuid - The target UUID.
   * @returns The target profile response.
   * @example
   * ```ts
   * import { RedTeamClient } from '@cdot65/prisma-airs-sdk';
   * const rt = new RedTeamClient();
   *
   * const profile = await rt.targets.getProfile('550e8400-e29b-41d4-a716-446655440000');
   * // profile =>
   * // { target_id: '550e8400-...', target_version: 1, status: 'READY' }
   * ```
   */
  async getProfile(uuid: string): Promise<TargetProfileResponse> {
    assertUuid(uuid, 'target uuid');
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_TARGET_PATH}/${uuid}/profile`,
      responseSchema: TargetProfileResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Update a target profile (background + additional context).
   * @param uuid - The target UUID.
   * @param body - The context update request body.
   * @returns The updated target response.
   * @example
   * ```ts
   * import { RedTeamClient } from '@cdot65/prisma-airs-sdk';
   * const rt = new RedTeamClient();
   *
   * const target = await rt.targets.updateProfile('550e8400-e29b-41d4-a716-446655440000', {
   *   target_background: { industry: 'Healthcare', use_case: 'Patient Support Chatbot' },
   *   additional_context: { base_model: 'GPT-4', languages_supported: ['en', 'es'] },
   * });
   * // target =>
   * // { uuid: '550e8400-...', name: 'prod-chatbot', status: 'READY' }
   * ```
   */
  async updateProfile(uuid: string, body: TargetContextUpdate): Promise<TargetResponse> {
    assertUuid(uuid, 'target uuid');
    return request({
      method: 'PUT',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_TARGET_PATH}/${uuid}/profile`,
      body,
      responseSchema: TargetResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Validate target authentication credentials.
   * @param body - The auth validation request body.
   * @returns The auth validation response.
   * @example
   * ```ts
   * import { RedTeamClient } from '@cdot65/prisma-airs-sdk';
   * const rt = new RedTeamClient();
   *
   * const result = await rt.targets.validateAuth({
   *   auth_type: 'HEADERS',
   *   auth_config: { Authorization: 'Bearer sk-xxx' },
   * });
   * // result =>
   * // { validated: true }
   * ```
   */
  async validateAuth(body: TargetAuthValidationRequest): Promise<TargetAuthValidationResponse> {
    return request({
      method: 'POST',
      baseUrl: this.baseUrl,
      path: RED_TEAM_TARGET_VALIDATE_AUTH_PATH,
      body,
      responseSchema: TargetAuthValidationResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Get target metadata (field definitions for target configuration).
   * @returns The target metadata object.
   * @example
   * ```ts
   * import { RedTeamClient } from '@cdot65/prisma-airs-sdk';
   * const rt = new RedTeamClient();
   *
   * const metadata = await rt.targets.getTargetMetadata();
   * // metadata =>
   * // { rate_limit: { type: 'number', required: false }, multi_turn: { type: 'boolean' } }
   * ```
   */
  async getTargetMetadata(): Promise<Record<string, unknown>> {
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_TEMPLATE_PATH}/target-metadata`,
      responseSchema: z.record(z.unknown()),
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Get target templates for all supported provider types.
   * @returns The collection of target templates keyed by provider.
   * @example
   * ```ts
   * import { RedTeamClient } from '@cdot65/prisma-airs-sdk';
   * const rt = new RedTeamClient();
   *
   * const templates = await rt.targets.getTargetTemplates();
   * // templates =>
   * // { OPENAI: {...}, HUGGING_FACE: {...}, DATABRICKS: {...}, BEDROCK: {...}, REST: {...}, STREAMING: {...} }
   * ```
   */
  async getTargetTemplates(): Promise<TargetTemplateCollection> {
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_TEMPLATE_PATH}/target-templates`,
      responseSchema: TargetTemplateCollectionSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }
}
