import { MGMT_CUSTOMER_APP_PATH, MGMT_CUSTOMER_APPS_TSG_PATH } from '../constants.js';
import { request } from '../http/request.js';
import type { AuthAdapter } from '../http/types.js';
import type { PaginationOptions } from './profiles.js';
import {
  CustomerAppSchema,
  CustomerAppListResponseSchema,
  type CustomerApp,
  type CustomerAppListResponse,
} from '../models/mgmt-customer-app.js';

/** @internal */
export interface CustomerAppsClientOptions {
  baseUrl: string;
  auth: AuthAdapter;
  tsgId: string;
  numRetries: number;
}

/** Client for AIRS customer application management operations. */
export class CustomerAppsClient {
  private readonly baseUrl: string;
  private readonly auth: AuthAdapter;
  private readonly tsgId: string;
  private readonly numRetries: number;

  constructor(opts: CustomerAppsClientOptions) {
    this.baseUrl = opts.baseUrl;
    this.auth = opts.auth;
    this.tsgId = opts.tsgId;
    this.numRetries = opts.numRetries;
  }

  /**
   * Get a customer app by name.
   * @param appName - Name of the customer app.
   * @returns The customer app.
   */
  async get(appName: string): Promise<CustomerApp> {
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: MGMT_CUSTOMER_APP_PATH,
      params: { app_name: appName },
      responseSchema: CustomerAppSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * List customer apps for the TSG.
   * @param opts - Pagination options.
   * @returns Paginated list of customer apps.
   */
  async list(opts?: PaginationOptions): Promise<CustomerAppListResponse> {
    const params: Record<string, string> = {
      offset: String(opts?.offset ?? 0),
      limit: String(opts?.limit ?? 100),
    };

    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${MGMT_CUSTOMER_APPS_TSG_PATH}/${this.tsgId}`,
      params,
      responseSchema: CustomerAppListResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Update a customer app.
   * @param customerAppId - UUID of the customer app to update.
   * @param body - Updated customer app data.
   * @returns The updated customer app.
   */
  async update(customerAppId: string, body: CustomerApp): Promise<CustomerApp> {
    return request({
      method: 'PUT',
      baseUrl: this.baseUrl,
      path: MGMT_CUSTOMER_APP_PATH,
      params: { customer_app_id: customerAppId },
      body,
      responseSchema: CustomerAppSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Delete a customer app.
   * @param appName - Name of the customer app to delete.
   * @param updatedBy - Email of user performing the deletion.
   * @returns The deleted customer app.
   */
  async delete(appName: string, updatedBy: string): Promise<CustomerApp> {
    return request({
      method: 'DELETE',
      baseUrl: this.baseUrl,
      path: MGMT_CUSTOMER_APP_PATH,
      params: { app_name: appName, updated_by: updatedBy },
      responseSchema: CustomerAppSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }
}
