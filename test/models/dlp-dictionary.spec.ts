import { describe, it, expect } from 'vitest';
import {
  DictionaryMetaDataDTOSchema,
  DictionaryPatchRequestSchema,
  DictionaryRequestSchema,
  DictionaryResponseSchema,
  DictionaryTagsSchema,
  PageDictionaryResponseSchema,
  ResourceModelExtensionSchema,
} from '../../src/models/dlp-dictionary.js';

const responseFixture = {
  id: 'dict-abc',
  name: 'PII Keywords',
  description: 'PII keyword list',
  category: 'Confidential',
  region_name: 'us',
  type: 'custom',
  is_case_sensitive: false,
  is_parent_managed: false,
  detection_technique: 'dictionary',
  detection_sub_technique: 'threshold',
  dictionary_metadata: {
    number_of_keywords: 42,
    original_file_name: 'pii.txt',
    original_file_size_in_byte: 2048,
  },
  keywords: ['ssn', 'dob'],
  tags: { classification: ['pab', 'endpoint'] },
  attributes: [
    { key: 'k1', value: 'v1' },
    { key: 'k2', value: 'v2' },
  ],
  audit_metadata: {
    created_at: '2026-01-01T00:00:00Z',
    created_by: 'alice@example.com',
    updated_at: '2026-02-01T00:00:00Z',
    updated_by: 'bob@example.com',
  },
};

describe('DictionaryMetaDataDTOSchema', () => {
  it('parses sample metadata', () => {
    expect(
      DictionaryMetaDataDTOSchema.safeParse({
        number_of_keywords: 5,
        original_file_name: 'a.txt',
        original_file_size_in_byte: 100,
      }).success,
    ).toBe(true);
  });
  it('parses empty metadata', () => {
    expect(DictionaryMetaDataDTOSchema.safeParse({}).success).toBe(true);
  });
});

describe('DictionaryTagsSchema', () => {
  it('accepts pab/endpoint classification values', () => {
    for (const cls of ['pab', 'endpoint'] as const) {
      expect(DictionaryTagsSchema.safeParse({ classification: [cls] }).success).toBe(true);
    }
  });
  it('rejects unknown classification value', () => {
    expect(DictionaryTagsSchema.safeParse({ classification: ['mobile'] }).success).toBe(false);
  });
});

describe('ResourceModelExtensionSchema', () => {
  it('parses k/v pair', () => {
    expect(ResourceModelExtensionSchema.safeParse({ key: 'k', value: 'v' }).success).toBe(true);
  });
});

describe('DictionaryRequestSchema', () => {
  it('parses a minimal valid request (required: category, name, original_file_name, region_name)', () => {
    expect(
      DictionaryRequestSchema.safeParse({
        category: 'Financial',
        name: 'D1',
        original_file_name: 'd.txt',
        region_name: 'us',
      }).success,
    ).toBe(true);
  });
  it('accepts all 9 category enum values (including "Source Code" with a space)', () => {
    for (const category of [
      'Academic',
      'Confidential',
      'Employment',
      'Financial',
      'Government',
      'Healthcare',
      'Legal',
      'Marketing',
      'Source Code',
    ] as const) {
      expect(
        DictionaryRequestSchema.safeParse({
          category,
          name: 'D',
          original_file_name: 'd.txt',
          region_name: 'us',
        }).success,
      ).toBe(true);
    }
  });
  it('rejects unknown category', () => {
    expect(
      DictionaryRequestSchema.safeParse({
        category: 'Mystery',
        name: 'D',
        original_file_name: 'd.txt',
        region_name: 'us',
      }).success,
    ).toBe(false);
  });
  it('rejects when category missing', () => {
    expect(
      DictionaryRequestSchema.safeParse({
        name: 'D',
        original_file_name: 'd.txt',
        region_name: 'us',
      }).success,
    ).toBe(false);
  });
  it('rejects when name missing', () => {
    expect(
      DictionaryRequestSchema.safeParse({
        category: 'Financial',
        original_file_name: 'd.txt',
        region_name: 'us',
      }).success,
    ).toBe(false);
  });
  it('rejects when original_file_name missing', () => {
    expect(
      DictionaryRequestSchema.safeParse({
        category: 'Financial',
        name: 'D',
        region_name: 'us',
      }).success,
    ).toBe(false);
  });
  it('rejects when region_name missing', () => {
    expect(
      DictionaryRequestSchema.safeParse({
        category: 'Financial',
        name: 'D',
        original_file_name: 'd.txt',
      }).success,
    ).toBe(false);
  });
  it('accepts predefined / custom type', () => {
    for (const type of ['predefined', 'custom'] as const) {
      expect(
        DictionaryRequestSchema.safeParse({
          category: 'Financial',
          name: 'D',
          original_file_name: 'd.txt',
          region_name: 'us',
          type,
        }).success,
      ).toBe(true);
    }
  });
});

describe('DictionaryPatchRequestSchema', () => {
  it('parses a patch clearing description with null', () => {
    const r = DictionaryPatchRequestSchema.safeParse({
      category: 'Financial',
      name: 'D',
      original_file_name: 'd.txt',
      description: null,
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.description).toBeNull();
  });
  it('parses a patch with all jsonNullable fields omitted', () => {
    expect(
      DictionaryPatchRequestSchema.safeParse({
        category: 'Financial',
        name: 'D',
        original_file_name: 'd.txt',
      }).success,
    ).toBe(true);
  });
  it('rejects when required name missing', () => {
    expect(
      DictionaryPatchRequestSchema.safeParse({
        category: 'Financial',
        original_file_name: 'd.txt',
      }).success,
    ).toBe(false);
  });
});

describe('DictionaryResponseSchema', () => {
  it('parses the full response fixture', () => {
    const r = DictionaryResponseSchema.safeParse(responseFixture);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.id).toBe('dict-abc');
      expect(r.data.dictionary_metadata?.number_of_keywords).toBe(42);
      expect(r.data.keywords).toEqual(['ssn', 'dob']);
    }
  });
  it('accepts all 8 detection_sub_technique enum values', () => {
    for (const v of [
      'dnn',
      'gamma',
      'ml_gateway',
      'encoding',
      'password_protected',
      'encryption',
      'compression',
      'threshold',
    ] as const) {
      expect(DictionaryResponseSchema.safeParse({ detection_sub_technique: v }).success).toBe(true);
    }
  });
  it('accepts all 13 detection_technique enum values', () => {
    for (const v of [
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
    ] as const) {
      expect(DictionaryResponseSchema.safeParse({ detection_technique: v }).success).toBe(true);
    }
  });
  it('rejects unknown detection_sub_technique', () => {
    expect(DictionaryResponseSchema.safeParse({ detection_sub_technique: 'mystery' }).success).toBe(
      false,
    );
  });
  it('passes through unknown fields', () => {
    expect(
      DictionaryResponseSchema.safeParse({ ...responseFixture, future_field: 'ok' }).success,
    ).toBe(true);
  });
  it('accepts null for nullable string/boolean/object fields per live API (issue #158)', () => {
    const r = DictionaryResponseSchema.safeParse({
      ...responseFixture,
      description: null,
      is_case_sensitive: null,
      region_name: null,
      tags: null,
      keywords: null,
    });
    expect(r.success).toBe(true);
  });
  it('accepts null audit_metadata fields (live API emits null on unset)', () => {
    const r = DictionaryResponseSchema.safeParse({
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
});

describe('PageDictionaryResponseSchema', () => {
  it('parses a Spring Page envelope', () => {
    const r = PageDictionaryResponseSchema.safeParse({
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
    if (r.success) expect(r.data.content[0].id).toBe('dict-abc');
  });
});
