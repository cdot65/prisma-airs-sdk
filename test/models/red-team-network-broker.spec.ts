import { describe, it, expect } from 'vitest';
import { ChannelStatus } from '../../src/models/red-team-enums.js';
import {
  ChannelStatusSchema,
  CreateChannelRequestSchema,
  UpdateChannelRequestSchema,
  ChannelSchema,
  ChannelStatsSchema,
  ChannelListPaginationSchema,
  ChannelListResponseSchema,
} from '../../src/models/red-team-network-broker.js';

describe('red-team network broker models', () => {
  it('ChannelStatus enum exposes upstream values', () => {
    expect(ChannelStatus.ONLINE).toBe('ONLINE');
    expect(ChannelStatus.OFFLINE).toBe('OFFLINE');
    expect(ChannelStatus.DRAFT).toBe('DRAFT');
  });

  it('ChannelStatusSchema accepts the three upstream values', () => {
    expect(ChannelStatusSchema.parse('ONLINE')).toBe('ONLINE');
    expect(ChannelStatusSchema.parse('OFFLINE')).toBe('OFFLINE');
    expect(ChannelStatusSchema.parse('DRAFT')).toBe('DRAFT');
    expect(() => ChannelStatusSchema.parse('BOGUS')).toThrow();
  });

  it('CreateChannelRequestSchema requires name, allows optional description', () => {
    expect(CreateChannelRequestSchema.parse({ name: 'c1' })).toEqual({ name: 'c1' });
    expect(CreateChannelRequestSchema.parse({ name: 'c1', description: 'd' })).toEqual({
      name: 'c1',
      description: 'd',
    });
    expect(() => CreateChannelRequestSchema.parse({})).toThrow();
  });

  it('UpdateChannelRequestSchema allows optional name and description', () => {
    expect(UpdateChannelRequestSchema.parse({})).toEqual({});
    expect(UpdateChannelRequestSchema.parse({ name: 'x', description: 'y' })).toEqual({
      name: 'x',
      description: 'y',
    });
  });

  it('ChannelSchema parses an upstream-shaped channel and keeps extra fields', () => {
    const parsed = ChannelSchema.parse({
      uuid: '550e8400-e29b-41d4-a716-446655440000',
      name: 'prod-broker',
      description: 'desc',
      status: 'ONLINE',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      extra_upstream_field: 'kept',
    });
    expect(parsed.name).toBe('prod-broker');
    expect(parsed.status).toBe('ONLINE');
    expect((parsed as Record<string, unknown>).extra_upstream_field).toBe('kept');
  });

  it('ChannelListPaginationSchema parses total_items', () => {
    expect(ChannelListPaginationSchema.parse({ total_items: 5 }).total_items).toBe(5);
    expect(ChannelListPaginationSchema.parse({}).total_items).toBeUndefined();
  });

  it('ChannelListResponseSchema parses pagination + data', () => {
    const parsed = ChannelListResponseSchema.parse({
      pagination: { total_items: 1 },
      data: [{ uuid: '550e8400-e29b-41d4-a716-446655440000', name: 'c', status: 'DRAFT' }],
    });
    expect(parsed.pagination?.total_items).toBe(1);
    expect(parsed.data).toHaveLength(1);
    expect(parsed.data[0].name).toBe('c');
  });

  it('ChannelStatsSchema parses stats and keeps extra fields', () => {
    const parsed = ChannelStatsSchema.parse({
      network_channels_server_domain: 'broker.example.com',
      docker_registry: 'registry.example.com',
      helm_chart: 'charts/network-client:1.0.0',
      docker_image: 'images/network-client:1.0.0',
      online_channels: 3,
      total_channels: 5,
      client_version: '1.4.0',
      future_field: true,
    });
    expect(parsed.online_channels).toBe(3);
    expect(parsed.total_channels).toBe(5);
    expect(parsed.client_version).toBe('1.4.0');
    expect((parsed as Record<string, unknown>).future_field).toBe(true);
  });
});
