import { describe, it, expect, afterEach, vi } from 'vitest';
import { ManagementClient } from '../../src/management/client.js';
import { ProfilesClient } from '../../src/management/profiles.js';
import { TopicsClient } from '../../src/management/topics.js';
import { ApiKeysClient } from '../../src/management/api-keys.js';
import { CustomerAppsClient } from '../../src/management/customer-apps.js';
import { DlpProfilesClient } from '../../src/management/dlp-profiles.js';
import { DeploymentProfilesClient } from '../../src/management/deployment-profiles.js';
import { ScanLogsClient } from '../../src/management/scan-logs.js';
import { OAuthManagementClient } from '../../src/management/oauth-management.js';
import { DlpNamespace } from '../../src/management/dlp/index.js';
import { DataFilteringProfilesClient } from '../../src/management/dlp/data-filtering-profiles.js';
import { DataPatternsClient } from '../../src/management/dlp/data-patterns.js';
import { DataProfilesClient } from '../../src/management/dlp/data-profiles.js';
import { DictionariesClient } from '../../src/management/dlp/dictionaries.js';
import { AISecSDKException } from '../../src/errors.js';

describe('ManagementClient', () => {
  const originalEnv = { ...process.env };
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    process.env = { ...originalEnv };
    globalThis.fetch = originalFetch;
  });

  it('constructs with explicit options', () => {
    const client = new ManagementClient({
      clientId: 'cid',
      clientSecret: 'csec',
      tsgId: '999',
    });

    expect(client.profiles).toBeInstanceOf(ProfilesClient);
    expect(client.topics).toBeInstanceOf(TopicsClient);
    expect(client.apiKeys).toBeInstanceOf(ApiKeysClient);
    expect(client.customerApps).toBeInstanceOf(CustomerAppsClient);
    expect(client.dlpProfiles).toBeInstanceOf(DlpProfilesClient);
    expect(client.deploymentProfiles).toBeInstanceOf(DeploymentProfilesClient);
    expect(client.scanLogs).toBeInstanceOf(ScanLogsClient);
    expect(client.oauth).toBeInstanceOf(OAuthManagementClient);
    expect(client.dlp).toBeInstanceOf(DlpNamespace);
  });

  it('reads credentials from env vars', () => {
    process.env.PANW_MGMT_CLIENT_ID = 'env-cid';
    process.env.PANW_MGMT_CLIENT_SECRET = 'env-csec';
    process.env.PANW_MGMT_TSG_ID = 'env-tsg';

    const client = new ManagementClient();
    expect(client.profiles).toBeInstanceOf(ProfilesClient);
  });

  it('explicit opts override env vars', () => {
    process.env.PANW_MGMT_CLIENT_ID = 'env-cid';
    process.env.PANW_MGMT_CLIENT_SECRET = 'env-csec';
    process.env.PANW_MGMT_TSG_ID = 'env-tsg';

    // Should not throw
    const client = new ManagementClient({
      clientId: 'override-cid',
      clientSecret: 'override-csec',
      tsgId: 'override-tsg',
    });
    expect(client.profiles).toBeInstanceOf(ProfilesClient);
  });

  it('throws when clientId missing', () => {
    expect(
      () =>
        new ManagementClient({
          clientSecret: 'sec',
          tsgId: '1',
        }),
    ).toThrow(AISecSDKException);
  });

  it('throws when clientSecret missing', () => {
    expect(
      () =>
        new ManagementClient({
          clientId: 'cid',
          tsgId: '1',
        }),
    ).toThrow(AISecSDKException);
  });

  it('throws when tsgId missing', () => {
    expect(
      () =>
        new ManagementClient({
          clientId: 'cid',
          clientSecret: 'sec',
        }),
    ).toThrow(AISecSDKException);
  });

  it('accepts custom endpoints', () => {
    const client = new ManagementClient({
      clientId: 'cid',
      clientSecret: 'sec',
      tsgId: '1',
      apiEndpoint: 'https://custom.api.com',
      tokenEndpoint: 'https://custom.auth.com/token',
    });
    expect(client.profiles).toBeInstanceOf(ProfilesClient);
  });

  it.each([undefined, 'https://dashboard.example.com/aisec/'])(
    'routes dashboard requests independently while sharing OAuth: %s',
    async (dashboardEndpoint) => {
      globalThis.fetch = vi.fn().mockImplementation(async (input) => {
        const url = String(input);
        if (url.endsWith('/access_token'))
          return Response.json({
            access_token: 'test-access-token',
            token_type: 'Bearer',
            expires_in: 900,
          });
        if (url.includes('/applicationsoverview'))
          return Response.json({ items: [], pagination: { limit: 25, skip: 0, total_items: 0 } });
        if (url.includes('/profiles/')) return Response.json({ ai_profiles: [] });
        if (url.includes('/applicationviolationbreakdown'))
          return Response.json({ detection_type_violation_breakdown: [] });
        if (url.includes('/topapplicationsviolations')) return Response.json({ applications: [] });
        if (url.includes('/applicationsviolationstrend')) return Response.json({ violations: [] });
        if (url.includes('/application?'))
          return Response.json({ token_stats: null, session_stats: null });
        return Response.json({});
      });
      const client = new ManagementClient({
        clientId: 'cid',
        clientSecret: 'secret',
        tsgId: '123',
        apiEndpoint: 'https://management.example.com/aisec',
        tokenEndpoint: 'https://auth.example.com/access_token',
        dashboardEndpoint,
        numRetries: 0,
      });
      await client.dashboard.applicationsOverviewRaw({ timeInterval: 1, timeUnit: 'day' });
      await client.dashboard.applicationsOverview();
      await client.dashboard.application({ appId: 'app-1', appName: 'example' });
      await client.dashboard.applicationViolationBreakdown({ appId: 'app-1', appName: 'example' });
      await client.dashboard.applicationRaw({ appId: 'app-1', appName: 'example' });
      await client.dashboard.applicationViolationBreakdownRaw({
        appId: 'app-1',
        appName: 'example',
      });
      await client.dashboard.topApplicationsViolations();
      await client.dashboard.topApplicationsViolationsRaw();
      await client.dashboard.applicationsViolationsTrend();
      await client.dashboard.applicationsViolationsTrendRaw();
      await client.profiles.list();
      const calls = vi.mocked(globalThis.fetch).mock.calls;
      expect(calls.filter(([url]) => String(url).includes('/access_token'))).toHaveLength(1);
      const dashboardCalls = calls.filter(([url]) => String(url).includes('/dashboard/'));
      expect(dashboardCalls).toHaveLength(10);
      for (const [url, init] of dashboardCalls) {
        expect(String(url)).toMatch(
          dashboardEndpoint
            ? /^https:\/\/dashboard\.example\.com\/aisec\/v1\//
            : /^https:\/\/management\.example\.com\/aisec\/v1\//,
        );
        const headers = new Headers(init?.headers);
        expect(headers.get('authorization')).toBe('Bearer test-access-token');
        expect(headers.get('x-tsg-id')).toBe('123');
      }
      const [profileUrl, profileInit] = calls.find(([url]) => String(url).includes('/profiles/'))!;
      expect(String(profileUrl)).toContain(
        'https://management.example.com/aisec/v1/mgmt/profiles/',
      );
      expect(new Headers(profileInit?.headers).get('authorization')).toBe(
        'Bearer test-access-token',
      );
    },
  );

  it('reads endpoint from env var', () => {
    process.env.PANW_MGMT_CLIENT_ID = 'cid';
    process.env.PANW_MGMT_CLIENT_SECRET = 'sec';
    process.env.PANW_MGMT_TSG_ID = '1';
    process.env.PANW_MGMT_ENDPOINT = 'https://env.api.com';
    process.env.PANW_MGMT_TOKEN_ENDPOINT = 'https://env.auth.com/token';

    const client = new ManagementClient();
    expect(client.profiles).toBeInstanceOf(ProfilesClient);
  });

  it('clamps numRetries to valid range', () => {
    const client = new ManagementClient({
      clientId: 'cid',
      clientSecret: 'sec',
      tsgId: '1',
      numRetries: 10,
    });
    expect(client.profiles).toBeInstanceOf(ProfilesClient);
  });

  it('defaults numRetries to 5', () => {
    const client = new ManagementClient({
      clientId: 'cid',
      clientSecret: 'sec',
      tsgId: '1',
    });
    expect(client.profiles).toBeInstanceOf(ProfilesClient);
  });

  it('exposes dlp namespace with default DLP endpoint', () => {
    const client = new ManagementClient({
      clientId: 'cid',
      clientSecret: 'sec',
      tsgId: '1',
    });
    expect(client.dlp).toBeInstanceOf(DlpNamespace);
    expect(client.dlp.baseUrl).toBe('https://api.dlp.paloaltonetworks.com');
  });

  it('exposes dlp.dataFilteringProfiles subclient', () => {
    const client = new ManagementClient({
      clientId: 'cid',
      clientSecret: 'sec',
      tsgId: '1',
    });
    expect(client.dlp.dataFilteringProfiles).toBeInstanceOf(DataFilteringProfilesClient);
  });

  it('exposes dlp.dataPatterns subclient', () => {
    const client = new ManagementClient({
      clientId: 'cid',
      clientSecret: 'sec',
      tsgId: '1',
    });
    expect(client.dlp.dataPatterns).toBeInstanceOf(DataPatternsClient);
  });

  it('exposes dlp.dataProfiles subclient', () => {
    const client = new ManagementClient({
      clientId: 'cid',
      clientSecret: 'sec',
      tsgId: '1',
    });
    expect(client.dlp.dataProfiles).toBeInstanceOf(DataProfilesClient);
  });

  it('exposes dlp.dictionaries subclient', () => {
    const client = new ManagementClient({
      clientId: 'cid',
      clientSecret: 'sec',
      tsgId: '1',
    });
    expect(client.dlp.dictionaries).toBeInstanceOf(DictionariesClient);
  });

  it('dlpEndpoint option overrides default DLP base URL', () => {
    const client = new ManagementClient({
      clientId: 'cid',
      clientSecret: 'sec',
      tsgId: '1',
      dlpEndpoint: 'https://dlp.staging.example.com',
    });
    expect(client.dlp.baseUrl).toBe('https://dlp.staging.example.com');
  });

  it('does NOT read DLP endpoint from a DLP-specific env var', () => {
    process.env.PANW_DLP_ENDPOINT = 'https://should-be-ignored.example.com';
    const client = new ManagementClient({
      clientId: 'cid',
      clientSecret: 'sec',
      tsgId: '1',
    });
    expect(client.dlp.baseUrl).toBe('https://api.dlp.paloaltonetworks.com');
  });
});
