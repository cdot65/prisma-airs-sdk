import { MGMT_CUSTOMER_APP_PATH, MGMT_CUSTOMER_APPS_TSG_PATH } from '../constants.js';
import { managementHttpRequest } from './management-http-client.js';
import type { OAuthClient } from './oauth-client.js';
import type { PaginationOptions } from './profiles.js';
import type { CustomerApp, CustomerAppListResponse } from '../models/mgmt-customer-app.js';

/** @internal */
export interface CustomerAppsClientOptions {
  baseUrl: string;
  oauthClient: OAuthClient;
  tsgId: string;
  numRetries: number;
}

/** Client for AIRS customer application management operations. */
export class CustomerAppsClient {
  private readonly baseUrl: string;
  private readonly oauthClient: OAuthClient;
  private readonly tsgId: string;
  private readonly numRetries: number;

  constructor(opts: CustomerAppsClientOptions) {
    this.baseUrl = opts.baseUrl;
    this.oauthClient = opts.oauthClient;
    this.tsgId = opts.tsgId;
    this.numRetries = opts.numRetries;
  }

  /**
   * Get a customer app by name.
   * @param appName - Name of the customer app.
   * @returns The customer app.
   */
  async get(appName: string): Promise<CustomerApp> {
    const res = await managementHttpRequest<CustomerApp>({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: MGMT_CUSTOMER_APP_PATH,
      params: { app_name: appName },
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
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

    const res = await managementHttpRequest<CustomerAppListResponse>({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${MGMT_CUSTOMER_APPS_TSG_PATH}/${this.tsgId}`,
      params,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /**
   * Update a customer app.
   * @param customerAppId - UUID of the customer app to update.
   * @param request - Updated customer app data.
   * @returns The updated customer app.
   */
  async update(customerAppId: string, request: CustomerApp): Promise<CustomerApp> {
    const res = await managementHttpRequest<CustomerApp>({
      method: 'PUT',
      baseUrl: this.baseUrl,
      path: MGMT_CUSTOMER_APP_PATH,
      params: { customer_app_id: customerAppId },
      body: request,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /**
   * Delete a customer app.
   * @param appName - Name of the customer app to delete.
   * @param updatedBy - Email of user performing the deletion.
   * @returns The deleted customer app.
   */
  async delete(appName: string, updatedBy: string): Promise<CustomerApp> {
    const res = await managementHttpRequest<CustomerApp>({
      method: 'DELETE',
      baseUrl: this.baseUrl,
      path: MGMT_CUSTOMER_APP_PATH,
      params: { app_name: appName, updated_by: updatedBy },
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }
}
