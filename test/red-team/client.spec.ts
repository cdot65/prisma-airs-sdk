import { describe, it, expect, afterEach, vi } from 'vitest';
import { RedTeamClient } from '../../src/red-team/client.js';
import { RedTeamScansClient } from '../../src/red-team/scans-client.js';
import { RedTeamReportsClient } from '../../src/red-team/reports-client.js';
import { RedTeamCustomAttackReportsClient } from '../../src/red-team/custom-attack-reports-client.js';
import { RedTeamTargetsClient } from '../../src/red-team/targets-client.js';
import { RedTeamCustomAttacksClient } from '../../src/red-team/custom-attacks-client.js';
import { AISecSDKException } from '../../src/errors.js';

const validUuid = '550e8400-e29b-41d4-a716-446655440000';

describe('RedTeamClient', () => {
  const originalEnv = { ...process.env };
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    process.env = { ...originalEnv };
    globalThis.fetch = originalFetch;
  });

  it('constructs with explicit options', () => {
    const client = new RedTeamClient({
      clientId: 'cid',
      clientSecret: 'csec',
      tsgId: '999',
    });
    expect(client.scans).toBeInstanceOf(RedTeamScansClient);
    expect(client.reports).toBeInstanceOf(RedTeamReportsClient);
    expect(client.customAttackReports).toBeInstanceOf(RedTeamCustomAttackReportsClient);
    expect(client.targets).toBeInstanceOf(RedTeamTargetsClient);
    expect(client.customAttacks).toBeInstanceOf(RedTeamCustomAttacksClient);
  });

  it('reads credentials from RED_TEAM env vars', () => {
    process.env.PANW_RED_TEAM_CLIENT_ID = 'env-cid';
    process.env.PANW_RED_TEAM_CLIENT_SECRET = 'env-csec';
    process.env.PANW_RED_TEAM_TSG_ID = 'env-tsg';

    const client = new RedTeamClient();
    expect(client.scans).toBeInstanceOf(RedTeamScansClient);
  });

  it('falls back to MGMT env vars', () => {
    process.env.PANW_MGMT_CLIENT_ID = 'mgmt-cid';
    process.env.PANW_MGMT_CLIENT_SECRET = 'mgmt-csec';
    process.env.PANW_MGMT_TSG_ID = 'mgmt-tsg';

    const client = new RedTeamClient();
    expect(client.scans).toBeInstanceOf(RedTeamScansClient);
  });

  it('RED_TEAM env vars take precedence over MGMT', () => {
    process.env.PANW_RED_TEAM_CLIENT_ID = 'rt-cid';
    process.env.PANW_RED_TEAM_CLIENT_SECRET = 'rt-csec';
    process.env.PANW_RED_TEAM_TSG_ID = 'rt-tsg';
    process.env.PANW_MGMT_CLIENT_ID = 'mgmt-cid';
    process.env.PANW_MGMT_CLIENT_SECRET = 'mgmt-csec';
    process.env.PANW_MGMT_TSG_ID = 'mgmt-tsg';

    const client = new RedTeamClient();
    expect(client.scans).toBeInstanceOf(RedTeamScansClient);
  });

  it('explicit opts override env vars', () => {
    process.env.PANW_RED_TEAM_CLIENT_ID = 'env-cid';
    process.env.PANW_RED_TEAM_CLIENT_SECRET = 'env-csec';
    process.env.PANW_RED_TEAM_TSG_ID = 'env-tsg';

    const client = new RedTeamClient({
      clientId: 'override',
      clientSecret: 'override-sec',
      tsgId: 'override-tsg',
    });
    expect(client.scans).toBeInstanceOf(RedTeamScansClient);
  });

  it('throws when clientId missing', () => {
    expect(
      () =>
        new RedTeamClient({
          clientSecret: 'sec',
          tsgId: '1',
        }),
    ).toThrow(AISecSDKException);
  });

  it('throws when clientSecret missing', () => {
    expect(
      () =>
        new RedTeamClient({
          clientId: 'cid',
          tsgId: '1',
        }),
    ).toThrow(AISecSDKException);
  });

  it('throws when tsgId missing', () => {
    expect(
      () =>
        new RedTeamClient({
          clientId: 'cid',
          clientSecret: 'sec',
        }),
    ).toThrow(AISecSDKException);
  });

  it('accepts custom endpoints', () => {
    const client = new RedTeamClient({
      clientId: 'cid',
      clientSecret: 'sec',
      tsgId: '1',
      dataEndpoint: 'https://data.example.com',
      mgmtEndpoint: 'https://mgmt.example.com',
      tokenEndpoint: 'https://auth.example.com/token',
    });
    expect(client.scans).toBeInstanceOf(RedTeamScansClient);
  });

  it('reads endpoints from env vars', () => {
    process.env.PANW_RED_TEAM_CLIENT_ID = 'cid';
    process.env.PANW_RED_TEAM_CLIENT_SECRET = 'sec';
    process.env.PANW_RED_TEAM_TSG_ID = '1';
    process.env.PANW_RED_TEAM_DATA_ENDPOINT = 'https://data.env.com';
    process.env.PANW_RED_TEAM_MGMT_ENDPOINT = 'https://mgmt.env.com';
    process.env.PANW_RED_TEAM_TOKEN_ENDPOINT = 'https://auth.env.com/token';

    const client = new RedTeamClient();
    expect(client.scans).toBeInstanceOf(RedTeamScansClient);
  });

  it('clamps numRetries to valid range', () => {
    const client = new RedTeamClient({
      clientId: 'cid',
      clientSecret: 'sec',
      tsgId: '1',
      numRetries: 10,
    });
    expect(client.scans).toBeInstanceOf(RedTeamScansClient);
  });

  it('clamps negative numRetries to 0', () => {
    const client = new RedTeamClient({
      clientId: 'cid',
      clientSecret: 'sec',
      tsgId: '1',
      numRetries: -1,
    });
    expect(client.scans).toBeInstanceOf(RedTeamScansClient);
  });

  it('defaults numRetries to 5', () => {
    const client = new RedTeamClient({
      clientId: 'cid',
      clientSecret: 'sec',
      tsgId: '1',
    });
    expect(client.scans).toBeInstanceOf(RedTeamScansClient);
  });

  // -----------------------------------------------------------------------
  // Convenience methods
  // -----------------------------------------------------------------------

  function mockTwoFetches(data: unknown) {
    const tokenResp = { access_token: 'tok', token_type: 'bearer', expires_in: 3600 };
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(tokenResp),
        text: () => Promise.resolve(JSON.stringify(tokenResp)),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify(data)),
      });
  }

  function makeClient() {
    return new RedTeamClient({
      clientId: 'cid',
      clientSecret: 'sec',
      tsgId: '1',
      numRetries: 0,
    });
  }

  describe('getScanStatistics', () => {
    it('GETs /v1/dashboard/scan-statistics', async () => {
      const resp = { total_scans: 10 };
      mockTwoFetches(resp);
      const client = makeClient();
      const result = await client.getScanStatistics();
      expect(result.total_scans).toBe(10);

      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[1];
      expect(url).toContain('/v1/dashboard/scan-statistics');
    });
  });

  describe('getScoreTrend', () => {
    it('GETs /v1/dashboard/score-trend', async () => {
      const resp = { trends: [] };
      mockTwoFetches(resp);
      const client = makeClient();
      const result = await client.getScoreTrend(validUuid);
      expect(result.trends).toEqual([]);

      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[1];
      expect(url).toContain('/v1/dashboard/score-trend');
    });

    it('rejects invalid UUID', async () => {
      const client = makeClient();
      await expect(client.getScoreTrend('bad')).rejects.toThrow(AISecSDKException);
    });
  });

  describe('getQuota', () => {
    it('POSTs to /v1/metering/quota', async () => {
      const resp = { used: 5, total: 100 };
      mockTwoFetches(resp);
      const client = makeClient();
      const result = await client.getQuota();
      expect(result.used).toBe(5);

      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[1];
      expect(url).toContain('/v1/metering/quota');
      expect(init.method).toBe('POST');
    });
  });

  describe('getErrorLogs', () => {
    it('GETs /v1/error-log/job/:jobId', async () => {
      const resp = { logs: [] };
      mockTwoFetches(resp);
      const client = makeClient();
      const result = await client.getErrorLogs(validUuid);
      expect(result.logs).toEqual([]);

      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[1];
      expect(url).toContain(`/v1/error-log/job/${validUuid}`);
    });

    it('rejects invalid UUID', async () => {
      const client = makeClient();
      await expect(client.getErrorLogs('bad')).rejects.toThrow(AISecSDKException);
    });
  });

  describe('updateSentiment', () => {
    it('POSTs to /v1/sentiment', async () => {
      const resp = { job_id: validUuid, sentiment: 'positive' };
      mockTwoFetches(resp);
      const client = makeClient();
      const result = await client.updateSentiment({ job_id: validUuid, sentiment: 'positive' });
      expect(result.sentiment).toBe('positive');

      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[1];
      expect(url).toContain('/v1/sentiment');
      expect(init.method).toBe('POST');
    });
  });

  describe('getSentiment', () => {
    it('GETs /v1/sentiment/:jobId', async () => {
      const resp = { job_id: validUuid, sentiment: 'positive' };
      mockTwoFetches(resp);
      const client = makeClient();
      const result = await client.getSentiment(validUuid);
      expect(result.sentiment).toBe('positive');

      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[1];
      expect(url).toContain(`/v1/sentiment/${validUuid}`);
    });

    it('rejects invalid UUID', async () => {
      const client = makeClient();
      await expect(client.getSentiment('bad')).rejects.toThrow(AISecSDKException);
    });
  });

  describe('getDashboardOverview', () => {
    it('GETs /v1/dashboard/overview', async () => {
      const resp = { overview: {} };
      mockTwoFetches(resp);
      const client = makeClient();
      const result = await client.getDashboardOverview();
      expect(result.overview).toEqual({});

      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[1];
      expect(url).toContain('/v1/dashboard/overview');
    });
  });
});
