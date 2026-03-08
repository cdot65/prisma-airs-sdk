import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ModelSecurityRulesClient } from '../../src/model-security/security-rules-client.js';
import { OAuthClient } from '../../src/management/oauth-client.js';
import { AISecSDKException } from '../../src/errors.js';

const validUuid = '550e8400-e29b-41d4-a716-446655440000';

function createMockOAuth(): OAuthClient {
  return {
    getToken: vi.fn().mockResolvedValue('tok'),
    clearToken: vi.fn(),
  } as unknown as OAuthClient;
}

function mockFetch(data: unknown, status = 200) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(data)),
  });
}

const sampleRule = {
  uuid: validUuid,
  name: 'rule-1',
  description: 'Test rule',
  rule_type: 'ARTIFACT',
  compatible_sources: ['HUGGING_FACE'],
  default_state: 'BLOCKING',
  remediation: { description: 'Fix', steps: ['s1'], url: 'https://example.com' },
  editable_fields: [],
  constant_values: {},
  default_values: {},
};

describe('ModelSecurityRulesClient', () => {
  const originalFetch = globalThis.fetch;
  let client: ModelSecurityRulesClient;

  beforeEach(() => {
    client = new ModelSecurityRulesClient({
      baseUrl: 'https://mgmt.example.com',
      oauthClient: createMockOAuth(),
      numRetries: 0,
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('list', () => {
    it('GETs /v1/security-rules', async () => {
      mockFetch({ pagination: { total_items: 1 }, rules: [sampleRule] });
      const result = await client.list();

      expect(result.rules).toHaveLength(1);
      expect(result.rules[0].name).toBe('rule-1');
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toBe('https://mgmt.example.com/v1/security-rules');
    });

    it('passes pagination params', async () => {
      mockFetch({ pagination: { total_items: 0 }, rules: [] });
      await client.list({ skip: 0, limit: 25 });

      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('limit=25');
    });

    it('sends search_query param per spec', async () => {
      mockFetch({ pagination: { total_items: 0 }, rules: [] });
      await client.list({ search_query: 'pickle' });

      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('search_query=pickle');
      expect(url).not.toContain('search=pickle');
    });

    it('sends source_type filter', async () => {
      mockFetch({ pagination: { total_items: 0 }, rules: [] });
      await client.list({ source_type: 'HUGGING_FACE' });

      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('source_type=HUGGING_FACE');
    });

    it('does not send sort params (not in spec)', async () => {
      mockFetch({ pagination: { total_items: 0 }, rules: [] });
      await client.list({ skip: 0, limit: 10 });

      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).not.toContain('sort_by');
      expect(url).not.toContain('sort_field');
      expect(url).not.toContain('sort_direction');
      expect(url).not.toContain('sort_dir');
    });
  });

  describe('get', () => {
    it('GETs /v1/security-rules/:uuid', async () => {
      mockFetch(sampleRule);
      const result = await client.get(validUuid);

      expect(result.name).toBe('rule-1');
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain(`/v1/security-rules/${validUuid}`);
    });

    it('rejects invalid UUID', async () => {
      await expect(client.get('bad')).rejects.toThrow(AISecSDKException);
    });
  });
});
