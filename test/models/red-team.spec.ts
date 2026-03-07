import { describe, it, expect } from 'vitest';
import {
  RedTeamPaginationSchema,
  JobCreateRequestSchema,
  JobResponseSchema,
  JobListResponseSchema,
  JobAbortResponseSchema,
  AttackListResponseSchema,
  AttackDetailResponseSchema,
  StaticJobReportSchema,
  DynamicJobReportSchema,
  GoalSchema,
  StreamDetailResponseSchema,
  CustomAttackReportResponseSchema,
  ScanStatisticsResponseSchema,
  ScoreTrendResponseSchema,
  SentimentRequestSchema,
  QuotaSummarySchema,
  ErrorLogSchema,
  TargetCreateRequestSchema,
  TargetResponseSchema,
  TargetListSchema,
  CustomPromptSetCreateRequestSchema,
  CustomPromptSetResponseSchema,
  CustomPromptCreateRequestSchema,
  CustomPromptResponseSchema,
  PropertyNamesListResponseSchema,
  BaseResponseSchema,
  DashboardOverviewResponseSchema,
} from '../../src/models/red-team.js';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const validUuid = '550e8400-e29b-41d4-a716-446655440000';
const now = '2025-01-01T00:00:00Z';

const baseTargetRef = {
  uuid: validUuid,
  tsg_id: '123',
  name: 'test-target',
  status: 'active',
  active: true,
  validated: true,
  created_at: now,
  updated_at: now,
};

// ---------------------------------------------------------------------------
// Shared / utility schemas
// ---------------------------------------------------------------------------

describe('RedTeamPaginationSchema', () => {
  it('parses valid pagination', () => {
    expect(RedTeamPaginationSchema.parse({ total_items: 42 })).toEqual({ total_items: 42 });
  });

  it('accepts null total_items', () => {
    expect(RedTeamPaginationSchema.parse({ total_items: null })).toEqual({ total_items: null });
  });

  it('accepts missing total_items', () => {
    expect(RedTeamPaginationSchema.parse({})).toEqual({});
  });

  it('passes through unknown fields', () => {
    const res = RedTeamPaginationSchema.parse({ total_items: 1, extra: true });
    expect((res as Record<string, unknown>).extra).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// DataPlane — Job schemas
// ---------------------------------------------------------------------------

describe('JobCreateRequestSchema', () => {
  it('parses valid static job request', () => {
    const req = {
      name: 'test-job',
      target: { uuid: validUuid },
      job_type: 'static',
      job_metadata: { categories: { security: true } },
    };
    const parsed = JobCreateRequestSchema.parse(req);
    expect(parsed.name).toBe('test-job');
    expect(parsed.job_type).toBe('static');
  });

  it('parses with optional version and extra_info', () => {
    const req = {
      name: 'test-job',
      target: { uuid: validUuid, version: 2 },
      job_type: 'dynamic',
      job_metadata: { stream_breadth: 3, stream_depth: 5 },
      version: 1,
      extra_info: { note: 'test' },
    };
    const parsed = JobCreateRequestSchema.parse(req);
    expect(parsed.version).toBe(1);
    expect(parsed.extra_info).toEqual({ note: 'test' });
  });

  it('accepts null version and extra_info', () => {
    const req = {
      name: 'test-job',
      target: { uuid: validUuid },
      job_type: 'custom',
      job_metadata: { custom_prompt_sets: [validUuid] },
      version: null,
      extra_info: null,
    };
    const parsed = JobCreateRequestSchema.parse(req);
    expect(parsed.version).toBeNull();
    expect(parsed.extra_info).toBeNull();
  });

  it('rejects missing required fields', () => {
    expect(() => JobCreateRequestSchema.parse({ name: 'x' })).toThrow();
  });
});

describe('JobResponseSchema', () => {
  const baseJob = {
    uuid: validUuid,
    tsg_id: '123',
    name: 'my-job',
    target: baseTargetRef,
    job_type: 'static',
    job_metadata: {},
    target_id: validUuid,
    target_type: 'api',
  };

  it('parses valid job response', () => {
    const parsed = JobResponseSchema.parse(baseJob);
    expect(parsed.uuid).toBe(validUuid);
    expect(parsed.name).toBe('my-job');
  });

  it('accepts optional fields', () => {
    const full = {
      ...baseJob,
      version: 1,
      total: 100,
      completed: 50,
      status: 'running',
      score: 85.5,
      asr: 0.15,
      time_record: { queued_at: now, started_at: now },
      created_at: now,
      updated_at: now,
      created_by_user_id: 'user-1',
      report_stats: { summary: 'ok' },
      metering_quota_uuid: validUuid,
      counted_towards_quota: 'yes',
      invocation_id: 'inv-1',
    };
    const parsed = JobResponseSchema.parse(full);
    expect(parsed.status).toBe('running');
    expect(parsed.score).toBe(85.5);
  });

  it('passes through unknown fields', () => {
    const res = JobResponseSchema.parse({ ...baseJob, future_field: 'hello' });
    expect((res as Record<string, unknown>).future_field).toBe('hello');
  });
});

describe('JobListResponseSchema', () => {
  it('parses valid list', () => {
    const baseJob = {
      uuid: validUuid,
      tsg_id: '123',
      name: 'j1',
      target: baseTargetRef,
      job_type: 'static',
      job_metadata: {},
      target_id: validUuid,
      target_type: 'api',
    };
    const data = { pagination: { total_items: 1 }, data: [baseJob] };
    const parsed = JobListResponseSchema.parse(data);
    expect(parsed.data).toHaveLength(1);
    expect(parsed.pagination.total_items).toBe(1);
  });

  it('passes through unknown fields', () => {
    const data = { pagination: {}, data: [], extra: 42 };
    const parsed = JobListResponseSchema.parse(data);
    expect((parsed as Record<string, unknown>).extra).toBe(42);
  });
});

describe('JobAbortResponseSchema', () => {
  it('parses valid abort response', () => {
    const parsed = JobAbortResponseSchema.parse({ job_id: validUuid, message: 'Job aborted' });
    expect(parsed.job_id).toBe(validUuid);
    expect(parsed.message).toBe('Job aborted');
  });

  it('rejects missing message', () => {
    expect(() => JobAbortResponseSchema.parse({ job_id: validUuid })).toThrow();
  });
});

// ---------------------------------------------------------------------------
// DataPlane — Attack schemas
// ---------------------------------------------------------------------------

describe('AttackListResponseSchema', () => {
  it('parses valid attack list', () => {
    const attack = {
      uuid: validUuid,
      tsg_id: '123',
      job_id: validUuid,
      target_id: validUuid,
      prompt: 'test prompt',
      prompt_mapping_id: 'pm-1',
      prompt_id: 'p-1',
      category: 'security',
      sub_category: 'injection',
      category_display_name: 'Security',
      sub_category_display_name: 'Injection',
    };
    const data = { pagination: { total_items: 1 }, data: [attack] };
    const parsed = AttackListResponseSchema.parse(data);
    expect(parsed.data).toHaveLength(1);
    expect(parsed.data[0].category).toBe('security');
  });

  it('parses empty list', () => {
    const parsed = AttackListResponseSchema.parse({ pagination: {}, data: [] });
    expect(parsed.data).toHaveLength(0);
  });
});

describe('AttackDetailResponseSchema', () => {
  const baseAttack = {
    uuid: validUuid,
    tsg_id: '123',
    job_id: validUuid,
    target_id: validUuid,
    prompt: 'test prompt',
    prompt_mapping_id: 'pm-1',
    prompt_id: 'p-1',
    category: 'security',
    sub_category: 'injection',
    category_display_name: 'Security',
    sub_category_display_name: 'Injection',
    compliance_frameworks: [],
    goal: 'Extract PII data',
  };

  it('parses valid attack detail', () => {
    const parsed = AttackDetailResponseSchema.parse(baseAttack);
    expect(parsed.goal).toBe('Extract PII data');
    expect(parsed.compliance_frameworks).toEqual([]);
  });

  it('accepts null goal', () => {
    const parsed = AttackDetailResponseSchema.parse({ ...baseAttack, goal: null });
    expect(parsed.goal).toBeNull();
  });

  it('accepts outputs array', () => {
    const output = {
      uuid: validUuid,
      tsg_id: '123',
      attack_id: validUuid,
      job_id: validUuid,
      target_id: validUuid,
      output: 'response text',
    };
    const parsed = AttackDetailResponseSchema.parse({ ...baseAttack, outputs: [output] });
    expect(parsed.outputs).toHaveLength(1);
  });

  it('passes through unknown fields', () => {
    const res = AttackDetailResponseSchema.parse({ ...baseAttack, new_field: 'x' });
    expect((res as Record<string, unknown>).new_field).toBe('x');
  });
});

// ---------------------------------------------------------------------------
// DataPlane — Report schemas
// ---------------------------------------------------------------------------

describe('StaticJobReportSchema', () => {
  const minReport = {
    severity_report: { stats: [] },
  };

  it('parses minimal report', () => {
    const parsed = StaticJobReportSchema.parse(minReport);
    expect(parsed.severity_report.stats).toEqual([]);
  });

  it('parses full report', () => {
    const full = {
      severity_report: {
        stats: [{ severity: 'high', successful: 5, failed: 2 }],
        successful: 5,
        failed: 2,
        total_attacks: 7,
      },
      asr: 0.71,
      score: 71,
      security_report: {
        id: 'sec',
        display_name: 'Security',
        description: 'Security attacks',
        sub_categories: [
          {
            id: 'inj',
            display_name: 'Injection',
            description: 'Prompt injection',
            successful: 3,
            failed: 1,
          },
        ],
        asr: 0.75,
        total_prompts: 4,
        total_attacks: 4,
        successful: 3,
        failed: 1,
      },
      safety_report: null,
      brand_report: null,
      compliance_report: [],
      report_summary: 'High risk',
      recommendations: null,
    };
    const parsed = StaticJobReportSchema.parse(full);
    expect(parsed.asr).toBe(0.71);
    expect(parsed.security_report?.asr).toBe(0.75);
  });

  it('passes through unknown fields', () => {
    const res = StaticJobReportSchema.parse({ ...minReport, future: true });
    expect((res as Record<string, unknown>).future).toBe(true);
  });
});

describe('DynamicJobReportSchema', () => {
  it('parses valid dynamic report', () => {
    const data = {
      total_goals: 10,
      total_streams: 30,
      total_threats: 5,
      goals_achieved: 3,
      report_summary: 'Moderate risk',
      score: 65,
      asr: 0.3,
    };
    const parsed = DynamicJobReportSchema.parse(data);
    expect(parsed.total_goals).toBe(10);
    expect(parsed.score).toBe(65);
  });

  it('parses empty object (all optional)', () => {
    const parsed = DynamicJobReportSchema.parse({});
    expect(parsed).toEqual({});
  });

  it('passes through unknown fields', () => {
    const res = DynamicJobReportSchema.parse({ extra_metric: 42 });
    expect((res as Record<string, unknown>).extra_metric).toBe(42);
  });
});

// ---------------------------------------------------------------------------
// DataPlane — Goal & Stream schemas
// ---------------------------------------------------------------------------

describe('GoalSchema', () => {
  const baseGoal = {
    goal: 'Extract confidential data',
    safe_response: 'I cannot help with that.',
    jailbroken_response: 'Here is the data...',
    uuid: validUuid,
    tsg_id: '123',
    job_id: validUuid,
  };

  it('parses valid goal', () => {
    const parsed = GoalSchema.parse(baseGoal);
    expect(parsed.goal).toBe('Extract confidential data');
    expect(parsed.safe_response).toBe('I cannot help with that.');
  });

  it('accepts optional fields', () => {
    const full = {
      ...baseGoal,
      goal_metadata: { difficulty: 'hard' },
      custom_goal: true,
      goal_type: 'extraction',
      goal_to_show: 'Show this goal',
      threat: true,
      version: 2,
      extra_info: { note: 'test' },
    };
    const parsed = GoalSchema.parse(full);
    expect(parsed.custom_goal).toBe(true);
    expect(parsed.threat).toBe(true);
  });

  it('passes through unknown fields', () => {
    const res = GoalSchema.parse({ ...baseGoal, new_field: 'y' });
    expect((res as Record<string, unknown>).new_field).toBe('y');
  });
});

describe('StreamDetailResponseSchema', () => {
  const baseStream = {
    uuid: validUuid,
    tsg_id: '123',
    job_id: validUuid,
    target_id: validUuid,
    goal_id: validUuid,
  };

  it('parses minimal stream', () => {
    const parsed = StreamDetailResponseSchema.parse(baseStream);
    expect(parsed.uuid).toBe(validUuid);
    expect(parsed.goal_id).toBe(validUuid);
  });

  it('accepts optional iteration data', () => {
    const iteration = {
      uuid: validUuid,
      tsg_id: '123',
      job_id: validUuid,
      stream_id: validUuid,
      goal_id: validUuid,
      iteration: 1,
      prompt: 'test prompt',
      techniques: 'jailbreak',
      improvement: 'refined approach',
      prompts_objective: 'extract data',
      summary: 'first attempt',
      output: 'model response',
      score: 7,
    };
    const parsed = StreamDetailResponseSchema.parse({
      ...baseStream,
      stream_idx: 0,
      iteration: 3,
      threat: true,
      first_threat_iteration: iteration,
      iterations: [iteration],
    });
    expect(parsed.iterations).toHaveLength(1);
    expect(parsed.first_threat_iteration?.iteration).toBe(1);
  });

  it('passes through unknown fields', () => {
    const res = StreamDetailResponseSchema.parse({ ...baseStream, extra: 'val' });
    expect((res as Record<string, unknown>).extra).toBe('val');
  });
});

// ---------------------------------------------------------------------------
// DataPlane — Custom attack report schemas
// ---------------------------------------------------------------------------

describe('CustomAttackReportResponseSchema', () => {
  it('parses valid report', () => {
    const data = {
      total_prompts: 100,
      total_attacks: 80,
      total_threats: 15,
      failed_attacks: 5,
      score: 81.25,
      asr: 0.1875,
    };
    const parsed = CustomAttackReportResponseSchema.parse(data);
    expect(parsed.total_prompts).toBe(100);
    expect(parsed.score).toBe(81.25);
  });

  it('accepts optional custom_attack_reports', () => {
    const data = {
      total_prompts: 10,
      total_attacks: 10,
      total_threats: 2,
      failed_attacks: 0,
      score: 80,
      asr: 0.2,
      custom_attack_reports: [
        {
          prompt_set_id: validUuid,
          prompt_set_name: 'set-1',
          total_prompts: 10,
          total_attacks: 10,
          total_threats: 2,
          failed_attacks: 0,
          threat_rate: 0.2,
        },
      ],
    };
    const parsed = CustomAttackReportResponseSchema.parse(data);
    expect(parsed.custom_attack_reports).toHaveLength(1);
  });

  it('passes through unknown fields', () => {
    const data = {
      total_prompts: 1,
      total_attacks: 1,
      total_threats: 0,
      failed_attacks: 0,
      score: 100,
      asr: 0,
      new_metric: 'test',
    };
    const res = CustomAttackReportResponseSchema.parse(data);
    expect((res as Record<string, unknown>).new_metric).toBe('test');
  });
});

// ---------------------------------------------------------------------------
// DataPlane — Dashboard schemas
// ---------------------------------------------------------------------------

describe('ScanStatisticsResponseSchema', () => {
  it('parses valid stats', () => {
    const data = {
      total_scans: 50,
      targets_scanned: 10,
      targets_scanned_by_type: [{ name: 'api', count: 8 }],
      scan_status: [{ name: 'completed', count: 45 }],
      risk_profile: [
        { risk_rating: 'high', total: 3, targets_by_type: [{ name: 'api', count: 2 }] },
      ],
    };
    const parsed = ScanStatisticsResponseSchema.parse(data);
    expect(parsed.total_scans).toBe(50);
    expect(parsed.risk_profile).toHaveLength(1);
  });

  it('parses minimal stats', () => {
    const parsed = ScanStatisticsResponseSchema.parse({ total_scans: 0, targets_scanned: 0 });
    expect(parsed.total_scans).toBe(0);
  });

  it('passes through unknown fields', () => {
    const res = ScanStatisticsResponseSchema.parse({
      total_scans: 1,
      targets_scanned: 1,
      extra: true,
    });
    expect((res as Record<string, unknown>).extra).toBe(true);
  });
});

describe('ScoreTrendResponseSchema', () => {
  it('parses valid trend', () => {
    const data = {
      labels: ['2025-01', '2025-02', '2025-03'],
      series: [{ label: 'target-1', data: [85, 90, null] }],
    };
    const parsed = ScoreTrendResponseSchema.parse(data);
    expect(parsed.labels).toHaveLength(3);
    expect(parsed.series[0].data[2]).toBeNull();
  });

  it('parses empty trend', () => {
    const parsed = ScoreTrendResponseSchema.parse({ labels: [], series: [] });
    expect(parsed.labels).toHaveLength(0);
    expect(parsed.series).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// DataPlane — Sentiment, Quota, Error Log schemas
// ---------------------------------------------------------------------------

describe('SentimentRequestSchema', () => {
  it('parses valid request', () => {
    const parsed = SentimentRequestSchema.parse({ job_id: validUuid, up_vote: true });
    expect(parsed.job_id).toBe(validUuid);
    expect(parsed.up_vote).toBe(true);
  });

  it('parses minimal request', () => {
    const parsed = SentimentRequestSchema.parse({ job_id: validUuid });
    expect(parsed.job_id).toBe(validUuid);
    expect(parsed.up_vote).toBeUndefined();
    expect(parsed.down_vote).toBeUndefined();
  });

  it('rejects missing job_id', () => {
    expect(() => SentimentRequestSchema.parse({ up_vote: true })).toThrow();
  });
});

describe('QuotaSummarySchema', () => {
  it('parses valid quota', () => {
    const data = {
      static: { allocated: 100, unlimited: false, consumed: 25 },
      dynamic: { allocated: 50, unlimited: false, consumed: 10 },
      custom: { allocated: 0, unlimited: true, consumed: 0 },
    };
    const parsed = QuotaSummarySchema.parse(data);
    expect(parsed.static.consumed).toBe(25);
    expect(parsed.custom.unlimited).toBe(true);
  });

  it('rejects missing quota type', () => {
    expect(() =>
      QuotaSummarySchema.parse({
        static: { allocated: 100, unlimited: false, consumed: 0 },
        dynamic: { allocated: 50, unlimited: false, consumed: 0 },
      }),
    ).toThrow();
  });
});

describe('ErrorLogSchema', () => {
  it('parses valid error log', () => {
    const data = {
      created_at: now,
      updated_at: now,
      job_id: validUuid,
      target_id: validUuid,
      error_type: 'timeout',
      error_source: 'target',
      error_message: 'Request timed out',
    };
    const parsed = ErrorLogSchema.parse(data);
    expect(parsed.error_type).toBe('timeout');
    expect(parsed.error_message).toBe('Request timed out');
  });

  it('accepts nullable fields as null', () => {
    const data = {
      created_at: now,
      updated_at: now,
      job_id: null,
      target_id: null,
      error_type: null,
      error_source: null,
      error_message: null,
    };
    const parsed = ErrorLogSchema.parse(data);
    expect(parsed.job_id).toBeNull();
    expect(parsed.error_message).toBeNull();
  });

  it('parses minimal (only required timestamps)', () => {
    const parsed = ErrorLogSchema.parse({ created_at: now, updated_at: now });
    expect(parsed.created_at).toBe(now);
  });

  it('passes through unknown fields', () => {
    const res = ErrorLogSchema.parse({ created_at: now, updated_at: now, extra: 'val' });
    expect((res as Record<string, unknown>).extra).toBe('val');
  });
});

// ---------------------------------------------------------------------------
// Management — Target schemas
// ---------------------------------------------------------------------------

describe('TargetCreateRequestSchema', () => {
  it('parses minimal request', () => {
    const parsed = TargetCreateRequestSchema.parse({ name: 'my-target' });
    expect(parsed.name).toBe('my-target');
  });

  it('parses full request with optionals', () => {
    const req = {
      name: 'my-target',
      description: 'A test target',
      target_type: 'llm',
      connection_type: 'api',
      api_endpoint_type: 'openai',
      response_mode: 'streaming',
      session_supported: true,
      target_metadata: { probe_message: 'hello' },
      target_background: { industry: 'finance' },
      additional_context: { base_model: 'gpt-4' },
    };
    const parsed = TargetCreateRequestSchema.parse(req);
    expect(parsed.session_supported).toBe(true);
  });

  it('passes through unknown fields', () => {
    const res = TargetCreateRequestSchema.parse({ name: 'x', custom: true });
    expect((res as Record<string, unknown>).custom).toBe(true);
  });

  it('rejects missing name', () => {
    expect(() => TargetCreateRequestSchema.parse({})).toThrow();
  });
});

describe('TargetResponseSchema', () => {
  const baseTarget = {
    uuid: validUuid,
    tsg_id: '123',
    name: 'my-target',
    status: 'active',
    active: true,
    validated: true,
    created_at: now,
    updated_at: now,
  };

  it('parses valid target response', () => {
    const parsed = TargetResponseSchema.parse(baseTarget);
    expect(parsed.uuid).toBe(validUuid);
    expect(parsed.active).toBe(true);
  });

  it('accepts optional fields', () => {
    const full = {
      ...baseTarget,
      description: 'Test target',
      target_type: 'llm',
      connection_type: 'api',
      session_supported: false,
      version: 3,
      target_metadata: { multi_turn: true },
    };
    const parsed = TargetResponseSchema.parse(full);
    expect(parsed.session_supported).toBe(false);
  });

  it('passes through unknown fields', () => {
    const res = TargetResponseSchema.parse({ ...baseTarget, future: 'yes' });
    expect((res as Record<string, unknown>).future).toBe('yes');
  });
});

describe('TargetListSchema', () => {
  it('parses valid list', () => {
    const item = {
      uuid: validUuid,
      tsg_id: '123',
      name: 't1',
      status: 'active',
      active: true,
      validated: true,
      created_at: now,
      updated_at: now,
    };
    const data = { pagination: { total_items: 1 }, data: [item] };
    const parsed = TargetListSchema.parse(data);
    expect(parsed.data).toHaveLength(1);
  });

  it('accepts missing data array', () => {
    const parsed = TargetListSchema.parse({ pagination: {} });
    expect(parsed.data).toBeUndefined();
  });

  it('passes through unknown fields', () => {
    const res = TargetListSchema.parse({ pagination: {}, extra: 42 });
    expect((res as Record<string, unknown>).extra).toBe(42);
  });
});

// ---------------------------------------------------------------------------
// Management — Custom prompt set schemas
// ---------------------------------------------------------------------------

describe('CustomPromptSetCreateRequestSchema', () => {
  it('parses minimal request', () => {
    const parsed = CustomPromptSetCreateRequestSchema.parse({ name: 'my-set' });
    expect(parsed.name).toBe('my-set');
  });

  it('parses full request', () => {
    const req = {
      name: 'my-set',
      description: 'Test prompt set',
      property_names: ['category', 'severity'],
    };
    const parsed = CustomPromptSetCreateRequestSchema.parse(req);
    expect(parsed.property_names).toEqual(['category', 'severity']);
  });

  it('rejects missing name', () => {
    expect(() => CustomPromptSetCreateRequestSchema.parse({})).toThrow();
  });
});

describe('CustomPromptSetResponseSchema', () => {
  const baseSet = {
    uuid: validUuid,
    name: 'my-set',
    active: true,
    archive: false,
    status: 'ready',
    created_at: now,
    updated_at: now,
  };

  it('parses valid response', () => {
    const parsed = CustomPromptSetResponseSchema.parse(baseSet);
    expect(parsed.uuid).toBe(validUuid);
    expect(parsed.archive).toBe(false);
  });

  it('accepts optional fields', () => {
    const full = {
      ...baseSet,
      description: 'A prompt set',
      property_names: ['cat'],
      properties: [{ name: 'cat', value: 'security' }],
      stats: { total_prompts: 10 },
      version: 2,
      created_by_user_id: 'user-1',
      updated_by_user_id: 'user-2',
    };
    const parsed = CustomPromptSetResponseSchema.parse(full);
    expect(parsed.property_names).toEqual(['cat']);
  });

  it('passes through unknown fields', () => {
    const res = CustomPromptSetResponseSchema.parse({ ...baseSet, extra: 'x' });
    expect((res as Record<string, unknown>).extra).toBe('x');
  });
});

describe('CustomPromptCreateRequestSchema', () => {
  it('parses valid request', () => {
    const req = { prompt: 'How do I hack?', prompt_set_id: validUuid };
    const parsed = CustomPromptCreateRequestSchema.parse(req);
    expect(parsed.prompt).toBe('How do I hack?');
    expect(parsed.prompt_set_id).toBe(validUuid);
  });

  it('parses with optional goal and properties', () => {
    const req = {
      prompt: 'test',
      prompt_set_id: validUuid,
      goal: 'Extract secrets',
      properties: [{ name: 'cat', value: 'security' }],
    };
    const parsed = CustomPromptCreateRequestSchema.parse(req);
    expect(parsed.goal).toBe('Extract secrets');
  });

  it('rejects missing prompt', () => {
    expect(() => CustomPromptCreateRequestSchema.parse({ prompt_set_id: validUuid })).toThrow();
  });
});

describe('CustomPromptResponseSchema', () => {
  const basePrompt = {
    uuid: validUuid,
    prompt: 'test prompt',
    user_defined_goal: false,
    status: 'active',
    active: true,
    prompt_set_id: validUuid,
    created_at: now,
    updated_at: now,
  };

  it('parses valid response', () => {
    const parsed = CustomPromptResponseSchema.parse(basePrompt);
    expect(parsed.uuid).toBe(validUuid);
    expect(parsed.user_defined_goal).toBe(false);
  });

  it('accepts optional fields', () => {
    const full = {
      ...basePrompt,
      goal: 'Extract data',
      properties: [{ name: 'cat', value: 'sec' }],
      property_assignments: [{ name: 'cat', value: 'sec' }],
      detector_category: 'injection',
      severity: 'high',
      extra_info: { note: 'test' },
    };
    const parsed = CustomPromptResponseSchema.parse(full);
    expect(parsed.goal).toBe('Extract data');
  });

  it('passes through unknown fields', () => {
    const res = CustomPromptResponseSchema.parse({ ...basePrompt, future: true });
    expect((res as Record<string, unknown>).future).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Management — Property schemas
// ---------------------------------------------------------------------------

describe('PropertyNamesListResponseSchema', () => {
  it('parses valid list', () => {
    const data = {
      data: [
        { property_name: 'category', created_at: now },
        { property_name: 'severity', created_at: now },
      ],
    };
    const parsed = PropertyNamesListResponseSchema.parse(data);
    expect(parsed.data).toHaveLength(2);
    expect(parsed.data![0].property_name).toBe('category');
  });

  it('accepts missing data', () => {
    const parsed = PropertyNamesListResponseSchema.parse({});
    expect(parsed.data).toBeUndefined();
  });

  it('passes through unknown fields', () => {
    const res = PropertyNamesListResponseSchema.parse({ extra: 'val' });
    expect((res as Record<string, unknown>).extra).toBe('val');
  });
});

// ---------------------------------------------------------------------------
// Management — Base response & Dashboard
// ---------------------------------------------------------------------------

describe('BaseResponseSchema', () => {
  it('parses valid response', () => {
    const parsed = BaseResponseSchema.parse({ message: 'OK', status: 200 });
    expect(parsed.message).toBe('OK');
    expect(parsed.status).toBe(200);
  });

  it('rejects missing message', () => {
    expect(() => BaseResponseSchema.parse({ status: 200 })).toThrow();
  });

  it('rejects missing status', () => {
    expect(() => BaseResponseSchema.parse({ message: 'OK' })).toThrow();
  });
});

describe('DashboardOverviewResponseSchema', () => {
  it('parses valid overview', () => {
    const data = {
      total_targets: 15,
      targets_by_type: [
        { name: 'api', count: 10 },
        { name: 'web', count: 5 },
      ],
    };
    const parsed = DashboardOverviewResponseSchema.parse(data);
    expect(parsed.total_targets).toBe(15);
    expect(parsed.targets_by_type).toHaveLength(2);
  });

  it('parses without optional targets_by_type', () => {
    const parsed = DashboardOverviewResponseSchema.parse({ total_targets: 0 });
    expect(parsed.total_targets).toBe(0);
    expect(parsed.targets_by_type).toBeUndefined();
  });

  it('passes through unknown fields', () => {
    const res = DashboardOverviewResponseSchema.parse({ total_targets: 1, extra: 'field' });
    expect((res as Record<string, unknown>).extra).toBe('field');
  });
});
