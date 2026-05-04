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
   */
  async delete(uuid: string): Promise<BaseResponse> {
    assertUuid(uuid, 'target uuid');
    return request({
      method: 'DELETE',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_TARGET_PATH}/${uuid}`,
      responseSchema: BaseResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Run profiling probes on a target.
   * @param body - The probe request body.
   * @returns The target response after probing.
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
