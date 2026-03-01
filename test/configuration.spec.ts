import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { globalConfiguration, init } from '../src/configuration.js';
import { AISecSDKException } from '../src/errors.js';
import { DEFAULT_ENDPOINT, MAX_NUMBER_OF_RETRIES } from '../src/constants.js';

describe('Configuration', () => {
  beforeEach(() => {
    globalConfiguration.reset();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    globalConfiguration.reset();
    vi.unstubAllEnvs();
  });

  it('throws if no credentials provided', () => {
    expect(() => init()).toThrow(AISecSDKException);
  });

  it('initializes with apiKey', () => {
    init({ apiKey: 'test-key' });
    expect(globalConfiguration.apiKey).toBe('test-key');
    expect(globalConfiguration.apiToken).toBeUndefined();
    expect(globalConfiguration.initialized).toBe(true);
  });

  it('initializes with apiToken', () => {
    init({ apiToken: 'test-token' });
    expect(globalConfiguration.apiToken).toBe('test-token');
    expect(globalConfiguration.initialized).toBe(true);
  });

  it('reads apiKey from env', () => {
    vi.stubEnv('PANW_AI_SEC_API_KEY', 'env-key');
    init();
    expect(globalConfiguration.apiKey).toBe('env-key');
  });

  it('reads apiToken from env', () => {
    vi.stubEnv('PANW_AI_SEC_API_TOKEN', 'env-token');
    init();
    expect(globalConfiguration.apiToken).toBe('env-token');
  });

  it('uses custom endpoint', () => {
    init({ apiKey: 'k', apiEndpoint: 'https://custom.example.com/' });
    expect(globalConfiguration.apiEndpoint).toBe('https://custom.example.com');
  });

  it('reads endpoint from env', () => {
    vi.stubEnv('PANW_AI_SEC_API_ENDPOINT', 'https://env.example.com');
    init({ apiKey: 'k' });
    expect(globalConfiguration.apiEndpoint).toBe('https://env.example.com');
  });

  it('uses default endpoint', () => {
    init({ apiKey: 'k' });
    expect(globalConfiguration.apiEndpoint).toBe(DEFAULT_ENDPOINT);
  });

  it('sets numRetries', () => {
    init({ apiKey: 'k', numRetries: 2 });
    expect(globalConfiguration.numRetries).toBe(2);
  });

  it('throws for invalid numRetries', () => {
    expect(() => init({ apiKey: 'k', numRetries: 10 })).toThrow(AISecSDKException);
    expect(() => init({ apiKey: 'k', numRetries: -1 })).toThrow(AISecSDKException);
  });

  it('defaults numRetries to MAX_NUMBER_OF_RETRIES', () => {
    init({ apiKey: 'k' });
    expect(globalConfiguration.numRetries).toBe(MAX_NUMBER_OF_RETRIES);
  });

  it('throws for oversized apiKey', () => {
    expect(() => init({ apiKey: 'x'.repeat(3000) })).toThrow(AISecSDKException);
  });

  it('throws for oversized apiToken', () => {
    expect(() => init({ apiToken: 'x'.repeat(3000) })).toThrow(AISecSDKException);
  });

  it('reset restores defaults', () => {
    init({ apiKey: 'k', numRetries: 1 });
    globalConfiguration.reset();
    expect(globalConfiguration.initialized).toBe(false);
    expect(globalConfiguration.apiKey).toBeUndefined();
    expect(globalConfiguration.numRetries).toBe(MAX_NUMBER_OF_RETRIES);
  });
});
