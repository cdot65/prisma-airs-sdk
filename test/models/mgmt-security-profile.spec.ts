import { describe, it, expect } from 'vitest';
import {
  SecurityProfileSchema,
  CreateSecurityProfileRequestSchema,
  SecurityProfileListResponseSchema,
  DeleteProfileResponseSchema,
  DeleteProfileConflictSchema,
  PolicySchema,
  AiSecurityProfileSchema,
  ModelConfigurationSchema,
  PolicyLatencySchema,
  DataProtectionSchema,
  PolicyAppProtectionSchema,
  TopicObjectSchema,
  TopicArraySchema,
  ModelProtectionItemSchema,
  AgentProtectionItemSchema,
  DlpDataProfilePolicySchema,
  DlpRuleSchema,
  UrlCategorySchema,
  MaliciousCodeProtectionSchema,
  DataLeakDetectionMemberSchema,
  DatabaseSecurityItemSchema,
} from '../../src/models/mgmt-security-profile.js';

// ── Realistic test data matching actual AIRS API ──────────────────────────

const realisticPolicy = {
  'ai-security-profiles': [
    {
      'model-type': 'default',
      'model-configuration': {
        'mask-data-in-storage': false,
        latency: {
          'inline-timeout-action': 'block',
          'max-inline-latency': 5,
        },
        'data-protection': {
          'data-leak-detection': {
            member: [{ text: 'SSN Detection', id: 'dlp-1', version: '1' }],
            action: 'block',
            'mask-data-inline': true,
          },
          'database-security': [{ name: 'db-sec-rule', action: 'alert' }],
        },
        'app-protection': {
          'alert-url-category': { member: ['news'] },
          'block-url-category': { member: ['malware'] },
          'allow-url-category': { member: ['business'] },
          'default-url-category': { member: ['uncategorized'] },
          'url-detected-action': 'block',
          'malicious-code-protection': { name: 'code-guard', action: 'block' },
        },
        'model-protection': [
          {
            name: 'topic-guardrail',
            action: 'block',
            'topic-list': [
              {
                action: 'block',
                topic: [{ topic_name: 'PII', topic_id: 'tid-1', revision: 3 }],
              },
            ],
          },
        ],
        'agent-protection': [{ name: 'malicious-agent', action: 'alert' }],
      },
    },
  ],
  'dlp-data-profiles': [
    {
      name: 'credit-cards',
      uuid: 'dlp-uuid-1',
      id: 'dlp-id-1',
      version: '2',
      rule1: { action: 'block' },
      rule2: { action: 'alert' },
      'log-severity': 'high',
      'non-file-based': 'enabled',
      'file-based': 'enabled',
    },
  ],
};

const validProfile = {
  profile_id: '550e8400-e29b-41d4-a716-446655440000',
  profile_name: 'test-profile',
  revision: 1,
  active: true,
  policy: realisticPolicy,
  created_by: 'admin@example.com',
  updated_by: 'admin@example.com',
  last_modified_ts: '2025-01-01T00:00:00Z',
};

// ── Leaf schema tests ─────────────────────────────────────────────────────

describe('PolicyLatencySchema', () => {
  it('parses valid latency', () => {
    const result = PolicyLatencySchema.parse({
      'inline-timeout-action': 'block',
      'max-inline-latency': 5,
    });
    expect(result['inline-timeout-action']).toBe('block');
    expect(result['max-inline-latency']).toBe(5);
  });

  it('allows extra fields via passthrough', () => {
    const result = PolicyLatencySchema.parse({
      'inline-timeout-action': 'allow',
      future_field: true,
    });
    expect((result as Record<string, unknown>).future_field).toBe(true);
  });
});

describe('DataLeakDetectionMemberSchema', () => {
  it('parses member with required text', () => {
    const result = DataLeakDetectionMemberSchema.parse({ text: 'SSN' });
    expect(result.text).toBe('SSN');
  });

  it('parses member with optional id and version', () => {
    const result = DataLeakDetectionMemberSchema.parse({
      text: 'SSN',
      id: 'dlp-1',
      version: '1',
    });
    expect(result.id).toBe('dlp-1');
    expect(result.version).toBe('1');
  });

  it('rejects missing text', () => {
    expect(() => DataLeakDetectionMemberSchema.parse({ id: 'dlp-1' })).toThrow();
  });
});

describe('DatabaseSecurityItemSchema', () => {
  it('parses item with required fields', () => {
    const result = DatabaseSecurityItemSchema.parse({ name: 'rule1', action: 'block' });
    expect(result.name).toBe('rule1');
  });

  it('rejects missing name', () => {
    expect(() => DatabaseSecurityItemSchema.parse({ action: 'block' })).toThrow();
  });

  it('rejects missing action', () => {
    expect(() => DatabaseSecurityItemSchema.parse({ name: 'rule1' })).toThrow();
  });
});

describe('DataProtectionSchema', () => {
  it('parses full data-protection object', () => {
    const result = DataProtectionSchema.parse({
      'data-leak-detection': {
        member: [{ text: 'SSN' }],
        action: 'block',
        'mask-data-inline': true,
      },
      'database-security': [{ name: 'db-rule', action: 'alert' }],
    });
    expect(result['data-leak-detection']?.action).toBe('block');
    expect(result['database-security']?.[0].name).toBe('db-rule');
  });

  it('allows null member and database-security (API returns null)', () => {
    const result = DataProtectionSchema.parse({
      'data-leak-detection': { member: null, action: '' },
      'database-security': null,
    });
    expect(result['data-leak-detection']?.member).toBeNull();
    expect(result['database-security']).toBeNull();
  });
});

describe('UrlCategorySchema', () => {
  it('parses category with member array', () => {
    const result = UrlCategorySchema.parse({ member: ['news', 'social'] });
    expect(result.member).toEqual(['news', 'social']);
  });

  it('allows null member', () => {
    const result = UrlCategorySchema.parse({ member: null });
    expect(result.member).toBeNull();
  });
});

describe('MaliciousCodeProtectionSchema', () => {
  it('parses with required fields', () => {
    const result = MaliciousCodeProtectionSchema.parse({ name: 'guard', action: 'block' });
    expect(result.name).toBe('guard');
  });

  it('rejects missing action', () => {
    expect(() => MaliciousCodeProtectionSchema.parse({ name: 'guard' })).toThrow();
  });
});

describe('PolicyAppProtectionSchema', () => {
  it('parses full app-protection', () => {
    const result = PolicyAppProtectionSchema.parse(
      realisticPolicy['ai-security-profiles'][0]['model-configuration']['app-protection'],
    );
    expect(result['url-detected-action']).toBe('block');
    expect(result['block-url-category']?.member).toEqual(['malware']);
    expect(result['malicious-code-protection']?.name).toBe('code-guard');
  });
});

describe('TopicObjectSchema', () => {
  it('parses with required fields', () => {
    const result = TopicObjectSchema.parse({
      topic_name: 'PII',
      topic_id: 'tid-1',
      revision: 3,
    });
    expect(result.topic_name).toBe('PII');
  });

  it('rejects missing topic_id', () => {
    expect(() => TopicObjectSchema.parse({ topic_name: 'PII', revision: 1 })).toThrow();
  });
});

describe('TopicArraySchema', () => {
  it('parses with required fields', () => {
    const result = TopicArraySchema.parse({
      action: 'block',
      topic: [{ topic_name: 'PII', topic_id: 'tid-1', revision: 1 }],
    });
    expect(result.topic).toHaveLength(1);
  });
});

describe('ModelProtectionItemSchema', () => {
  it('parses item with topic-list', () => {
    const result = ModelProtectionItemSchema.parse({
      name: 'guardrail',
      action: 'block',
      'topic-list': [
        {
          action: 'block',
          topic: [{ topic_name: 'PII', topic_id: 'tid-1', revision: 1 }],
        },
      ],
    });
    expect(result.name).toBe('guardrail');
    expect(result['topic-list']?.[0].topic[0].topic_name).toBe('PII');
  });

  it('parses item without topic-list', () => {
    const result = ModelProtectionItemSchema.parse({ name: 'simple', action: 'alert' });
    expect(result['topic-list']).toBeUndefined();
  });

  it('parses item with options array', () => {
    const result = ModelProtectionItemSchema.parse({
      name: 'guardrail',
      action: 'block',
      options: [],
    });
    // Type assertion: options should be unknown[] | undefined
    const _opts: unknown[] | undefined = result.options;
    expect(_opts).toEqual([]);
  });

  it('parses item without options (optional)', () => {
    const result = ModelProtectionItemSchema.parse({ name: 'simple', action: 'alert' });
    const _opts: unknown[] | undefined = result.options;
    expect(_opts).toBeUndefined();
  });
});

describe('AgentProtectionItemSchema', () => {
  it('parses with required fields', () => {
    const result = AgentProtectionItemSchema.parse({ name: 'mal-agent', action: 'block' });
    expect(result.name).toBe('mal-agent');
  });

  it('rejects missing name', () => {
    expect(() => AgentProtectionItemSchema.parse({ action: 'block' })).toThrow();
  });
});

describe('DlpRuleSchema', () => {
  it('parses with optional action', () => {
    const result = DlpRuleSchema.parse({ action: 'block' });
    expect(result.action).toBe('block');
  });

  it('parses empty object', () => {
    const result = DlpRuleSchema.parse({});
    expect(result.action).toBeUndefined();
  });
});

describe('DlpDataProfilePolicySchema', () => {
  it('parses full DLP data profile', () => {
    const result = DlpDataProfilePolicySchema.parse(realisticPolicy['dlp-data-profiles'][0]);
    expect(result.name).toBe('credit-cards');
    expect(result.uuid).toBe('dlp-uuid-1');
    expect(result.rule1?.action).toBe('block');
    expect(result['log-severity']).toBe('high');
  });

  it('parses minimal DLP data profile', () => {
    const result = DlpDataProfilePolicySchema.parse({ name: 'minimal', uuid: 'u1' });
    expect(result.name).toBe('minimal');
    expect(result.rule1).toBeUndefined();
  });

  it('parses DLP data profile with description', () => {
    const result = DlpDataProfilePolicySchema.parse({
      name: 'with-desc',
      uuid: 'u2',
      description: 'Detects credit card numbers',
    });
    // Type assertion: description should be string | undefined
    const _desc: string | undefined = result.description;
    expect(_desc).toBe('Detects credit card numbers');
  });

  it('parses DLP data profile without description (optional)', () => {
    const result = DlpDataProfilePolicySchema.parse({ name: 'no-desc', uuid: 'u3' });
    const _desc: string | undefined = result.description;
    expect(_desc).toBeUndefined();
  });

  it('rejects missing name', () => {
    expect(() => DlpDataProfilePolicySchema.parse({ uuid: 'u1' })).toThrow();
  });

  it('rejects missing uuid', () => {
    expect(() => DlpDataProfilePolicySchema.parse({ name: 'n' })).toThrow();
  });
});

// ── Composite schema tests ────────────────────────────────────────────────

describe('ModelConfigurationSchema', () => {
  it('parses full model-configuration', () => {
    const modelConfig = realisticPolicy['ai-security-profiles'][0]['model-configuration'];
    const result = ModelConfigurationSchema.parse(modelConfig);
    expect(result['mask-data-in-storage']).toBe(false);
    expect(result.latency?.['inline-timeout-action']).toBe('block');
    expect(result['data-protection']?.['data-leak-detection']?.action).toBe('block');
    expect(result['app-protection']?.['url-detected-action']).toBe('block');
    expect(result['model-protection']?.[0].name).toBe('topic-guardrail');
    expect(result['agent-protection']?.[0].name).toBe('malicious-agent');
  });

  it('allows extra fields via passthrough', () => {
    const result = ModelConfigurationSchema.parse({ future_setting: true });
    expect((result as Record<string, unknown>).future_setting).toBe(true);
  });
});

describe('AiSecurityProfileSchema', () => {
  it('parses full ai-security-profile item', () => {
    const result = AiSecurityProfileSchema.parse(realisticPolicy['ai-security-profiles'][0]);
    expect(result['model-type']).toBe('default');
    expect(result['model-configuration']?.['mask-data-in-storage']).toBe(false);
  });

  it('parses minimal item', () => {
    const result = AiSecurityProfileSchema.parse({});
    expect(result['model-type']).toBeUndefined();
  });

  it('allows extra fields via passthrough', () => {
    const result = AiSecurityProfileSchema.parse({ 'new-field': 'val' });
    expect((result as Record<string, unknown>)['new-field']).toBe('val');
  });
});

describe('PolicySchema', () => {
  it('parses full realistic policy', () => {
    const result = PolicySchema.parse(realisticPolicy);
    expect(result['ai-security-profiles']).toHaveLength(1);
    expect(result['ai-security-profiles']?.[0]['model-type']).toBe('default');
    expect(result['dlp-data-profiles']).toHaveLength(1);
    expect(result['dlp-data-profiles']?.[0].name).toBe('credit-cards');
  });

  it('parses minimal policy (empty arrays)', () => {
    const result = PolicySchema.parse({
      'ai-security-profiles': [],
      'dlp-data-profiles': [],
    });
    expect(result['ai-security-profiles']).toHaveLength(0);
    expect(result['dlp-data-profiles']).toHaveLength(0);
  });

  it('parses policy with no arrays (all optional)', () => {
    const result = PolicySchema.parse({});
    expect(result['ai-security-profiles']).toBeUndefined();
  });

  it('allows extra fields via passthrough', () => {
    const result = PolicySchema.parse({ future_policy_field: 'test' });
    expect((result as Record<string, unknown>).future_policy_field).toBe('test');
  });
});

// ── Top-level profile schemas ─────────────────────────────────────────────

describe('SecurityProfileSchema', () => {
  it('parses valid profile with realistic policy', () => {
    const result = SecurityProfileSchema.parse(validProfile);
    expect(result.profile_id).toBe('550e8400-e29b-41d4-a716-446655440000');
    expect(result.profile_name).toBe('test-profile');
    expect(result.active).toBe(true);
    expect(result.policy?.['ai-security-profiles']?.[0]['model-type']).toBe('default');
  });

  it('allows extra fields via passthrough', () => {
    const result = SecurityProfileSchema.parse({ ...validProfile, new_field: 'test' });
    expect((result as Record<string, unknown>).new_field).toBe('test');
  });

  it('parses profile with csp_id and tsg_id', () => {
    const result = SecurityProfileSchema.parse({
      ...validProfile,
      csp_id: 'csp-abc-123',
      tsg_id: 'tsg-def-456',
    });
    expect(result.csp_id).toBe('csp-abc-123');
    expect(result.tsg_id).toBe('tsg-def-456');
    // Type assertion: csp_id and tsg_id should be string | undefined, not unknown
    const _cspId: string | undefined = result.csp_id;
    const _tsgId: string | undefined = result.tsg_id;
    expect(_cspId).toBe('csp-abc-123');
    expect(_tsgId).toBe('tsg-def-456');
  });

  it('parses profile without csp_id and tsg_id (optional)', () => {
    const result = SecurityProfileSchema.parse(validProfile);
    const _cspId: string | undefined = result.csp_id;
    const _tsgId: string | undefined = result.tsg_id;
    expect(_cspId).toBeUndefined();
    expect(_tsgId).toBeUndefined();
  });

  it('rejects missing profile_name', () => {
    const noName = { ...validProfile };
    delete (noName as Record<string, unknown>).profile_name;
    expect(() => SecurityProfileSchema.parse(noName)).toThrow();
  });
});

describe('CreateSecurityProfileRequestSchema', () => {
  it('parses without profile_id', () => {
    const noId = { ...validProfile };
    delete (noId as Record<string, unknown>).profile_id;
    const result = CreateSecurityProfileRequestSchema.parse(noId);
    expect(result.profile_name).toBe('test-profile');
    expect(result.profile_id).toBeUndefined();
  });

  it('parses with profile_id', () => {
    const result = CreateSecurityProfileRequestSchema.parse(validProfile);
    expect(result.profile_id).toBe('550e8400-e29b-41d4-a716-446655440000');
  });
});

describe('SecurityProfileListResponseSchema', () => {
  it('parses profile list', () => {
    const result = SecurityProfileListResponseSchema.parse({
      ai_profiles: [validProfile],
      next_offset: 10,
    });
    expect(result.ai_profiles).toHaveLength(1);
    expect(result.next_offset).toBe(10);
  });

  it('parses without next_offset', () => {
    const result = SecurityProfileListResponseSchema.parse({
      ai_profiles: [],
    });
    expect(result.ai_profiles).toHaveLength(0);
    expect(result.next_offset).toBeUndefined();
  });
});

describe('DeleteProfileResponseSchema', () => {
  it('parses success', () => {
    const result = DeleteProfileResponseSchema.parse({ message: 'deleted' });
    expect(result.message).toBe('deleted');
  });
});

describe('DeleteProfileConflictSchema', () => {
  it('parses conflict with payload', () => {
    const result = DeleteProfileConflictSchema.parse({
      message: 'in use',
      payload: [{ policy_id: 'p1', policy_name: 'pol', priority: 1 }],
    });
    expect(result.payload).toHaveLength(1);
    expect(result.payload[0].policy_id).toBe('p1');
  });
});
