import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ModelSecurityScansClient } from '../../src/model-security/scans-client.js';
import { OAuthClient } from '../../src/management/oauth-client.js';
import { AISecSDKException } from '../../src/errors.js';

const validUuid = '550e8400-e29b-41d4-a716-446655440000';
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

const baseScan = {
  uuid: validUuid,
  tsg_id: '123',
  created_at: now,
  updated_at: now,
  model_uri: 'hf://org/model',
  owner: 'user@test.com',
  scan_origin: 'MODEL_SECURITY_SDK',
  security_group_uuid: validUuid,
  security_group_name: 'default',
  model_version_uuid: validUuid,
  eval_outcome: 'ALLOWED',
  source_type: 'HUGGING_FACE',
};

describe('ModelSecurityScansClient', () => {
  const originalFetch = globalThis.fetch;
  let client: ModelSecurityScansClient;

  beforeEach(() => {
    client = new ModelSecurityScansClient({
      baseUrl: 'https://data.example.com',
      oauthClient: createMockOAuth(),
      numRetries: 0,
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  // -----------------------------------------------------------------------
  // create
  // -----------------------------------------------------------------------
  describe('create', () => {
    it('POSTs to /v1/scans', async () => {
      mockFetch(baseScan, 201);
      const result = await client.create({
        model_uri: 'hf://org/model',
        security_group_uuid: validUuid,
        scan_origin: 'MODEL_SECURITY_SDK',
      });

      expect(result.uuid).toBe(validUuid);
      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toBe('https://data.example.com/v1/scans');
      expect(init.method).toBe('POST');
    });
  });

  // -----------------------------------------------------------------------
  // list
  // -----------------------------------------------------------------------
  describe('list', () => {
    it('GETs /v1/scans', async () => {
      mockFetch({ pagination: { total_items: 1 }, scans: [baseScan] });
      const result = await client.list();

      expect(result.scans).toHaveLength(1);
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('/v1/scans');
    });

    it('passes pagination params', async () => {
      mockFetch({ pagination: { total_items: 0 }, scans: [] });
      await client.list({ skip: 10, limit: 5 });

      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('skip=10');
      expect(url).toContain('limit=5');
    });

    it('passes filter params', async () => {
      mockFetch({ pagination: { total_items: 0 }, scans: [] });
      await client.list({
        eval_outcome: 'ALLOWED',
        source_type: 'HUGGING_FACE',
        scan_origin: 'MODEL_SECURITY_SDK',
      });

      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('eval_outcome=ALLOWED');
      expect(url).toContain('source_type=HUGGING_FACE');
      expect(url).toContain('scan_origin=MODEL_SECURITY_SDK');
    });

    it('passes sort params', async () => {
      mockFetch({ pagination: { total_items: 0 }, scans: [] });
      await client.list({ sort_by: 'created_at', sort_direction: 'desc' });

      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('sort_by=created_at');
      expect(url).toContain('sort_direction=desc');
    });

    it('passes search param', async () => {
      mockFetch({ pagination: { total_items: 0 }, scans: [] });
      await client.list({ search: 'model-name' });

      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('search=model-name');
    });
  });

  // -----------------------------------------------------------------------
  // get
  // -----------------------------------------------------------------------
  describe('get', () => {
    it('GETs /v1/scans/:uuid', async () => {
      mockFetch(baseScan);
      const result = await client.get(validUuid);

      expect(result.uuid).toBe(validUuid);
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain(`/v1/scans/${validUuid}`);
    });

    it('rejects invalid UUID', async () => {
      await expect(client.get('bad-uuid')).rejects.toThrow(AISecSDKException);
    });
  });

  // -----------------------------------------------------------------------
  // getEvaluations
  // -----------------------------------------------------------------------
  describe('getEvaluations', () => {
    it('GETs /v1/scans/:uuid/evaluations', async () => {
      mockFetch({ pagination: { total_items: 0 }, evaluations: [] });
      const result = await client.getEvaluations(validUuid);

      expect(result.evaluations).toHaveLength(0);
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain(`/v1/scans/${validUuid}/evaluations`);
    });

    it('passes pagination params', async () => {
      mockFetch({ pagination: { total_items: 0 }, evaluations: [] });
      await client.getEvaluations(validUuid, { skip: 0, limit: 10 });

      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('limit=10');
    });

    it('rejects invalid UUID', async () => {
      await expect(client.getEvaluations('bad')).rejects.toThrow(AISecSDKException);
    });
  });

  // -----------------------------------------------------------------------
  // getFiles
  // -----------------------------------------------------------------------
  describe('getFiles', () => {
    it('GETs /v1/scans/:uuid/files', async () => {
      mockFetch({ pagination: { total_items: 0 }, files: [] });
      const result = await client.getFiles(validUuid);

      expect(result.files).toHaveLength(0);
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain(`/v1/scans/${validUuid}/files`);
    });

    it('passes file filter params', async () => {
      mockFetch({ pagination: { total_items: 0 }, files: [] });
      await client.getFiles(validUuid, { type: 'FILE', result: 'SUCCESS' });

      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('type=FILE');
      expect(url).toContain('result=SUCCESS');
    });

    it('rejects invalid UUID', async () => {
      await expect(client.getFiles('bad')).rejects.toThrow(AISecSDKException);
    });
  });

  // -----------------------------------------------------------------------
  // addLabels
  // -----------------------------------------------------------------------
  describe('addLabels', () => {
    it('POSTs to /v1/scans/:uuid/labels', async () => {
      mockFetch({});
      await client.addLabels(validUuid, { labels: [{ key: 'env', value: 'prod' }] });

      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain(`/v1/scans/${validUuid}/labels`);
      expect(init.method).toBe('POST');
    });

    it('rejects invalid UUID', async () => {
      await expect(client.addLabels('bad', { labels: [{ key: 'a', value: 'b' }] })).rejects.toThrow(
        AISecSDKException,
      );
    });
  });

  // -----------------------------------------------------------------------
  // setLabels
  // -----------------------------------------------------------------------
  describe('setLabels', () => {
    it('PUTs to /v1/scans/:uuid/labels', async () => {
      mockFetch({});
      await client.setLabels(validUuid, { labels: [{ key: 'env', value: 'staging' }] });

      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain(`/v1/scans/${validUuid}/labels`);
      expect(init.method).toBe('PUT');
    });

    it('rejects invalid UUID', async () => {
      await expect(client.setLabels('bad', { labels: [{ key: 'a', value: 'b' }] })).rejects.toThrow(
        AISecSDKException,
      );
    });
  });

  // -----------------------------------------------------------------------
  // deleteLabels
  // -----------------------------------------------------------------------
  describe('deleteLabels', () => {
    it('DELETEs /v1/scans/:uuid/labels with keys query params', async () => {
      mockFetch(undefined);
      await client.deleteLabels(validUuid, ['env', 'team']);

      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain(`/v1/scans/${validUuid}/labels`);
      expect(url).toContain('keys=env');
      expect(url).toContain('keys=team');
      expect(init.method).toBe('DELETE');
    });

    it('handles empty keys array', async () => {
      mockFetch(undefined);
      await client.deleteLabels(validUuid, []);

      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain(`/v1/scans/${validUuid}/labels`);
    });

    it('rejects invalid UUID', async () => {
      await expect(client.deleteLabels('bad', ['env'])).rejects.toThrow(AISecSDKException);
    });
  });

  // -----------------------------------------------------------------------
  // getViolations
  // -----------------------------------------------------------------------
  describe('getViolations', () => {
    it('GETs /v1/scans/:uuid/rule-violations', async () => {
      mockFetch({ pagination: { total_items: 0 }, violations: [] });
      const result = await client.getViolations(validUuid);

      expect(result.violations).toHaveLength(0);
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain(`/v1/scans/${validUuid}/rule-violations`);
    });

    it('rejects invalid UUID', async () => {
      await expect(client.getViolations('bad')).rejects.toThrow(AISecSDKException);
    });
  });

  // -----------------------------------------------------------------------
  // getLabelKeys
  // -----------------------------------------------------------------------
  describe('getLabelKeys', () => {
    it('GETs /v1/scans/label-keys', async () => {
      mockFetch({ pagination: { total_items: 2 }, keys: ['env', 'team'] });
      const result = await client.getLabelKeys();

      expect(result.keys).toEqual(['env', 'team']);
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('/v1/scans/label-keys');
    });

    it('passes pagination params', async () => {
      mockFetch({ pagination: { total_items: 0 }, keys: [] });
      await client.getLabelKeys({ limit: 50 });

      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('limit=50');
    });
  });

  // -----------------------------------------------------------------------
  // getLabelValues
  // -----------------------------------------------------------------------
  describe('getLabelValues', () => {
    it('GETs /v1/scans/label-keys/:key/values', async () => {
      mockFetch({ pagination: { total_items: 1 }, values: ['prod'] });
      const result = await client.getLabelValues('env');

      expect(result.values).toEqual(['prod']);
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('/v1/scans/label-keys/env/values');
    });

    it('encodes special characters in key', async () => {
      mockFetch({ pagination: { total_items: 0 }, values: [] });
      await client.getLabelValues('my key');

      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('/v1/scans/label-keys/my%20key/values');
    });
  });

  // -----------------------------------------------------------------------
  // getEvaluation
  // -----------------------------------------------------------------------
  describe('getEvaluation', () => {
    it('GETs /v1/evaluations/:uuid', async () => {
      const evalResp = {
        uuid: validUuid,
        tsg_id: '123',
        created_at: now,
        updated_at: now,
        result: 'PASSED',
        violation_count: 0,
        rule_instance_uuid: validUuid,
        scan_uuid: validUuid,
        rule_name: 'rule-1',
        rule_description: 'desc',
        rule_instance_state: 'BLOCKING',
      };
      mockFetch(evalResp);
      const result = await client.getEvaluation(validUuid);

      expect(result.result).toBe('PASSED');
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain(`/v1/evaluations/${validUuid}`);
    });

    it('rejects invalid UUID', async () => {
      await expect(client.getEvaluation('bad')).rejects.toThrow(AISecSDKException);
    });
  });

  // -----------------------------------------------------------------------
  // getViolation
  // -----------------------------------------------------------------------
  describe('getViolation', () => {
    it('GETs /v1/violations/:uuid', async () => {
      const violation = {
        uuid: validUuid,
        tsg_id: '123',
        created_at: now,
        updated_at: now,
        description: 'Malicious op',
        rule_instance_uuid: validUuid,
        rule_name: 'r',
        rule_description: 'rd',
        rule_instance_state: 'BLOCKING',
      };
      mockFetch(violation);
      const result = await client.getViolation(validUuid);

      expect(result.description).toBe('Malicious op');
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain(`/v1/violations/${validUuid}`);
    });

    it('rejects invalid UUID', async () => {
      await expect(client.getViolation('bad')).rejects.toThrow(AISecSDKException);
    });
  });
});
