import { describe, it, expect } from 'vitest';
import {
  CostChartResponseSchema,
  LatencyChartResponseSchema,
  RescuedRetriesResponseSchema,
  GroupListResponseSchema,
  UserGroupResponseSchema,
  GatewayLogsResponseSchema,
} from '../../src/models/ai-gateway.js';

describe('AI Gateway telemetry schemas', () => {
  it('parses a cost chart (values in cents)', () => {
    const r = CostChartResponseSchema.parse({
      success: true,
      data: {
        records: [{ x: '2026-07-20T05:00:00.000Z', y: 68064.028, avg: 20.342 }],
        total: 411082.598,
        avg: 19.981,
        isQuotaExceeded: false,
      },
    });
    expect(r.data.total).toBe(411082.598);
  });

  it('parses per-bucket latency percentiles', () => {
    const r = LatencyChartResponseSchema.parse({
      success: true,
      data: {
        records: [
          { x: '2026-07-20T05:00:00.000Z', y: 2296.845, p50: 1855, p90: 3570, p99: 8611.8 },
        ],
        total: 2202.043,
        p50: 1750,
        p90: 3599.9,
        p99: 8329.14,
        isQuotaExceeded: false,
      },
    });
    expect(r.data.records[0].p99).toBe(8611.8);
  });

  it('parses rescued-retries where record y is an ARRAY', () => {
    const r = RescuedRetriesResponseSchema.parse({
      success: true,
      data: {
        trend: [{ x: '2026-07-20T05:00:00.000Z', y: [] }],
        total: 0,
        trends: [{ x: '2026-07-20T05:00:00.000Z', retry: [], fallback: [] }],
        retryTotal: 0,
        fallbackTotal: 0,
        isQuotaExceeded: false,
      },
    });
    expect(r.data.trend[0].y).toEqual([]);
  });

  it('parses a groups row using the snake_case quota flag', () => {
    const r = GroupListResponseSchema.parse({
      object: 'list',
      is_quota_exceeded: false,
      total: 1,
      data: [{ model: 'claude-sonnet-5', requests: 10506, cost: 29704.16, object: 'log' }],
    });
    expect(r.data[0].requests).toBe(10506);
  });

  it('parses groups/users, which uses the OTHER envelope', () => {
    const r = UserGroupResponseSchema.parse({
      success: true,
      data: {
        records: [{ _user: '', count: 25748, cost: 411060.85 }],
        total: 1,
        isQuotaExceeded: false,
      },
    });
    expect(r.data.records[0]._user).toBe('');
  });

  it('parses a log record with 0/1 integer booleans and null-safe fields', () => {
    const r = GatewayLogsResponseSchema.parse({
      success: true,
      data: {
        records: [
          {
            id: '11111111-1111-4111-8111-111111111111',
            workspace_slug: 'ws-main-a-349e0e',
            ai_model: 'claude-sonnet-5',
            _user: '',
            total_units: 63809,
            cost: 1.383,
            trace_id: 'claude-code-calvin',
            is_proxy_call: 0,
            created_at: '2026-07-27T10:48:22.059Z',
            is_success: 1,
            cache_status: 'DISABLED',
            retry_success_count: 0,
            mode: 'single',
            last_used_option_index: -1,
            response_status_code: 200,
            request_url: 'https://api.anthropic.com/v1/messages',
            request_method: 'POST',
            ai_org: 'anthropic',
            api_key_id: 'k1',
            license_id: '22222222-2222-4222-8222-222222222222',
            log_store_file_path_format: 'v2',
            metadataKey: [],
            metadataValue: [],
            prompt_slug: '',
            feedback: [],
          },
        ],
        total: 25750,
        isQuotaExceeded: false,
        capturedTotal: 0,
      },
    });
    expect(r.data.records[0].is_success).toBe(1);
  });

  it('tolerates unknown upstream fields (passthrough)', () => {
    const r = CostChartResponseSchema.parse({
      success: true,
      data: { records: [], total: 0, avg: 0, isQuotaExceeded: false, brandNewField: 'x' },
    });
    expect((r.data as Record<string, unknown>).brandNewField).toBe('x');
  });
});
