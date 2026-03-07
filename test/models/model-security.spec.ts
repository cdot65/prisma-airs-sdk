import { describe, it, expect } from 'vitest';
import {
  ModelSecurityPaginationSchema,
  LabelSchema,
  LabelsCreateRequestSchema,
  LabelsResponseSchema,
  LabelKeyListSchema,
  LabelValueListSchema,
  EvalSummarySchema,
  ModelScanIssueSchema,
  FileScanDataSchema,
  ScanDetailsSchema,
  ScanCreateRequestSchema,
  ScanBaseResponseSchema,
  ScanListSchema,
  FileResponseSchema,
  FileListSchema,
  RuleEvaluationResponseSchema,
  RuleEvaluationListSchema,
  ViolationResponseSchema,
  ViolationListSchema,
  RuleEditableFieldDropdownSchema,
  RuleEditableFieldSchema,
  RuleRemediationSchema,
  RuleConfigurationSchema,
  ModelSecurityRuleResponseSchema,
  ListModelSecurityRulesResponseSchema,
  ModelSecurityRuleInstanceResponseSchema,
  ModelSecurityRuleInstanceUpdateRequestSchema,
  ListModelSecurityRuleInstancesResponseSchema,
  ModelSecurityGroupCreateRequestSchema,
  ModelSecurityGroupResponseSchema,
  ModelSecurityGroupUpdateRequestSchema,
  ListModelSecurityGroupsResponseSchema,
  PyPIAuthResponseSchema,
} from '../../src/models/model-security.js';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const validUuid = '550e8400-e29b-41d4-a716-446655440000';
const now = '2025-01-01T00:00:00Z';

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

const baseRule = {
  uuid: validUuid,
  name: 'rule-1',
  description: 'Test rule',
  rule_type: 'ARTIFACT',
  compatible_sources: ['HUGGING_FACE'],
  default_state: 'BLOCKING',
  remediation: { description: 'Fix it', steps: ['step1'], url: 'https://example.com' },
  editable_fields: [],
  constant_values: {},
  default_values: {},
};

// ---------------------------------------------------------------------------
// DataPlane schemas
// ---------------------------------------------------------------------------

describe('ModelSecurityPaginationSchema', () => {
  it('parses valid pagination', () => {
    expect(ModelSecurityPaginationSchema.parse({ total_items: 42 })).toEqual({ total_items: 42 });
  });

  it('accepts null total_items', () => {
    expect(ModelSecurityPaginationSchema.parse({ total_items: null })).toEqual({
      total_items: null,
    });
  });

  it('accepts missing total_items', () => {
    expect(ModelSecurityPaginationSchema.parse({})).toEqual({});
  });

  it('passes through unknown fields', () => {
    const res = ModelSecurityPaginationSchema.parse({ total_items: 1, extra: true });
    expect((res as Record<string, unknown>).extra).toBe(true);
  });
});

describe('LabelSchema', () => {
  it('parses valid label', () => {
    expect(LabelSchema.parse({ key: 'env', value: 'prod' })).toEqual({
      key: 'env',
      value: 'prod',
    });
  });

  it('rejects missing key', () => {
    expect(() => LabelSchema.parse({ value: 'v' })).toThrow();
  });
});

describe('LabelsCreateRequestSchema', () => {
  it('parses valid request', () => {
    const req = { labels: [{ key: 'a', value: 'b' }] };
    expect(LabelsCreateRequestSchema.parse(req).labels).toHaveLength(1);
  });

  it('accepts empty labels array', () => {
    expect(LabelsCreateRequestSchema.parse({ labels: [] }).labels).toHaveLength(0);
  });
});

describe('LabelsResponseSchema', () => {
  it('parses empty object', () => {
    expect(LabelsResponseSchema.parse({})).toEqual({});
  });

  it('passes through extra fields', () => {
    const res = LabelsResponseSchema.parse({ message: 'ok' });
    expect((res as Record<string, unknown>).message).toBe('ok');
  });
});

describe('LabelKeyListSchema', () => {
  it('parses valid list', () => {
    const data = { pagination: { total_items: 2 }, keys: ['env', 'team'] };
    const parsed = LabelKeyListSchema.parse(data);
    expect(parsed.keys).toEqual(['env', 'team']);
    expect(parsed.pagination.total_items).toBe(2);
  });
});

describe('LabelValueListSchema', () => {
  it('parses valid list', () => {
    const data = { pagination: { total_items: 1 }, values: ['prod'] };
    expect(LabelValueListSchema.parse(data).values).toEqual(['prod']);
  });
});

describe('EvalSummarySchema', () => {
  it('parses with defaults', () => {
    const parsed = EvalSummarySchema.parse({});
    expect(parsed.rules_failed).toBe(0);
    expect(parsed.rules_passed).toBe(0);
    expect(parsed.total_rules).toBe(0);
  });

  it('parses explicit values', () => {
    const parsed = EvalSummarySchema.parse({
      rules_failed: 1,
      rules_passed: 9,
      total_rules: 10,
    });
    expect(parsed.total_rules).toBe(10);
  });
});

describe('ModelScanIssueSchema', () => {
  it('parses valid issue', () => {
    const issue = { description: 'Bad op', source: 'pickle' };
    expect(ModelScanIssueSchema.parse(issue).description).toBe('Bad op');
  });

  it('accepts optional fields as null', () => {
    const issue = {
      description: 'd',
      source: 's',
      threat: null,
      module: null,
      operator: null,
    };
    expect(ModelScanIssueSchema.parse(issue).threat).toBeNull();
  });
});

describe('FileScanDataSchema', () => {
  it('parses valid file scan data', () => {
    const data = {
      file_path: 'model.pkl',
      modelscan_status: 'SCANNED',
      blob_id: 'abc123',
    };
    expect(FileScanDataSchema.parse(data).file_path).toBe('model.pkl');
  });
});

describe('ScanDetailsSchema', () => {
  it('parses valid scan details', () => {
    const details = {
      scanner_version: '1.0.0',
      time_started: now,
      files: [],
      total_files_scanned: 5,
      total_files_skipped: 1,
      model_formats: ['pickle'],
      model_size_bytes: 1024,
      scan_duration_ms: 500,
    };
    expect(ScanDetailsSchema.parse(details).scanner_version).toBe('1.0.0');
  });
});

describe('ScanCreateRequestSchema', () => {
  it('parses minimal request', () => {
    const req = {
      model_uri: 'hf://org/model',
      security_group_uuid: validUuid,
      scan_origin: 'MODEL_SECURITY_SDK',
    };
    expect(ScanCreateRequestSchema.parse(req).model_uri).toBe('hf://org/model');
  });

  it('parses full request with optionals', () => {
    const req = {
      model_uri: 'hf://org/model',
      security_group_uuid: validUuid,
      scan_origin: 'MODEL_SECURITY_SDK',
      allow_patterns: ['*.pkl'],
      ignore_patterns: ['*.tmp'],
      labels: [{ key: 'env', value: 'prod' }],
      model_author: 'author',
      model_name: 'model',
      model_version: '1.0',
    };
    const parsed = ScanCreateRequestSchema.parse(req);
    expect(parsed.labels).toHaveLength(1);
    expect(parsed.model_author).toBe('author');
  });
});

describe('ScanBaseResponseSchema', () => {
  it('parses valid scan response', () => {
    const parsed = ScanBaseResponseSchema.parse(baseScan);
    expect(parsed.uuid).toBe(validUuid);
    expect(parsed.eval_outcome).toBe('ALLOWED');
  });

  it('accepts optional fields', () => {
    const full = {
      ...baseScan,
      eval_summary: { rules_failed: 0, rules_passed: 5, total_rules: 5 },
      labels: [{ key: 'env', value: 'test' }],
      scanner_version: '1.0.0',
    };
    const parsed = ScanBaseResponseSchema.parse(full);
    expect(parsed.eval_summary?.total_rules).toBe(5);
  });

  it('passes through unknown fields', () => {
    const res = ScanBaseResponseSchema.parse({ ...baseScan, future_field: true });
    expect((res as Record<string, unknown>).future_field).toBe(true);
  });
});

describe('ScanListSchema', () => {
  it('parses valid list', () => {
    const data = { pagination: { total_items: 1 }, scans: [baseScan] };
    const parsed = ScanListSchema.parse(data);
    expect(parsed.scans).toHaveLength(1);
    expect(parsed.pagination.total_items).toBe(1);
  });
});

describe('FileResponseSchema', () => {
  it('parses valid file response', () => {
    const file = {
      uuid: validUuid,
      tsg_id: '123',
      created_at: now,
      updated_at: now,
      path: '/model.pkl',
      parent_path: '/',
      type: 'FILE',
      result: 'SUCCESS',
      model_version_uuid: validUuid,
    };
    expect(FileResponseSchema.parse(file).path).toBe('/model.pkl');
  });
});

describe('FileListSchema', () => {
  it('parses valid file list', () => {
    const data = {
      pagination: { total_items: 0 },
      files: [],
    };
    expect(FileListSchema.parse(data).files).toHaveLength(0);
  });
});

describe('RuleEvaluationResponseSchema', () => {
  it('parses valid evaluation', () => {
    const eval_ = {
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
    expect(RuleEvaluationResponseSchema.parse(eval_).result).toBe('PASSED');
  });
});

describe('RuleEvaluationListSchema', () => {
  it('parses empty list', () => {
    const data = { pagination: { total_items: 0 }, evaluations: [] };
    expect(RuleEvaluationListSchema.parse(data).evaluations).toHaveLength(0);
  });
});

describe('ViolationResponseSchema', () => {
  it('parses valid violation', () => {
    const v = {
      uuid: validUuid,
      tsg_id: '123',
      created_at: now,
      updated_at: now,
      description: 'Malicious op found',
      rule_instance_uuid: validUuid,
      rule_name: 'rule-1',
      rule_description: 'desc',
      rule_instance_state: 'BLOCKING',
    };
    expect(ViolationResponseSchema.parse(v).description).toBe('Malicious op found');
  });

  it('accepts optional threat fields', () => {
    const v = {
      uuid: validUuid,
      tsg_id: '123',
      created_at: now,
      updated_at: now,
      description: 'd',
      rule_instance_uuid: validUuid,
      rule_name: 'r',
      rule_description: 'rd',
      rule_instance_state: 'BLOCKING',
      file: 'model.pkl',
      hash: 'abc',
      threat: 'PAIT-PKL-100',
      threat_description: 'Pickle exploit',
    };
    const parsed = ViolationResponseSchema.parse(v);
    expect(parsed.threat).toBe('PAIT-PKL-100');
  });
});

describe('ViolationListSchema', () => {
  it('parses empty list', () => {
    const data = { pagination: { total_items: 0 }, violations: [] };
    expect(ViolationListSchema.parse(data).violations).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Management schemas
// ---------------------------------------------------------------------------

describe('RuleEditableFieldDropdownSchema', () => {
  it('parses valid dropdown', () => {
    const d = { value: 'v1', label: 'Label 1' };
    expect(RuleEditableFieldDropdownSchema.parse(d).value).toBe('v1');
  });
});

describe('RuleEditableFieldSchema', () => {
  it('parses valid field', () => {
    const f = {
      attribute_name: 'approved_formats',
      type: 'LIST',
      display_name: 'Approved Formats',
      display_type: 'LIST',
    };
    expect(RuleEditableFieldSchema.parse(f).attribute_name).toBe('approved_formats');
  });
});

describe('RuleRemediationSchema', () => {
  it('parses valid remediation', () => {
    const r = { description: 'Fix', steps: ['s1', 's2'], url: 'https://example.com' };
    expect(RuleRemediationSchema.parse(r).steps).toHaveLength(2);
  });
});

describe('RuleConfigurationSchema', () => {
  it('parses with state and field_values', () => {
    const c = { state: 'BLOCKING', field_values: { approved_formats: ['pickle'] } };
    expect(RuleConfigurationSchema.parse(c).state).toBe('BLOCKING');
  });

  it('parses minimal config', () => {
    expect(RuleConfigurationSchema.parse({})).toBeDefined();
  });
});

describe('ModelSecurityRuleResponseSchema', () => {
  it('parses valid rule', () => {
    const parsed = ModelSecurityRuleResponseSchema.parse(baseRule);
    expect(parsed.name).toBe('rule-1');
    expect(parsed.compatible_sources).toContain('HUGGING_FACE');
  });
});

describe('ListModelSecurityRulesResponseSchema', () => {
  it('parses valid list', () => {
    const data = { pagination: { total_items: 1 }, rules: [baseRule] };
    expect(ListModelSecurityRulesResponseSchema.parse(data).rules).toHaveLength(1);
  });
});

describe('ModelSecurityRuleInstanceResponseSchema', () => {
  it('parses valid instance', () => {
    const inst = {
      uuid: validUuid,
      tsg_id: '123',
      created_at: now,
      updated_at: now,
      security_group_uuid: validUuid,
      security_rule_uuid: validUuid,
      state: 'BLOCKING',
      rule: baseRule,
    };
    expect(ModelSecurityRuleInstanceResponseSchema.parse(inst).state).toBe('BLOCKING');
  });
});

describe('ModelSecurityRuleInstanceUpdateRequestSchema', () => {
  it('parses valid update', () => {
    const req = {
      security_group_uuid: validUuid,
      state: 'ALLOWING',
      field_values: { approved_formats: ['onnx'] },
    };
    expect(ModelSecurityRuleInstanceUpdateRequestSchema.parse(req).state).toBe('ALLOWING');
  });

  it('parses minimal update', () => {
    const req = { security_group_uuid: validUuid };
    expect(ModelSecurityRuleInstanceUpdateRequestSchema.parse(req).security_group_uuid).toBe(
      validUuid,
    );
  });
});

describe('ListModelSecurityRuleInstancesResponseSchema', () => {
  it('parses empty list', () => {
    const data = { pagination: { total_items: 0 }, rule_instances: [] };
    expect(ListModelSecurityRuleInstancesResponseSchema.parse(data).rule_instances).toHaveLength(0);
  });
});

describe('ModelSecurityGroupCreateRequestSchema', () => {
  it('parses minimal request', () => {
    const req = { name: 'test-group', source_type: 'HUGGING_FACE' };
    const parsed = ModelSecurityGroupCreateRequestSchema.parse(req);
    expect(parsed.name).toBe('test-group');
    expect(parsed.description).toBe('');
  });

  it('parses full request', () => {
    const req = {
      name: 'test-group',
      source_type: 'HUGGING_FACE',
      description: 'My group',
      rule_configurations: {
        [validUuid]: { state: 'BLOCKING', field_values: {} },
      },
    };
    const parsed = ModelSecurityGroupCreateRequestSchema.parse(req);
    expect(parsed.description).toBe('My group');
  });
});

describe('ModelSecurityGroupResponseSchema', () => {
  it('parses valid group', () => {
    const group = {
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
    expect(ModelSecurityGroupResponseSchema.parse(group).name).toBe('default');
  });
});

describe('ModelSecurityGroupUpdateRequestSchema', () => {
  it('parses name update', () => {
    expect(ModelSecurityGroupUpdateRequestSchema.parse({ name: 'new' }).name).toBe('new');
  });

  it('parses empty update', () => {
    expect(ModelSecurityGroupUpdateRequestSchema.parse({})).toBeDefined();
  });
});

describe('ListModelSecurityGroupsResponseSchema', () => {
  it('parses empty list', () => {
    const data = { pagination: { total_items: 0 }, security_groups: [] };
    expect(ListModelSecurityGroupsResponseSchema.parse(data).security_groups).toHaveLength(0);
  });
});

describe('PyPIAuthResponseSchema', () => {
  it('parses valid response', () => {
    const data = { url: 'https://artifact.example.com', expires_at: now };
    const parsed = PyPIAuthResponseSchema.parse(data);
    expect(parsed.url).toBe('https://artifact.example.com');
    expect(parsed.expires_at).toBe(now);
  });

  it('passes through extra fields', () => {
    const data = { url: 'https://x.com', expires_at: now, extra: 'field' };
    const parsed = PyPIAuthResponseSchema.parse(data);
    expect((parsed as Record<string, unknown>).extra).toBe('field');
  });
});
