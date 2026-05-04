import { RED_TEAM_INSTANCES_PATH, RED_TEAM_REGISTRY_CREDENTIALS_PATH } from '../constants.js';
import { request } from '../http/request.js';
import type { AuthAdapter } from '../http/types.js';
import {
  InstanceResponseSchema,
  InstanceGetResponseSchema,
  DeviceResponseSchema,
  RegistryCredentialsSchema,
  type InstanceRequest,
  type InstanceResponse,
  type InstanceGetResponse,
  type DeviceRequest,
  type DeviceResponse,
  type RegistryCredentials,
} from '../models/red-team.js';

/** @internal */
export interface RedTeamInstancesClientOptions {
  baseUrl: string;
  auth: AuthAdapter;
  numRetries: number;
}

/** Client for Red Team instance/licensing and registry credential operations. */
export class RedTeamInstancesClient {
  private readonly baseUrl: string;
  private readonly auth: AuthAdapter;
  private readonly numRetries: number;

  constructor(opts: RedTeamInstancesClientOptions) {
    this.baseUrl = opts.baseUrl;
    this.auth = opts.auth;
    this.numRetries = opts.numRetries;
  }

  /**
   * Create a new tenant instance.
   * @param body - The instance creation request.
   * @returns The instance response.
   */
  async createInstance(body: InstanceRequest): Promise<InstanceResponse> {
    return request({
      method: 'POST',
      baseUrl: this.baseUrl,
      path: RED_TEAM_INSTANCES_PATH,
      body,
      responseSchema: InstanceResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Get an existing tenant instance.
   * @param tenantId - The tenant ID.
   * @returns The instance details.
   */
  async getInstance(tenantId: string): Promise<InstanceGetResponse> {
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_INSTANCES_PATH}/${tenantId}`,
      responseSchema: InstanceGetResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Update an existing tenant instance.
   * @param tenantId - The tenant ID.
   * @param body - The instance update request.
   * @returns The instance response.
   */
  async updateInstance(tenantId: string, body: InstanceRequest): Promise<InstanceResponse> {
    return request({
      method: 'PUT',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_INSTANCES_PATH}/${tenantId}`,
      body,
      responseSchema: InstanceResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Delete a tenant instance.
   * @param tenantId - The tenant ID.
   * @returns The instance response.
   */
  async deleteInstance(tenantId: string): Promise<InstanceResponse> {
    return request({
      method: 'DELETE',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_INSTANCES_PATH}/${tenantId}`,
      responseSchema: InstanceResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Create devices for a tenant instance.
   * @param tenantId - The tenant ID.
   * @param body - The device creation request.
   * @returns The device response with statuses.
   */
  async createDevices(tenantId: string, body: DeviceRequest): Promise<DeviceResponse> {
    return request({
      method: 'POST',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_INSTANCES_PATH}/${tenantId}/devices`,
      body,
      responseSchema: DeviceResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Update devices for a tenant instance.
   * @param tenantId - The tenant ID.
   * @param body - The device update request.
   * @returns The device response with statuses.
   */
  async updateDevices(tenantId: string, body: DeviceRequest): Promise<DeviceResponse> {
    return request({
      method: 'PATCH',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_INSTANCES_PATH}/${tenantId}/devices`,
      body,
      responseSchema: DeviceResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Delete devices from a tenant instance.
   * @param tenantId - The tenant ID.
   * @param serialNumbers - Comma-separated serial numbers to delete.
   * @returns The device response with statuses.
   */
  async deleteDevices(tenantId: string, serialNumbers: string): Promise<DeviceResponse> {
    return request({
      method: 'DELETE',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_INSTANCES_PATH}/${tenantId}/devices`,
      params: { serial_numbers: serialNumbers },
      responseSchema: DeviceResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Get or create registry credentials.
   * @returns The registry credentials with token and expiry.
   */
  async getRegistryCredentials(): Promise<RegistryCredentials> {
    return request({
      method: 'POST',
      baseUrl: this.baseUrl,
      path: RED_TEAM_REGISTRY_CREDENTIALS_PATH,
      responseSchema: RegistryCredentialsSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }
}
