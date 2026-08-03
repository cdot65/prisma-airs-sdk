import {
  RED_TEAM_ADAPTER_PATH,
  RED_TEAM_ADAPTER_VALIDATE_PATH,
  RED_TEAM_ADAPTER_CONFIG_PATH,
} from '../constants.js';
import { request } from '../http/request.js';
import type { AuthAdapter } from '../http/types.js';
import { serializeListing } from '../listing.js';
import { assertUuid } from '../validators.js';
import {
  AdapterResponseSchema,
  AdapterListSchema,
  AdapterValidateResponseSchema,
  AdapterConfigResponseSchema,
  BaseResponseSchema,
  type AdapterCreateRequest,
  type AdapterUpdateRequest,
  type AdapterValidateRequest,
  type AdapterResponse,
  type AdapterList,
  type AdapterValidateResponse,
  type AdapterConfigResponse,
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
   * Update an adapter. **Full replacement (PUT), not a patch** — `name`, `script_b64`, and
   * `prompt` are required just as on create. For `variables`, the list defines the complete
   * desired key set: a provided value sets it, `null` keeps the stored value (unchanged
   * secrets), and omitting a key **deletes** that variable.
   * @param uuid - Adapter UUID.
   * @param body - The complete adapter definition.
   * @param opts - Set validate: false to save as DRAFT without re-running the script.
   * @returns The updated adapter.
   * @example
   * ```ts
   * const updated = await rt.adapters.update('550e8400-...', {
   *   name: 'my-keycloak-agent',
   *   script_b64: Buffer.from(newScript).toString('base64'),
   *   prompt: 'What is the capital of France?',
   *   variables: [
   *     { key: 'endpoint', value: 'http://agent.svc:8080', type: 'VAR' },
   *     { key: 'client_secret', value: null, type: 'SECRET' }, // null keeps stored secret
   *   ],
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
   * Validate an adapter script without saving anything. Runs the script end-to-end through the
   * network broker channel using the sample prompt, and returns the execution outcome —
   * `validated` plus the script's `stdout` / `stderr` / `traceback` — not an adapter record.
   *
   * This endpoint has its own request shape: no `name`, `network_broker_channel_uuid` is
   * required, and `adapter_uuid` may reference an existing adapter so `null` variable values
   * are resolved from its stored secrets before the run.
   * @param body - Script, channel, prompt, and optionally variables / an existing adapter UUID.
   * @returns The validation outcome.
   * @example
   * ```ts
   * const result = await rt.adapters.validate({
   *   script_b64: Buffer.from(script).toString('base64'),
   *   network_broker_channel_uuid: '550e8400-...',
   *   prompt: 'Hello',
   * });
   * if (!result.validated) console.error(result.stderr ?? result.traceback);
   * ```
   */
  async validate(body: AdapterValidateRequest): Promise<AdapterValidateResponse> {
    return request({
      method: 'POST',
      baseUrl: this.baseUrl,
      path: RED_TEAM_ADAPTER_VALIDATE_PATH,
      body,
      responseSchema: AdapterValidateResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Get the default adapter configuration — a starter script template and default test prompt
   * used to prefill the adapter authoring UI.
   * @returns The base64-encoded starter script and default test prompt.
   * @example
   * ```ts
   * import { RedTeamClient } from '@cdot65/prisma-airs-sdk';
   * const rt = new RedTeamClient();
   *
   * const cfg = await rt.adapters.getConfig();
   * // Use as a starting point when authoring a new adapter.
   * const starter = Buffer.from(cfg.default_script_b64, 'base64').toString();
   * console.log(cfg.default_test_prompt); // e.g. 'What is the capital of France?'
   * ```
   */
  async getConfig(): Promise<AdapterConfigResponse> {
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: RED_TEAM_ADAPTER_CONFIG_PATH,
      responseSchema: AdapterConfigResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }
}
