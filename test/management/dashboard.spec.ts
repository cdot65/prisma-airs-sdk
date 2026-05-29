import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DashboardClient } from '../../src/management/dashboard.js';
import type { AuthAdapter } from '../../src/http/types.js';

function passthroughAuth(): AuthAdapter {
  return { prepare: async (req) => req };
}

function mockFetch(data: unknown, status = 200) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(data)),
  });
}

const APPLICATION_RESPONSE = {
  id: '5e16929a-1234-4567-89ab-cdef01234567',
  name: 'chatbot',
  cloud: 'other',
  source: 'api',
  created_at: '2026-04-29T17:04:52Z',
  updated_at: '2026-05-27T14:53:33Z',
  profiles: ['ms-tuned', 'claude-code', 'golden-v2'],
  token_stats: {
    average_daily_tokens: 744.233,
    average_daily_tokens_scale: 'K',
    monthly_total_tokens: 17.713747,
    monthly_total_tokens_scale: 'M',
  },
  session_stats: {
    total: 56935,
    violating: 31136,
    violation_breakdown: { critical: 0, high: 11, low: 4664, medium: 55282, total: 59957 },
    last_session_id: 'session-abc',
    most_recent_session_time: '2026-05-27T14:53:33Z',
  },
};

const BREAKDOWN_RESPONSE = {
  detection_type_violation_breakdown: [
    {
      detection_type: 'agent_security',
      violation_breakdown: { critical: 0, high: 0, low: 0, medium: 0, total: 0 },
    },
    {
      detection_type: 'dlp',
      violation_breakdown: { critical: 0, high: 0, low: 0, medium: 0, total: 0 },
    },
    {
      detection_type: 'topic_guardrails',
      violation_breakdown: { critical: 0, high: 0, low: 0, medium: 3, total: 3 },
    },
  ],
  total_violating: 3,
};

describe('DashboardClient', () => {
  const originalFetch = globalThis.fetch;
  let client: DashboardClient;

  beforeEach(() => {
    client = new DashboardClient({
      baseUrl: 'https://api.example.com',
      auth: passthroughAuth(),
      numRetries: 0,
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('application', () => {
    it('GETs /v1/mgmt/dashboard/v2/apps/application with appid + appname', async () => {
      mockFetch(APPLICATION_RESPONSE);
      const result = await client.application({ appId: 'uuid-1', appName: 'chatbot' });

      expect(result.name).toBe('chatbot');
      expect(result.token_stats?.average_daily_tokens).toBe(744.233);
      expect(result.token_stats?.average_daily_tokens_scale).toBe('K');
      expect(result.token_stats?.monthly_total_tokens_scale).toBe('M');
      expect(result.session_stats?.total).toBe(56935);

      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('/v1/mgmt/dashboard/v2/apps/application');
      expect(url).toContain('appid=uuid-1');
      expect(url).toContain('appname=chatbot');
      expect(url).toContain('time_interval=30');
      expect(url).toContain('time_unit=days');
    });

    it('URL-encodes appname with spaces', async () => {
      mockFetch(APPLICATION_RESPONSE);
      await client.application({ appId: 'uuid-1', appName: 'Claude Code' });

      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toMatch(/appname=Claude(\+|%20)Code/);
    });

    it('uses caller-supplied timeInterval + timeUnit', async () => {
      mockFetch(APPLICATION_RESPONSE);
      await client.application({
        appId: 'uuid-1',
        appName: 'chatbot',
        timeInterval: 7,
        timeUnit: 'days',
      });

      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('time_interval=7');
      expect(url).toContain('time_unit=days');
    });

    it('tolerates all-null body when appname omitted server-side', async () => {
      mockFetch({
        id: null,
        name: null,
        token_stats: null,
        session_stats: null,
      });
      const result = await client.application({ appId: 'uuid-1', appName: 'chatbot' });
      expect(result.token_stats).toBeNull();
      expect(result.session_stats).toBeNull();
    });
  });

  describe('applicationViolationBreakdown', () => {
    it('GETs /v1/mgmt/dashboard/v2/apps/applicationviolationbreakdown', async () => {
      mockFetch(BREAKDOWN_RESPONSE);
      const result = await client.applicationViolationBreakdown({
        appId: 'uuid-1',
        appName: 'chatbot',
      });

      expect(result.total_violating).toBe(3);
      expect(result.detection_type_violation_breakdown).toHaveLength(3);
      const tg = result.detection_type_violation_breakdown?.find(
        (e) => e.detection_type === 'topic_guardrails',
      );
      expect(tg?.violation_breakdown?.medium).toBe(3);
      expect(tg?.violation_breakdown?.total).toBe(3);

      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('/v1/mgmt/dashboard/v2/apps/applicationviolationbreakdown');
      expect(url).toContain('appid=uuid-1');
      expect(url).toContain('appname=chatbot');
    });
  });

  describe('applicationsOverview', () => {
    const OVERVIEW_RESPONSE = {
      items: [
        {
          id: '5e16929a-1234-4567-89ab-cdef01234567',
          name: 'chatbot',
          cloud: 'other',
          source: 'api',
          created_at: '2026-04-29T19:00:56.098009282Z',
          sessions: [
            { bucket_number: 0, date: '2026-04-29T19:00:56Z', total: 0, violated: 0 },
            { bucket_number: 1, date: '2026-04-30T19:00:56Z', total: 13104, violated: 504 },
          ],
          sessions_total: 13104,
          sessions_violated: 504,
        },
        {
          id: '5e16929a-1234-4567-89ab-cdef01234567',
          name: 'Claude Code',
          cloud: 'other',
          source: 'api',
          created_at: '2026-04-29T19:00:56.098009282Z',
          sessions: [],
          sessions_total: 234,
          sessions_violated: 12,
        },
      ],
      pagination: { limit: 25, skip: 0, total_items: 2 },
    };

    it('GETs /v1/mgmt/dashboard/v2/apps/applicationsoverview with defaults', async () => {
      mockFetch(OVERVIEW_RESPONSE);
      const result = await client.applicationsOverview();

      expect(result.items).toHaveLength(2);
      expect(result.items?.[0].name).toBe('chatbot');
      expect(result.items?.[1].name).toBe('Claude Code');
      expect(result.pagination?.total_items).toBe(2);

      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('/v1/mgmt/dashboard/v2/apps/applicationsoverview');
      expect(url).toContain('time_interval=30');
      expect(url).toContain('time_unit=days');
      expect(url).toContain('limit=25');
      expect(url).toContain('offset=0');
    });

    it('exposes the (id, name) pair the application endpoint needs', async () => {
      mockFetch(OVERVIEW_RESPONSE);
      const result = await client.applicationsOverview();

      // Both items share the same id (same registered customer_app) but have distinct names
      // (each is a separate dashboard bucket driven by scan-payload metadata.app_name).
      const ids = (result.items ?? []).map((i) => i.id);
      const names = (result.items ?? []).map((i) => i.name);
      expect(new Set(ids).size).toBe(1);
      expect(new Set(names).size).toBe(2);
    });

    it('uses caller-supplied timeInterval / timeUnit / limit / offset', async () => {
      mockFetch({ items: [], pagination: { limit: 100, skip: 50, total_items: 0 } });
      await client.applicationsOverview({
        timeInterval: 60,
        timeUnit: 'days',
        limit: 100,
        offset: 50,
      });

      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('time_interval=60');
      expect(url).toContain('time_unit=days');
      expect(url).toContain('limit=100');
      expect(url).toContain('offset=50');
    });

    it('supports the singular time_unit values the API accepts (day, hour)', async () => {
      mockFetch({ items: [], pagination: { limit: 25, skip: 0, total_items: 0 } });
      await client.applicationsOverview({ timeInterval: 1, timeUnit: 'hour' });

      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('time_interval=1');
      expect(url).toContain('time_unit=hour');
    });

    it('tolerates empty items[] without throwing', async () => {
      mockFetch({ items: [], pagination: { limit: 25, skip: 0, total_items: 0 } });
      const result = await client.applicationsOverview();
      expect(result.items).toEqual([]);
      expect(result.pagination?.total_items).toBe(0);
    });
  });
});
