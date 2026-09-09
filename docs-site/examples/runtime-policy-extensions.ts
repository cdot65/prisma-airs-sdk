/** Credential-free example of observed policy extensions; values are illustrative. */
import {
  PolicySchema,
  SourceCodeDetectionSchema,
  SeverityByConfidenceSchema,
  ToxicCategorySchema,
  type SourceCodeDetection,
  type SeverityByConfidence,
  type ToxicCategory,
} from '@cdot65/prisma-airs-sdk';

const source: SourceCodeDetection = SourceCodeDetectionSchema.parse({
  action: 'block', severity: 'high',
});
const confidence: SeverityByConfidence = SeverityByConfidenceSchema.parse({
  high: 'medium', moderate: 'low',
});
const category: ToxicCategory = ToxicCategorySchema.parse({
  category: 'hate', action: 'high:block, moderate:block',
  'severity-by-confidence': confidence,
});
const policy = PolicySchema.parse({
  'ai-security-profiles': [{
    'model-configuration': {
      'data-protection': { 'source-code-detection': source },
      'model-protection': [{ name: 'toxic-content', 'toxic-category-list': [category] }],
    },
  }],
});
const severity: string | undefined = policy['ai-security-profiles']?.[0]
  ?.['model-configuration']?.['model-protection']?.[0]?.['toxic-category-list']?.[0]
  ?.['severity-by-confidence']?.high;
console.log(JSON.stringify({ sourceCodeSeverity: source.severity, highConfidenceSeverity: severity }));
