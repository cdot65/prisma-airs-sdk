import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RedTeamCustomAttackReportsClient } from '../../src/red-team/custom-attack-reports-client.js';
import type { AuthAdapter } from '../../src/http/types.js';
import { AISecSDKException } from '../../src/errors.js';
import {
  VALID_UUID,
  customAttackReportMock,
  promptSetsReportMock,
  promptDetailMock,
  customAttacksListMock,
  customAttackOutputMock,
  propertyStatMock,
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

describe('RedTeamCustomAttackReportsClient', () => {
  const originalFetch = globalThis.fetch;
  let client: RedTeamCustomAttackReportsClient;

  beforeEach(() => {
    client = new RedTeamCustomAttackReportsClient({
      baseUrl: 'https://data.example.com',
      auth: passthroughAuth(),
      numRetries: 0,
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('getReport', () => {
    it('GETs /v1/custom-attacks/report/:jobId', async () => {
      mockFetch(customAttackReportMock());
      const result = await client.getReport(validUuid);

      expect(result.job_id).toBe(validUuid);
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain(`/v1/custom-attacks/report/${validUuid}`);
    });

    it('rejects invalid UUID', async () => {
      await expect(client.getReport('bad')).rejects.toThrow(AISecSDKException);
    });
  });

  describe('getPromptSets', () => {
    it('GETs /v1/custom-attacks/report/:jobId/prompt-sets', async () => {
      mockFetch(promptSetsReportMock());
      const result = await client.getPromptSets(validUuid);

      expect(result.prompt_sets).toEqual([]);
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain(`/v1/custom-attacks/report/${validUuid}/prompt-sets`);
    });

    it('rejects invalid UUID', async () => {
      await expect(client.getPromptSets('bad')).rejects.toThrow(AISecSDKException);
    });
  });

  describe('getPromptsBySet', () => {
    it('GETs /v1/custom-attacks/report/:jobId/prompt-set/:promptSetId/prompts', async () => {
      mockFetch([promptDetailMock()]);
      const result = await client.getPromptsBySet(validUuid, validUuid2);

      expect(result).toBeDefined();
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain(
        `/v1/custom-attacks/report/${validUuid}/prompt-set/${validUuid2}/prompts`,
      );
    });

    it('rejects invalid job UUID', async () => {
      await expect(client.getPromptsBySet('bad', validUuid2)).rejects.toThrow(AISecSDKException);
    });

    it('rejects invalid prompt set UUID', async () => {
      await expect(client.getPromptsBySet(validUuid, 'bad')).rejects.toThrow(AISecSDKException);
    });

    it('passes is_threat filter', async () => {
      mockFetch([]);
      await client.getPromptsBySet(validUuid, validUuid2, { is_threat: true });

      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('is_threat=true');
    });
  });

  describe('getPromptDetail', () => {
    it('GETs /v1/custom-attacks/report/:jobId/prompt/:promptId', async () => {
      mockFetch(promptDetailMock());
      const result = await client.getPromptDetail(validUuid, validUuid2);

      expect(result.prompt_id).toBe(VALID_UUID);
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain(`/v1/custom-attacks/report/${validUuid}/prompt/${validUuid2}`);
    });

    it('rejects invalid job UUID', async () => {
      await expect(client.getPromptDetail('bad', validUuid2)).rejects.toThrow(AISecSDKException);
    });

    it('rejects invalid prompt UUID', async () => {
      await expect(client.getPromptDetail(validUuid, 'bad')).rejects.toThrow(AISecSDKException);
    });
  });

  describe('listCustomAttacks', () => {
    it('GETs /v1/custom-attacks/job/:jobId/list-custom-attacks', async () => {
      mockFetch(customAttacksListMock());
      const result = await client.listCustomAttacks(validUuid);

      expect(result.data).toEqual([]);
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain(`/v1/custom-attacks/job/${validUuid}/list-custom-attacks`);
    });

    it('passes filter params', async () => {
      mockFetch(customAttacksListMock());
      await client.listCustomAttacks(validUuid, {
        threat: true,
        prompt_set_id: validUuid2,
        property_value: '{"severity":"HIGH"}',
      });

      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('threat=true');
      expect(url).toContain(`prompt_set_id=${validUuid2}`);
      expect(url).toContain('property_value=');
    });

    it('rejects invalid UUID', async () => {
      await expect(client.listCustomAttacks('bad')).rejects.toThrow(AISecSDKException);
    });
  });

  describe('getAttackOutputs', () => {
    it('GETs /v1/custom-attacks/job/:jobId/attack/:attackId/list-outputs', async () => {
      mockFetch([customAttackOutputMock()]);
      const result = await client.getAttackOutputs(validUuid, validUuid2);

      expect(result).toBeDefined();
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain(
        `/v1/custom-attacks/job/${validUuid}/attack/${validUuid2}/list-outputs`,
      );
    });

    it('rejects invalid job UUID', async () => {
      await expect(client.getAttackOutputs('bad', validUuid2)).rejects.toThrow(AISecSDKException);
    });

    it('rejects invalid attack UUID', async () => {
      await expect(client.getAttackOutputs(validUuid, 'bad')).rejects.toThrow(AISecSDKException);
    });
  });

  describe('getPropertyStats', () => {
    it('GETs /v1/custom-attacks/job/:jobId/property-stats', async () => {
      mockFetch([propertyStatMock()]);
      const result = await client.getPropertyStats(validUuid);

      expect(result).toHaveLength(1);
      expect(result[0].property_name).toBe('category');
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain(`/v1/custom-attacks/job/${validUuid}/property-stats`);
    });

    it('rejects invalid UUID', async () => {
      await expect(client.getPropertyStats('bad')).rejects.toThrow(AISecSDKException);
    });
  });
});
