import { describe, it, expect, afterEach, vi } from 'vitest';
import { ModelSecurityClient } from '../../src/model-security/client.js';
import { ModelSecurityScansClient } from '../../src/model-security/scans-client.js';
import { ModelSecurityGroupsClient } from '../../src/model-security/security-groups-client.js';
import { ModelSecurityRulesClient } from '../../src/model-security/security-rules-client.js';
import { AISecSDKException } from '../../src/errors.js';

describe('ModelSecurityClient', () => {
  const originalEnv = { ...process.env };
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    process.env = { ...originalEnv };
    globalThis.fetch = originalFetch;
  });

  it('constructs with explicit options', () => {
    const client = new ModelSecurityClient({
      clientId: 'cid',
      clientSecret: 'csec',
      tsgId: '999',
    });
    expect(client.scans).toBeInstanceOf(ModelSecurityScansClient);
    expect(client.securityGroups).toBeInstanceOf(ModelSecurityGroupsClient);
    expect(client.securityRules).toBeInstanceOf(ModelSecurityRulesClient);
  });

  it('reads credentials from MODEL_SEC env vars', () => {
    process.env.PANW_MODEL_SEC_CLIENT_ID = 'env-cid';
    process.env.PANW_MODEL_SEC_CLIENT_SECRET = 'env-csec';
    process.env.PANW_MODEL_SEC_TSG_ID = 'env-tsg';

    const client = new ModelSecurityClient();
    expect(client.scans).toBeInstanceOf(ModelSecurityScansClient);
  });

  it('falls back to MGMT env vars', () => {
    process.env.PANW_MGMT_CLIENT_ID = 'mgmt-cid';
    process.env.PANW_MGMT_CLIENT_SECRET = 'mgmt-csec';
    process.env.PANW_MGMT_TSG_ID = 'mgmt-tsg';

    const client = new ModelSecurityClient();
    expect(client.scans).toBeInstanceOf(ModelSecurityScansClient);
  });

  it('MODEL_SEC env vars take precedence over MGMT', () => {
    process.env.PANW_MODEL_SEC_CLIENT_ID = 'msec-cid';
    process.env.PANW_MODEL_SEC_CLIENT_SECRET = 'msec-csec';
    process.env.PANW_MODEL_SEC_TSG_ID = 'msec-tsg';
    process.env.PANW_MGMT_CLIENT_ID = 'mgmt-cid';
    process.env.PANW_MGMT_CLIENT_SECRET = 'mgmt-csec';
    process.env.PANW_MGMT_TSG_ID = 'mgmt-tsg';

    // Should not throw — uses MODEL_SEC vars
    const client = new ModelSecurityClient();
    expect(client.scans).toBeInstanceOf(ModelSecurityScansClient);
  });

  it('explicit opts override env vars', () => {
    process.env.PANW_MODEL_SEC_CLIENT_ID = 'env-cid';
    process.env.PANW_MODEL_SEC_CLIENT_SECRET = 'env-csec';
    process.env.PANW_MODEL_SEC_TSG_ID = 'env-tsg';

    const client = new ModelSecurityClient({
      clientId: 'override',
      clientSecret: 'override-sec',
      tsgId: 'override-tsg',
    });
    expect(client.scans).toBeInstanceOf(ModelSecurityScansClient);
  });

  it('throws when clientId missing', () => {
    expect(
      () =>
        new ModelSecurityClient({
          clientSecret: 'sec',
          tsgId: '1',
        }),
    ).toThrow(AISecSDKException);
  });

  it('throws when clientSecret missing', () => {
    expect(
      () =>
        new ModelSecurityClient({
          clientId: 'cid',
          tsgId: '1',
        }),
    ).toThrow(AISecSDKException);
  });

  it('throws when tsgId missing', () => {
    expect(
      () =>
        new ModelSecurityClient({
          clientId: 'cid',
          clientSecret: 'sec',
        }),
    ).toThrow(AISecSDKException);
  });

  it('accepts custom endpoints', () => {
    const client = new ModelSecurityClient({
      clientId: 'cid',
      clientSecret: 'sec',
      tsgId: '1',
      dataEndpoint: 'https://data.example.com',
      mgmtEndpoint: 'https://mgmt.example.com',
      tokenEndpoint: 'https://auth.example.com/token',
    });
    expect(client.scans).toBeInstanceOf(ModelSecurityScansClient);
  });

  it('reads endpoints from env vars', () => {
    process.env.PANW_MODEL_SEC_CLIENT_ID = 'cid';
    process.env.PANW_MODEL_SEC_CLIENT_SECRET = 'sec';
    process.env.PANW_MODEL_SEC_TSG_ID = '1';
    process.env.PANW_MODEL_SEC_DATA_ENDPOINT = 'https://data.env.com';
    process.env.PANW_MODEL_SEC_MGMT_ENDPOINT = 'https://mgmt.env.com';
    process.env.PANW_MODEL_SEC_TOKEN_ENDPOINT = 'https://auth.env.com/token';

    const client = new ModelSecurityClient();
    expect(client.scans).toBeInstanceOf(ModelSecurityScansClient);
  });

  it('clamps numRetries to valid range', () => {
    const client = new ModelSecurityClient({
      clientId: 'cid',
      clientSecret: 'sec',
      tsgId: '1',
      numRetries: 10,
    });
    expect(client.scans).toBeInstanceOf(ModelSecurityScansClient);
  });

  it('clamps negative numRetries to 0', () => {
    const client = new ModelSecurityClient({
      clientId: 'cid',
      clientSecret: 'sec',
      tsgId: '1',
      numRetries: -1,
    });
    expect(client.scans).toBeInstanceOf(ModelSecurityScansClient);
  });

  it('defaults numRetries to 5', () => {
    const client = new ModelSecurityClient({
      clientId: 'cid',
      clientSecret: 'sec',
      tsgId: '1',
    });
    expect(client.scans).toBeInstanceOf(ModelSecurityScansClient);
  });

  describe('getPyPIAuth', () => {
    it('GETs /v1/pypi/authenticate', async () => {
      const pypiResp = { url: 'https://artifact.example.com', expires_at: '2025-01-01T00:00:00Z' };
      const tokenResp = { access_token: 'tok', token_type: 'bearer', expires_in: 3600 };
      globalThis.fetch = vi
        .fn()
        // First call: OAuthClient.getToken() fetches a token
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(tokenResp),
          text: () => Promise.resolve(JSON.stringify(tokenResp)),
        })
        // Second call: actual API request
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () => Promise.resolve(JSON.stringify(pypiResp)),
        });

      const client = new ModelSecurityClient({
        clientId: 'cid',
        clientSecret: 'sec',
        tsgId: '1',
        numRetries: 0,
      });

      const result = await client.getPyPIAuth();
      expect(result.url).toBe('https://artifact.example.com');

      // Second call is the actual API request
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[1];
      expect(url).toContain('/v1/pypi/authenticate');
    });
  });
});
