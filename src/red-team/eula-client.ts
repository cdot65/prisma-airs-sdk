import { RED_TEAM_EULA_PATH } from '../constants.js';
import { request } from '../http/request.js';
import type { AuthAdapter } from '../http/types.js';
import {
  EulaContentResponseSchema,
  EulaResponseSchema,
  type EulaAcceptRequest,
  type EulaContentResponse,
  type EulaResponse,
} from '../models/red-team.js';

/** @internal */
export interface RedTeamEulaClientOptions {
  baseUrl: string;
  auth: AuthAdapter;
  numRetries: number;
}

/** Client for Red Team EULA management operations. */
export class RedTeamEulaClient {
  private readonly baseUrl: string;
  private readonly auth: AuthAdapter;
  private readonly numRetries: number;

  constructor(opts: RedTeamEulaClientOptions) {
    this.baseUrl = opts.baseUrl;
    this.auth = opts.auth;
    this.numRetries = opts.numRetries;
  }

  /**
   * Get the current EULA content.
   * @returns The EULA content response.
   */
  async getContent(): Promise<EulaContentResponse> {
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_EULA_PATH}/content`,
      responseSchema: EulaContentResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Get the current EULA acceptance status.
   * @returns The EULA status response.
   */
  async getStatus(): Promise<EulaResponse> {
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_EULA_PATH}/status`,
      responseSchema: EulaResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Accept the EULA.
   * @param body - The acceptance request body.
   * @returns The EULA response with acceptance status.
   */
  async accept(body: EulaAcceptRequest): Promise<EulaResponse> {
    return request({
      method: 'POST',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_EULA_PATH}/accept`,
      body,
      responseSchema: EulaResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }
}
