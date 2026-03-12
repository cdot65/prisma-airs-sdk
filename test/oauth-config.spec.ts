import { describe, it, expect, afterEach } from 'vitest';
import { resolveOAuthConfig } from '../src/oauth-config.js';
import { OAuthClient } from '../src/management/oauth-client.js';
import { AISecSDKException } from '../src/errors.js';
import { MAX_NUMBER_OF_RETRIES } from '../src/constants.js';

describe('resolveOAuthConfig', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('returns config when all opts provided', () => {
    const cfg = resolveOAuthConfig({
      clientId: 'cid',
      clientSecret: 'csec',
      tsgId: 'tsg1',
      baseUrl: 'https://api.example.com',
      primaryEnvPrefix: 'PANW_TEST',
    });

    expect(cfg.oauthClient).toBeInstanceOf(OAuthClient);
    expect(cfg.baseUrl).toBe('https://api.example.com');
    expect(cfg.numRetries).toBe(MAX_NUMBER_OF_RETRIES);
    expect(cfg.tsgId).toBe('tsg1');
  });

  it('falls back to primary env prefix when opts missing', () => {
    process.env.PANW_TEST_CLIENT_ID = 'env-cid';
    process.env.PANW_TEST_CLIENT_SECRET = 'env-csec';
    process.env.PANW_TEST_TSG_ID = 'env-tsg';

    const cfg = resolveOAuthConfig({
      baseUrl: 'https://api.example.com',
      primaryEnvPrefix: 'PANW_TEST',
    });

    expect(cfg.oauthClient).toBeInstanceOf(OAuthClient);
    expect(cfg.baseUrl).toBe('https://api.example.com');
  });

  it('falls back to secondary env prefix when primary also missing', () => {
    process.env.PANW_MGMT_CLIENT_ID = 'mgmt-cid';
    process.env.PANW_MGMT_CLIENT_SECRET = 'mgmt-csec';
    process.env.PANW_MGMT_TSG_ID = 'mgmt-tsg';

    const cfg = resolveOAuthConfig({
      baseUrl: 'https://api.example.com',
      primaryEnvPrefix: 'PANW_TEST',
      fallbackEnvPrefix: 'PANW_MGMT',
    });

    expect(cfg.oauthClient).toBeInstanceOf(OAuthClient);
  });

  it('throws MISSING_VARIABLE when clientId not available', () => {
    expect(() =>
      resolveOAuthConfig({
        clientSecret: 'sec',
        tsgId: 'tsg',
        baseUrl: 'https://api.example.com',
        primaryEnvPrefix: 'PANW_TEST',
      }),
    ).toThrow(AISecSDKException);
  });

  it('throws MISSING_VARIABLE when clientSecret not available', () => {
    expect(() =>
      resolveOAuthConfig({
        clientId: 'cid',
        tsgId: 'tsg',
        baseUrl: 'https://api.example.com',
        primaryEnvPrefix: 'PANW_TEST',
      }),
    ).toThrow(AISecSDKException);
  });

  it('throws MISSING_VARIABLE when tsgId not available', () => {
    expect(() =>
      resolveOAuthConfig({
        clientId: 'cid',
        clientSecret: 'sec',
        baseUrl: 'https://api.example.com',
        primaryEnvPrefix: 'PANW_TEST',
      }),
    ).toThrow(AISecSDKException);
  });

  it('clamps numRetries to [0, MAX_NUMBER_OF_RETRIES]', () => {
    const cfgHigh = resolveOAuthConfig({
      clientId: 'cid',
      clientSecret: 'sec',
      tsgId: 'tsg',
      baseUrl: 'https://api.example.com',
      primaryEnvPrefix: 'PANW_TEST',
      numRetries: 100,
    });
    expect(cfgHigh.numRetries).toBe(MAX_NUMBER_OF_RETRIES);

    const cfgLow = resolveOAuthConfig({
      clientId: 'cid',
      clientSecret: 'sec',
      tsgId: 'tsg',
      baseUrl: 'https://api.example.com',
      primaryEnvPrefix: 'PANW_TEST',
      numRetries: -5,
    });
    expect(cfgLow.numRetries).toBe(0);
  });

  it('defaults numRetries to MAX_NUMBER_OF_RETRIES when not provided', () => {
    const cfg = resolveOAuthConfig({
      clientId: 'cid',
      clientSecret: 'sec',
      tsgId: 'tsg',
      baseUrl: 'https://api.example.com',
      primaryEnvPrefix: 'PANW_TEST',
    });
    expect(cfg.numRetries).toBe(MAX_NUMBER_OF_RETRIES);
  });

  it('creates OAuthClient with custom tokenEndpoint', () => {
    const cfg = resolveOAuthConfig({
      clientId: 'cid',
      clientSecret: 'sec',
      tsgId: 'tsg',
      baseUrl: 'https://api.example.com',
      primaryEnvPrefix: 'PANW_TEST',
      tokenEndpoint: 'https://custom.auth.com/token',
    });
    expect(cfg.oauthClient.tokenEndpoint).toBe('https://custom.auth.com/token');
  });

  it('falls back tokenEndpoint to primary then fallback env prefix', () => {
    process.env.PANW_MGMT_TOKEN_ENDPOINT = 'https://mgmt.auth.com/token';

    const cfg = resolveOAuthConfig({
      clientId: 'cid',
      clientSecret: 'sec',
      tsgId: 'tsg',
      baseUrl: 'https://api.example.com',
      primaryEnvPrefix: 'PANW_TEST',
      fallbackEnvPrefix: 'PANW_MGMT',
    });
    expect(cfg.oauthClient.tokenEndpoint).toBe('https://mgmt.auth.com/token');
  });

  it('passes onTokenRefresh callback through', () => {
    const callback = () => {};
    const cfg = resolveOAuthConfig({
      clientId: 'cid',
      clientSecret: 'sec',
      tsgId: 'tsg',
      baseUrl: 'https://api.example.com',
      primaryEnvPrefix: 'PANW_TEST',
      onTokenRefresh: callback,
    });
    expect(cfg.oauthClient).toBeInstanceOf(OAuthClient);
  });

  it('passes tokenBufferMs through to OAuthClient', () => {
    const cfg = resolveOAuthConfig({
      clientId: 'cid',
      clientSecret: 'sec',
      tsgId: 'tsg',
      baseUrl: 'https://api.example.com',
      primaryEnvPrefix: 'PANW_TEST',
      tokenBufferMs: 60000,
    });
    expect(cfg.oauthClient).toBeInstanceOf(OAuthClient);
  });

  it('includes error message with both prefixes when fallback provided', () => {
    expect(() =>
      resolveOAuthConfig({
        clientSecret: 'sec',
        tsgId: 'tsg',
        baseUrl: 'https://api.example.com',
        primaryEnvPrefix: 'PANW_RED_TEAM',
        fallbackEnvPrefix: 'PANW_MGMT',
      }),
    ).toThrow(/PANW_RED_TEAM_CLIENT_ID.*PANW_MGMT_CLIENT_ID/);
  });

  it('includes error message with single prefix when no fallback', () => {
    expect(() =>
      resolveOAuthConfig({
        clientSecret: 'sec',
        tsgId: 'tsg',
        baseUrl: 'https://api.example.com',
        primaryEnvPrefix: 'PANW_MGMT',
      }),
    ).toThrow(/PANW_MGMT_CLIENT_ID/);
  });
});
