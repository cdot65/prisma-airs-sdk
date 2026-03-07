import { RED_TEAM_TARGET_PATH } from '../constants.js';
import { AISecSDKException, ErrorType } from '../errors.js';
import { isValidUuid } from '../utils.js';
import { managementHttpRequest } from '../management/management-http-client.js';
import type { OAuthClient } from '../management/oauth-client.js';
import type { RedTeamListOptions } from './scans-client.js';
import type {
  TargetCreateRequest,
  TargetUpdateRequest,
  TargetContextUpdate,
  TargetResponse,
  TargetList,
  TargetProbeRequest,
  TargetProfileResponse,
  BaseResponse,
} from '../models/red-team.js';

/** Target list filter options. */
export interface TargetListOptions extends RedTeamListOptions {
  target_type?: string;
  status?: string;
  active?: boolean;
}

/** @internal */
export interface RedTeamTargetsClientOptions {
  baseUrl: string;
  oauthClient: OAuthClient;
  numRetries: number;
}

function buildListParams(opts?: RedTeamListOptions): Record<string, string> {
  const params: Record<string, string> = {};
  if (opts?.skip !== undefined) params.skip = String(opts.skip);
  if (opts?.limit !== undefined) params.limit = String(opts.limit);
  if (opts?.sort_by !== undefined) params.sort_by = opts.sort_by;
  if (opts?.sort_direction !== undefined) params.sort_direction = opts.sort_direction;
  if (opts?.search !== undefined) params.search = opts.search;
  return params;
}

/** Client for Red Team management plane target operations. */
export class RedTeamTargetsClient {
  private readonly baseUrl: string;
  private readonly oauthClient: OAuthClient;
  private readonly numRetries: number;

  constructor(opts: RedTeamTargetsClientOptions) {
    this.baseUrl = opts.baseUrl;
    this.oauthClient = opts.oauthClient;
    this.numRetries = opts.numRetries;
  }

  /** Create a new target. */
  async create(request: TargetCreateRequest): Promise<TargetResponse> {
    const res = await managementHttpRequest<TargetResponse>({
      method: 'POST',
      baseUrl: this.baseUrl,
      path: RED_TEAM_TARGET_PATH,
      body: request,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /** List targets with optional filters. */
  async list(opts?: TargetListOptions): Promise<TargetList> {
    const params = buildListParams(opts);
    if (opts?.target_type !== undefined) params.target_type = opts.target_type;
    if (opts?.status !== undefined) params.status = opts.status;
    if (opts?.active !== undefined) params.active = String(opts.active);

    const res = await managementHttpRequest<TargetList>({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: RED_TEAM_TARGET_PATH,
      params,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /** Get a target by UUID. */
  async get(uuid: string): Promise<TargetResponse> {
    if (!isValidUuid(uuid)) {
      throw new AISecSDKException(
        `Invalid target uuid: ${uuid}`,
        ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      );
    }

    const res = await managementHttpRequest<TargetResponse>({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_TARGET_PATH}/${uuid}`,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /** Update a target. */
  async update(uuid: string, request: TargetUpdateRequest): Promise<TargetResponse> {
    if (!isValidUuid(uuid)) {
      throw new AISecSDKException(
        `Invalid target uuid: ${uuid}`,
        ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      );
    }

    const res = await managementHttpRequest<TargetResponse>({
      method: 'PUT',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_TARGET_PATH}/${uuid}`,
      body: request,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /** Delete a target. */
  async delete(uuid: string): Promise<BaseResponse> {
    if (!isValidUuid(uuid)) {
      throw new AISecSDKException(
        `Invalid target uuid: ${uuid}`,
        ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      );
    }

    const res = await managementHttpRequest<BaseResponse>({
      method: 'DELETE',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_TARGET_PATH}/${uuid}`,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /** Run profiling probes on a target. */
  async probe(request: TargetProbeRequest): Promise<TargetResponse> {
    const res = await managementHttpRequest<TargetResponse>({
      method: 'POST',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_TARGET_PATH}/probe`,
      body: request,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /** Get profiling results for a target. */
  async getProfile(uuid: string): Promise<TargetProfileResponse> {
    if (!isValidUuid(uuid)) {
      throw new AISecSDKException(
        `Invalid target uuid: ${uuid}`,
        ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      );
    }

    const res = await managementHttpRequest<TargetProfileResponse>({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_TARGET_PATH}/${uuid}/profile`,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  /** Update a target profile (background + additional context). */
  async updateProfile(uuid: string, request: TargetContextUpdate): Promise<TargetProfileResponse> {
    if (!isValidUuid(uuid)) {
      throw new AISecSDKException(
        `Invalid target uuid: ${uuid}`,
        ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      );
    }

    const res = await managementHttpRequest<TargetProfileResponse>({
      method: 'PUT',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_TARGET_PATH}/${uuid}/profile`,
      body: request,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }
}
