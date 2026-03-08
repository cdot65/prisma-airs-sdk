import { describe, it, expect } from 'vitest';
import {
  AiProfileSchema,
  ScanResponseSchema,
  AsyncScanResponseSchema,
  ScanIdResultSchema,
  ThreatScanReportSchema,
  MetadataSchema,
  ToolEventSchema,
} from '../../src/models/index.js';

describe('AiProfileSchema', () => {
  it('accepts profile_name', () => {
    const result = AiProfileSchema.safeParse({ profile_name: 'my-profile' });
    expect(result.success).toBe(true);
  });

  it('accepts profile_id', () => {
    const result = AiProfileSchema.safeParse({
      profile_id: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty object', () => {
    const result = AiProfileSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects oversized profile_name', () => {
    const result = AiProfileSchema.safeParse({ profile_name: 'x'.repeat(200) });
    expect(result.success).toBe(false);
  });
});

describe('ScanResponseSchema', () => {
  it('parses minimal valid response', () => {
    const result = ScanResponseSchema.safeParse({
      report_id: 'r1',
      scan_id: 's1',
      category: 'benign',
      action: 'allow',
    });
    expect(result.success).toBe(true);
  });

  it('parses full response with new fields', () => {
    const result = ScanResponseSchema.safeParse({
      source: 'AI-Runtime-API',
      report_id: 'r1',
      scan_id: 's1',
      category: 'malicious',
      action: 'block',
      session_id: 'sess1',
      prompt_detected: { injection: true, toxic_content: false },
      response_detected: { dlp: true, ungrounded: true },
      tool_detected: { verdict: 'malicious' },
      prompt_masked_data: { data: 'masked ***' },
    });
    expect(result.success).toBe(true);
  });

  it('parses timeout, error, and errors fields', () => {
    const result = ScanResponseSchema.safeParse({
      report_id: 'r1',
      scan_id: 's1',
      category: 'error',
      action: 'block',
      timeout: true,
      error: true,
      errors: [
        { content_type: 'prompt', feature: 'dlp', status: 'timeout' },
        { content_type: 'response', feature: 'injection', status: 'error' },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.timeout).toBe(true);
      expect(result.data.error).toBe(true);
      expect(result.data.errors).toHaveLength(2);
    }
  });

  it('parses masked data with typed pattern detections', () => {
    const result = ScanResponseSchema.safeParse({
      report_id: 'r1',
      scan_id: 's1',
      category: 'benign',
      action: 'allow',
      prompt_masked_data: {
        data: "SELECT * FROM users WHERE password='***'",
        pattern_detections: [{ pattern: 'password', locations: [[35, 54]] }],
      },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.prompt_masked_data?.pattern_detections?.[0]?.pattern).toBe('password');
    }
  });
});

describe('AsyncScanResponseSchema', () => {
  it('parses valid response', () => {
    const result = AsyncScanResponseSchema.safeParse({
      received: '2024-01-01T00:00:00Z',
      scan_id: 's1',
      source: 'AI-Runtime-API',
    });
    expect(result.success).toBe(true);
  });
});

describe('ScanIdResultSchema', () => {
  it('parses result with nested ScanResponse', () => {
    const result = ScanIdResultSchema.safeParse({
      source: 'AI-Runtime-API',
      scan_id: 's1',
      status: 'complete',
      result: {
        report_id: 'r1',
        scan_id: 's1',
        category: 'benign',
        action: 'allow',
      },
    });
    expect(result.success).toBe(true);
  });
});

describe('ThreatScanReportSchema', () => {
  it('parses report with detection results', () => {
    const result = ThreatScanReportSchema.safeParse({
      report_id: 'r1',
      scan_id: 's1',
      session_id: 'sess1',
      detection_results: [
        {
          data_type: 'prompt',
          detection_service: 'injection',
          verdict: 'malicious',
          action: 'block',
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('parses detection result with all report types', () => {
    const result = ThreatScanReportSchema.safeParse({
      report_id: 'r1',
      scan_id: 's1',
      detection_results: [
        {
          data_type: 'response',
          detection_service: 'malicious_code',
          verdict: 'malicious',
          action: 'block',
          metadata: {
            ecosystem: 'mcp',
            method: 'tools/call',
            server_name: 'MCP server',
            tool_invoked: 'get_file',
            direction: 'output',
          },
          result_detail: {
            mc_report: {
              verdict: 'malicious',
              all_code_blocks: ['os.system("rm -rf /")'],
              code_analysis_by_type: [{ file_type: 'Python', code_sha256: 'abc' }],
              malware_script_report: { verdict: 'malicious' },
              command_injection_report: [{ code_block: 'rm -rf /', verdict: 'malicious' }],
            },
            dbs_report: [{ sub_type: 'delete', verdict: 'malicious', action: 'block' }],
            tc_report: { confidence: 'high', verdict: 'malicious' },
            agent_report: {
              model_verdict: 'malicious',
              agent_framework: 'AWS_Agent_Builder',
              agent_patterns: [{ category_type: 'tools misuse', verdict: 'malicious' }],
            },
            topic_guardrails_report: {
              allowed_topic_list: 'NOT MATCHED',
              blocked_topic_list: 'MATCHED',
              allowedTopics: [],
              blockedTopics: ['harmful-content'],
            },
            cg_report: {
              status: 'completed',
              explanation: 'ungrounded',
              category: 'hallucination',
            },
            dlp_report: {
              dlp_report_id: 'dlp-1',
              data_pattern_detection_offsets: [
                {
                  data_pattern_id: 'p1',
                  version: 1,
                  name: 'SSN',
                  high_confidence_detections: [[0, 11]],
                },
              ],
            },
            urlf_report: [
              {
                url: 'https://evil.com',
                risk_level: 'high',
                action: 'block',
                categories: ['malware'],
              },
            ],
          },
        },
      ],
    });
    expect(result.success).toBe(true);
  });
});

describe('MetadataSchema', () => {
  it('parses with agent_meta', () => {
    const result = MetadataSchema.safeParse({
      app_name: 'test',
      agent_meta: { agent_id: 'a1', agent_version: '1.0' },
    });
    expect(result.success).toBe(true);
  });
});

describe('ToolEventSchema', () => {
  it('parses valid tool event', () => {
    const result = ToolEventSchema.safeParse({
      metadata: {
        ecosystem: 'mcp',
        method: 'invoke',
        server_name: 'my-server',
        tool_invoked: 'search',
      },
      input: '{"query": "test"}',
      output: '{"results": []}',
    });
    expect(result.success).toBe(true);
  });
});
