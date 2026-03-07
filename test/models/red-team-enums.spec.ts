import { describe, it, expect } from 'vitest';
import {
  ApiEndpointType,
  AttackStatus,
  AttackType,
  AuthType,
  BrandSubCategory,
  ComplianceSubCategory,
  CountedQuotaEnum,
  DateRangeFilter,
  ErrorSource,
  RedTeamErrorType,
  FileFormat,
  GoalType,
  GoalTypeQueryParam,
  GuardrailAction,
  JobStatus,
  JobStatusFilter,
  JobType,
  PolicyType,
  ProfilingStatus,
  RedTeamCategory,
  ResponseMode,
  RiskRating,
  SafetySubCategory,
  SecuritySubCategory,
  SeverityFilter,
  StatusQueryParam,
  StreamType,
  TargetConnectionType,
  TargetStatus,
  TargetType,
} from '../../src/models/red-team-enums.js';

describe('ApiEndpointType', () => {
  it('has expected values', () => {
    expect(ApiEndpointType.PUBLIC).toBe('PUBLIC');
    expect(ApiEndpointType.PRIVATE).toBe('PRIVATE');
    expect(ApiEndpointType.NETWORK_BROKER).toBe('NETWORK_BROKER');
  });

  it('has exactly 3 values', () => {
    expect(Object.keys(ApiEndpointType)).toHaveLength(3);
  });
});

describe('AttackStatus', () => {
  it('has expected values', () => {
    expect(AttackStatus.INIT).toBe('INIT');
    expect(AttackStatus.ATTACK).toBe('ATTACK');
    expect(AttackStatus.COMPLETED).toBe('COMPLETED');
  });

  it('has exactly 6 values', () => {
    expect(Object.keys(AttackStatus)).toHaveLength(6);
  });
});

describe('AttackType', () => {
  it('has expected values', () => {
    expect(AttackType.NORMAL).toBe('NORMAL');
    expect(AttackType.CUSTOM).toBe('CUSTOM');
  });

  it('has exactly 2 values', () => {
    expect(Object.keys(AttackType)).toHaveLength(2);
  });
});

describe('AuthType', () => {
  it('has expected values', () => {
    expect(AuthType.OAUTH).toBe('OAUTH');
    expect(AuthType.ACCESS_TOKEN).toBe('ACCESS_TOKEN');
  });

  it('has exactly 2 values', () => {
    expect(Object.keys(AuthType)).toHaveLength(2);
  });
});

describe('BrandSubCategory', () => {
  it('has expected values', () => {
    expect(BrandSubCategory.COMPETITOR_ENDORSEMENTS).toBe('COMPETITOR_ENDORSEMENTS');
    expect(BrandSubCategory.BRAND_TARNISHING_SELF_CRITICISM).toBe(
      'BRAND_TARNISHING_SELF_CRITICISM',
    );
    expect(BrandSubCategory.POLITICAL_ENDORSEMENTS).toBe('POLITICAL_ENDORSEMENTS');
  });

  it('has exactly 4 values', () => {
    expect(Object.keys(BrandSubCategory)).toHaveLength(4);
  });
});

describe('ComplianceSubCategory', () => {
  it('has expected values', () => {
    expect(ComplianceSubCategory.OWASP).toBe('OWASP');
    expect(ComplianceSubCategory.MITRE_ATLAS).toBe('MITRE_ATLAS');
    expect(ComplianceSubCategory.DASF_V2).toBe('DASF_V2');
  });

  it('has exactly 4 values', () => {
    expect(Object.keys(ComplianceSubCategory)).toHaveLength(4);
  });
});

describe('CountedQuotaEnum', () => {
  it('has expected values', () => {
    expect(CountedQuotaEnum.HELD).toBe('HELD');
    expect(CountedQuotaEnum.COUNTED).toBe('COUNTED');
    expect(CountedQuotaEnum.NOT_COUNTED).toBe('NOT_COUNTED');
  });

  it('has exactly 3 values', () => {
    expect(Object.keys(CountedQuotaEnum)).toHaveLength(3);
  });
});

describe('DateRangeFilter', () => {
  it('has expected values', () => {
    expect(DateRangeFilter.LAST_7_DAYS).toBe('LAST_7_DAYS');
    expect(DateRangeFilter.LAST_30_DAYS).toBe('LAST_30_DAYS');
    expect(DateRangeFilter.ALL).toBe('ALL');
  });

  it('has exactly 4 values', () => {
    expect(Object.keys(DateRangeFilter)).toHaveLength(4);
  });
});

describe('ErrorSource', () => {
  it('has expected values', () => {
    expect(ErrorSource.TARGET).toBe('TARGET');
    expect(ErrorSource.SYSTEM).toBe('SYSTEM');
    expect(ErrorSource.TARGET_PROFILING).toBe('TARGET_PROFILING');
  });

  it('has exactly 5 values', () => {
    expect(Object.keys(ErrorSource)).toHaveLength(5);
  });
});

describe('RedTeamErrorType', () => {
  it('has expected values', () => {
    expect(RedTeamErrorType.CONTENT_FILTER).toBe('CONTENT_FILTER');
    expect(RedTeamErrorType.RATE_LIMIT).toBe('RATE_LIMIT');
    expect(RedTeamErrorType.UNKNOWN).toBe('UNKNOWN');
  });

  it('has exactly 7 values', () => {
    expect(Object.keys(RedTeamErrorType)).toHaveLength(7);
  });
});

describe('FileFormat', () => {
  it('has expected values', () => {
    expect(FileFormat.CSV).toBe('CSV');
    expect(FileFormat.JSON).toBe('JSON');
    expect(FileFormat.ALL).toBe('ALL');
  });

  it('has exactly 3 values', () => {
    expect(Object.keys(FileFormat)).toHaveLength(3);
  });
});

describe('GoalType', () => {
  it('has expected values', () => {
    expect(GoalType.BASE).toBe('BASE');
    expect(GoalType.TOOL_MISUSE).toBe('TOOL_MISUSE');
    expect(GoalType.GOAL_MANIPULATION).toBe('GOAL_MANIPULATION');
  });

  it('has exactly 3 values', () => {
    expect(Object.keys(GoalType)).toHaveLength(3);
  });
});

describe('GoalTypeQueryParam', () => {
  it('has expected values', () => {
    expect(GoalTypeQueryParam.AGENT).toBe('AGENT');
    expect(GoalTypeQueryParam.HUMAN_AUGMENTED).toBe('HUMAN_AUGMENTED');
  });

  it('has exactly 2 values', () => {
    expect(Object.keys(GoalTypeQueryParam)).toHaveLength(2);
  });
});

describe('GuardrailAction', () => {
  it('has expected values', () => {
    expect(GuardrailAction.ALLOW).toBe('ALLOW');
    expect(GuardrailAction.BLOCK).toBe('BLOCK');
  });

  it('has exactly 2 values', () => {
    expect(Object.keys(GuardrailAction)).toHaveLength(2);
  });
});

describe('JobStatus', () => {
  it('has expected values', () => {
    expect(JobStatus.INIT).toBe('INIT');
    expect(JobStatus.RUNNING).toBe('RUNNING');
    expect(JobStatus.ABORTED).toBe('ABORTED');
  });

  it('has exactly 7 values', () => {
    expect(Object.keys(JobStatus)).toHaveLength(7);
  });
});

describe('JobStatusFilter', () => {
  it('has expected values', () => {
    expect(JobStatusFilter.QUEUED).toBe('QUEUED');
    expect(JobStatusFilter.COMPLETED).toBe('COMPLETED');
    expect(JobStatusFilter.ABORTED).toBe('ABORTED');
  });

  it('has exactly 6 values', () => {
    expect(Object.keys(JobStatusFilter)).toHaveLength(6);
  });
});

describe('JobType', () => {
  it('has expected values', () => {
    expect(JobType.STATIC).toBe('STATIC');
    expect(JobType.DYNAMIC).toBe('DYNAMIC');
    expect(JobType.CUSTOM).toBe('CUSTOM');
  });

  it('has exactly 3 values', () => {
    expect(Object.keys(JobType)).toHaveLength(3);
  });
});

describe('PolicyType', () => {
  it('has expected values', () => {
    expect(PolicyType.PROMPT_INJECTION).toBe('PROMPT_INJECTION');
    expect(PolicyType.TOXIC_CONTENT).toBe('TOXIC_CONTENT');
    expect(PolicyType.SENSITIVE_DATA_PROTECTION).toBe('SENSITIVE_DATA_PROTECTION');
  });

  it('has exactly 6 values', () => {
    expect(Object.keys(PolicyType)).toHaveLength(6);
  });
});

describe('ProfilingStatus', () => {
  it('has expected values', () => {
    expect(ProfilingStatus.INIT).toBe('INIT');
    expect(ProfilingStatus.IN_PROGRESS).toBe('IN_PROGRESS');
    expect(ProfilingStatus.FAILED).toBe('FAILED');
  });

  it('has exactly 5 values', () => {
    expect(Object.keys(ProfilingStatus)).toHaveLength(5);
  });
});

describe('RedTeamCategory', () => {
  it('has expected values', () => {
    expect(RedTeamCategory.SECURITY).toBe('SECURITY');
    expect(RedTeamCategory.SAFETY).toBe('SAFETY');
    expect(RedTeamCategory.BRAND).toBe('BRAND');
  });

  it('has exactly 4 values', () => {
    expect(Object.keys(RedTeamCategory)).toHaveLength(4);
  });
});

describe('ResponseMode', () => {
  it('has expected values', () => {
    expect(ResponseMode.REST).toBe('REST');
    expect(ResponseMode.STREAMING).toBe('STREAMING');
  });

  it('has exactly 2 values', () => {
    expect(Object.keys(ResponseMode)).toHaveLength(2);
  });
});

describe('RiskRating', () => {
  it('has expected values', () => {
    expect(RiskRating.LOW).toBe('LOW');
    expect(RiskRating.HIGH).toBe('HIGH');
    expect(RiskRating.CRITICAL).toBe('CRITICAL');
  });

  it('has exactly 4 values', () => {
    expect(Object.keys(RiskRating)).toHaveLength(4);
  });
});

describe('SafetySubCategory', () => {
  it('has expected values', () => {
    expect(SafetySubCategory.BIAS).toBe('BIAS');
    expect(SafetySubCategory.CYBERCRIME).toBe('CYBERCRIME');
    expect(SafetySubCategory.VIOLENT_CRIMES_WEAPONS).toBe('VIOLENT_CRIMES_WEAPONS');
  });

  it('has exactly 10 values', () => {
    expect(Object.keys(SafetySubCategory)).toHaveLength(10);
  });
});

describe('SecuritySubCategory', () => {
  it('has expected values', () => {
    expect(SecuritySubCategory.JAILBREAK).toBe('JAILBREAK');
    expect(SecuritySubCategory.PROMPT_INJECTION).toBe('PROMPT_INJECTION');
    expect(SecuritySubCategory.MALWARE_GENERATION).toBe('MALWARE_GENERATION');
  });

  it('has exactly 10 values', () => {
    expect(Object.keys(SecuritySubCategory)).toHaveLength(10);
  });
});

describe('SeverityFilter', () => {
  it('has expected values', () => {
    expect(SeverityFilter.LOW).toBe('LOW');
    expect(SeverityFilter.MEDIUM).toBe('MEDIUM');
    expect(SeverityFilter.CRITICAL).toBe('CRITICAL');
  });

  it('has exactly 4 values', () => {
    expect(Object.keys(SeverityFilter)).toHaveLength(4);
  });
});

describe('StatusQueryParam', () => {
  it('has expected values', () => {
    expect(StatusQueryParam.SUCCESSFUL).toBe('SUCCESSFUL');
    expect(StatusQueryParam.FAILED).toBe('FAILED');
  });

  it('has exactly 2 values', () => {
    expect(Object.keys(StatusQueryParam)).toHaveLength(2);
  });
});

describe('StreamType', () => {
  it('has expected values', () => {
    expect(StreamType.NORMAL).toBe('NORMAL');
    expect(StreamType.ADVERSARIAL).toBe('ADVERSARIAL');
  });

  it('has exactly 2 values', () => {
    expect(Object.keys(StreamType)).toHaveLength(2);
  });
});

describe('TargetConnectionType', () => {
  it('has expected values', () => {
    expect(TargetConnectionType.DATABRICKS).toBe('DATABRICKS');
    expect(TargetConnectionType.OPENAI).toBe('OPENAI');
    expect(TargetConnectionType.STREAMING).toBe('STREAMING');
  });

  it('has exactly 7 values', () => {
    expect(Object.keys(TargetConnectionType)).toHaveLength(7);
  });
});

describe('TargetStatus', () => {
  it('has expected values', () => {
    expect(TargetStatus.DRAFT).toBe('DRAFT');
    expect(TargetStatus.ACTIVE).toBe('ACTIVE');
    expect(TargetStatus.PENDING_AUTH).toBe('PENDING_AUTH');
  });

  it('has exactly 7 values', () => {
    expect(Object.keys(TargetStatus)).toHaveLength(7);
  });
});

describe('TargetType', () => {
  it('has expected values', () => {
    expect(TargetType.APPLICATION).toBe('APPLICATION');
    expect(TargetType.AGENT).toBe('AGENT');
    expect(TargetType.MODEL).toBe('MODEL');
  });

  it('has exactly 3 values', () => {
    expect(Object.keys(TargetType)).toHaveLength(3);
  });
});
