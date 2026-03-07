// src/models/red-team-enums.ts — typed enums for AIRS Red Teaming API values

/** API endpoint accessibility type. */
export const ApiEndpointType = {
  PUBLIC: 'PUBLIC',
  PRIVATE: 'PRIVATE',
  NETWORK_BROKER: 'NETWORK_BROKER',
} as const;
export type ApiEndpointType = (typeof ApiEndpointType)[keyof typeof ApiEndpointType];

/** Attack lifecycle status. */
export const AttackStatus = {
  INIT: 'INIT',
  ATTACK: 'ATTACK',
  DETECTION: 'DETECTION',
  REPORT: 'REPORT',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
} as const;
export type AttackStatus = (typeof AttackStatus)[keyof typeof AttackStatus];

/** Attack type classification. */
export const AttackType = {
  NORMAL: 'NORMAL',
  CUSTOM: 'CUSTOM',
} as const;
export type AttackType = (typeof AttackType)[keyof typeof AttackType];

/** Authentication type for target connections. */
export const AuthType = {
  OAUTH: 'OAUTH',
  ACCESS_TOKEN: 'ACCESS_TOKEN',
} as const;
export type AuthType = (typeof AuthType)[keyof typeof AuthType];

/** Brand risk subcategories. */
export const BrandSubCategory = {
  COMPETITOR_ENDORSEMENTS: 'COMPETITOR_ENDORSEMENTS',
  BRAND_TARNISHING_SELF_CRITICISM: 'BRAND_TARNISHING_SELF_CRITICISM',
  DISCRIMINATING_CLAIMS: 'DISCRIMINATING_CLAIMS',
  POLITICAL_ENDORSEMENTS: 'POLITICAL_ENDORSEMENTS',
} as const;
export type BrandSubCategory = (typeof BrandSubCategory)[keyof typeof BrandSubCategory];

/** Compliance framework subcategories. */
export const ComplianceSubCategory = {
  OWASP: 'OWASP',
  MITRE_ATLAS: 'MITRE_ATLAS',
  NIST: 'NIST',
  DASF_V2: 'DASF_V2',
} as const;
export type ComplianceSubCategory =
  (typeof ComplianceSubCategory)[keyof typeof ComplianceSubCategory];

/** Whether a scan counts toward quota. */
export const CountedQuotaEnum = {
  HELD: 'HELD',
  COUNTED: 'COUNTED',
  NOT_COUNTED: 'NOT_COUNTED',
} as const;
export type CountedQuotaEnum = (typeof CountedQuotaEnum)[keyof typeof CountedQuotaEnum];

/** Date range filter for dashboard queries. */
export const DateRangeFilter = {
  LAST_7_DAYS: 'LAST_7_DAYS',
  LAST_15_DAYS: 'LAST_15_DAYS',
  LAST_30_DAYS: 'LAST_30_DAYS',
  ALL: 'ALL',
} as const;
export type DateRangeFilter = (typeof DateRangeFilter)[keyof typeof DateRangeFilter];

/** Error source for error log entries. */
export const ErrorSource = {
  TARGET: 'TARGET',
  JOB: 'JOB',
  SYSTEM: 'SYSTEM',
  VALIDATION: 'VALIDATION',
  TARGET_PROFILING: 'TARGET_PROFILING',
} as const;
export type ErrorSource = (typeof ErrorSource)[keyof typeof ErrorSource];

/** Red Team error type classification (prefixed to avoid conflict with SDK ErrorType). */
export const RedTeamErrorType = {
  CONTENT_FILTER: 'CONTENT_FILTER',
  RATE_LIMIT: 'RATE_LIMIT',
  AUTHENTICATION: 'AUTHENTICATION',
  NETWORK: 'NETWORK',
  VALIDATION: 'VALIDATION',
  NETWORK_CHANNEL: 'NETWORK_CHANNEL',
  UNKNOWN: 'UNKNOWN',
} as const;
export type RedTeamErrorType = (typeof RedTeamErrorType)[keyof typeof RedTeamErrorType];

/** Report download file format. */
export const FileFormat = {
  CSV: 'CSV',
  JSON: 'JSON',
  ALL: 'ALL',
} as const;
export type FileFormat = (typeof FileFormat)[keyof typeof FileFormat];

/** Dynamic scan goal type. */
export const GoalType = {
  BASE: 'BASE',
  TOOL_MISUSE: 'TOOL_MISUSE',
  GOAL_MANIPULATION: 'GOAL_MANIPULATION',
} as const;
export type GoalType = (typeof GoalType)[keyof typeof GoalType];

/** Goal type query parameter filter. */
export const GoalTypeQueryParam = {
  AGENT: 'AGENT',
  HUMAN_AUGMENTED: 'HUMAN_AUGMENTED',
} as const;
export type GoalTypeQueryParam = (typeof GoalTypeQueryParam)[keyof typeof GoalTypeQueryParam];

/** Guardrail action for runtime security policies. */
export const GuardrailAction = {
  ALLOW: 'ALLOW',
  BLOCK: 'BLOCK',
} as const;
export type GuardrailAction = (typeof GuardrailAction)[keyof typeof GuardrailAction];

/** Red team scan job status. */
export const JobStatus = {
  INIT: 'INIT',
  QUEUED: 'QUEUED',
  RUNNING: 'RUNNING',
  COMPLETED: 'COMPLETED',
  PARTIALLY_COMPLETE: 'PARTIALLY_COMPLETE',
  FAILED: 'FAILED',
  ABORTED: 'ABORTED',
} as const;
export type JobStatus = (typeof JobStatus)[keyof typeof JobStatus];

/** Job status values available for filtering (excludes INIT). */
export const JobStatusFilter = {
  QUEUED: 'QUEUED',
  RUNNING: 'RUNNING',
  COMPLETED: 'COMPLETED',
  PARTIALLY_COMPLETE: 'PARTIALLY_COMPLETE',
  FAILED: 'FAILED',
  ABORTED: 'ABORTED',
} as const;
export type JobStatusFilter = (typeof JobStatusFilter)[keyof typeof JobStatusFilter];

/** Red team scan job type. */
export const JobType = {
  STATIC: 'STATIC',
  DYNAMIC: 'DYNAMIC',
  CUSTOM: 'CUSTOM',
} as const;
export type JobType = (typeof JobType)[keyof typeof JobType];

/** Runtime security policy type. */
export const PolicyType = {
  PROMPT_INJECTION: 'PROMPT_INJECTION',
  TOXIC_CONTENT: 'TOXIC_CONTENT',
  CUSTOM_TOPIC_GUARDRAILS: 'CUSTOM_TOPIC_GUARDRAILS',
  MALICIOUS_CODE_DETECTION: 'MALICIOUS_CODE_DETECTION',
  MALICIOUS_URL_DETECTION: 'MALICIOUS_URL_DETECTION',
  SENSITIVE_DATA_PROTECTION: 'SENSITIVE_DATA_PROTECTION',
} as const;
export type PolicyType = (typeof PolicyType)[keyof typeof PolicyType];

/** Target profiling status. */
export const ProfilingStatus = {
  INIT: 'INIT',
  QUEUED: 'QUEUED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
} as const;
export type ProfilingStatus = (typeof ProfilingStatus)[keyof typeof ProfilingStatus];

/** Red Team risk category (prefixed to avoid conflict with SDK Category). */
export const RedTeamCategory = {
  SECURITY: 'SECURITY',
  SAFETY: 'SAFETY',
  COMPLIANCE: 'COMPLIANCE',
  BRAND: 'BRAND',
} as const;
export type RedTeamCategory = (typeof RedTeamCategory)[keyof typeof RedTeamCategory];

/** Target response mode. */
export const ResponseMode = {
  REST: 'REST',
  STREAMING: 'STREAMING',
} as const;
export type ResponseMode = (typeof ResponseMode)[keyof typeof ResponseMode];

/** Risk rating levels. */
export const RiskRating = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const;
export type RiskRating = (typeof RiskRating)[keyof typeof RiskRating];

/** Safety risk subcategories. */
export const SafetySubCategory = {
  BIAS: 'BIAS',
  CBRN: 'CBRN',
  CYBERCRIME: 'CYBERCRIME',
  DRUGS: 'DRUGS',
  HATE_TOXIC_ABUSE: 'HATE_TOXIC_ABUSE',
  NON_VIOLENT_CRIMES: 'NON_VIOLENT_CRIMES',
  POLITICAL: 'POLITICAL',
  SELF_HARM: 'SELF_HARM',
  SEXUAL: 'SEXUAL',
  VIOLENT_CRIMES_WEAPONS: 'VIOLENT_CRIMES_WEAPONS',
} as const;
export type SafetySubCategory = (typeof SafetySubCategory)[keyof typeof SafetySubCategory];

/** Security risk subcategories. */
export const SecuritySubCategory = {
  ADVERSARIAL_SUFFIX: 'ADVERSARIAL_SUFFIX',
  EVASION: 'EVASION',
  INDIRECT_PROMPT_INJECTION: 'INDIRECT_PROMPT_INJECTION',
  JAILBREAK: 'JAILBREAK',
  MULTI_TURN: 'MULTI_TURN',
  PROMPT_INJECTION: 'PROMPT_INJECTION',
  REMOTE_CODE_EXECUTION: 'REMOTE_CODE_EXECUTION',
  SYSTEM_PROMPT_LEAK: 'SYSTEM_PROMPT_LEAK',
  TOOL_LEAK: 'TOOL_LEAK',
  MALWARE_GENERATION: 'MALWARE_GENERATION',
} as const;
export type SecuritySubCategory = (typeof SecuritySubCategory)[keyof typeof SecuritySubCategory];

/** Severity filter levels. */
export const SeverityFilter = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const;
export type SeverityFilter = (typeof SeverityFilter)[keyof typeof SeverityFilter];

/** Attack status query parameter filter. */
export const StatusQueryParam = {
  SUCCESSFUL: 'SUCCESSFUL',
  FAILED: 'FAILED',
} as const;
export type StatusQueryParam = (typeof StatusQueryParam)[keyof typeof StatusQueryParam];

/** Dynamic scan stream type. */
export const StreamType = {
  NORMAL: 'NORMAL',
  ADVERSARIAL: 'ADVERSARIAL',
} as const;
export type StreamType = (typeof StreamType)[keyof typeof StreamType];

/** Target connection provider type. */
export const TargetConnectionType = {
  DATABRICKS: 'DATABRICKS',
  BEDROCK: 'BEDROCK',
  OPENAI: 'OPENAI',
  HUGGING_FACE: 'HUGGING_FACE',
  CUSTOM: 'CUSTOM',
  REST: 'REST',
  STREAMING: 'STREAMING',
} as const;
export type TargetConnectionType = (typeof TargetConnectionType)[keyof typeof TargetConnectionType];

/** Target lifecycle status. */
export const TargetStatus = {
  DRAFT: 'DRAFT',
  VALIDATING: 'VALIDATING',
  VALIDATED: 'VALIDATED',
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  FAILED: 'FAILED',
  PENDING_AUTH: 'PENDING_AUTH',
} as const;
export type TargetStatus = (typeof TargetStatus)[keyof typeof TargetStatus];

/** Target classification type. */
export const TargetType = {
  APPLICATION: 'APPLICATION',
  AGENT: 'AGENT',
  MODEL: 'MODEL',
} as const;
export type TargetType = (typeof TargetType)[keyof typeof TargetType];
