import { describe, it, expect } from 'vitest';
import {
  AppExclusionSchema,
  DataFilteringDetailsSchema,
  DataFilteringProfileRequestSchema,
  DataFilteringProfileResponseSchema,
  DataFilteringRuleDTOSchema,
  DestinationAttributesSchema,
  ExceptionRuleDTOSchema,
  ExclusionsSchema,
  PageDataFilteringProfileResponseSchema,
  SourceAttributesSchema,
  URLExclusionSchema,
} from '../../src/models/dlp-data-filtering-profile.js';

const responseFixture = {
  id: 'dfp-abc-123',
  name: 'Finance Files',
  description: 'Profile for finance department',
  tenant_id: 'tenant-xyz',
  type: 'standard',
  data_profile_id: 4242,
  direction: 'BOTH',
  file_based: true,
  non_file_based: false,
  log_severity: 'HIGH',
  scan_type: 'include',
  is_end_user_coaching_enabled: true,
  is_granular_profile: false,
  is_parent_managed: false,
  euc_template_id: 'euc-1',
  version: 7,
  file_type: ['pdf', 'docx'],
  audit_metadata: {
    created_at: '2026-01-02T03:04:05Z',
    created_by: 'alice@example.com',
    updated_at: '2026-02-03T04:05:06Z',
    updated_by: 'bob@example.com',
  },
  criteria_details: [
    {
      action: 'BLOCK',
      dataProfileId: 99,
      direction: 'UPLOAD',
      euc_template_id: 'euc-2',
      fileBased: 'true',
      fileTypes: ['csv'],
      is_end_user_coaching_enabled: true,
      logSeverity: 'CRITICAL',
      nonFileBased: 'false',
      scanType: 'include',
    },
  ],
  exception_rules: [
    {
      id: 'ex-1',
      action: 'ALLOW',
      data_profile_ids: [1, 2, 3],
      log_severity: 'MEDIUM',
      destination_attributes: {
        match_any: true,
        app_ids: ['app-1'],
        url_patterns: ['https://*.example.com'],
      },
      source_attributes: {
        match_any: false,
        user_group_ids: ['ug-1'],
        user_ids: ['u-1', 'u-2'],
      },
    },
  ],
  exclusions: {
    app_exclusion_list: [{ app_id: 'a-1', app_name: 'A1', type: 'cloud' }],
    url_exclusion_list: [{ url_id: 'u-1', url_name: 'U1', type: 'regex' }],
    exclusion_list: {
      'cc-numbers': ['4111-*', '4222-*'],
      ssn: ['123-*'],
    },
  },
  rule1: { action: 'BLOCK', response_page: 'rp-1', show_rsp_page: 'true' },
  rule2: { action: 'ALERT', response_page: 'rp-2', show_rsp_page: 'false' },
};

describe('AppExclusionSchema', () => {
  it('parses with all fields', () => {
    expect(AppExclusionSchema.safeParse({ app_id: 'a', app_name: 'A', type: 't' }).success).toBe(
      true,
    );
  });
  it('parses with all fields omitted (all optional)', () => {
    expect(AppExclusionSchema.safeParse({}).success).toBe(true);
  });
});

describe('URLExclusionSchema', () => {
  it('parses with all fields', () => {
    expect(URLExclusionSchema.safeParse({ type: 't', url_id: 'u', url_name: 'n' }).success).toBe(
      true,
    );
  });
});

describe('SourceAttributesSchema', () => {
  it('parses sample source attributes', () => {
    expect(
      SourceAttributesSchema.safeParse({
        match_any: true,
        user_group_ids: ['g1'],
        user_ids: ['u1'],
      }).success,
    ).toBe(true);
  });
});

describe('DestinationAttributesSchema', () => {
  it('parses sample destination attributes', () => {
    expect(
      DestinationAttributesSchema.safeParse({
        match_any: false,
        app_ids: ['a1'],
        url_patterns: ['p1'],
      }).success,
    ).toBe(true);
  });
});

describe('DataFilteringRuleDTOSchema', () => {
  it('parses a rule', () => {
    expect(
      DataFilteringRuleDTOSchema.safeParse({
        action: 'BLOCK',
        response_page: 'rp',
        show_rsp_page: 'true',
      }).success,
    ).toBe(true);
  });
});

describe('DataFilteringDetailsSchema', () => {
  it('parses details with camelCase keys per spec', () => {
    expect(
      DataFilteringDetailsSchema.safeParse({
        action: 'ALERT',
        dataProfileId: 7,
        direction: 'DOWNLOAD',
        fileBased: 'true',
        fileTypes: ['pdf'],
        is_end_user_coaching_enabled: true,
        logSeverity: 'LOW',
        nonFileBased: 'false',
        scanType: 'exclude',
        euc_template_id: 'euc',
      }).success,
    ).toBe(true);
  });
});

describe('ExceptionRuleDTOSchema', () => {
  it('accepts ALLOW/ALERT/BLOCK actions', () => {
    for (const action of ['ALLOW', 'ALERT', 'BLOCK'] as const) {
      expect(ExceptionRuleDTOSchema.safeParse({ action }).success).toBe(true);
    }
  });
  it('rejects unknown action', () => {
    expect(ExceptionRuleDTOSchema.safeParse({ action: 'DENY' }).success).toBe(false);
  });
  it('accepts all 5 log_severity values', () => {
    for (const log_severity of ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFORMATIONAL'] as const) {
      expect(ExceptionRuleDTOSchema.safeParse({ log_severity }).success).toBe(true);
    }
  });
});

describe('ExclusionsSchema', () => {
  it('parses exclusion_list as a record of string-array', () => {
    const r = ExclusionsSchema.safeParse({
      exclusion_list: { foo: ['a', 'b'], bar: ['c'] },
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.exclusion_list).toEqual({ foo: ['a', 'b'], bar: ['c'] });
    }
  });
  it('rejects exclusion_list values that are not string arrays', () => {
    expect(ExclusionsSchema.safeParse({ exclusion_list: { foo: [1, 2] } }).success).toBe(false);
  });
});

describe('DataFilteringProfileRequestSchema', () => {
  it('parses a minimal request (required fields only)', () => {
    expect(
      DataFilteringProfileRequestSchema.safeParse({
        file_based: true,
        non_file_based: false,
      }).success,
    ).toBe(true);
  });
  it('rejects when file_based is missing', () => {
    expect(DataFilteringProfileRequestSchema.safeParse({ non_file_based: false }).success).toBe(
      false,
    );
  });
  it('rejects when non_file_based is missing', () => {
    expect(DataFilteringProfileRequestSchema.safeParse({ file_based: true }).success).toBe(false);
  });
  it('accepts all direction enums', () => {
    for (const direction of ['BOTH', 'UPLOAD', 'DOWNLOAD'] as const) {
      expect(
        DataFilteringProfileRequestSchema.safeParse({
          file_based: true,
          non_file_based: false,
          direction,
        }).success,
      ).toBe(true);
    }
  });
  it('rejects unknown direction', () => {
    expect(
      DataFilteringProfileRequestSchema.safeParse({
        file_based: true,
        non_file_based: false,
        direction: 'SIDEWAYS',
      }).success,
    ).toBe(false);
  });
  it('accepts all log_severity enums', () => {
    for (const log_severity of ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFORMATIONAL'] as const) {
      expect(
        DataFilteringProfileRequestSchema.safeParse({
          file_based: true,
          non_file_based: false,
          log_severity,
        }).success,
      ).toBe(true);
    }
  });
  it('accepts include/exclude scan_type', () => {
    for (const scan_type of ['include', 'exclude'] as const) {
      expect(
        DataFilteringProfileRequestSchema.safeParse({
          file_based: true,
          non_file_based: false,
          scan_type,
        }).success,
      ).toBe(true);
    }
  });
});

describe('DataFilteringProfileResponseSchema', () => {
  it('parses the full response fixture', () => {
    const r = DataFilteringProfileResponseSchema.safeParse(responseFixture);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.id).toBe('dfp-abc-123');
      expect(r.data.audit_metadata?.created_by).toBe('alice@example.com');
      expect(r.data.exclusions?.exclusion_list?.['cc-numbers']).toEqual(['4111-*', '4222-*']);
    }
  });
  it('passes through unknown fields (forward-compat)', () => {
    expect(
      DataFilteringProfileResponseSchema.safeParse({
        ...responseFixture,
        future_field: 'ok',
      }).success,
    ).toBe(true);
  });
  it('parses an empty response', () => {
    expect(DataFilteringProfileResponseSchema.safeParse({}).success).toBe(true);
  });
});

describe('PageDataFilteringProfileResponseSchema', () => {
  it('parses a Spring Page envelope with content', () => {
    const r = PageDataFilteringProfileResponseSchema.safeParse({
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
      expect(r.data.content[0].name).toBe('Finance Files');
    }
  });
});
