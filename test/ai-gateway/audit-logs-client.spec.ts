import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AIGatewayAuditLogsClient } from '../../src/ai-gateway/audit-logs-client.js';
import type { AuthAdapter } from '../../src/http/types.js';

function passthroughAuth(): AuthAdapter {
  return { prepare: async (req) => req };
}
function mockFetch(data: unknown) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    text: () => Promise.resolve(JSON.stringify(data)),
  });
}

describe('AIGatewayAuditLogsClient', () => {
  const originalFetch = globalThis.fetch;
  let client: AIGatewayAuditLogsClient;

  beforeEach(() => {
    client = new AIGatewayAuditLogsClient({
      baseUrl: 'https://admin.example.com',
      auth: passthroughAuth(),
      numRetries: 0,
    });
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('serializes start/end as ISO-8601 Z strings', async () => {
    mockFetch({ records: [] });
    await client.list({
      start: new Date('2026-07-20T00:00:00Z'),
      end: new Date('2026-07-27T00:00:00Z'),
    });

    const u = new URL((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string);
    expect(u.pathname).toBe('/audit-logs');
    expect(u.searchParams.get('start_time')).toBe('2026-07-20T00:00:00.000Z');
    expect(u.searchParams.get('end_time')).toBe('2026-07-27T00:00:00.000Z');
  });

  it('GETs the audit-logs path and returns the bare records envelope', async () => {
    const record = {
      timestamp: '2026-07-26T12:00:00.000Z',
      method: 'POST',
      uri: '/v2/integrations',
      request_id: 'req-1',
      request_body: '{"key":"sk-live-super-secret"}',
      query_params: '',
      request_headers: '{"authorization":"***MASKED***"}',
      user_id: 'user-1',
      user_type: 'human',
      organisation_id: '1852583913',
      workspace_id: 'ws-1',
      response_status_code: 200,
      resource_type: 'integration',
      action: 'create',
      client_ip: '10.0.0.1',
      country: 'US',
    };
    mockFetch({ records: [record] });

    const res = await client.list({
      start: new Date('2026-07-20T00:00:00Z'),
      end: new Date('2026-07-27T00:00:00Z'),
    });

    const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(new URL(url as string).pathname).toBe('/audit-logs');
    expect((init as RequestInit).method).toBe('GET');
    expect(res.records).toHaveLength(1);
    expect(res.records[0].request_body).toBe('{"key":"sk-live-super-secret"}');
    expect(res.records[0].request_headers).toBe('{"authorization":"***MASKED***"}');
  });
});
