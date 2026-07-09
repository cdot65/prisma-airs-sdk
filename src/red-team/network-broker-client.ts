import { RED_TEAM_CHANNELS_PATH, RED_TEAM_CHANNELS_STATS_PATH } from '../constants.js';
import { request } from '../http/request.js';
import type { AuthAdapter } from '../http/types.js';
import { serializeListing } from '../listing.js';
import { assertUuid } from '../validators.js';
import {
  ChannelSchema,
  ChannelListResponseSchema,
  ChannelStatsSchema,
  type Channel,
  type ChannelListResponse,
  type ChannelStats,
  type CreateChannelRequest,
  type UpdateChannelRequest,
} from '../models/red-team-network-broker.js';
import type { RedTeamListOptions } from './scans-client.js';

/** Filter options for {@link RedTeamNetworkBrokerClient.listChannels}. */
export interface ChannelListOptions extends RedTeamListOptions {
  /** Filter by channel status. Pass an array to filter by several statuses at once. */
  status?: string | string[];
  /** Include all channels when the other filters match nothing. */
  include_all_if_empty?: boolean;
}

/** @internal */
export interface RedTeamNetworkBrokerClientOptions {
  baseUrl: string;
  auth: AuthAdapter;
  numRetries: number;
}

/**
 * Client for Red Team Network Broker channel operations.
 * Uses a distinct network broker base URL (data plane), sharing the Red Team OAuth adapter.
 */
export class RedTeamNetworkBrokerClient {
  private readonly baseUrl: string;
  private readonly auth: AuthAdapter;
  private readonly numRetries: number;

  constructor(opts: RedTeamNetworkBrokerClientOptions) {
    this.baseUrl = opts.baseUrl;
    this.auth = opts.auth;
    this.numRetries = opts.numRetries;
  }

  /**
   * List network broker channels with optional filters.
   * @param opts - Optional pagination, search, and status filter options.
   * @returns The paginated list of channels.
   * @example
   * ```ts
   * import { RedTeamClient } from '@cdot65/prisma-airs-sdk';
   * const rt = new RedTeamClient();
   *
   * const channels = await rt.networkBroker.listChannels({ status: ['ONLINE', 'DRAFT'], limit: 10 });
   * // channels =>
   * // { pagination: { total_items: 2 }, data: [{ uuid: '550e8400-...', name: 'prod-broker', status: 'ONLINE' }] }
   * ```
   */
  async listChannels(opts?: ChannelListOptions): Promise<ChannelListResponse> {
    const params = serializeListing(opts) as Record<string, string | string[]>;
    if (opts?.status !== undefined) {
      params.status = Array.isArray(opts.status) ? opts.status : [opts.status];
    }
    if (opts?.include_all_if_empty !== undefined) {
      params.include_all_if_empty = String(opts.include_all_if_empty);
    }

    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: RED_TEAM_CHANNELS_PATH,
      params,
      responseSchema: ChannelListResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Create a network broker channel.
   * @param body - Channel creation request body (requires `name`).
   * @returns The created channel.
   * @example
   * ```ts
   * import { RedTeamClient } from '@cdot65/prisma-airs-sdk';
   * const rt = new RedTeamClient();
   *
   * const channel = await rt.networkBroker.createChannel({
   *   name: 'prod-broker',
   *   description: 'Production network broker channel',
   * });
   * // channel =>
   * // { uuid: '550e8400-...', name: 'prod-broker', status: 'DRAFT' }
   * ```
   */
  async createChannel(body: CreateChannelRequest): Promise<Channel> {
    return request({
      method: 'POST',
      baseUrl: this.baseUrl,
      path: RED_TEAM_CHANNELS_PATH,
      body,
      responseSchema: ChannelSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Get network broker channel stats.
   * @returns The channel stats (broker server, registry, chart, image, channel counts).
   * @example
   * ```ts
   * import { RedTeamClient } from '@cdot65/prisma-airs-sdk';
   * const rt = new RedTeamClient();
   *
   * const stats = await rt.networkBroker.getChannelStats();
   * // stats =>
   * // { network_channels_server_domain: 'broker.example.com', online_channels: 3, total_channels: 5, client_version: '1.4.0' }
   * ```
   */
  async getChannelStats(): Promise<ChannelStats> {
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: RED_TEAM_CHANNELS_STATS_PATH,
      responseSchema: ChannelStatsSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Get a network broker channel by UUID.
   * @param channelId - The channel UUID.
   * @returns The channel.
   * @example
   * ```ts
   * import { RedTeamClient } from '@cdot65/prisma-airs-sdk';
   * const rt = new RedTeamClient();
   *
   * const channel = await rt.networkBroker.getChannel('550e8400-e29b-41d4-a716-446655440000');
   * // channel =>
   * // { uuid: '550e8400-...', name: 'prod-broker', status: 'ONLINE' }
   * ```
   */
  async getChannel(channelId: string): Promise<Channel> {
    assertUuid(channelId, 'channel id');
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_CHANNELS_PATH}/${channelId}`,
      responseSchema: ChannelSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Update a network broker channel's name or description.
   * @param channelId - The channel UUID.
   * @param body - Channel update request body.
   * @returns The updated channel.
   * @example
   * ```ts
   * import { RedTeamClient } from '@cdot65/prisma-airs-sdk';
   * const rt = new RedTeamClient();
   *
   * const channel = await rt.networkBroker.updateChannel('550e8400-e29b-41d4-a716-446655440000', {
   *   description: 'Updated description',
   * });
   * // channel =>
   * // { uuid: '550e8400-...', name: 'prod-broker', description: 'Updated description', status: 'ONLINE' }
   * ```
   */
  async updateChannel(channelId: string, body: UpdateChannelRequest): Promise<Channel> {
    assertUuid(channelId, 'channel id');
    return request({
      method: 'PATCH',
      baseUrl: this.baseUrl,
      path: `${RED_TEAM_CHANNELS_PATH}/${channelId}`,
      body,
      responseSchema: ChannelSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }
}
