// src/models/enums.ts — typed enums for AIRS API verdict/action/category values

/** Scan result verdict classification. */
export const Verdict = {
  BENIGN: 'benign',
  MALICIOUS: 'malicious',
  UNKNOWN: 'unknown',
} as const;

/** Union type of all possible verdict values. */
export type Verdict = (typeof Verdict)[keyof typeof Verdict];

/** Enforcement action taken by AIRS. */
export const Action = {
  ALLOW: 'allow',
  BLOCK: 'block',
  ALERT: 'alert',
} as const;

/** Union type of all possible action values. */
export type Action = (typeof Action)[keyof typeof Action];

/** Top-level scan result category. */
export const Category = {
  BENIGN: 'benign',
  MALICIOUS: 'malicious',
  UNKNOWN: 'unknown',
} as const;

/** Union type of all possible category values. */
export type Category = (typeof Category)[keyof typeof Category];

/** Detection service names used in scan results. */
export const DetectionServiceName = {
  DLP: 'dlp',
  INJECTION: 'injection',
  URL_CATS: 'url_cats',
  TOXIC_CONTENT: 'toxic_content',
  MALICIOUS_CODE: 'malicious_code',
  AGENT: 'agent',
  TOPIC_VIOLATION: 'topic_violation',
  DB_SECURITY: 'db_security',
  UNGROUNDED: 'ungrounded',
} as const;

/** Union type of all detection service name values. */
export type DetectionServiceName = (typeof DetectionServiceName)[keyof typeof DetectionServiceName];

/** Content type that encountered an error during scanning. */
export const ContentErrorType = {
  PROMPT: 'prompt',
  RESPONSE: 'response',
} as const;

/** Union type of content error type values. */
export type ContentErrorType = (typeof ContentErrorType)[keyof typeof ContentErrorType];

/** Status of a detection service error. */
export const ErrorStatus = {
  ERROR: 'error',
  TIMEOUT: 'timeout',
} as const;

/** Union type of error status values. */
export type ErrorStatus = (typeof ErrorStatus)[keyof typeof ErrorStatus];
