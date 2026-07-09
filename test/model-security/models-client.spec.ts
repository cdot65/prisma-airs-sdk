import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ModelSecurityModelsClient } from '../../src/model-security/models-client.js';
import type { AuthAdapter } from '../../src/http/types.js';
import { AISecSDKException } from '../../src/errors.js';

const validUuid = '550e8400-e29b-41d4-a716-446655440000';
const now = '2025-01-01T00:00:00Z';

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

function lastCall() {
  return (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
}

const sampleModel = {
  uuid: validUuid,
  tsg_id: '123',
  created_at: now,
  updated_at: now,
  name: 'org/model',
};

const sampleVersion = {
  uuid: validUuid,
  tsg_id: '123',
  created_at: now,
  updated_at: now,
  revision: 'main',
  model_uuid: validUuid,
};

const sampleFile = {
  uuid: validUuid,
  tsg_id: '123',
  created_at: now,
  updated_at: now,
  path: '/model.bin',
  parent_path: '/',
  type: 'FILE',
  result: 'SUCCESS',
  model_version_uuid: validUuid,
};

describe('ModelSecurityModelsClient', () => {
  const originalFetch = globalThis.fetch;
  let client: ModelSecurityModelsClient;

  beforeEach(() => {
    client = new ModelSecurityModelsClient({
      baseUrl: 'https://data.example.com',
      auth: passthroughAuth(),
      numRetries: 0,
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('listModels', () => {
    it('GETs /v1/models', async () => {
      mockFetch({ pagination: { total_items: 1 }, models: [sampleModel] });
      const result = await client.listModels();

      expect(result.models).toHaveLength(1);
      expect(result.models[0].name).toBe('org/model');
      const [url, init] = lastCall();
      expect(url).toBe('https://data.example.com/v1/models');
      expect(init.method).toBe('GET');
    });

    it('serializes pagination, search_query, sort, and repeated array filters', async () => {
      mockFetch({ pagination: { total_items: 0 }, models: [] });
      await client.listModels({
        limit: 10,
        skip: 5,
        search_query: 'llama',
        sort_field: 'created_at',
        sort_order: 'asc',
        latest_version_outcomes: ['PASSED', 'FAILED'],
        latest_version_source_types: ['HUGGING_FACE'],
        start_time: '2025-01-01T00:00:00Z',
      });

      const [url] = lastCall();
      const params = new URL(url).searchParams;
      expect(params.get('limit')).toBe('10');
      expect(params.get('skip')).toBe('5');
      expect(params.get('search_query')).toBe('llama');
      expect(params.get('sort_field')).toBe('created_at');
      expect(params.get('sort_order')).toBe('asc');
      expect(params.getAll('latest_version_outcomes')).toEqual(['PASSED', 'FAILED']);
      expect(params.get('latest_version_source_types')).toBe('HUGGING_FACE');
      expect(params.get('start_time')).toBe('2025-01-01T00:00:00Z');
    });
  });

  describe('getModel', () => {
    it('GETs /v1/models/{uuid}', async () => {
      mockFetch(sampleModel);
      const result = await client.getModel(validUuid);

      expect(result.uuid).toBe(validUuid);
      const [url] = lastCall();
      expect(url).toBe(`https://data.example.com/v1/models/${validUuid}`);
    });

    it('rejects invalid UUID', async () => {
      await expect(client.getModel('bad')).rejects.toThrow(AISecSDKException);
    });
  });

  describe('listModelVersions', () => {
    it('GETs /v1/models/{uuid}/model-versions', async () => {
      mockFetch({ pagination: { total_items: 1 }, model_versions: [sampleVersion] });
      const result = await client.listModelVersions(validUuid, { sort_order: 'desc', limit: 5 });

      expect(result.model_versions).toHaveLength(1);
      const [url] = lastCall();
      expect(url).toContain(`/v1/models/${validUuid}/model-versions`);
      expect(url).toContain('sort_order=desc');
      expect(url).toContain('limit=5');
    });

    it('rejects invalid UUID', async () => {
      await expect(client.listModelVersions('bad')).rejects.toThrow(AISecSDKException);
    });
  });

  describe('getModelVersion', () => {
    it('GETs /v1/model-versions/{uuid}', async () => {
      mockFetch(sampleVersion);
      const result = await client.getModelVersion(validUuid);

      expect(result.revision).toBe('main');
      const [url] = lastCall();
      expect(url).toBe(`https://data.example.com/v1/model-versions/${validUuid}`);
    });

    it('rejects invalid UUID', async () => {
      await expect(client.getModelVersion('bad')).rejects.toThrow(AISecSDKException);
    });
  });

  describe('listModelVersionFiles', () => {
    it('GETs /v1/model-versions/{uuid}/files', async () => {
      mockFetch({ pagination: { total_items: 1 }, files: [sampleFile] });
      const result = await client.listModelVersionFiles(validUuid, { limit: 20 });

      expect(result.files).toHaveLength(1);
      expect(result.files[0].path).toBe('/model.bin');
      const [url] = lastCall();
      expect(url).toContain(`/v1/model-versions/${validUuid}/files`);
      expect(url).toContain('limit=20');
    });

    it('rejects invalid UUID', async () => {
      await expect(client.listModelVersionFiles('bad')).rejects.toThrow(AISecSDKException);
    });
  });
});
