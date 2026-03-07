// src/models/enums.ts — typed enums for AIRS API verdict/action/category values

export const Verdict = {
  BENIGN: 'benign',
  MALICIOUS: 'malicious',
  UNKNOWN: 'unknown',
} as const;

export type Verdict = (typeof Verdict)[keyof typeof Verdict];

export const Action = {
  ALLOW: 'allow',
  BLOCK: 'block',
  ALERT: 'alert',
} as const;

export type Action = (typeof Action)[keyof typeof Action];

export const Category = {
  BENIGN: 'benign',
  MALICIOUS: 'malicious',
  UNKNOWN: 'unknown',
} as const;

export type Category = (typeof Category)[keyof typeof Category];
