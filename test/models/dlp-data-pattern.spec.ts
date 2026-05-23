import { describe, it, expect } from 'vitest';
import {
  DataPatternDetectionConfigSchema,
  DataPatternMatchingRulesSchema,
  DataPatternPatchRequestSchema,
  DataPatternRequestSchema,
  DataPatternResponseSchema,
  DataPatternTagsSchema,
  MetadataCriterionSchema,
  PageDataPatternResponseSchema,
  WeightedRegexSchema,
} from '../../src/models/dlp-data-pattern.js';

const responseFixture = {
  id: 'dp-abc-123',
  name: 'SSN Pattern',
  description: 'US Social Security Numbers',
  tenant_id: 'tenant-xyz',
  type: 'custom',
  status: 'active',
  license_type: 'enterprise',
  is_parent_managed: false,
  version: 3,
  detection_config: {
    technique: 'weighted_regex',
    supported_confidence_levels: ['low', 'medium', 'high'],
  },
  matching_rules: {
    proximity_distance: 25,
    proximity_keywords: ['ssn', 'social'],
    regexes: [
      { regex: '\\d{3}-\\d{2}-\\d{4}', weight: 10 },
      { regex: '\\d{9}', weight: 5 },
    ],
    delimiter: ',',
    metadata_criteria: [
      { name: 'page_count', comparisonOperatorType: 'greater_than', type: 'integer', value: '2' },
    ],
  },
  tags: {
    classification: ['PII'],
    compliance: ['GDPR', 'HIPAA'],
    geography: ['US'],
  },
  audit_metadata: {
    created_at: '2026-01-02T03:04:05Z',
    created_by: 'alice@example.com',
    updated_at: '2026-02-03T04:05:06Z',
    updated_by: 'bob@example.com',
  },
};

describe('DataPatternDetectionConfigSchema', () => {
  it('parses minimal config (technique required)', () => {
    expect(DataPatternDetectionConfigSchema.safeParse({ technique: 'regex' }).success).toBe(true);
  });
  it('rejects when technique missing', () => {
    expect(DataPatternDetectionConfigSchema.safeParse({}).success).toBe(false);
  });
  it('accepts all 13 technique enum values', () => {
    const techniques = [
      'edm',
      'document_fingerprint',
      'trainable_classifier',
      'ml_document',
      'regex',
      'weighted_regex',
      'ml',
      'titus_tag',
      'wildfire',
      'file_property',
      'dictionary',
      'pab',
      'document_classifier',
    ] as const;
    for (const technique of techniques) {
      expect(DataPatternDetectionConfigSchema.safeParse({ technique }).success).toBe(true);
    }
  });
  it('rejects unknown technique', () => {
    expect(DataPatternDetectionConfigSchema.safeParse({ technique: 'mystery' }).success).toBe(
      false,
    );
  });
  it('accepts all 3 confidence-level values', () => {
    for (const level of ['low', 'medium', 'high'] as const) {
      expect(
        DataPatternDetectionConfigSchema.safeParse({
          technique: 'regex',
          supported_confidence_levels: [level],
        }).success,
      ).toBe(true);
    }
  });
  it('rejects unknown confidence level', () => {
    expect(
      DataPatternDetectionConfigSchema.safeParse({
        technique: 'regex',
        supported_confidence_levels: ['extreme'],
      }).success,
    ).toBe(false);
  });
});

describe('WeightedRegexSchema', () => {
  it('parses a valid regex+weight pair', () => {
    expect(WeightedRegexSchema.safeParse({ regex: 'foo', weight: 3 }).success).toBe(true);
  });
  it('rejects empty regex (minLength 1)', () => {
    expect(WeightedRegexSchema.safeParse({ regex: '', weight: 3 }).success).toBe(false);
  });
  it('rejects missing regex', () => {
    expect(WeightedRegexSchema.safeParse({ weight: 3 }).success).toBe(false);
  });
  it('rejects missing weight', () => {
    expect(WeightedRegexSchema.safeParse({ regex: 'x' }).success).toBe(false);
  });
});

describe('MetadataCriterionSchema', () => {
  it('parses sample criterion', () => {
    expect(
      MetadataCriterionSchema.safeParse({
        comparisonOperatorType: 'equal_to',
        name: 'author',
        type: 'string',
        value: 'alice',
      }).success,
    ).toBe(true);
  });
  it('accepts all 5 comparisonOperatorType values', () => {
    for (const op of [
      'less_than',
      'less_than_or_equal_to',
      'greater_than_or_equal_to',
      'greater_than',
      'equal_to',
    ] as const) {
      expect(MetadataCriterionSchema.safeParse({ comparisonOperatorType: op }).success).toBe(true);
    }
  });
  it('rejects unknown comparisonOperatorType', () => {
    expect(MetadataCriterionSchema.safeParse({ comparisonOperatorType: 'wat' }).success).toBe(
      false,
    );
  });
});

describe('DataPatternMatchingRulesSchema', () => {
  it('parses full rules block', () => {
    const r = DataPatternMatchingRulesSchema.safeParse({
      proximity_distance: 50,
      proximity_keywords: ['k1'],
      delimiter: '|',
      regexes: [{ regex: 'x', weight: 1 }],
      metadata_criteria: [{ name: 'n', type: 't', value: 'v' }],
    });
    expect(r.success).toBe(true);
  });
  it('rejects proximity_distance below 2', () => {
    expect(DataPatternMatchingRulesSchema.safeParse({ proximity_distance: 1 }).success).toBe(false);
  });
  it('rejects proximity_distance above 1000', () => {
    expect(DataPatternMatchingRulesSchema.safeParse({ proximity_distance: 1001 }).success).toBe(
      false,
    );
  });
  it('accepts the boundary values 2 and 1000', () => {
    expect(DataPatternMatchingRulesSchema.safeParse({ proximity_distance: 2 }).success).toBe(true);
    expect(DataPatternMatchingRulesSchema.safeParse({ proximity_distance: 1000 }).success).toBe(
      true,
    );
  });
});

describe('DataPatternTagsSchema', () => {
  it('parses tags with all three arrays', () => {
    expect(
      DataPatternTagsSchema.safeParse({
        classification: ['PII'],
        compliance: ['GDPR'],
        geography: ['EU'],
      }).success,
    ).toBe(true);
  });
  it('parses empty tags', () => {
    expect(DataPatternTagsSchema.safeParse({}).success).toBe(true);
  });
});

describe('DataPatternRequestSchema', () => {
  it('parses a minimal valid request', () => {
    expect(
      DataPatternRequestSchema.safeParse({
        name: 'P1',
        type: 'custom',
        detection_config: { technique: 'regex' },
      }).success,
    ).toBe(true);
  });
  it('rejects when name missing', () => {
    expect(
      DataPatternRequestSchema.safeParse({
        type: 'custom',
        detection_config: { technique: 'regex' },
      }).success,
    ).toBe(false);
  });
  it('rejects when type missing', () => {
    expect(
      DataPatternRequestSchema.safeParse({
        name: 'P1',
        detection_config: { technique: 'regex' },
      }).success,
    ).toBe(false);
  });
  it('rejects when detection_config missing', () => {
    expect(DataPatternRequestSchema.safeParse({ name: 'P1', type: 'custom' }).success).toBe(false);
  });
  it('rejects empty name (minLength 1)', () => {
    expect(
      DataPatternRequestSchema.safeParse({
        name: '',
        type: 'custom',
        detection_config: { technique: 'regex' },
      }).success,
    ).toBe(false);
  });
  it('rejects name > 64 chars (maxLength 64)', () => {
    expect(
      DataPatternRequestSchema.safeParse({
        name: 'x'.repeat(65),
        type: 'custom',
        detection_config: { technique: 'regex' },
      }).success,
    ).toBe(false);
  });
  it('accepts all 3 type enum values', () => {
    for (const type of ['predefined', 'custom', 'file_property'] as const) {
      expect(
        DataPatternRequestSchema.safeParse({
          name: 'P',
          type,
          detection_config: { technique: 'regex' },
        }).success,
      ).toBe(true);
    }
  });
  it('rejects unknown type', () => {
    expect(
      DataPatternRequestSchema.safeParse({
        name: 'P',
        type: 'mystery',
        detection_config: { technique: 'regex' },
      }).success,
    ).toBe(false);
  });
});

describe('DataPatternPatchRequestSchema', () => {
  it('parses a patch setting description to null (clear)', () => {
    const r = DataPatternPatchRequestSchema.safeParse({
      name: 'NewName',
      type: 'custom',
      detection_config: { technique: 'regex' },
      description: null,
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.description).toBeNull();
  });
  it('parses a patch with omitted optional jsonNullable fields', () => {
    const r = DataPatternPatchRequestSchema.safeParse({
      name: 'NewName',
      type: 'custom',
      detection_config: { technique: 'regex' },
    });
    expect(r.success).toBe(true);
  });
  it('allows tags to be set to null', () => {
    expect(
      DataPatternPatchRequestSchema.safeParse({
        name: 'X',
        type: 'custom',
        detection_config: { technique: 'regex' },
        tags: null,
      }).success,
    ).toBe(true);
  });
  it('rejects when required name missing', () => {
    expect(
      DataPatternPatchRequestSchema.safeParse({
        type: 'custom',
        detection_config: { technique: 'regex' },
      }).success,
    ).toBe(false);
  });
});

describe('DataPatternResponseSchema', () => {
  it('parses the full response fixture', () => {
    const r = DataPatternResponseSchema.safeParse(responseFixture);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.id).toBe('dp-abc-123');
      expect(r.data.audit_metadata?.created_by).toBe('alice@example.com');
      expect(r.data.matching_rules?.regexes?.[0].regex).toBe('\\d{3}-\\d{2}-\\d{4}');
    }
  });
  it('accepts all 5 status enum values', () => {
    for (const status of ['active', 'disabled', 'deleted', 'deprecated', 'silent'] as const) {
      expect(DataPatternResponseSchema.safeParse({ status }).success).toBe(true);
    }
  });
  it('rejects unknown status', () => {
    expect(DataPatternResponseSchema.safeParse({ status: 'pending' }).success).toBe(false);
  });
  it('accepts all 3 license_type enum values', () => {
    for (const license_type of ['standard', 'enterprise', 'essentials'] as const) {
      expect(DataPatternResponseSchema.safeParse({ license_type }).success).toBe(true);
    }
  });
  it('passes through unknown fields (forward-compat)', () => {
    expect(
      DataPatternResponseSchema.safeParse({ ...responseFixture, future_field: 'ok' }).success,
    ).toBe(true);
  });
  it('accepts null for nullable string/boolean/object fields per live API (issue #158)', () => {
    const r = DataPatternResponseSchema.safeParse({
      ...responseFixture,
      description: null,
      matching_rules: null,
      tags: null,
    });
    expect(r.success).toBe(true);
  });
  it('accepts null audit_metadata fields (live API emits null on unset)', () => {
    const r = DataPatternResponseSchema.safeParse({
      ...responseFixture,
      audit_metadata: {
        created_at: null,
        created_by: null,
        updated_at: 1779560642845,
        updated_by: null,
      },
    });
    expect(r.success).toBe(true);
  });
  it('accepts null on every nested matching_rules field per live API (issue #160)', () => {
    const r = DataPatternResponseSchema.safeParse({
      ...responseFixture,
      matching_rules: {
        delimiter: null,
        proximity_distance: null,
        proximity_keywords: null,
        regexes: null,
        metadata_criteria: null,
      },
    });
    expect(r.success).toBe(true);
  });
  it('accepts null on detection_config.supported_confidence_levels (defensive)', () => {
    const r = DataPatternResponseSchema.safeParse({
      ...responseFixture,
      detection_config: { technique: 'regex', supported_confidence_levels: null },
    });
    expect(r.success).toBe(true);
  });
  it('accepts null on tags inner array fields (defensive)', () => {
    const r = DataPatternResponseSchema.safeParse({
      ...responseFixture,
      tags: { classification: null, compliance: null, geography: null },
    });
    expect(r.success).toBe(true);
  });
  it('accepts null on metadata_criteria inner fields (defensive)', () => {
    const r = DataPatternResponseSchema.safeParse({
      ...responseFixture,
      matching_rules: {
        ...responseFixture.matching_rules,
        metadata_criteria: [{ comparisonOperatorType: null, name: null, type: null, value: null }],
      },
    });
    expect(r.success).toBe(true);
  });
});

describe('PageDataPatternResponseSchema', () => {
  it('parses a Spring Page envelope with one entry', () => {
    const r = PageDataPatternResponseSchema.safeParse({
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
      expect(r.data.content[0].id).toBe('dp-abc-123');
    }
  });
});
