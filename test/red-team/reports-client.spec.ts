import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RedTeamReportsClient } from '../../src/red-team/reports-client.js';
import type { AuthAdapter } from '../../src/http/types.js';
import { AISecSDKException } from '../../src/errors.js';
import {
  VALID_UUID,
  attackListMock,
  attackDetailMock,
  attackMultiTurnDetailMock,
  staticReportMock,
  dynamicReportMock,
  remediationMock,
  runtimePolicyMock,
  goalListMock,
  streamListMock,
  streamDetailMock,
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

describe('RedTeamReportsClient', () => {
  const originalFetch = globalThis.fetch;
  let client: RedTeamReportsClient;

  beforeEach(() => {
    client = new RedTeamReportsClient({
      baseUrl: 'https://data.example.com',
      auth: passthroughAuth(),
      numRetries: 0,
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('listAttacks', () => {
    it('GETs /v1/report/static/:jobId/list-attacks', async () => {
      mockFetch(attackListMock());
      const result = await client.listAttacks(validUuid);

      expect(result.data).toEqual([]);
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain(`/v1/report/static/${validUuid}/list-attacks`);
    });

    it('passes filter params', async () => {
      mockFetch(attackListMock());
      await client.listAttacks(validUuid, {
        status: 'FAILED',
        severity: 'HIGH',
        attack_type: 'JAILBREAK',
        threat: true,
      });

      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('status=FAILED');
      expect(url).toContain('severity=HIGH');
      expect(url).toContain('attack_type=JAILBREAK');
      expect(url).toContain('threat=true');
    });

    it('rejects invalid UUID', async () => {
      await expect(client.listAttacks('bad')).rejects.toThrow(AISecSDKException);
    });
  });

  describe('getAttackDetail', () => {
    it('GETs /v1/report/static/:jobId/attack/:attackId', async () => {
      mockFetch(attackDetailMock());
      const result = await client.getAttackDetail(validUuid, validUuid2);

      expect(result.uuid).toBe(validUuid);
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain(`/v1/report/static/${validUuid}/attack/${validUuid2}`);
    });

    it('rejects invalid job UUID', async () => {
      await expect(client.getAttackDetail('bad', validUuid2)).rejects.toThrow(AISecSDKException);
    });

    it('rejects invalid attack UUID', async () => {
      await expect(client.getAttackDetail(validUuid, 'bad')).rejects.toThrow(AISecSDKException);
    });
  });

  describe('getMultiTurnAttackDetail', () => {
    it('GETs /v1/report/static/:jobId/attack-multi-turn/:attackId', async () => {
      mockFetch(attackMultiTurnDetailMock());
      const result = await client.getMultiTurnAttackDetail(validUuid, validUuid2);

      expect(result.uuid).toBe(validUuid);
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain(`/v1/report/static/${validUuid}/attack-multi-turn/${validUuid2}`);
    });

    it('rejects invalid job UUID', async () => {
      await expect(client.getMultiTurnAttackDetail('bad', validUuid2)).rejects.toThrow(
        AISecSDKException,
      );
    });

    it('rejects invalid attack UUID', async () => {
      await expect(client.getMultiTurnAttackDetail(validUuid, 'bad')).rejects.toThrow(
        AISecSDKException,
      );
    });
  });

  describe('getStaticReport', () => {
    it('GETs /v1/report/static/:jobId/report', async () => {
      mockFetch(staticReportMock());
      const result = await client.getStaticReport(validUuid);

      expect(result.severity_report).toBeDefined();
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain(`/v1/report/static/${validUuid}/report`);
    });

    it('rejects invalid UUID', async () => {
      await expect(client.getStaticReport('bad')).rejects.toThrow(AISecSDKException);
    });
  });

  describe('getStaticRemediation', () => {
    it('GETs /v1/report/static/:jobId/remediation', async () => {
      mockFetch(remediationMock());
      const result = await client.getStaticRemediation(validUuid);

      expect(result.remediations).toEqual([]);
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain(`/v1/report/static/${validUuid}/remediation`);
    });

    it('rejects invalid UUID', async () => {
      await expect(client.getStaticRemediation('bad')).rejects.toThrow(AISecSDKException);
    });
  });

  describe('getStaticRuntimePolicy', () => {
    it('GETs /v1/report/static/:jobId/runtime-policy-config', async () => {
      mockFetch(runtimePolicyMock());
      const result = await client.getStaticRuntimePolicy(validUuid);

      expect(result.runtime_security_profile).toBeNull();
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain(`/v1/report/static/${validUuid}/runtime-policy-config`);
    });

    it('rejects invalid UUID', async () => {
      await expect(client.getStaticRuntimePolicy('bad')).rejects.toThrow(AISecSDKException);
    });
  });

  describe('getDynamicReport', () => {
    it('GETs /v1/report/dynamic/:jobId/report', async () => {
      mockFetch(dynamicReportMock());
      const result = await client.getDynamicReport(validUuid);

      expect(result).toBeDefined();
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain(`/v1/report/dynamic/${validUuid}/report`);
    });

    it('rejects invalid UUID', async () => {
      await expect(client.getDynamicReport('bad')).rejects.toThrow(AISecSDKException);
    });
  });

  describe('getDynamicRemediation', () => {
    it('GETs /v1/report/dynamic/:jobId/remediation', async () => {
      mockFetch(remediationMock());
      const result = await client.getDynamicRemediation(validUuid);

      expect(result.remediations).toEqual([]);
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain(`/v1/report/dynamic/${validUuid}/remediation`);
    });

    it('rejects invalid UUID', async () => {
      await expect(client.getDynamicRemediation('bad')).rejects.toThrow(AISecSDKException);
    });
  });

  describe('getDynamicRuntimePolicy', () => {
    it('GETs /v1/report/dynamic/:jobId/runtime-policy-config', async () => {
      mockFetch(runtimePolicyMock());
      const result = await client.getDynamicRuntimePolicy(validUuid);

      expect(result.runtime_security_profile).toBeNull();
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain(`/v1/report/dynamic/${validUuid}/runtime-policy-config`);
    });

    it('rejects invalid UUID', async () => {
      await expect(client.getDynamicRuntimePolicy('bad')).rejects.toThrow(AISecSDKException);
    });
  });

  describe('listGoals', () => {
    it('GETs /v1/report/dynamic/:jobId/list-goals', async () => {
      mockFetch(goalListMock());
      const result = await client.listGoals(validUuid);

      expect(result.data).toEqual([]);
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain(`/v1/report/dynamic/${validUuid}/list-goals`);
    });

    it('passes goal_type filter', async () => {
      mockFetch(goalListMock());
      await client.listGoals(validUuid, {
        goal_type: 'JAILBREAK',
        status: 'SUCCESSFUL',
        count: false,
      });

      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('goal_type=JAILBREAK');
      expect(url).toContain('status=SUCCESSFUL');
      expect(url).toContain('count=false');
    });

    it('rejects invalid UUID', async () => {
      await expect(client.listGoals('bad')).rejects.toThrow(AISecSDKException);
    });
  });

  describe('listGoalStreams', () => {
    it('GETs /v1/report/dynamic/:jobId/goal/:goalId/list-streams', async () => {
      mockFetch(streamListMock());
      const result = await client.listGoalStreams(validUuid, validUuid2);

      expect(result.data).toEqual([]);
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain(`/v1/report/dynamic/${validUuid}/goal/${validUuid2}/list-streams`);
    });

    it('rejects invalid job UUID', async () => {
      await expect(client.listGoalStreams('bad', validUuid2)).rejects.toThrow(AISecSDKException);
    });

    it('rejects invalid goal UUID', async () => {
      await expect(client.listGoalStreams(validUuid, 'bad')).rejects.toThrow(AISecSDKException);
    });
  });

  describe('getStreamDetail', () => {
    it('GETs /v1/report/dynamic/stream/:streamId', async () => {
      mockFetch(streamDetailMock());
      const result = await client.getStreamDetail(validUuid);

      expect(result.uuid).toBe(validUuid);
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain(`/v1/report/dynamic/stream/${validUuid}`);
    });

    it('rejects invalid UUID', async () => {
      await expect(client.getStreamDetail('bad')).rejects.toThrow(AISecSDKException);
    });
  });

  describe('downloadReport', () => {
    it('GETs /v1/report/:jobId/download with file_format', async () => {
      mockFetch({ url: 'https://download.example.com/report.csv' });
      const result = await client.downloadReport(validUuid, 'CSV');

      expect(result).toBeDefined();
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain(`/v1/report/${validUuid}/download`);
      expect(url).toContain('file_format=CSV');
    });

    it('rejects invalid UUID', async () => {
      await expect(client.downloadReport('bad', 'CSV')).rejects.toThrow(AISecSDKException);
    });
  });

  describe('generatePartialReport', () => {
    it('POSTs to /v1/report/:jobId/generate-partial-report', async () => {
      mockFetch({ status: 'GENERATING' });
      const result = await client.generatePartialReport(validUuid);

      expect(result).toBeDefined();
      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain(`/v1/report/${validUuid}/generate-partial-report`);
      expect(init.method).toBe('POST');
    });

    it('rejects invalid UUID', async () => {
      await expect(client.generatePartialReport('bad')).rejects.toThrow(AISecSDKException);
    });
  });
});
