import { describe, it, expect, afterEach } from 'vitest';
import { ManagementClient } from '../../src/management/client.js';
import { ProfilesClient } from '../../src/management/profiles.js';
import { TopicsClient } from '../../src/management/topics.js';
import { AISecSDKException } from '../../src/errors.js';

describe('ManagementClient', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('constructs with explicit options', () => {
    const client = new ManagementClient({
      clientId: 'cid',
      clientSecret: 'csec',
      tsgId: '999',
    });

    expect(client.profiles).toBeInstanceOf(ProfilesClient);
    expect(client.topics).toBeInstanceOf(TopicsClient);
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
});
