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
