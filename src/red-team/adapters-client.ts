import { RED_TEAM_ADAPTER_PATH, RED_TEAM_ADAPTER_VALIDATE_PATH } from '../constants.js';
import { request } from '../http/request.js';
import type { AuthAdapter } from '../http/types.js';
import { serializeListing } from '../listing.js';
import { assertUuid } from '../validators.js';
import {
  AdapterResponseSchema,
  AdapterListSchema,
  BaseResponseSchema,
  type AdapterCreateRequest,
  type AdapterUpdateRequest,
  type AdapterResponse,
  type AdapterList,
  type BaseResponse,
} from '../models/red-team.js';
import type { RedTeamListOptions } from './scans-client.js';

/** Options for adapter create/update operations. */
export interface AdapterOperationOptions {
  /**
   * Run the adapter script end-to-end against its configured target during save.
   * When true the adapter is saved as ACTIVE on success, DRAFT on failure.
   * When false (or omitted) the adapter is saved as DRAFT without validation.
   * Note: requires the network channel client (v1.4.0+) to be running and ONLINE.
   */
  validate?: boolean;
}

/** @internal */
export interface RedTeamAdaptersClientOptions {
  baseUrl: string;
  auth: AuthAdapter;
  numRetries: number;
}

/**
 * Client for Red Team custom target adapter operations (management plane).
 *
 * Custom target adapters are Python scripts that run inside an adapter sidecar
 * alongside the network broker client pod. They give full control over how
 * attack prompts are delivered to targets that use non-standard protocols,
 * dynamic auth, or multi-turn session handling.
 *
 * @example
 * ```ts
 * import { RedTeamClient } from '@cdot65/prisma-airs-sdk';
 * const rt = new RedTeamClient();
 *
 * const adapter = await rt.adapters.create({
 *   name: 'my-keycloak-agent',
 *   script_b64: Buffer.from(pythonScript).toString('base64'),
 *   network_broker_channel_uuid: '550e8400-e29b-41d4-a716-446655440000',
 *   variables: [
 *     { key: 'endpoint', value: 'http://agent.svc:8080/v1/chat/completions', type: 'VAR' },
 *     { key: 'client_secret', value: 'changeme', type: 'SECRET' },
 *   ],
 *   prompt: 'What is the capital of France?',
 * });
 * // adapter.status => 'ACTIVE'  (when validate=true, default)
 * ```
 */
export class RedTeamAdaptersClient {
  private readonly baseUrl: string;
  private readonly auth: AuthAdapter;
  private readonly numRetries: number;

  constructor(opts: RedTeamAdaptersClientOptions) {
    this.baseUrl = opts.baseUrl;
    this.auth = opts.auth;
    this.numRetries = opts.numRetries;
  }

  /**
   * Create a new custom target adapter.
   * @param body - Adapter creation request (name, base64 script, variables, validation prompt).
   * @param opts - Set validate: false to save as DRAFT without running the script.
   * @returns The created adapter.
   * @example
   * ```ts
   * const adapter = await rt.adapters.create({
   *   name: 'my-adapter',
   *   script_b64: Buffer.from(script).toString('base64'),
   *   network_broker_channel_uuid: '550e8400-...',
   *   variables: [{ key: 'endpoint', value: 'http://...', type: 'VAR' }],
   *   prompt: 'Hello',
   * }, { validate: true });
   * ```
   */
  async create(
    body: AdapterCreateRequest,
    opts?: AdapterOperationOptions,
  ): Promise<AdapterResponse> {
    const validate = opts?.validate ?? true;
    return request({
      method: 'POST',
      baseUrl: this.baseUrl,
      path: RED_TEAM_ADAPTER_PATH,
      params: { validate: String(validate) },
      body,
      responseSchema: AdapterResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * List adapters with optional pagination.
   * @param opts - Optional limit/skip/search.
   * @returns Paginated list of adapters.
   * @example
   * ```ts
   * const { data } = await rt.adapters.list({ limit: 20 });
   * // data => [{ uuid: '...', name: 'my-adapter', status: 'ACTIVE' }]
   * ```
   */
  async list(opts?: RedTeamListOptions): Promise<AdapterList> {
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: RED_TEAM_ADAPTER_PATH,
      params: serializeListing(opts),
      responseSchema: AdapterListSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Get a single adapter by UUID.
   * @param uuid - Adapter UUID.
   * @returns The adapter detail.
   * @example
   * ```ts
   * const adapter = await rt.adapters.get('550e8400-e29b-41d4-a716-446655440000');
   * // adapter.status => 'ACTIVE'
   * ```
   */
  async get(uuid: string): Promise<AdapterResponse> {
    assertUuid(uuid, 'adapter uuid');
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_ADAPTER_PATH}/${uuid}`,
      responseSchema: AdapterResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Update an existing adapter.
   * @param uuid - Adapter UUID.
   * @param body - Fields to update (all optional).
   * @param opts - Set validate: false to save without re-running the script.
   * @returns The updated adapter.
   * @example
   * ```ts
   * const updated = await rt.adapters.update('550e8400-...', {
   *   script_b64: Buffer.from(newScript).toString('base64'),
   * });
   * ```
   */
  async update(
    uuid: string,
    body: AdapterUpdateRequest,
    opts?: AdapterOperationOptions,
  ): Promise<AdapterResponse> {
    assertUuid(uuid, 'adapter uuid');
    const validate = opts?.validate ?? true;
    return request({
      method: 'PUT',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_ADAPTER_PATH}/${uuid}`,
      params: { validate: String(validate) },
      body,
      responseSchema: AdapterResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Delete an adapter.
   * @param uuid - Adapter UUID.
   * @example
   * ```ts
   * await rt.adapters.delete('550e8400-e29b-41d4-a716-446655440000');
   * ```
   */
  async delete(uuid: string): Promise<BaseResponse | undefined> {
    assertUuid(uuid, 'adapter uuid');
    return request<BaseResponse | undefined>({
      method: 'DELETE',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_ADAPTER_PATH}/${uuid}`,
      responseSchema: BaseResponseSchema.optional(),
      allowEmptyBody: true,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Validate an adapter script without saving it.
   * Runs the script against the configured target using the sample prompt.
   * @param body - Same payload as create (minus any uuid).
   * @returns The would-be adapter response if validation passes.
   * @example
   * ```ts
   * const result = await rt.adapters.validate({
   *   name: 'test',
   *   script_b64: Buffer.from(script).toString('base64'),
   *   network_broker_channel_uuid: '550e8400-...',
   *   variables: [],
   *   prompt: 'Hello',
   * });
   * ```
   */
  async validate(body: AdapterCreateRequest): Promise<AdapterResponse> {
    return request({
      method: 'POST',
      baseUrl: this.baseUrl,
      path: RED_TEAM_ADAPTER_VALIDATE_PATH,
      body,
      responseSchema: AdapterResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }
}
