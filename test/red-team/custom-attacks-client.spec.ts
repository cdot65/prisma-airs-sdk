import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RedTeamCustomAttacksClient } from '../../src/red-team/custom-attacks-client.js';
import type { AuthAdapter } from '../../src/http/types.js';
import { AISecSDKException } from '../../src/errors.js';
import {
  VALID_UUID,
  promptSetMock,
  promptSetListMock,
  promptSetReferenceMock,
  promptSetVersionInfoMock,
  promptSetListActiveMock,
  promptMock,
  promptListMock,
  propertyNamesMock,
  propertyValuesMock,
  propertyValuesMultipleMock,
  baseResponseMock,
} from './_fixtures.js';

const validUuid = VALID_UUID;
const validUuid2 = '660e8400-e29b-41d4-a716-446655440000';

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

describe('RedTeamCustomAttacksClient', () => {
  const originalFetch = globalThis.fetch;
  let client: RedTeamCustomAttacksClient;

  beforeEach(() => {
    client = new RedTeamCustomAttacksClient({
      baseUrl: 'https://mgmt.example.com',
      auth: passthroughAuth(),
      numRetries: 0,
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('createPromptSet', () => {
    it('POSTs to /v1/custom-attack/custom-prompt-set', async () => {
      mockFetch(promptSetMock({ name: 'test-set' }), 201);
      const result = await client.createPromptSet({ name: 'test-set' });

      expect(result.uuid).toBe(validUuid);
      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toBe('https://mgmt.example.com/v1/custom-attack/custom-prompt-set');
      expect(init.method).toBe('POST');
    });
  });

  describe('listPromptSets', () => {
    it('GETs /v1/custom-attack/list-custom-prompt-sets', async () => {
      mockFetch(promptSetListMock());
      const result = await client.listPromptSets();

      expect(result.data).toEqual([]);
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('/v1/custom-attack/list-custom-prompt-sets');
    });

    it('passes filter params', async () => {
      mockFetch(promptSetListMock());
      await client.listPromptSets({ active: true, archive: false, status: 'READY' });

      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('active=true');
      expect(url).toContain('archive=false');
      expect(url).toContain('status=READY');
    });

    it('does not send sort params (not in spec)', async () => {
      mockFetch(promptSetListMock());
      await client.listPromptSets({ skip: 0 });

      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).not.toContain('sort_by');
      expect(url).not.toContain('sort_direction');
    });
  });

  describe('getPromptSet', () => {
    it('GETs /v1/custom-attack/custom-prompt-set/:uuid', async () => {
      mockFetch(promptSetMock({ name: 'my-set' }));
      const result = await client.getPromptSet(validUuid);

      expect(result.uuid).toBe(validUuid);
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain(`/v1/custom-attack/custom-prompt-set/${validUuid}`);
    });

    it('rejects invalid UUID', async () => {
      await expect(client.getPromptSet('bad')).rejects.toThrow(AISecSDKException);
    });
  });

  describe('updatePromptSet', () => {
    it('PUTs to /v1/custom-attack/custom-prompt-set/:uuid', async () => {
      mockFetch(promptSetMock({ name: 'updated' }));
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
      mockFetch(promptSetMock({ archive: true }));
      const result = await client.archivePromptSet(validUuid, { archive: true });

      expect(result.archive).toBe(true);
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
      mockFetch(promptSetReferenceMock());
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
      mockFetch(promptSetVersionInfoMock());
      const result = await client.getPromptSetVersionInfo(validUuid);

      expect(result.uuid).toBe(validUuid);
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain(`/v1/custom-attack/custom-prompt-set/${validUuid}/version-info`);
    });

    it('rejects invalid UUID', async () => {
      await expect(client.getPromptSetVersionInfo('bad')).rejects.toThrow(AISecSDKException);
    });

    it('passes version query param when provided', async () => {
      mockFetch(promptSetVersionInfoMock());
      await client.getPromptSetVersionInfo(validUuid, { version: 'v2' });

      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('version=v2');
    });

    it('omits version param when not provided', async () => {
      mockFetch(promptSetVersionInfoMock());
      await client.getPromptSetVersionInfo(validUuid);

      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).not.toContain('version=');
    });
  });

  describe('listActivePromptSets', () => {
    it('GETs /v1/custom-attack/active-custom-prompt-sets', async () => {
      mockFetch(promptSetListActiveMock());
      const result = await client.listActivePromptSets();

      expect(result.data).toEqual([]);
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

  describe('createPrompt', () => {
    it('POSTs to /v1/custom-attack/custom-prompt-set/custom-prompt', async () => {
      mockFetch(promptMock(), 201);
      const result = await client.createPrompt({
        prompt_set_uuid: validUuid,
        text: 'test prompt',
      });

      expect(result.uuid).toBe(validUuid);
      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('/v1/custom-attack/custom-prompt-set/custom-prompt');
      expect(init.method).toBe('POST');
    });
  });

  describe('listPrompts', () => {
    it('GETs /v1/custom-attack/custom-prompt-set/:uuid/list-custom-prompts', async () => {
      mockFetch(promptListMock());
      const result = await client.listPrompts(validUuid);

      expect(result.data).toEqual([]);
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain(`/v1/custom-attack/custom-prompt-set/${validUuid}/list-custom-prompts`);
    });

    it('rejects invalid UUID', async () => {
      await expect(client.listPrompts('bad')).rejects.toThrow(AISecSDKException);
    });

    it('passes active filter param', async () => {
      mockFetch(promptListMock());
      await client.listPrompts(validUuid, { active: true });

      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('active=true');
    });

    it('passes status filter param', async () => {
      mockFetch(promptListMock());
      await client.listPrompts(validUuid, { status: 'ACTIVE' });

      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('status=ACTIVE');
    });
  });

  describe('getPrompt', () => {
    it('GETs /v1/custom-attack/custom-prompt-set/:setUuid/custom-prompt/:promptUuid', async () => {
      mockFetch(promptMock());
      const result = await client.getPrompt(validUuid, validUuid2);

      expect(result.uuid).toBe(validUuid);
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
      mockFetch(promptMock({ prompt: 'updated' }));
      const result = await client.updatePrompt(validUuid, validUuid2, { prompt: 'updated' });

      expect(result.prompt).toBe('updated');
      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain(
        `/v1/custom-attack/custom-prompt-set/${validUuid}/custom-prompt/${validUuid2}`,
      );
      expect(init.method).toBe('PUT');
    });

    it('rejects invalid prompt set UUID', async () => {
      await expect(client.updatePrompt('bad', validUuid2, { prompt: 'x' })).rejects.toThrow(
        AISecSDKException,
      );
    });

    it('rejects invalid prompt UUID', async () => {
      await expect(client.updatePrompt(validUuid, 'bad', { prompt: 'x' })).rejects.toThrow(
        AISecSDKException,
      );
    });
  });

  describe('deletePrompt', () => {
    it('DELETEs /v1/custom-attack/custom-prompt-set/:setUuid/custom-prompt/:promptUuid', async () => {
      mockFetch(baseResponseMock());
      const result = await client.deletePrompt(validUuid, validUuid2);

      expect(result.message).toBe('ok');
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

  describe('getPropertyNames', () => {
    it('GETs /v1/custom-attack/property-names', async () => {
      mockFetch(propertyNamesMock(['severity', 'category']));
      const result = await client.getPropertyNames();

      expect(result.data).toEqual(['severity', 'category']);
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('/v1/custom-attack/property-names');
    });
  });

  describe('createPropertyName', () => {
    it('POSTs to /v1/custom-attack/property-names', async () => {
      mockFetch(baseResponseMock());
      const result = await client.createPropertyName({ name: 'severity' });

      expect(result.message).toBe('ok');
      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('/v1/custom-attack/property-names');
      expect(init.method).toBe('POST');
    });
  });

  describe('getPropertyValues', () => {
    it('GETs /v1/custom-attack/property-values/:name', async () => {
      mockFetch(propertyValuesMock('severity', ['HIGH', 'LOW']));
      const result = await client.getPropertyValues('severity');

      expect(result.values).toEqual(['HIGH', 'LOW']);
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('/v1/custom-attack/property-values/severity');
    });
  });

  describe('getPropertyValuesMultiple', () => {
    it('GETs /v1/custom-attack/property-values with query params', async () => {
      mockFetch(propertyValuesMultipleMock());
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
      mockFetch(baseResponseMock());
      const result = await client.createPropertyValue({
        property_name: 'severity',
        value: 'CRITICAL',
      });

      expect(result.message).toBe('ok');
      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('/v1/custom-attack/property-values');
      expect(init.method).toBe('POST');
    });
  });

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
