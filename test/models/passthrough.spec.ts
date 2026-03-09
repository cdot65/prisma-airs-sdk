import { describe, it, expect } from 'vitest';
import {
  AiProfileSchema,
  AsyncScanObjectSchema,
  AsyncScanResponseSchema,
  AgentMetaSchema,
  MetadataSchema,
  PromptDetectionDetailsSchema,
  PromptDetectedSchema,
  ResponseDetectionDetailsSchema,
  ResponseDetectedSchema,
  ScanIdResultSchema,
  ScanRequestContentsInnerSchema,
  ScanRequestSchema,
  ScanResponseSchema,
  ThreatScanReportSchema,
  ToolEventMetadataSchema,
  ToolEventSchema,
  DlpReportSchema,
  UrlfEntrySchema,
  MaskedDataSchema,
  ToolDetectedSchema,
  DetectionServiceResultSchema,
} from '../../src/models/index.js';

/**
 * All Zod object schemas must use .passthrough() so that unknown fields
 * from future API versions are preserved rather than stripped.
 */
describe('passthrough — scan-related schemas preserve unknown fields', () => {
  it('AiProfileSchema', () => {
    const r = AiProfileSchema.safeParse({ profile_name: 'p', _future: true });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toHaveProperty('_future', true);
  });

  it('AsyncScanObjectSchema', () => {
    const r = AsyncScanObjectSchema.safeParse({
      req_id: 1,
      scan_req: {
        ai_profile: { profile_name: 'p' },
        contents: [{ prompt: 'hi' }],
      },
      _future: 42,
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toHaveProperty('_future', 42);
  });

  it('AsyncScanResponseSchema', () => {
    const r = AsyncScanResponseSchema.safeParse({
      received: 'now',
      scan_id: 's1',
      _future: 'x',
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toHaveProperty('_future', 'x');
  });

  it('AgentMetaSchema', () => {
    const r = AgentMetaSchema.safeParse({ _future: 1 });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toHaveProperty('_future', 1);
  });

  it('MetadataSchema', () => {
    const r = MetadataSchema.safeParse({ _future: 1 });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toHaveProperty('_future', 1);
  });

  it('PromptDetectionDetailsSchema', () => {
    const r = PromptDetectionDetailsSchema.safeParse({ _future: 1 });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toHaveProperty('_future', 1);
  });

  it('PromptDetectedSchema', () => {
    const r = PromptDetectedSchema.safeParse({ _future: 1 });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toHaveProperty('_future', 1);
  });

  it('ResponseDetectionDetailsSchema', () => {
    const r = ResponseDetectionDetailsSchema.safeParse({ _future: 1 });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toHaveProperty('_future', 1);
  });

  it('ResponseDetectedSchema', () => {
    const r = ResponseDetectedSchema.safeParse({ _future: 1 });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toHaveProperty('_future', 1);
  });

  it('ScanIdResultSchema', () => {
    const r = ScanIdResultSchema.safeParse({
      scan_id: 's1',
      _future: 1,
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toHaveProperty('_future', 1);
  });

  it('ScanRequestContentsInnerSchema', () => {
    const r = ScanRequestContentsInnerSchema.safeParse({ _future: 1 });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toHaveProperty('_future', 1);
  });

  it('ScanRequestSchema', () => {
    const r = ScanRequestSchema.safeParse({
      ai_profile: { profile_name: 'p' },
      contents: [{ prompt: 'hi' }],
      _future: 1,
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toHaveProperty('_future', 1);
  });

  it('ScanResponseSchema', () => {
    const r = ScanResponseSchema.safeParse({
      report_id: 'r1',
      scan_id: 's1',
      category: 'benign',
      action: 'allow',
      _future: 1,
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toHaveProperty('_future', 1);
  });

  it('ThreatScanReportSchema', () => {
    const r = ThreatScanReportSchema.safeParse({
      report_id: 'r1',
      _future: 1,
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toHaveProperty('_future', 1);
  });

  it('ToolEventMetadataSchema', () => {
    const r = ToolEventMetadataSchema.safeParse({
      ecosystem: 'mcp',
      method: 'invoke',
      server_name: 'srv',
      _future: 1,
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toHaveProperty('_future', 1);
  });

  it('ToolEventSchema', () => {
    const r = ToolEventSchema.safeParse({ _future: 1 });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toHaveProperty('_future', 1);
  });

  it('DlpReportSchema', () => {
    const r = DlpReportSchema.safeParse({ _future: 1 });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toHaveProperty('_future', 1);
  });

  it('UrlfEntrySchema', () => {
    const r = UrlfEntrySchema.safeParse({ _future: 1 });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toHaveProperty('_future', 1);
  });

  it('MaskedDataSchema', () => {
    const r = MaskedDataSchema.safeParse({ _future: 1 });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toHaveProperty('_future', 1);
  });

  it('ToolDetectedSchema', () => {
    const r = ToolDetectedSchema.safeParse({ _future: 1 });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toHaveProperty('_future', 1);
  });

  it('DetectionServiceResultSchema', () => {
    const r = DetectionServiceResultSchema.safeParse({
      data_type: 'prompt',
      _future: 1,
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toHaveProperty('_future', 1);
  });
});
