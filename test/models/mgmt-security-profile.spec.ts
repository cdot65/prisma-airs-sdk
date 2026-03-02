import { describe, it, expect } from 'vitest';
import {
  SecurityProfileSchema,
  CreateSecurityProfileRequestSchema,
  SecurityProfileListResponseSchema,
  DeleteProfileResponseSchema,
  DeleteProfileConflictSchema,
} from '../../src/models/mgmt-security-profile.js';

const validProfile = {
  profile_id: '550e8400-e29b-41d4-a716-446655440000',
  profile_name: 'test-profile',
  revision: 1,
  active: true,
  policy: {
    'data-leak-detection': {
      'data-leak-detection-status': 'enabled',
      dlp: {
        dlp_status: 'enabled',
        data_profiles: [{ profile_name: 'SSN', active: true }],
      },
    },
    'app-protection': {
      'prompt-injection': 'enabled',
      'jailbreak-detection': 'enabled',
    },
    'model-protection': {
      'model-denial-of-service': 'enabled',
    },
    'agent-protection': {
      'malicious-agent-activity': 'enabled',
    },
    'model-configuration': {
      latency: { status: 'enabled', max_latency_ms: 5000 },
    },
  },
  created_by: 'admin@example.com',
  updated_by: 'admin@example.com',
  last_modified_ts: '2025-01-01T00:00:00Z',
};

describe('SecurityProfileSchema', () => {
  it('parses valid profile', () => {
    const result = SecurityProfileSchema.parse(validProfile);
    expect(result.profile_id).toBe('550e8400-e29b-41d4-a716-446655440000');
    expect(result.profile_name).toBe('test-profile');
    expect(result.active).toBe(true);
  });

  it('allows extra fields via passthrough', () => {
    const result = SecurityProfileSchema.parse({ ...validProfile, new_field: 'test' });
    expect((result as Record<string, unknown>).new_field).toBe('test');
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
