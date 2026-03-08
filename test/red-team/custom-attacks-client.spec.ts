import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RedTeamCustomAttacksClient } from '../../src/red-team/custom-attacks-client.js';
import { OAuthClient } from '../../src/management/oauth-client.js';
import { AISecSDKException } from '../../src/errors.js';

const validUuid = '550e8400-e29b-41d4-a716-446655440000';
const validUuid2 = '660e8400-e29b-41d4-a716-446655440000';

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

describe('RedTeamCustomAttacksClient', () => {
  const originalFetch = globalThis.fetch;
  let client: RedTeamCustomAttacksClient;

  beforeEach(() => {
    client = new RedTeamCustomAttacksClient({
      baseUrl: 'https://mgmt.example.com',
      oauthClient: createMockOAuth(),
      numRetries: 0,
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  // -----------------------------------------------------------------------
  // Prompt Set operations
  // -----------------------------------------------------------------------

  describe('createPromptSet', () => {
    it('POSTs to /v1/custom-attack/custom-prompt-set', async () => {
      const ps = { id: validUuid, name: 'test-set' };
      mockFetch(ps, 201);
      const result = await client.createPromptSet({ name: 'test-set' });

      expect(result.id).toBe(validUuid);
      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toBe('https://mgmt.example.com/v1/custom-attack/custom-prompt-set');
      expect(init.method).toBe('POST');
    });
  });

  describe('listPromptSets', () => {
    it('GETs /v1/custom-attack/list-custom-prompt-sets', async () => {
      mockFetch({ prompt_sets: [], total: 0 });
      const result = await client.listPromptSets();

      expect(result.prompt_sets).toEqual([]);
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('/v1/custom-attack/list-custom-prompt-sets');
    });

    it('passes filter params', async () => {
      mockFetch({ prompt_sets: [], total: 0 });
      await client.listPromptSets({ active: true, archive: false });

      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('active=true');
      expect(url).toContain('archive=false');
    });
  });

  describe('getPromptSet', () => {
    it('GETs /v1/custom-attack/custom-prompt-set/:uuid', async () => {
      mockFetch({ id: validUuid, name: 'my-set' });
      const result = await client.getPromptSet(validUuid);

      expect(result.id).toBe(validUuid);
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain(`/v1/custom-attack/custom-prompt-set/${validUuid}`);
    });

    it('rejects invalid UUID', async () => {
      await expect(client.getPromptSet('bad')).rejects.toThrow(AISecSDKException);
    });
  });

  describe('updatePromptSet', () => {
    it('PUTs to /v1/custom-attack/custom-prompt-set/:uuid', async () => {
      mockFetch({ id: validUuid, name: 'updated' });
      const result = await client.updatePromptSet(validUuid, { name: 'updated' });

      expect(result.name).toBe('updated');
      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain(`/v1/custom-attack/custom-prompt-set/${validUuid}`);
      expect(init.method).toBe('PUT');
    });

    it('rejects invalid UUID', async () => {
      await expect(client.updatePromptSet('bad', { name: 'x' })).rejects.toThrow(AISecSDKException);
    });
  });

  describe('archivePromptSet', () => {
    it('PUTs to /v1/custom-attack/custom-prompt-set/:uuid/archive', async () => {
      mockFetch({ id: validUuid, archived: true });
      const result = await client.archivePromptSet(validUuid, { archive: true });

      expect(result.archived).toBe(true);
      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain(`/v1/custom-attack/custom-prompt-set/${validUuid}/archive`);
      expect(init.method).toBe('PUT');
    });

    it('rejects invalid UUID', async () => {
      await expect(client.archivePromptSet('bad', { archive: true })).rejects.toThrow(
        AISecSDKException,
      );
    });
  });

  describe('getPromptSetReference', () => {
    it('GETs /v1/custom-attack/custom-prompt-set/:uuid/reference', async () => {
      mockFetch({ uuid: validUuid, version: 1 });
      const result = await client.getPromptSetReference(validUuid);

      expect(result.uuid).toBe(validUuid);
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain(`/v1/custom-attack/custom-prompt-set/${validUuid}/reference`);
    });

    it('rejects invalid UUID', async () => {
      await expect(client.getPromptSetReference('bad')).rejects.toThrow(AISecSDKException);
    });
  });

  describe('getPromptSetVersionInfo', () => {
    it('GETs /v1/custom-attack/custom-prompt-set/:uuid/version-info', async () => {
      mockFetch({ uuid: validUuid, version: 3 });
      const result = await client.getPromptSetVersionInfo(validUuid);

      expect(result.version).toBe(3);
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain(`/v1/custom-attack/custom-prompt-set/${validUuid}/version-info`);
    });

    it('rejects invalid UUID', async () => {
      await expect(client.getPromptSetVersionInfo('bad')).rejects.toThrow(AISecSDKException);
    });
  });

  describe('listActivePromptSets', () => {
    it('GETs /v1/custom-attack/active-custom-prompt-sets', async () => {
      mockFetch({ prompt_sets: [] });
      const result = await client.listActivePromptSets();

      expect(result.prompt_sets).toEqual([]);
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('/v1/custom-attack/active-custom-prompt-sets');
    });
  });

  describe('downloadTemplate', () => {
    it('GETs /v1/custom-attack/download-template/:uuid', async () => {
      mockFetch('csv-data');
      const result = await client.downloadTemplate(validUuid);

      expect(result).toBe('csv-data');
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain(`/v1/custom-attack/download-template/${validUuid}`);
    });

    it('rejects invalid UUID', async () => {
      await expect(client.downloadTemplate('bad')).rejects.toThrow(AISecSDKException);
    });
  });

  // -----------------------------------------------------------------------
  // Prompt operations
  // -----------------------------------------------------------------------

  describe('createPrompt', () => {
    it('POSTs to /v1/custom-attack/custom-prompt-set/custom-prompt', async () => {
      const prompt = { id: validUuid, text: 'test prompt' };
      mockFetch(prompt, 201);
      const result = await client.createPrompt({
        prompt_set_uuid: validUuid,
        text: 'test prompt',
      });

      expect(result.id).toBe(validUuid);
      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('/v1/custom-attack/custom-prompt-set/custom-prompt');
      expect(init.method).toBe('POST');
    });
  });

  describe('listPrompts', () => {
    it('GETs /v1/custom-attack/custom-prompt-set/:uuid/list-custom-prompts', async () => {
      mockFetch({ prompts: [], total: 0 });
      const result = await client.listPrompts(validUuid);

      expect(result.prompts).toEqual([]);
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain(`/v1/custom-attack/custom-prompt-set/${validUuid}/list-custom-prompts`);
    });

    it('rejects invalid UUID', async () => {
      await expect(client.listPrompts('bad')).rejects.toThrow(AISecSDKException);
    });

    it('passes active filter param', async () => {
      mockFetch({ prompts: [], total: 0 });
      await client.listPrompts(validUuid, { active: true });

      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('active=true');
    });
  });

  describe('getPrompt', () => {
    it('GETs /v1/custom-attack/custom-prompt-set/:setUuid/custom-prompt/:promptUuid', async () => {
      mockFetch({ id: validUuid2, text: 'prompt text' });
      const result = await client.getPrompt(validUuid, validUuid2);

      expect(result.id).toBe(validUuid2);
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain(
        `/v1/custom-attack/custom-prompt-set/${validUuid}/custom-prompt/${validUuid2}`,
      );
    });

    it('rejects invalid prompt set UUID', async () => {
      await expect(client.getPrompt('bad', validUuid2)).rejects.toThrow(AISecSDKException);
    });

    it('rejects invalid prompt UUID', async () => {
      await expect(client.getPrompt(validUuid, 'bad')).rejects.toThrow(AISecSDKException);
    });
  });

  describe('updatePrompt', () => {
    it('PUTs to /v1/custom-attack/custom-prompt-set/:setUuid/custom-prompt/:promptUuid', async () => {
      mockFetch({ id: validUuid2, text: 'updated' });
      const result = await client.updatePrompt(validUuid, validUuid2, { text: 'updated' });

      expect(result.text).toBe('updated');
      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain(
        `/v1/custom-attack/custom-prompt-set/${validUuid}/custom-prompt/${validUuid2}`,
      );
      expect(init.method).toBe('PUT');
    });

    it('rejects invalid prompt set UUID', async () => {
      await expect(client.updatePrompt('bad', validUuid2, { text: 'x' })).rejects.toThrow(
        AISecSDKException,
      );
    });

    it('rejects invalid prompt UUID', async () => {
      await expect(client.updatePrompt(validUuid, 'bad', { text: 'x' })).rejects.toThrow(
        AISecSDKException,
      );
    });
  });

  describe('deletePrompt', () => {
    it('DELETEs /v1/custom-attack/custom-prompt-set/:setUuid/custom-prompt/:promptUuid', async () => {
      mockFetch({ success: true });
      const result = await client.deletePrompt(validUuid, validUuid2);

      expect(result.success).toBe(true);
      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain(
        `/v1/custom-attack/custom-prompt-set/${validUuid}/custom-prompt/${validUuid2}`,
      );
      expect(init.method).toBe('DELETE');
    });

    it('rejects invalid prompt set UUID', async () => {
      await expect(client.deletePrompt('bad', validUuid2)).rejects.toThrow(AISecSDKException);
    });

    it('rejects invalid prompt UUID', async () => {
      await expect(client.deletePrompt(validUuid, 'bad')).rejects.toThrow(AISecSDKException);
    });
  });

  // -----------------------------------------------------------------------
  // Property operations
  // -----------------------------------------------------------------------

  describe('getPropertyNames', () => {
    it('GETs /v1/custom-attack/property-names', async () => {
      mockFetch({ property_names: ['severity', 'category'] });
      const result = await client.getPropertyNames();

      expect(result.property_names).toEqual(['severity', 'category']);
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('/v1/custom-attack/property-names');
    });
  });

  describe('createPropertyName', () => {
    it('POSTs to /v1/custom-attack/property-names', async () => {
      mockFetch({ success: true });
      const result = await client.createPropertyName({ name: 'severity' });

      expect(result.success).toBe(true);
      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('/v1/custom-attack/property-names');
      expect(init.method).toBe('POST');
    });
  });

  describe('getPropertyValues', () => {
    it('GETs /v1/custom-attack/property-values/:name', async () => {
      mockFetch({ values: ['HIGH', 'LOW'] });
      const result = await client.getPropertyValues('severity');

      expect(result.values).toEqual(['HIGH', 'LOW']);
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('/v1/custom-attack/property-values/severity');
    });
  });

  describe('getPropertyValuesMultiple', () => {
    it('GETs /v1/custom-attack/property-values with query params', async () => {
      mockFetch({ values: {} });
      const result = await client.getPropertyValuesMultiple(['severity', 'category']);

      expect(result).toBeDefined();
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('/v1/custom-attack/property-values');
      expect(url).toContain('property_names=severity');
      expect(url).toContain('property_names=category');
    });
  });

  describe('createPropertyValue', () => {
    it('POSTs to /v1/custom-attack/property-values', async () => {
      mockFetch({ success: true });
      const result = await client.createPropertyValue({
        property_name: 'severity',
        value: 'CRITICAL',
      });

      expect(result.success).toBe(true);
      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('/v1/custom-attack/property-values');
      expect(init.method).toBe('POST');
    });
  });

  // -----------------------------------------------------------------------
  // CSV upload
  // -----------------------------------------------------------------------

  describe('uploadPromptsCsv', () => {
    it('POSTs multipart form data to upload endpoint', async () => {
      mockFetch({ message: 'uploaded', status: 201 }, 201);
      const csvContent = 'prompt,goal\n"test prompt","test goal"';
      const file = new Blob([csvContent], { type: 'text/csv' });
      const result = await client.uploadPromptsCsv(validUuid, file);

      expect(result.message).toBe('uploaded');
      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('/v1/custom-attack/upload-custom-prompts-csv');
      expect(url).toContain(`prompt_set_uuid=${validUuid}`);
      expect(init.method).toBe('POST');
      expect(init.body).toBeInstanceOf(FormData);
    });

    it('rejects invalid prompt set UUID', async () => {
      const file = new Blob(['test'], { type: 'text/csv' });
      await expect(client.uploadPromptsCsv('bad', file)).rejects.toThrow(AISecSDKException);
    });
  });
});
