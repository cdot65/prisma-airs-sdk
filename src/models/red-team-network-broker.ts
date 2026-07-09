// src/models/red-team-network-broker.ts — Zod schemas + types for the AIRS Red Teaming
// Network Broker channel API. Response schemas use `.passthrough()` for forward compatibility.

import { z } from 'zod';
import { ChannelStatus } from './red-team-enums.js';

// ---------------------------------------------------------------------------
// Channel status
// ---------------------------------------------------------------------------

/** Channel lifecycle status. Accepts the upstream values `ONLINE`, `OFFLINE`, `DRAFT`. */
export const ChannelStatusSchema = z.nativeEnum(ChannelStatus);
export type ChannelStatusType = z.infer<typeof ChannelStatusSchema>;

// ---------------------------------------------------------------------------
// Requests
// ---------------------------------------------------------------------------

/** Request body for creating a network broker channel. */
export const CreateChannelRequestSchema = z
  .object({
    name: z.string(),
    description: z.string().optional(),
  })
  .passthrough();
export type CreateChannelRequest = z.infer<typeof CreateChannelRequestSchema>;

/** Request body for updating a network broker channel. */
export const UpdateChannelRequestSchema = z
  .object({
    name: z.string().optional(),
    description: z.string().optional(),
  })
  .passthrough();
export type UpdateChannelRequest = z.infer<typeof UpdateChannelRequestSchema>;

// ---------------------------------------------------------------------------
// Responses
// ---------------------------------------------------------------------------

/** A network broker channel. */
export const ChannelSchema = z
  .object({
    uuid: z.string().optional(),
    name: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    // Kept as a plain string (not the enum) so unknown upstream statuses never fail parsing.
    status: z.string().nullable().optional(),
    added_by: z.string().nullable().optional(),
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional(),
    last_online_at: z.string().nullable().optional(),
    // Present on live responses (not in the base OpenAPI Channel schema).
    connected_clients_count: z.number().int().nullable().optional(),
    outdated_clients_count: z.number().int().nullable().optional(),
    features: z.record(z.boolean()).nullable().optional(),
  })
  .passthrough();
export type Channel = z.infer<typeof ChannelSchema>;

/** Pagination metadata for a channel list response. */
export const ChannelListPaginationSchema = z
  .object({ total_items: z.number().int().nullable().optional() })
  .passthrough();
export type ChannelListPagination = z.infer<typeof ChannelListPaginationSchema>;

/** Paginated list of network broker channels. */
export const ChannelListResponseSchema = z
  .object({
    pagination: ChannelListPaginationSchema.optional(),
    data: z.array(ChannelSchema).default([]),
  })
  .passthrough();
export type ChannelListResponse = z.infer<typeof ChannelListResponseSchema>;

/** Network broker infrastructure and channel-count stats. */
export const ChannelStatsSchema = z
  .object({
    network_channels_server_domain: z.string().nullable().optional(),
    docker_registry: z.string().nullable().optional(),
    helm_chart: z.string().nullable().optional(),
    docker_image: z.string().nullable().optional(),
    online_channels: z.number().int().nullable().optional(),
    total_channels: z.number().int().nullable().optional(),
    // Present on live responses (not in the base OpenAPI ChannelStats schema).
    client_version: z.string().nullable().optional(),
  })
  .passthrough();
export type ChannelStats = z.infer<typeof ChannelStatsSchema>;
