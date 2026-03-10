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
  ErrorResponseSchema,
  LabelSchema,
  LabelsCreateRequestSchema,
  ScanDetailsSchema,
  ScanCreateRequestSchema,
  ModelSecurityGroupCreateRequestSchema,
  ModelSecurityGroupUpdateRequestSchema,
  ModelSecurityRuleInstanceUpdateRequestSchema,
  CountByNameSchema,
  ValidationErrorSchema,
  TargetJobRequestSchema,
  JobCreateRequestSchema,
  JobAbortResponseSchema,
  PrerequisiteModelSchema,
  PropertyAssignmentSchema,
  PropertyValueStatisticSchema,
  PropertyStatisticSchema,
  ScoreTrendSeriesSchema,
  ScoreTrendResponseSchema,
  SentimentRequestSchema,
  QuotaDetailsSchema,
  QuotaSummarySchema,
  BaseResponseSchema,
  CustomPromptSetCreateRequestSchema,
  CustomPromptSetArchiveRequestSchema,
  CustomPromptCreateRequestSchema,
  PropertyNameCreateRequestSchema,
  PropertyValueCreateRequestSchema,
  PropertyDefinitionSchema,
  ApiKeyCreateRequestSchema,
  ApiKeyRegenerateRequestSchema,
  ClientIdAndCustomerAppSchema,
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

describe('passthrough — error-response schemas preserve unknown fields', () => {
  it('ErrorResponseSchema', () => {
    const r = ErrorResponseSchema.safeParse({ _future: 1 });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toHaveProperty('_future', 1);
  });
});

describe('passthrough — model-security schemas preserve unknown fields', () => {
  it('LabelSchema', () => {
    const r = LabelSchema.safeParse({ key: 'k', value: 'v', _future: 1 });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toHaveProperty('_future', 1);
  });

  it('LabelsCreateRequestSchema', () => {
    const r = LabelsCreateRequestSchema.safeParse({
      labels: [{ key: 'k', value: 'v' }],
      _future: 1,
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toHaveProperty('_future', 1);
  });

  it('ScanDetailsSchema', () => {
    const r = ScanDetailsSchema.safeParse({
      scanner_version: '1.0',
      time_started: '2024-01-01',
      files: [],
      total_files_scanned: 0,
      total_files_skipped: 0,
      model_formats: [],
      model_size_bytes: 0,
      scan_duration_ms: 0,
      _future: 1,
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toHaveProperty('_future', 1);
  });

  it('ScanCreateRequestSchema', () => {
    const r = ScanCreateRequestSchema.safeParse({
      model_uri: 'hf://model',
      security_group_uuid: 'sg-1',
      scan_origin: 'sdk',
      _future: 1,
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toHaveProperty('_future', 1);
  });

  it('ModelSecurityGroupCreateRequestSchema', () => {
    const r = ModelSecurityGroupCreateRequestSchema.safeParse({
      name: 'group1',
      source_type: 'huggingface',
      _future: 1,
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toHaveProperty('_future', 1);
  });

  it('ModelSecurityGroupUpdateRequestSchema', () => {
    const r = ModelSecurityGroupUpdateRequestSchema.safeParse({ _future: 1 });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toHaveProperty('_future', 1);
  });

  it('ModelSecurityRuleInstanceUpdateRequestSchema', () => {
    const r = ModelSecurityRuleInstanceUpdateRequestSchema.safeParse({
      security_group_uuid: 'sg-1',
      _future: 1,
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toHaveProperty('_future', 1);
  });
});

describe('passthrough — red-team schemas preserve unknown fields', () => {
  it('CountByNameSchema', () => {
    const r = CountByNameSchema.safeParse({ name: 'n', count: 1, _future: 1 });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toHaveProperty('_future', 1);
  });

  it('ValidationErrorSchema', () => {
    const r = ValidationErrorSchema.safeParse({
      loc: ['body'],
      msg: 'err',
      type: 'value_error',
      _future: 1,
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toHaveProperty('_future', 1);
  });

  it('TargetJobRequestSchema', () => {
    const r = TargetJobRequestSchema.safeParse({ uuid: 'u1', _future: 1 });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toHaveProperty('_future', 1);
  });

  it('JobCreateRequestSchema', () => {
    const r = JobCreateRequestSchema.safeParse({
      name: 'job1',
      target: { uuid: 'u1' },
      job_type: 'static',
      job_metadata: { categories: ['cat1'] },
      _future: 1,
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toHaveProperty('_future', 1);
  });

  it('JobAbortResponseSchema', () => {
    const r = JobAbortResponseSchema.safeParse({
      job_id: 'j1',
      message: 'aborted',
      _future: 1,
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toHaveProperty('_future', 1);
  });

  it('PrerequisiteModelSchema', () => {
    const r = PrerequisiteModelSchema.safeParse({
      id: 'p1',
      display_name: 'Pre',
      description: 'desc',
      _future: 1,
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toHaveProperty('_future', 1);
  });

  it('PropertyAssignmentSchema', () => {
    const r = PropertyAssignmentSchema.safeParse({
      name: 'n',
      value: 'v',
      _future: 1,
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toHaveProperty('_future', 1);
  });

  it('PropertyValueStatisticSchema', () => {
    const r = PropertyValueStatisticSchema.safeParse({
      value: 'v',
      successful_attack_count: 1,
      total_attack_count: 2,
      success_rate: 0.5,
      _future: 1,
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toHaveProperty('_future', 1);
  });

  it('PropertyStatisticSchema', () => {
    const r = PropertyStatisticSchema.safeParse({
      property_name: 'p',
      values: [],
      _future: 1,
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toHaveProperty('_future', 1);
  });

  it('ScoreTrendSeriesSchema', () => {
    const r = ScoreTrendSeriesSchema.safeParse({
      label: 'l',
      data: [1, 2],
      _future: 1,
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toHaveProperty('_future', 1);
  });

  it('ScoreTrendResponseSchema', () => {
    const r = ScoreTrendResponseSchema.safeParse({
      labels: ['l'],
      series: [],
      _future: 1,
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toHaveProperty('_future', 1);
  });

  it('SentimentRequestSchema', () => {
    const r = SentimentRequestSchema.safeParse({ job_id: 'j1', _future: 1 });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toHaveProperty('_future', 1);
  });

  it('QuotaDetailsSchema', () => {
    const r = QuotaDetailsSchema.safeParse({
      allocated: 100,
      unlimited: false,
      consumed: 50,
      _future: 1,
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toHaveProperty('_future', 1);
  });

  it('QuotaSummarySchema', () => {
    const quota = { allocated: 100, unlimited: false, consumed: 50 };
    const r = QuotaSummarySchema.safeParse({
      static: quota,
      dynamic: quota,
      custom: quota,
      _future: 1,
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toHaveProperty('_future', 1);
  });

  it('BaseResponseSchema', () => {
    const r = BaseResponseSchema.safeParse({
      message: 'ok',
      status: 200,
      _future: 1,
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toHaveProperty('_future', 1);
  });

  it('CustomPromptSetCreateRequestSchema', () => {
    const r = CustomPromptSetCreateRequestSchema.safeParse({
      name: 'set1',
      _future: 1,
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toHaveProperty('_future', 1);
  });

  it('CustomPromptSetArchiveRequestSchema', () => {
    const r = CustomPromptSetArchiveRequestSchema.safeParse({
      archive: true,
      _future: 1,
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toHaveProperty('_future', 1);
  });

  it('CustomPromptCreateRequestSchema', () => {
    const r = CustomPromptCreateRequestSchema.safeParse({
      prompt: 'hello',
      prompt_set_id: 'ps1',
      _future: 1,
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toHaveProperty('_future', 1);
  });

  it('PropertyNameCreateRequestSchema', () => {
    const r = PropertyNameCreateRequestSchema.safeParse({
      name: 'prop',
      _future: 1,
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toHaveProperty('_future', 1);
  });

  it('PropertyValueCreateRequestSchema', () => {
    const r = PropertyValueCreateRequestSchema.safeParse({
      property_name: 'p',
      property_value: 'v',
      _future: 1,
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toHaveProperty('_future', 1);
  });

  it('PropertyDefinitionSchema', () => {
    const r = PropertyDefinitionSchema.safeParse({
      property_name: 'p',
      created_at: '2024-01-01',
      _future: 1,
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toHaveProperty('_future', 1);
  });
});

describe('passthrough — management schemas preserve unknown fields', () => {
  it('ApiKeyCreateRequestSchema', () => {
    const r = ApiKeyCreateRequestSchema.safeParse({
      auth_code: 'ac',
      cust_app: 'app',
      revoked: false,
      created_by: 'user',
      api_key_name: 'key1',
      rotation_time_interval: 30,
      rotation_time_unit: 'days',
      _future: 1,
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toHaveProperty('_future', 1);
  });

  it('ApiKeyRegenerateRequestSchema', () => {
    const r = ApiKeyRegenerateRequestSchema.safeParse({
      rotation_time_interval: 30,
      rotation_time_unit: 'days',
      _future: 1,
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toHaveProperty('_future', 1);
  });

  it('ClientIdAndCustomerAppSchema', () => {
    const r = ClientIdAndCustomerAppSchema.safeParse({
      client_id: 'cid',
      customer_app: 'app',
      _future: 1,
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toHaveProperty('_future', 1);
  });

  it('ErrorResponseSchema retry_after preserves unknown fields', () => {
    const r = ErrorResponseSchema.safeParse({
      retry_after: { interval: 5, unit: 'seconds', _future: 1 },
    });
    expect(r.success).toBe(true);
    if (r.success) {
      const retryAfter = r.data.retry_after as Record<string, unknown>;
      expect(retryAfter).toHaveProperty('_future', 1);
    }
  });
});
