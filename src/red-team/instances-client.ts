import { RED_TEAM_INSTANCES_PATH, RED_TEAM_REGISTRY_CREDENTIALS_PATH } from '../constants.js';
import { managementHttpRequest } from '../management/management-http-client.js';
import type { OAuthClient } from '../management/oauth-client.js';
import type {
  InstanceRequest,
  InstanceResponse,
  InstanceGetResponse,
  DeviceRequest,
  DeviceResponse,
  RegistryCredentials,
} from '../models/red-team.js';

/** @internal */
export interface RedTeamInstancesClientOptions {
  baseUrl: string;
  oauthClient: OAuthClient;
  numRetries: number;
}

/** Client for Red Team instance/licensing and registry credential operations. */
export class RedTeamInstancesClient {
  private readonly baseUrl: string;
  private readonly oauthClient: OAuthClient;
  private readonly numRetries: number;

  constructor(opts: RedTeamInstancesClientOptions) {
    this.baseUrl = opts.baseUrl;
    this.oauthClient = opts.oauthClient;
    this.numRetries = opts.numRetries;
  }

  /**
   * Create a new tenant instance.
   * @param request - The instance creation request.
   * @returns The instance response.
   */
  async createInstance(request: InstanceRequest): Promise<InstanceResponse> {
    const res = await managementHttpRequest<InstanceResponse>({
      method: 'POST',
      baseUrl: this.baseUrl,
      path: RED_TEAM_INSTANCES_PATH,
      body: request,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /**
   * Get an existing tenant instance.
   * @param tenantId - The tenant ID.
   * @returns The instance details.
   */
  async getInstance(tenantId: string): Promise<InstanceGetResponse> {
    const res = await managementHttpRequest<InstanceGetResponse>({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_INSTANCES_PATH}/${tenantId}`,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /**
   * Update an existing tenant instance.
   * @param tenantId - The tenant ID.
   * @param request - The instance update request.
   * @returns The instance response.
   */
  async updateInstance(tenantId: string, request: InstanceRequest): Promise<InstanceResponse> {
    const res = await managementHttpRequest<InstanceResponse>({
      method: 'PUT',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_INSTANCES_PATH}/${tenantId}`,
      body: request,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /**
   * Delete a tenant instance.
   * @param tenantId - The tenant ID.
   * @returns The instance response.
   */
  async deleteInstance(tenantId: string): Promise<InstanceResponse> {
    const res = await managementHttpRequest<InstanceResponse>({
      method: 'DELETE',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_INSTANCES_PATH}/${tenantId}`,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /**
   * Create devices for a tenant instance.
   * @param tenantId - The tenant ID.
   * @param request - The device creation request.
   * @returns The device response with statuses.
   */
  async createDevices(tenantId: string, request: DeviceRequest): Promise<DeviceResponse> {
    const res = await managementHttpRequest<DeviceResponse>({
      method: 'POST',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_INSTANCES_PATH}/${tenantId}/devices`,
      body: request,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /**
   * Update devices for a tenant instance.
   * @param tenantId - The tenant ID.
   * @param request - The device update request.
   * @returns The device response with statuses.
   */
  async updateDevices(tenantId: string, request: DeviceRequest): Promise<DeviceResponse> {
    const res = await managementHttpRequest<DeviceResponse>({
      method: 'PATCH',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_INSTANCES_PATH}/${tenantId}/devices`,
      body: request,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /**
   * Delete devices from a tenant instance.
   * @param tenantId - The tenant ID.
   * @param serialNumbers - Comma-separated serial numbers to delete.
   * @returns The device response with statuses.
   */
  async deleteDevices(tenantId: string, serialNumbers: string): Promise<DeviceResponse> {
    const res = await managementHttpRequest<DeviceResponse>({
      method: 'DELETE',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_INSTANCES_PATH}/${tenantId}/devices`,
      params: { serial_numbers: serialNumbers },
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /**
   * Get or create registry credentials.
   * @returns The registry credentials with token and expiry.
   */
  async getRegistryCredentials(): Promise<RegistryCredentials> {
    const res = await managementHttpRequest<RegistryCredentials>({
      method: 'POST',
      baseUrl: this.baseUrl,
      path: RED_TEAM_REGISTRY_CREDENTIALS_PATH,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }
}
