import { AI_GW_DEPLOYMENTS_PATH } from '../constants.js';
import { request } from '../http/request.js';
import type { AuthAdapter } from '../http/types.js';
import { assertUuid, assertNumericId } from '../validators.js';
import {
  ListDeploymentsResponseSchema,
  GatewayDeploymentDetailSchema,
  GatewayDeploymentCreateResponseSchema,
  GatewayDeploymentPingResponseSchema,
  GatewayWriteResponseSchema,
  type ListDeploymentsResponse,
  type GatewayDeploymentDetail,
  type GatewayDeploymentCreateResponse,
  type GatewayDeploymentPingResponse,
  type GatewayWriteResponse,
} from '../models/ai-gateway.js';
import type { AIGatewaySubClientOptions } from './types.js';

/** SCM settings controlling a self-hosted gateway deployment. */
export interface GatewayDeploymentAuthSettingsInput {
  gateway_base_url?: string;
  mcp_gateway_base_url?: string;
  is_dataservice_hosted?: 0 | 1;
  is_playground_proxy_allowed?: 0 | 1;
  /** Workspace slugs this deployment may serve. */
  workspaces_allowed?: string[];
  jwt_subs_allowed?: string[];
  jwt_sub_workspace_mapping?: Record<string, string>;
  allow_all_workspaces?: boolean;
  remove_workspaces_allowed?: string[];
  remove_subs_allowed?: string[];
}

/** Request body for creating a deployment. */
export interface GatewayDeploymentCreateRequest {
  name: string;
  /** `production` or `non_production`. */
  type: string;
  /** The TSG as a numeric string — NOT the organisation UUID returned on reads. */
  organisation_id: string;
  /** Note `allow_all_workspaces` is a real boolean here; reads return it as 0/1. */
  auth_settings?: GatewayDeploymentAuthSettingsInput;
  deployment_config?: Record<string, unknown>;
  is_default?: boolean;
  slug?: string;
}

/** Request body for updating a deployment. Omitted fields remain unchanged. */
export interface GatewayDeploymentUpdateRequest {
  name?: string;
  type?: string;
  status?: string;
  deployment_config?: Record<string, unknown> | null;
  is_default?: boolean;
  rotate_auth?: boolean;
  override_existing?: boolean;
  auth_settings?: GatewayDeploymentAuthSettingsInput;
}

/** Client for AI Gateway deployment operations (admin plane). */
export class AIGatewayDeploymentsClient {
  private readonly baseUrl: string;
  private readonly auth: AuthAdapter;
  private readonly numRetries: number;

  constructor(opts: AIGatewaySubClientOptions) {
    this.baseUrl = opts.baseUrl;
    this.auth = opts.auth;
    this.numRetries = opts.numRetries;
  }

  /**
   * List deployments.
   *
   * @remarks
   * Archived deployments are included — `delete()` is a soft-delete. Filter on
   * `status === 'active'` if you only want live ones.
   *
   * @returns All deployments, active and archived.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * const all = await gw.deployments.list();
   * const live = all.data.filter((d) => d.status === 'active');
   * // live[0] => { name: 'talos', slug: 'dp-talos-f3b74e', status: 'active', ... }
   * ```
   */
  async list(): Promise<ListDeploymentsResponse> {
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: AI_GW_DEPLOYMENTS_PATH,
      responseSchema: ListDeploymentsResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Fetch one deployment.
   * @param deploymentId - Deployment UUID.
   * @returns Deployment detail, including bound workspaces and masked credentials.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * const d = await gw.deployments.get('32e8314e-7e68-4384-aacb-a476f6c3f91d');
   * // d.auth_settings?.allow_all_workspaces => 1   (a number, not a boolean)
   * ```
   */
  async get(deploymentId: string): Promise<GatewayDeploymentDetail> {
    assertUuid(deploymentId, 'deploymentId');
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${AI_GW_DEPLOYMENTS_PATH}/${deploymentId}`,
      responseSchema: GatewayDeploymentDetailSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Create a deployment.
   *
   * @remarks
   * The response is a **creation receipt**, not a deployment record — it has 5 fields and
   * carries no `name`, `slug`, or `status`. Call {@link get} for the full record.
   *
   * This is the **only** time `credentials.password` and `client_auth` are readable; the
   * detail read masks them. Capture them here or they are unrecoverable. Never log them.
   * Note that setting `PANW_AI_SEC_DEBUG` will print the raw request/response, including
   * `credentials.password`, to the SDK's own debug log regardless of this warning.
   *
   * @param body - Name, type, TSG, and auth settings.
   * @returns The creation receipt including the deployment's gateway credentials.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * const receipt = await gw.deployments.create({
   *   name: 'prod-us',
   *   type: 'production',
   *   organisation_id: '1852583913',
   *   auth_settings: { allow_all_workspaces: true },
   * });
   * // receipt => { id: '2141...', client_auth: 'client-auth-...', credentials: { username, password }, ... }
   * const full = await gw.deployments.get(receipt.id);
   * ```
   */
  async create(body: GatewayDeploymentCreateRequest): Promise<GatewayDeploymentCreateResponse> {
    return request({
      method: 'POST',
      baseUrl: this.baseUrl,
      path: AI_GW_DEPLOYMENTS_PATH,
      body,
      responseSchema: GatewayDeploymentCreateResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Update deployment settings, including its externally deployed gateway URL and workspace scope.
   * @param deploymentId - Deployment UUID.
   * @param body - Fields to update.
   * @returns The gateway write response.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   * await gw.deployments.update('21414819-485e-4ba3-b3d3-3e1815580e43', {
   *   auth_settings: {
   *     gateway_base_url: 'https://gateway.example.com',
   *     workspaces_allowed: ['ws-develo-71f8d8'],
   *   },
   * });
   * ```
   */
  async update(
    deploymentId: string,
    body: GatewayDeploymentUpdateRequest,
  ): Promise<GatewayWriteResponse> {
    assertUuid(deploymentId, 'deploymentId');
    return request({
      method: 'PUT',
      baseUrl: this.baseUrl,
      path: `${AI_GW_DEPLOYMENTS_PATH}/${deploymentId}`,
      body,
      responseSchema: GatewayWriteResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Run SCM's outbound and inbound connectivity checks against a configured gateway.
   * @param deploymentId - Deployment UUID.
   * @returns Health of both connectivity directions.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   * const health = await gw.deployments.ping('21414819-485e-4ba3-b3d3-3e1815580e43');
   * console.log(health.status, health.outbound.status, health.inbound.status);
   * ```
   */
  async ping(deploymentId: string): Promise<GatewayDeploymentPingResponse> {
    assertUuid(deploymentId, 'deploymentId');
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${AI_GW_DEPLOYMENTS_PATH}/${deploymentId}/ping`,
      responseSchema: GatewayDeploymentPingResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Archive a deployment.
   *
   * @remarks
   * This is a **soft delete** — the one exception to the gateway's usual delete semantics.
   * The API returns 200 with an empty body and the record persists with `status:
   * 'archived'`, still visible in {@link list}. There is no observed hard-delete for
   * deployments specifically. Contrast with {@link AIGatewayConfigsClient.delete |
   * configs.delete}, {@link AIGatewayGuardrailsClient.delete | guardrails.delete}, and
   * {@link AIGatewayProvidersClient.delete | providers.delete}, all of which hard-delete —
   * do not assume archive-on-delete is a gateway-wide convention.
   *
   * @param deploymentId - Deployment UUID.
   * @param organisationId - The TSG as a numeric string; sent as a query param.
   * @returns Nothing.
   * @example
   * ```ts
   * import { AIGatewayClient } from '@cdot65/prisma-airs-sdk';
   * const gw = new AIGatewayClient();
   *
   * await gw.deployments.delete('21414819-485e-4ba3-b3d3-3e1815580e43', '1852583913');
   * // the record remains in list() with status 'archived'
   * ```
   */
  async delete(deploymentId: string, organisationId: string): Promise<void> {
    assertUuid(deploymentId, 'deploymentId');
    assertNumericId(organisationId, 'organisationId');
    // The API returns 200 with an empty body. request() resolves to undefined whenever
    // no responseSchema is supplied, regardless of allowEmptyBody — so that flag is
    // intentionally omitted here rather than implying it does something.
    await request({
      method: 'DELETE',
      baseUrl: this.baseUrl,
      path: `${AI_GW_DEPLOYMENTS_PATH}/${deploymentId}`,
      params: { organisation_id: organisationId },
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }
}
