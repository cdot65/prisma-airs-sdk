import { z } from 'zod';
import { ModelSecurityPaginationSchema } from './model-security.js';

/** A condition comparing a scan label. */
export const LabelConditionSchema = z
  .object({
    type: z.literal('label'),
    key: z.string().min(1).max(255),
    operator: z.enum(['equals', 'not_equals', 'exists', 'not_exists']),
    value: z.string().max(1024).nullable().optional(),
  })
  .strict();
export type LabelCondition = z.infer<typeof LabelConditionSchema>;
/** A condition comparing a security rule result. */
export const RuleResultConditionSchema = z
  .object({
    type: z.literal('rule_result'),
    rule_uuid: z.string().uuid(),
    operator: z.literal('equals'),
    value: z.enum(['PASSED', 'FAILED']),
  })
  .strict();
export type RuleResultCondition = z.infer<typeof RuleResultConditionSchema>;
/** Recursive conjunction or disjunction of at least two conditions. */
export interface ConditionGroup {
  operator: 'and' | 'or';
  conditions: CustomRuleCondition[];
}
export type CustomRuleCondition = LabelCondition | RuleResultCondition | ConditionGroup;
export const ConditionGroupSchema: z.ZodType<ConditionGroup> = z.lazy(() =>
  z
    .object({
      operator: z.enum(['and', 'or']),
      conditions: z.array(CustomRuleConditionSchema).min(2),
    })
    .strict(),
);
export const CustomRuleConditionSchema: z.ZodType<CustomRuleCondition> = z.lazy(() =>
  z.union([LabelConditionSchema, RuleResultConditionSchema, ConditionGroupSchema]),
);
/** Sources supported by custom rule creation. */
export const CustomRuleSourceTypeSchema = z.enum([
  'LOCAL',
  'HUGGING_FACE',
  'S3',
  'GCS',
  'AZURE',
  'ARTIFACTORY',
  'GITLAB',
  'ALL',
]);
export const CustomRuleStateSchema = z.enum(['DISABLED', 'ALLOWING', 'BLOCKING']);

/** Custom rule creation body; defaults remain server-owned. */
export const CustomRuleCreateRequestSchema = z
  .object({
    name: z.string().min(1).max(255),
    description: z.string().max(1000).optional(),
    compatible_sources: z.array(CustomRuleSourceTypeSchema).min(1),
    condition: CustomRuleConditionSchema,
    violation_message: z.string().min(1).max(4096),
    remediation_message: z.string().max(4096).nullable().optional(),
    rule_action: z.enum(['FAIL', 'PASS']).optional(),
  })
  .strict();
export type CustomRuleCreateRequest = z.infer<typeof CustomRuleCreateRequestSchema>;
/** Nullable partial update of a custom rule. */
export const CustomRuleUpdateRequestSchema = z
  .object({
    name: z.string().min(1).max(255).nullable().optional(),
    description: z.string().max(1000).nullable().optional(),
    condition: CustomRuleConditionSchema.nullable().optional(),
    violation_message: z.string().min(1).max(4096).nullable().optional(),
    remediation_message: z.string().max(4096).nullable().optional(),
    rule_action: z.enum(['FAIL', 'PASS']).nullable().optional(),
  })
  .strict();
export type CustomRuleUpdateRequest = z.infer<typeof CustomRuleUpdateRequestSchema>;
/** A custom rule, including nullable historical snapshot fields. */
export const CustomRuleResponseSchema = z
  .object({
    uuid: z.string().uuid(),
    tsg_id: z.string().max(64),
    name: z.string(),
    description: z.string(),
    compatible_sources: z.array(z.string()),
    condition: CustomRuleConditionSchema.nullable().optional(),
    violation_message: z.string(),
    remediation_message: z.string().nullable(),
    is_archived: z.boolean(),
    created_by: z.string().uuid().nullable(),
    updated_by: z.string().uuid().nullable(),
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional(),
    rule_action: z.string().nullable().optional(),
  })
  .passthrough();
export type CustomRuleResponse = z.infer<typeof CustomRuleResponseSchema>;
export const CustomRuleListItemSchema = CustomRuleResponseSchema.extend({
  enabled_security_group_count: z.number().int().nullable().optional(),
});
export type CustomRuleListItem = z.infer<typeof CustomRuleListItemSchema>;
export const ListCustomRulesResponseSchema = z
  .object({
    pagination: ModelSecurityPaginationSchema,
    custom_rules: z.array(CustomRuleListItemSchema),
  })
  .passthrough();
export type ListCustomRulesResponse = z.infer<typeof ListCustomRulesResponseSchema>;
/** Assigned group and effective rule state. */
export const CustomRuleSecurityGroupSchema = z
  .object({
    uuid: z.string().uuid(),
    name: z.string(),
    source_type: z.string(),
    rule_state: z.string(),
  })
  .passthrough();
export type CustomRuleSecurityGroup = z.infer<typeof CustomRuleSecurityGroupSchema>;
export const ListCustomRuleSecurityGroupsResponseSchema = z
  .object({
    pagination: ModelSecurityPaginationSchema,
    security_groups: z.array(CustomRuleSecurityGroupSchema),
  })
  .passthrough();
export type ListCustomRuleSecurityGroupsResponse = z.infer<
  typeof ListCustomRuleSecurityGroupsResponseSchema
>;
export const CustomRuleAssignmentSchema = z
  .object({ security_group_uuid: z.string().uuid(), state: CustomRuleStateSchema })
  .strict();
export type CustomRuleAssignment = z.infer<typeof CustomRuleAssignmentSchema>;
export const BatchAssignCustomRuleRequestSchema = z
  .object({ assignments: z.array(CustomRuleAssignmentSchema).min(1).max(50) })
  .strict();
export type BatchAssignCustomRuleRequest = z.infer<typeof BatchAssignCustomRuleRequestSchema>;
export const CustomRuleAssignmentResultSchema = z
  .object({
    security_group_uuid: z.string().uuid(),
    status: z.string(),
    error: z.string().nullable().optional(),
    rule_instance_uuid: z.string().uuid().nullable().optional(),
  })
  .passthrough();
export type CustomRuleAssignmentResult = z.infer<typeof CustomRuleAssignmentResultSchema>;
/** HTTP 207 contains individual assignment outcomes; inspect every result. */
export const BatchAssignCustomRuleResponseSchema = z
  .object({ results: z.array(CustomRuleAssignmentResultSchema) })
  .passthrough();
export type BatchAssignCustomRuleResponse = z.infer<typeof BatchAssignCustomRuleResponseSchema>;
/** Opaque cursor returned by historical listings. */
export const CursorPaginationSchema = z
  .object({ next_token: z.string().nullable().optional() })
  .passthrough();
export type CursorPagination = z.infer<typeof CursorPaginationSchema>;
/** Historical snapshot identified by its object generation. */
export const SnapshotVersionSchema = z
  .object({ generation: z.number().int(), timestamp: z.string() })
  .passthrough();
export type SnapshotVersion = z.infer<typeof SnapshotVersionSchema>;
export const SnapshotVersionListResponseSchema = z
  .object({ versions: z.array(SnapshotVersionSchema), pagination: CursorPaginationSchema })
  .passthrough();
export type SnapshotVersionListResponse = z.infer<typeof SnapshotVersionListResponseSchema>;
