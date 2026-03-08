import { describe, it, expect } from 'vitest';
import {
  ApiKeySchema,
  ApiKeyCreateRequestSchema,
  ApiKeyListResponseSchema,
  CustomerAppSchema,
  CustomerAppWithKeysSchema,
  CustomerAppListResponseSchema,
  DeploymentProfileEntrySchema,
  DeploymentProfilesResponseSchema,
  DlpDataProfileSchema,
  DlpProfileListResponseSchema,
  ScanResultEntrySchema,
  PaginatedScanResultsSchema,
  ClientIdAndCustomerAppSchema,
  Oauth2TokenSchema,
} from '../../src/models/index.js';

describe('ApiKeySchema', () => {
  it('parses valid API key', () => {
    const r = ApiKeySchema.safeParse({
      api_key_id: 'k1',
      api_key_last8: '12345678',
      auth_code: 'ac',
      expiration: '2025-12-31T00:00:00Z',
      revoked: false,
    });
    expect(r.success).toBe(true);
  });

  it('passes through unknown fields', () => {
    const r = ApiKeySchema.safeParse({
      api_key_id: 'k1',
      api_key_last8: '12345678',
      auth_code: 'ac',
      expiration: '2025-12-31',
      revoked: false,
      new_field: true,
    });
    expect(r.success).toBe(true);
  });
});

describe('ApiKeyCreateRequestSchema', () => {
  it('validates required fields', () => {
    const r = ApiKeyCreateRequestSchema.safeParse({
      auth_code: 'ac',
      cust_app: 'app1',
      revoked: false,
      created_by: 'user@test.com',
      api_key_name: 'key1',
      rotation_time_interval: 90,
      rotation_time_unit: 'days',
    });
    expect(r.success).toBe(true);
  });

  it('rejects missing required fields', () => {
    const r = ApiKeyCreateRequestSchema.safeParse({ auth_code: 'ac' });
    expect(r.success).toBe(false);
  });
});

describe('ApiKeyListResponseSchema', () => {
  it('parses paginated response', () => {
    const r = ApiKeyListResponseSchema.safeParse({
      api_keys: [
        {
          api_key_id: 'k1',
          api_key_last8: '12345678',
          auth_code: 'ac',
          expiration: '2025-12-31',
          revoked: false,
        },
      ],
      next_offset: 1,
    });
    expect(r.success).toBe(true);
  });
});

describe('CustomerAppSchema', () => {
  it('parses valid customer app', () => {
    const r = CustomerAppSchema.safeParse({
      tsg_id: '123',
      app_name: 'myapp',
      cloud_provider: 'aws',
      environment: 'prod',
    });
    expect(r.success).toBe(true);
  });
});

describe('CustomerAppWithKeysSchema', () => {
  it('parses customer app with API key info', () => {
    const r = CustomerAppWithKeysSchema.safeParse({
      customer_appId: 'ca1',
      tsg_id: '123',
      app_name: 'myapp',
      cloud_provider: 'aws',
      environment: 'prod',
      api_keys_dp_info: [{ api_key_name: 'k1', dp_name: 'dp1', auth_code: 'ac' }],
    });
    expect(r.success).toBe(true);
  });
});

describe('CustomerAppListResponseSchema', () => {
  it('parses paginated response', () => {
    const r = CustomerAppListResponseSchema.safeParse({
      customer_apps: [],
      next_offset: 0,
    });
    expect(r.success).toBe(true);
  });
});

describe('DeploymentProfileEntrySchema', () => {
  it('parses valid entry', () => {
    const r = DeploymentProfileEntrySchema.safeParse({
      dp_name: 'dp1',
      auth_code: 'ac',
      status: 'active',
    });
    expect(r.success).toBe(true);
  });
});

describe('DeploymentProfilesResponseSchema', () => {
  it('parses response with entries', () => {
    const r = DeploymentProfilesResponseSchema.safeParse({
      deployment_profiles: [{ dp_name: 'dp1', auth_code: 'ac' }],
      status: 'ok',
    });
    expect(r.success).toBe(true);
  });
});

describe('DlpDataProfileSchema', () => {
  it('parses DLP profile with rules', () => {
    const r = DlpDataProfileSchema.safeParse({
      name: 'default',
      uuid: 'u1',
      rule1: { action: 'block' },
      rule2: { action: 'alert' },
      'log-severity': 'high',
    });
    expect(r.success).toBe(true);
  });
});

describe('DlpProfileListResponseSchema', () => {
  it('parses list response', () => {
    const r = DlpProfileListResponseSchema.safeParse({
      dlp_profiles: [{ name: 'p1', uuid: 'u1' }],
    });
    expect(r.success).toBe(true);
  });
});

describe('ScanResultEntrySchema', () => {
  it('parses minimal entry', () => {
    const r = ScanResultEntrySchema.safeParse({
      csp_id: 'c1',
      tsg_id: 't1',
      scan_id: 's1',
      scan_sub_req_id: 0,
      api_key_name: 'k1',
      app_name: 'app1',
      tokens: 100,
      text_records: 1,
    });
    expect(r.success).toBe(true);
  });

  it('parses entry with verdict fields', () => {
    const r = ScanResultEntrySchema.safeParse({
      csp_id: 'c1',
      tsg_id: 't1',
      scan_id: 's1',
      scan_sub_req_id: 0,
      api_key_name: 'k1',
      app_name: 'app1',
      tokens: 100,
      text_records: 1,
      verdict: 'malicious',
      action: 'block',
      pi_final_verdict: 'malicious',
      prompt_pi_verdict: 'malicious',
      response_dlp_verdict: 'benign',
    });
    expect(r.success).toBe(true);
  });
});

describe('PaginatedScanResultsSchema', () => {
  it('parses paginated results', () => {
    const r = PaginatedScanResultsSchema.safeParse({
      total_pages: 5,
      page_number: 1,
      page_size: 10,
      page_token: 'tok',
    });
    expect(r.success).toBe(true);
  });
});

describe('ClientIdAndCustomerAppSchema', () => {
  it('validates required fields', () => {
    const r = ClientIdAndCustomerAppSchema.safeParse({
      client_id: 'cid',
      customer_app: 'app1',
    });
    expect(r.success).toBe(true);
  });

  it('rejects missing fields', () => {
    const r = ClientIdAndCustomerAppSchema.safeParse({ client_id: 'cid' });
    expect(r.success).toBe(false);
  });
});

describe('Oauth2TokenSchema', () => {
  it('parses token response', () => {
    const r = Oauth2TokenSchema.safeParse({
      access_token: 'tok123',
      expires_in: '86400',
      token_type: 'Bearer',
    });
    expect(r.success).toBe(true);
  });

  it('requires access_token', () => {
    const r = Oauth2TokenSchema.safeParse({ token_type: 'Bearer' });
    expect(r.success).toBe(false);
  });
});
