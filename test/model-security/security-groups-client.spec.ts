import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ModelSecurityGroupsClient } from '../../src/model-security/security-groups-client.js';
import { OAuthClient } from '../../src/management/oauth-client.js';
import { AISecSDKException } from '../../src/errors.js';

const validUuid = '550e8400-e29b-41d4-a716-446655440000';
const validUuid2 = '660e8400-e29b-41d4-a716-446655440000';
const now = '2025-01-01T00:00:00Z';

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

const sampleGroup = {
  uuid: validUuid,
  tsg_id: '123',
  created_at: now,
  updated_at: now,
  name: 'default',
  description: '',
  source_type: 'HUGGING_FACE',
  state: 'ACTIVE',
  is_tombstone: false,
};

const baseRule = {
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

const sampleRuleInstance = {
  uuid: validUuid2,
  tsg_id: '123',
  created_at: now,
  updated_at: now,
  security_group_uuid: validUuid,
  security_rule_uuid: validUuid,
  state: 'BLOCKING',
  rule: baseRule,
};

describe('ModelSecurityGroupsClient', () => {
  const originalFetch = globalThis.fetch;
  let client: ModelSecurityGroupsClient;

  beforeEach(() => {
    client = new ModelSecurityGroupsClient({
      baseUrl: 'https://mgmt.example.com',
      oauthClient: createMockOAuth(),
      numRetries: 0,
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('create', () => {
    it('POSTs to /v1/security-groups', async () => {
      mockFetch(sampleGroup, 201);
      const result = await client.create({ name: 'default', source_type: 'HUGGING_FACE' });

      expect(result.name).toBe('default');
      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toBe('https://mgmt.example.com/v1/security-groups');
      expect(init.method).toBe('POST');
    });
  });

  describe('list', () => {
    it('GETs /v1/security-groups', async () => {
      mockFetch({ pagination: { total_items: 1 }, security_groups: [sampleGroup] });
      const result = await client.list();

      expect(result.security_groups).toHaveLength(1);
    });

    it('passes pagination params', async () => {
      mockFetch({ pagination: { total_items: 0 }, security_groups: [] });
      await client.list({ skip: 5, limit: 10 });

      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('skip=5');
      expect(url).toContain('limit=10');
    });

    it('sends sort_field and sort_dir params per spec', async () => {
      mockFetch({ pagination: { total_items: 0 }, security_groups: [] });
      await client.list({ sort_field: 'created_at', sort_dir: 'desc' });

      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('sort_field=created_at');
      expect(url).toContain('sort_dir=desc');
      expect(url).not.toContain('sort_by');
      expect(url).not.toContain('sort_direction');
    });

    it('sends search_query param per spec', async () => {
      mockFetch({ pagination: { total_items: 0 }, security_groups: [] });
      await client.list({ search_query: 'production' });

      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('search_query=production');
      expect(url).not.toContain('search=production');
    });

    it('sends source_types as repeated query params', async () => {
      mockFetch({ pagination: { total_items: 0 }, security_groups: [] });
      await client.list({ source_types: ['LOCAL', 'HUGGING_FACE'] });

      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('source_types=LOCAL');
      expect(url).toContain('source_types=HUGGING_FACE');
    });

    it('sends enabled_rules as repeated query params', async () => {
      mockFetch({ pagination: { total_items: 0 }, security_groups: [] });
      await client.list({ enabled_rules: [validUuid, validUuid2] });

      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain(`enabled_rules=${encodeURIComponent(validUuid)}`);
      expect(url).toContain(`enabled_rules=${encodeURIComponent(validUuid2)}`);
    });
  });

  describe('get', () => {
    it('GETs /v1/security-groups/:uuid', async () => {
      mockFetch(sampleGroup);
      const result = await client.get(validUuid);

      expect(result.uuid).toBe(validUuid);
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain(`/v1/security-groups/${validUuid}`);
    });

    it('rejects invalid UUID', async () => {
      await expect(client.get('bad')).rejects.toThrow(AISecSDKException);
    });
  });

  describe('update', () => {
    it('PUTs to /v1/security-groups/:uuid', async () => {
      mockFetch({ ...sampleGroup, name: 'updated' });
      const result = await client.update(validUuid, { name: 'updated' });

      expect(result.name).toBe('updated');
      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain(`/v1/security-groups/${validUuid}`);
      expect(init.method).toBe('PUT');
    });

    it('rejects invalid UUID', async () => {
      await expect(client.update('bad', { name: 'x' })).rejects.toThrow(AISecSDKException);
    });
  });

  describe('delete', () => {
    it('DELETEs /v1/security-groups/:uuid', async () => {
      mockFetch(undefined);
      await client.delete(validUuid);

      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain(`/v1/security-groups/${validUuid}`);
      expect(init.method).toBe('DELETE');
    });

    it('rejects invalid UUID', async () => {
      await expect(client.delete('bad')).rejects.toThrow(AISecSDKException);
    });
  });

  describe('listRuleInstances', () => {
    it('GETs /v1/security-groups/:uuid/rule-instances', async () => {
      mockFetch({ pagination: { total_items: 1 }, rule_instances: [sampleRuleInstance] });
      const result = await client.listRuleInstances(validUuid);

      expect(result.rule_instances).toHaveLength(1);
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain(`/v1/security-groups/${validUuid}/rule-instances`);
    });

    it('passes pagination params', async () => {
      mockFetch({ pagination: { total_items: 0 }, rule_instances: [] });
      await client.listRuleInstances(validUuid, { limit: 20 });

      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('limit=20');
    });

    it('sends security_rule_uuid filter', async () => {
      mockFetch({ pagination: { total_items: 0 }, rule_instances: [] });
      await client.listRuleInstances(validUuid, { security_rule_uuid: validUuid2 });

      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain(`security_rule_uuid=${encodeURIComponent(validUuid2)}`);
    });

    it('sends state filter', async () => {
      mockFetch({ pagination: { total_items: 0 }, rule_instances: [] });
      await client.listRuleInstances(validUuid, { state: 'BLOCKING' });

      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('state=BLOCKING');
    });

    it('does not send sort or search params', async () => {
      mockFetch({ pagination: { total_items: 0 }, rule_instances: [] });
      await client.listRuleInstances(validUuid, { skip: 0, limit: 10 });

      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).not.toContain('sort_by');
      expect(url).not.toContain('sort_field');
      expect(url).not.toContain('sort_direction');
      expect(url).not.toContain('sort_dir');
      expect(url).not.toContain('search');
    });

    it('rejects invalid UUID', async () => {
      await expect(client.listRuleInstances('bad')).rejects.toThrow(AISecSDKException);
    });
  });

  describe('getRuleInstance', () => {
    it('GETs /v1/security-groups/:sgUuid/rule-instances/:riUuid', async () => {
      mockFetch(sampleRuleInstance);
      const result = await client.getRuleInstance(validUuid, validUuid2);

      expect(result.state).toBe('BLOCKING');
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain(`/v1/security-groups/${validUuid}/rule-instances/${validUuid2}`);
    });

    it('rejects invalid security group UUID', async () => {
      await expect(client.getRuleInstance('bad', validUuid2)).rejects.toThrow(AISecSDKException);
    });

    it('rejects invalid rule instance UUID', async () => {
      await expect(client.getRuleInstance(validUuid, 'bad')).rejects.toThrow(AISecSDKException);
    });
  });

  describe('updateRuleInstance', () => {
    it('PUTs to /v1/security-groups/:sgUuid/rule-instances/:riUuid', async () => {
      mockFetch({ ...sampleRuleInstance, state: 'ALLOWING' });
      const result = await client.updateRuleInstance(validUuid, validUuid2, {
        security_group_uuid: validUuid,
        state: 'ALLOWING',
      });

      expect(result.state).toBe('ALLOWING');
      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain(`/v1/security-groups/${validUuid}/rule-instances/${validUuid2}`);
      expect(init.method).toBe('PUT');
    });

    it('rejects invalid security group UUID', async () => {
      await expect(
        client.updateRuleInstance('bad', validUuid2, {
          security_group_uuid: validUuid,
        }),
      ).rejects.toThrow(AISecSDKException);
    });

    it('rejects invalid rule instance UUID', async () => {
      await expect(
        client.updateRuleInstance(validUuid, 'bad', {
          security_group_uuid: validUuid,
        }),
      ).rejects.toThrow(AISecSDKException);
    });
  });
});
