import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import {
  AgentProtectionItemSchema,
  CreateSecurityProfileRequestSchema,
  DataProtectionSchema,
  DatabaseSecurityItemSchema,
  MaliciousCodeProtectionSchema,
  ManagementClient,
  ModelProtectionItemSchema,
  PolicyAppProtectionSchema,
  PolicySchema,
  SeverityByConfidenceSchema,
  SourceCodeDetectionSchema,
  type SourceCodeDetection,
  type SeverityByConfidence,
  ToxicCategorySchema,
  type ToxicCategory,
  TopicObjectSchema,
} from '../../src/index.js';

// Sanitized policy shape observed 2026-09-08; no tenant identities or credentials.
const configuration = {
  'data-protection': {
    'database-security': [
      { name: 'database-security-create', action: 'block', severity: 'medium' },
      { name: 'database-security-read', action: 'block', severity: 'low' },
      { name: 'database-security-update', action: 'block', severity: 'medium' },
      { name: 'database-security-delete', action: 'block', severity: 'high' },
    ],
    'source-code-detection': { action: 'block', severity: 'high' },
  },
  'app-protection': {
    'malicious-code-protection': { name: 'malicious-code', action: 'block', severity: 'high' },
    'url-detected-severity': 'low',
  },
  'model-protection': [
    { name: 'prompt-injection', action: 'block', severity: 'medium' },
    {
      name: 'toxic-content',
      action: 'high:block, moderate:block',
      'severity-by-confidence': { high: 'medium', moderate: 'low' },
      'toxic-category-list': [
        {
          category: 'hate',
          action: 'high:allow, moderate:allow',
          'severity-by-confidence': { high: 'medium', moderate: 'low' },
        },
        {
          category: 'self-harm',
          action: 'high:block, moderate:block',
          'severity-by-confidence': { high: 'high', moderate: 'medium' },
        },
      ],
    },
    {
      name: 'topic-guardrails',
      severity: 'medium',
      'topic-list': [
        {
          action: 'block',
          topic: [{ topic_name: 'example', topic_id: 'example-id', revision: 1, severity: 'high' }],
        },
      ],
    },
  ],
  'agent-protection': [{ name: 'agent-security', action: 'block', severity: 'medium' }],
};
const policy = {
  'ai-security-profiles': [{ 'model-type': 'default', 'model-configuration': configuration }],
};

describe('observed Runtime policy extensions', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('types topic severity without inserting defaults or restricting future string values', () => {
    const legacy = { topic_name: 'example', topic_id: 'example-id', revision: 1 };
    expect(TopicObjectSchema.parse(legacy)).toEqual(legacy);
    const parsed = TopicObjectSchema.parse({ ...legacy, severity: 'future', future_field: true });
    expectTypeOf(parsed.severity).toEqualTypeOf<string | undefined>();
    expect(parsed).toEqual({ ...legacy, severity: 'future', future_field: true });
    for (const severity of [null, 42, false, [], {}])
      expect(TopicObjectSchema.safeParse({ ...legacy, severity }).success).toBe(false);
  });

  it('preserves observed values through policy and request parsing without mutating input', () => {
    const input = structuredClone(policy);
    expect(PolicySchema.parse(input)).toEqual(policy);
    expect(
      CreateSecurityProfileRequestSchema.parse({ profile_name: 'example', policy }).policy,
    ).toEqual(policy);
    expect(input).toEqual(policy);
  });

  it('exports typed fields, not unknown passthrough values', () => {
    const result = PolicySchema.parse(policy);
    const config = result['ai-security-profiles']?.[0]?.['model-configuration'];
    expectTypeOf(config?.['data-protection']?.['database-security']?.[0]?.severity).toEqualTypeOf<
      string | undefined
    >();
    expectTypeOf(config?.['data-protection']?.['source-code-detection']).toEqualTypeOf<
      SourceCodeDetection | undefined
    >();
    expectTypeOf(config?.['app-protection']?.['malicious-code-protection']?.severity).toEqualTypeOf<
      string | undefined
    >();
    expectTypeOf(config?.['app-protection']?.['url-detected-severity']).toEqualTypeOf<
      string | undefined
    >();
    expectTypeOf(config?.['model-protection']?.[0]?.severity).toEqualTypeOf<string | undefined>();
    expectTypeOf(config?.['model-protection']?.[1]?.['severity-by-confidence']).toEqualTypeOf<
      SeverityByConfidence | undefined
    >();
    expectTypeOf(config?.['agent-protection']?.[0]?.severity).toEqualTypeOf<string | undefined>();
    expectTypeOf(config?.['model-protection']?.[1]?.['toxic-category-list']?.[0]).toEqualTypeOf<
      ToxicCategory | undefined
    >();
    expectTypeOf(
      config?.['model-protection']?.[1]?.['toxic-category-list']?.[0]?.['severity-by-confidence']
        ?.high,
    ).toEqualTypeOf<string | undefined>();
  });

  it('keeps legacy categories unchanged and preserves explicit nested overrides and future keys', () => {
    const legacy = { category: 'hate', action: 'high:allow, moderate:allow' };
    expect(ToxicCategorySchema.parse(legacy)).toEqual(legacy);
    const extended = {
      ...legacy,
      'severity-by-confidence': {
        high: 'future-severity',
        moderate: 'high',
        future_confidence: 'low',
      },
      future_category_setting: true,
    };
    expect(ToxicCategorySchema.parse(extended)).toEqual(extended);
  });

  it.each([null, false, 42, 'medium', [], { high: 42 }, { moderate: false }])(
    'rejects malformed category confidence value %j',
    (value) => {
      const detector = {
        name: 'toxic-content',
        'toxic-category-list': [
          { category: 'hate', action: 'block', 'severity-by-confidence': value },
        ],
      };
      expect(ModelProtectionItemSchema.safeParse(detector).success).toBe(false);
      expect(
        CreateSecurityProfileRequestSchema.safeParse({
          profile_name: 'example',
          policy: {
            'ai-security-profiles': [{ 'model-configuration': { 'model-protection': [detector] } }],
          },
        }).success,
      ).toBe(false);
    },
  );

  const scalarSchemas = [
    ['database', DatabaseSecurityItemSchema, { name: 'rule', action: 'block' }, 'severity'],
    ['source-code', SourceCodeDetectionSchema, { action: 'block' }, 'severity'],
    [
      'malicious-code',
      MaliciousCodeProtectionSchema,
      { name: 'rule', action: 'block' },
      'severity',
    ],
    ['url', PolicyAppProtectionSchema, {}, 'url-detected-severity'],
    ['model', ModelProtectionItemSchema, { name: 'rule' }, 'severity'],
    ['agent', AgentProtectionItemSchema, { name: 'rule', action: 'block' }, 'severity'],
    ['confidence-high', SeverityByConfidenceSchema, {}, 'high'],
    ['confidence-moderate', SeverityByConfidenceSchema, {}, 'moderate'],
  ] as const;

  it.each(scalarSchemas)(
    '%s keeps omission and future strings without adding defaults',
    (_, schema, base, key) => {
      expect(schema.parse(base)).toEqual(base);
      const future = { ...base, [key]: 'future-severity', future_field: { preserved: true } };
      expect(schema.parse(future)).toEqual(future);
    },
  );

  it.each(scalarSchemas)('%s rejects malformed documented field types', (_, schema, base, key) => {
    for (const value of [42, false, null, [], {}]) {
      expect(schema.safeParse({ ...base, [key]: value }).success).toBe(false);
    }
  });

  it('validates extension containers while preserving unknown nested fields', () => {
    for (const value of [42, 'high', false, null, []]) {
      expect(DataProtectionSchema.safeParse({ 'source-code-detection': value }).success).toBe(
        false,
      );
      expect(ModelProtectionItemSchema.safeParse({ 'severity-by-confidence': value }).success).toBe(
        false,
      );
    }
    const source = { action: 'block', severity: 'high', future_rule: { enabled: true } };
    expect(
      DataProtectionSchema.parse({ 'source-code-detection': source })['source-code-detection'],
    ).toEqual(source);
    expect(SeverityByConfidenceSchema.parse({ high: 'medium', future_confidence: 'low' })).toEqual({
      high: 'medium',
      future_confidence: 'low',
    });
  });

  it('retains severity through OAuth read and read-modify-write using the SDK transport', async () => {
    const response = { profile_name: 'example', policy };
    const requests: Array<{ url: string; body: unknown }> = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init: RequestInit) => {
        requests.push({ url: String(url), body: init.body });
        const data = String(url).includes('/oauth2/token')
          ? { access_token: 'fixture-token', expires_in: 3600, token_type: 'Bearer' }
          : init.method === 'GET'
            ? { ai_profiles: [response] }
            : response;
        return new Response(JSON.stringify(data), { status: 200 });
      }),
    );
    const client = new ManagementClient({
      clientId: 'fixture-client',
      clientSecret: 'fixture-secret',
      tsgId: '100',
      apiEndpoint: 'https://fixture.invalid/aisec',
      tokenEndpoint: 'https://fixture.invalid/oauth2/token',
      numRetries: 0,
    });
    const found = (await client.profiles.list()).ai_profiles[0];
    expect(found.policy).toEqual(policy);
    const created = await client.profiles.create({ profile_name: 'example', policy: found.policy });
    expect(created.policy).toEqual(policy);
    const write = requests.find((r) => r.url.endsWith('/v1/mgmt/profile'));
    expect(JSON.parse(String(write?.body)).policy).toEqual(policy);
    expect(requests.filter((r) => r.url.includes('/oauth2/token'))).toHaveLength(1);
  });
});
