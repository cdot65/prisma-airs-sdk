import { z } from 'zod';

/** Typed compliance framework fields from the Red Team OpenAPI contract. */
const ComplianceFrameworkDefinition = z
  .object({
    id: z.string(),
    display_name: z.string(),
    description: z.string(),
    active: z.boolean(),
    version: z.string(),
    link: z.string(),
    techniques: z.array(
      z
        .object({
          id: z.string(),
          display_name: z.string(),
          compliance_id: z.string(),
          description: z.string(),
          link: z.string(),
          version: z.string(),
          active: z.boolean(),
        })
        .passthrough(),
    ),
  })
  .passthrough();
/** Public response fields; the runtime schema assignment checks this structure. */
export type ComplianceFramework = {
  id: string;
  display_name: string;
  description: string;
  active: boolean;
  version: string;
  link: string;
  techniques: z.objectOutputType<
    {
      id: z.ZodString;
      display_name: z.ZodString;
      compliance_id: z.ZodString;
      description: z.ZodString;
      link: z.ZodString;
      version: z.ZodString;
      active: z.ZodBoolean;
    },
    z.ZodTypeAny,
    'passthrough'
  >[];
} & { [k: string]: unknown };
/** Named validator keeps nested declaration types compact. */
export const ComplianceFrameworkSchema: z.ZodType<ComplianceFramework> =
  ComplianceFrameworkDefinition;

/** Shared typed fields across the optional-field runtime policy config variants. */
const RuntimeSecurityPolicyConfigDefinition = z
  .object({
    action: z.string().optional(),
    moderate: z.string().optional(),
    high: z.string().optional(),
    blocked_topics: z.array(z.string()).optional(),
    masking_sensitive_data: z.boolean().optional(),
  })
  .passthrough();
/** Public response fields; the runtime schema assignment checks this structure. */
export type RuntimeSecurityPolicyConfig = {
  action?: string | undefined;
  moderate?: string | undefined;
  high?: string | undefined;
  blocked_topics?: string[] | undefined;
  masking_sensitive_data?: boolean | undefined;
} & { [k: string]: unknown };
/** Named validator keeps nested declaration types compact. */
export const RuntimeSecurityPolicyConfigSchema: z.ZodType<RuntimeSecurityPolicyConfig> =
  RuntimeSecurityPolicyConfigDefinition;

/** A stream's goal can be an identifier, an expanded goal, or null. */
const StreamGoalDefinition = z
  .union([
    z.string(),
    z
      .object({
        goal: z.string(),
        goal_english: z.string().nullable().optional(),
        safe_response: z.string(),
        jailbroken_response: z.string(),
        goal_metadata: z.record(z.unknown()).optional(),
        custom_goal: z.boolean().optional(),
        goal_type: z.string().optional(),
        goal_category: z.string().nullable().optional(),
        uuid: z.string(),
        tsg_id: z.string(),
        job_id: z.string(),
        goal_to_show: z.string().nullable().optional(),
        threat: z.boolean().optional(),
        version: z.number().int().nullable().optional(),
        extra_info: z.record(z.unknown()).nullable().optional(),
        error: z.boolean().nullable().optional(),
      })
      .passthrough(),
  ])
  .nullable();
/** Public response fields; the runtime schema assignment checks this structure. */
export type StreamGoal =
  | string
  | z.objectOutputType<
      {
        goal: z.ZodString;
        goal_english: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        safe_response: z.ZodString;
        jailbroken_response: z.ZodString;
        goal_metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        custom_goal: z.ZodOptional<z.ZodBoolean>;
        goal_type: z.ZodOptional<z.ZodString>;
        goal_category: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        uuid: z.ZodString;
        tsg_id: z.ZodString;
        job_id: z.ZodString;
        goal_to_show: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        threat: z.ZodOptional<z.ZodBoolean>;
        version: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        extra_info: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
        error: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
      },
      z.ZodTypeAny,
      'passthrough'
    >
  | null;
/** Named validator keeps nested declaration types compact. */
export const StreamGoalSchema: z.ZodType<StreamGoal> = StreamGoalDefinition;

/** Provider configuration for targets; Copilot's legacy cache field remains readable. */
const TargetConnectionConfigDefinition = z
  .union([
    z.object({ api_key: z.string(), model_name: z.string() }).passthrough(),
    z
      .object({
        auth_type: z.string(),
        access_token: z.string().nullable().optional(),
        client_id: z.string().nullable().optional(),
        secret: z.string().nullable().optional(),
        workspace_url: z.string(),
        model_name: z.string(),
      })
      .passthrough(),
    z
      .object({
        access_id: z.string(),
        access_secret: z.string(),
        session_token: z.string().nullable().optional(),
        region: z.string(),
        model_id: z.string(),
      })
      .passthrough(),
    z
      .object({
        client_id: z.string(),
        client_secret: z.string(),
        tenant_id: z.string(),
        schema_name: z.string(),
        environment_id: z.string(),
        token_json_uuid: z.string().nullable().optional(),
        token_cache_json: z.string().nullable().optional(),
      })
      .passthrough(),
  ])
  .nullable();
/** Public response fields; the runtime schema assignment checks this structure. */
export type TargetConnectionConfig =
  | z.objectOutputType<
      { api_key: z.ZodString; model_name: z.ZodString },
      z.ZodTypeAny,
      'passthrough'
    >
  | z.objectOutputType<
      {
        auth_type: z.ZodString;
        access_token: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        client_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        secret: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        workspace_url: z.ZodString;
        model_name: z.ZodString;
      },
      z.ZodTypeAny,
      'passthrough'
    >
  | z.objectOutputType<
      {
        access_id: z.ZodString;
        access_secret: z.ZodString;
        session_token: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        region: z.ZodString;
        model_id: z.ZodString;
      },
      z.ZodTypeAny,
      'passthrough'
    >
  | z.objectOutputType<
      {
        client_id: z.ZodString;
        client_secret: z.ZodString;
        tenant_id: z.ZodString;
        schema_name: z.ZodString;
        environment_id: z.ZodString;
        token_json_uuid: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        token_cache_json: z.ZodOptional<z.ZodNullable<z.ZodString>>;
      },
      z.ZodTypeAny,
      'passthrough'
    >
  | null;
/** Named validator keeps nested declaration types compact. */
export const TargetConnectionConfigSchema: z.ZodType<TargetConnectionConfig> =
  TargetConnectionConfigDefinition;

/** Stateful or stateless multi-turn configuration without injecting a branch's defaults. */
const MultiTurnConfigDefinition = z
  .union([
    z
      .object({
        type: z.literal('stateful').optional(),
        response_id_field: z.string(),
        request_id_field: z.string(),
      })
      .passthrough(),
    z
      .object({
        type: z.literal('stateless').optional(),
        assistant_role: z.string().nullable().optional(),
      })
      .passthrough(),
  ])
  .nullable();
/** Public response fields; the runtime schema assignment checks this structure. */
export type MultiTurnConfig =
  | z.objectOutputType<
      {
        type: z.ZodOptional<z.ZodLiteral<'stateful'>>;
        response_id_field: z.ZodString;
        request_id_field: z.ZodString;
      },
      z.ZodTypeAny,
      'passthrough'
    >
  | z.objectOutputType<
      {
        type: z.ZodOptional<z.ZodLiteral<'stateless'>>;
        assistant_role: z.ZodOptional<z.ZodNullable<z.ZodString>>;
      },
      z.ZodTypeAny,
      'passthrough'
    >
  | null;
/** Named validator keeps nested declaration types compact. */
export const MultiTurnConfigSchema: z.ZodType<MultiTurnConfig> = MultiTurnConfigDefinition;
