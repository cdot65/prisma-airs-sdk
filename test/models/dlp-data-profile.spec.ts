import { describe, it, expect } from 'vitest';
import {
  AdvancedDataProfileRequestSchema,
  DataProfilePatchRequestSchema,
  DataProfileResponseSchema,
  DetectionRuleSchema,
  DetectionRuleItemSchema,
  ExpressionTreeNodeSchema,
  MultiProfileDataNodeSchema,
  PageDataProfileResponseSchema,
} from '../../src/models/dlp-data-profile.js';

describe('DetectionRuleItemSchema', () => {
  it('parses a data-pattern variant', () => {
    const r = DetectionRuleItemSchema.safeParse({
      detection_technique: 'regex',
      match_type: 'include',
      by_unique_count: true,
      confidence_level: 'high',
      occurrence_count: 5,
      occurrence_operator_type: 'more_than_equal_to',
    });
    expect(r.success).toBe(true);
  });

  it('parses a dictionary variant (with score fields)', () => {
    const r = DetectionRuleItemSchema.safeParse({
      detection_technique: 'dictionary',
      match_type: 'include',
      score: 50,
      score_low: 10,
      score_high: 100,
    });
    expect(r.success).toBe(true);
  });

  it('parses a document_classifier variant', () => {
    const r = DetectionRuleItemSchema.safeParse({
      detection_technique: 'document_classifier',
      match_type: 'exclude',
      confidence_level: 'medium',
    });
    expect(r.success).toBe(true);
  });

  it('parses an edm variant (edm_dataset_id + primary_fields)', () => {
    const r = DetectionRuleItemSchema.safeParse({
      detection_technique: 'edm',
      edm_dataset_id: 'edm-123',
      primary_fields: ['ssn', 'dob'],
      primary_match_criteria: 'all',
      primary_match_any_count: 2,
      secondary_fields: ['name'],
      secondary_match_criteria: 'any',
      secondary_match_any_count: 1,
    });
    expect(r.success).toBe(true);
  });

  it('rejects unknown detection_technique', () => {
    const r = DetectionRuleItemSchema.safeParse({
      detection_technique: 'mystery',
      match_type: 'include',
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(JSON.stringify(r.error.issues)).toContain('detection_technique');
    }
  });

  it('rejects when detection_technique missing', () => {
    expect(
      DetectionRuleItemSchema.safeParse({
        match_type: 'include',
      }).success,
    ).toBe(false);
  });

  it('rejects unknown match_type', () => {
    expect(
      DetectionRuleItemSchema.safeParse({
        detection_technique: 'regex',
        match_type: 'mystery',
      }).success,
    ).toBe(false);
  });

  it('rejects unknown occurrence_operator_type', () => {
    expect(
      DetectionRuleItemSchema.safeParse({
        detection_technique: 'regex',
        occurrence_operator_type: 'wat',
      }).success,
    ).toBe(false);
  });
});

describe('ExpressionTreeNodeSchema (recursive)', () => {
  it('parses a leaf node with a single rule_item', () => {
    const r = ExpressionTreeNodeSchema.safeParse({
      operator_type: 'and',
      rule_item: {
        detection_technique: 'regex',
        match_type: 'include',
      },
    });
    expect(r.success).toBe(true);
  });

  it('parses a 3-level-deep nested tree', () => {
    const r = ExpressionTreeNodeSchema.safeParse({
      operator_type: 'or',
      sub_expressions: [
        {
          operator_type: 'and',
          sub_expressions: [
            {
              operator_type: 'not',
              rule_item: { detection_technique: 'dictionary', match_type: 'exclude' },
            },
            {
              operator_type: 'and',
              rule_item: {
                detection_technique: 'edm',
                edm_dataset_id: 'e1',
                primary_fields: ['x'],
              },
            },
          ],
        },
        {
          operator_type: 'or_not',
          rule_item: { detection_technique: 'regex', match_type: 'include' },
        },
      ],
    });
    expect(r.success).toBe(true);
  });

  it('accepts all 5 operator_type values', () => {
    for (const op of ['and', 'or', 'not', 'and_not', 'or_not'] as const) {
      expect(ExpressionTreeNodeSchema.safeParse({ operator_type: op }).success).toBe(true);
    }
  });

  it('rejects unknown operator_type', () => {
    expect(ExpressionTreeNodeSchema.safeParse({ operator_type: 'xor' }).success).toBe(false);
  });
});

describe('MultiProfileDataNodeSchema', () => {
  it('parses data_profile_ids + operator_type', () => {
    const r = MultiProfileDataNodeSchema.safeParse({
      data_profile_ids: [1, 2, 3],
      operator_type: 'and',
    });
    expect(r.success).toBe(true);
  });

  it('accepts empty body', () => {
    expect(MultiProfileDataNodeSchema.safeParse({}).success).toBe(true);
  });
});

describe('DetectionRuleSchema (discriminated by rule_type)', () => {
  it('parses expression_tree variant', () => {
    const r = DetectionRuleSchema.safeParse({
      rule_type: 'expression_tree',
      expression_tree: {
        operator_type: 'and',
        rule_item: { detection_technique: 'regex', match_type: 'include' },
      },
    });
    expect(r.success).toBe(true);
    if (r.success && r.data.rule_type === 'expression_tree') {
      expect(r.data.expression_tree?.operator_type).toBe('and');
    }
  });

  it('parses multi_profile variant', () => {
    const r = DetectionRuleSchema.safeParse({
      rule_type: 'multi_profile',
      multi_profile: {
        data_profile_ids: [10, 20],
        operator_type: 'or',
      },
    });
    expect(r.success).toBe(true);
    if (r.success && r.data.rule_type === 'multi_profile') {
      expect(r.data.multi_profile?.data_profile_ids).toEqual([10, 20]);
    }
  });

  it('rejects unknown rule_type', () => {
    const r = DetectionRuleSchema.safeParse({ rule_type: 'mystery' });
    expect(r.success).toBe(false);
  });

  it('rejects when rule_type missing', () => {
    expect(DetectionRuleSchema.safeParse({}).success).toBe(false);
  });
});

describe('AdvancedDataProfileRequestSchema', () => {
  it('parses a minimal valid request', () => {
    const r = AdvancedDataProfileRequestSchema.safeParse({
      name: 'My Profile',
      detection_rules: [
        {
          rule_type: 'expression_tree',
          expression_tree: {
            operator_type: 'and',
            rule_item: { detection_technique: 'regex', match_type: 'include' },
          },
        },
      ],
    });
    expect(r.success).toBe(true);
  });

  it('parses a mixed-mode detection_rules array', () => {
    const r = AdvancedDataProfileRequestSchema.safeParse({
      name: 'Mixed',
      description: 'tree + multi',
      is_granular_data_profile: true,
      detection_rules: [
        {
          rule_type: 'expression_tree',
          expression_tree: {
            operator_type: 'and',
            rule_item: { detection_technique: 'dictionary', match_type: 'include' },
          },
        },
        {
          rule_type: 'multi_profile',
          multi_profile: { data_profile_ids: [99], operator_type: 'or' },
        },
      ],
    });
    expect(r.success).toBe(true);
  });

  it('rejects when name missing', () => {
    expect(
      AdvancedDataProfileRequestSchema.safeParse({
        detection_rules: [],
      }).success,
    ).toBe(false);
  });

  it('rejects when detection_rules missing', () => {
    expect(
      AdvancedDataProfileRequestSchema.safeParse({
        name: 'X',
      }).success,
    ).toBe(false);
  });

  it('rejects empty name (minLength 1)', () => {
    expect(
      AdvancedDataProfileRequestSchema.safeParse({
        name: '',
        detection_rules: [],
      }).success,
    ).toBe(false);
  });

  it('rejects name longer than 64 chars', () => {
    expect(
      AdvancedDataProfileRequestSchema.safeParse({
        name: 'x'.repeat(65),
        detection_rules: [],
      }).success,
    ).toBe(false);
  });
});

describe('DataProfilePatchRequestSchema', () => {
  it('parses a mixed-mode patch with multiple jsonNullable fields', () => {
    const r = DataProfilePatchRequestSchema.safeParse({
      name: 'Renamed',
      profile_type: 'basic',
      description: null,
      detection_rules: null,
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.description).toBeNull();
      expect(r.data.detection_rules).toBeNull();
    }
  });

  it('parses a patch with omitted optional jsonNullable fields', () => {
    const r = DataProfilePatchRequestSchema.safeParse({
      name: 'Renamed',
      profile_type: 'advanced',
    });
    expect(r.success).toBe(true);
  });

  it('rejects when required name missing', () => {
    expect(
      DataProfilePatchRequestSchema.safeParse({
        profile_type: 'basic',
      }).success,
    ).toBe(false);
  });

  it('rejects when required profile_type missing', () => {
    expect(
      DataProfilePatchRequestSchema.safeParse({
        name: 'X',
      }).success,
    ).toBe(false);
  });

  it('accepts both profile_type values', () => {
    for (const profile_type of ['basic', 'advanced'] as const) {
      expect(
        DataProfilePatchRequestSchema.safeParse({
          name: 'X',
          profile_type,
        }).success,
      ).toBe(true);
    }
  });
});

const responseFixture = {
  id: 'profile-123',
  name: 'Confidential',
  description: 'Confidential data profile',
  tenant_id: 'tenant-xyz',
  type: 'custom',
  profile_status: 'active',
  profile_type: 'advanced',
  is_granular_data_profile: false,
  is_parent_managed: false,
  version: 2,
  advance_data_patterns_rule_request: ['adv-1', 'adv-2'],
  detection_rules: [
    {
      rule_type: 'expression_tree',
      expression_tree: {
        operator_type: 'and',
        rule_item: { detection_technique: 'regex', match_type: 'include' },
      },
    },
  ],
  audit_metadata: {
    created_at: '2026-01-01T00:00:00Z',
    created_by: 'alice',
    updated_at: '2026-02-01T00:00:00Z',
    updated_by: 'bob',
  },
};

describe('DataProfileResponseSchema', () => {
  it('parses the full response fixture', () => {
    const r = DataProfileResponseSchema.safeParse(responseFixture);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.id).toBe('profile-123');
      expect(r.data.audit_metadata?.created_by).toBe('alice');
    }
  });

  it('accepts all 3 profile_status values', () => {
    for (const profile_status of ['active', 'disabled', 'deleted'] as const) {
      expect(DataProfileResponseSchema.safeParse({ profile_status }).success).toBe(true);
    }
  });

  it('accepts both type enum values', () => {
    for (const type of ['custom', 'predefined'] as const) {
      expect(DataProfileResponseSchema.safeParse({ type }).success).toBe(true);
    }
  });

  it('rejects unknown profile_status', () => {
    expect(DataProfileResponseSchema.safeParse({ profile_status: 'pending' }).success).toBe(false);
  });

  it('passes through unknown fields (forward-compat)', () => {
    expect(
      DataProfileResponseSchema.safeParse({ ...responseFixture, future_field: 'ok' }).success,
    ).toBe(true);
  });
});

describe('PageDataProfileResponseSchema', () => {
  it('parses a Spring Page envelope with one entry', () => {
    const r = PageDataProfileResponseSchema.safeParse({
      content: [responseFixture],
      empty: false,
      first: true,
      last: true,
      number: 0,
      numberOfElements: 1,
      size: 20,
      totalElements: 1,
      totalPages: 1,
      pageable: {
        offset: 0,
        pageNumber: 0,
        pageSize: 20,
        paged: true,
        unpaged: false,
        sort: { empty: true, sorted: false, unsorted: true },
      },
      sort: { empty: true, sorted: false, unsorted: true },
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.content).toHaveLength(1);
      expect(r.data.content[0].id).toBe('profile-123');
    }
  });
});
