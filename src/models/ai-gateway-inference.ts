/** Runtime inference models generated from Portkey OpenAPI SHA-256 de7a1bd98bdb2edb7428a33054d9f6000b9568d1cd5b603d1a8302c053d094d9.
 * Regenerate with scripts/openapi/generate-inference-models.ts and review compatibility changes.
 */
import { z } from 'zod';
import {
  GatewayJsonValueSchema,
  GatewayJsonObjectSchema,
  type GatewayJsonValue,
} from './ai-gateway-routing.js';

/** Portkey CreateCompletionRequest; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputCreateCompletionRequestSchema.parse(value);`
 */
export type GatewayInferenceInputCreateCompletionRequest = {
  model: string | 'gpt-3.5-turbo-instruct' | 'davinci-002' | 'babbage-002';
  prompt: (string | Array<string> | Array<number> | Array<Array<number>>) | null;
  best_of?: number | null;
  echo?: boolean | null;
  frequency_penalty?: number | null;
  logit_bias?: { [key: string]: number } | null;
  logprobs?: number | null;
  max_tokens?: number | null;
  n?: number | null;
  presence_penalty?: number | null;
  seed?: number | null;
  stop?: (string | null | Array<string>) | null;
  stream?: boolean | null;
  stream_options?: GatewayInferenceInputChatCompletionStreamOptions;
  suffix?: string | null;
  temperature?: number | null;
  top_p?: number | null;
  user?: string;
};
export const GatewayInferenceInputCreateCompletionRequestSchema: z.ZodType<GatewayInferenceInputCreateCompletionRequest> =
  z.lazy(() =>
    z
      .object({
        model: z.union([
          z.string(),
          z.union([
            z.literal('gpt-3.5-turbo-instruct'),
            z.literal('davinci-002'),
            z.literal('babbage-002'),
          ]),
        ]),
        prompt: z
          .union([
            z.string(),
            z.array(z.string()),
            z.array(z.number().finite().int()).min(1),
            z.array(z.array(z.number().finite().int()).min(1)).min(1),
          ])
          .nullable(),
        best_of: z.number().finite().int().min(0).max(20).nullable().optional(),
        echo: z.boolean().nullable().optional(),
        frequency_penalty: z.number().finite().min(-2).max(2).nullable().optional(),
        logit_bias: z
          .object({})
          .catchall(z.number().finite().int())
          .and(GatewayJsonObjectSchema)
          .nullable()
          .optional(),
        logprobs: z.number().finite().int().min(0).max(5).nullable().optional(),
        max_tokens: z.number().finite().int().min(0).nullable().optional(),
        n: z.number().finite().int().min(1).max(128).nullable().optional(),
        presence_penalty: z.number().finite().min(-2).max(2).nullable().optional(),
        seed: z
          .number()
          .finite()
          .int()
          .min(-9223372036854776000)
          .max(9223372036854776000)
          .nullable()
          .optional(),
        stop: z
          .union([z.string().nullable(), z.array(z.string()).min(1).max(4)])
          .nullable()
          .optional(),
        stream: z.boolean().nullable().optional(),
        stream_options: GatewayInferenceInputChatCompletionStreamOptionsSchema.optional(),
        suffix: z.string().nullable().optional(),
        temperature: z.number().finite().min(0).max(2).nullable().optional(),
        top_p: z.number().finite().min(0).max(1).nullable().optional(),
        user: z.string().optional(),
      })
      .strict(),
  );

/** Portkey ChatCompletionStreamOptions; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputChatCompletionStreamOptionsSchema.parse(value);`
 */
export type GatewayInferenceInputChatCompletionStreamOptions = { include_usage?: boolean } | null;
export const GatewayInferenceInputChatCompletionStreamOptionsSchema: z.ZodType<GatewayInferenceInputChatCompletionStreamOptions> =
  z.lazy(() => z.object({ include_usage: z.boolean().optional() }).strict().nullable());

/** Portkey CreateCompletionResponse; additive response fields are preserved.
 * @example `GatewayInferenceCreateCompletionResponseSchema.parse(value);`
 */
export type GatewayInferenceCreateCompletionResponse = {
  id: string;
  choices: Array<{
    finish_reason: ('stop' | 'length' | 'content_filter') | null;
    index: number;
    logprobs: {
      text_offset?: Array<number>;
      token_logprobs?: Array<number>;
      tokens?: Array<string>;
      top_logprobs?: Array<{ [key: string]: unknown }>;
      [key: string]: unknown;
    } | null;
    text: string;
    [key: string]: unknown;
  }>;
  created: number;
  model: string;
  system_fingerprint?: string | null;
  object: 'text_completion';
  usage?: GatewayInferenceCompletionUsage | null;
  [key: string]: unknown;
};
export const GatewayInferenceCreateCompletionResponseSchema: z.ZodType<GatewayInferenceCreateCompletionResponse> =
  z.lazy(() =>
    z
      .object({
        id: z.string(),
        choices: z.array(
          z
            .object({
              finish_reason: z
                .union([z.literal('stop'), z.literal('length'), z.literal('content_filter')])
                .nullable(),
              index: z.number().finite().int(),
              logprobs: z
                .object({
                  text_offset: z.array(z.number().finite().int()).optional(),
                  token_logprobs: z.array(z.number().finite()).optional(),
                  tokens: z.array(z.string()).optional(),
                  top_logprobs: z.array(z.object({}).passthrough()).optional(),
                })
                .passthrough()
                .nullable(),
              text: z.string(),
            })
            .passthrough(),
        ),
        created: z.number().finite().int(),
        model: z.string(),
        system_fingerprint: z.string().nullable().optional(),
        object: z.literal('text_completion'),
        usage: GatewayInferenceCompletionUsageSchema.nullable().optional(),
      })
      .passthrough(),
  );

/** Portkey CompletionUsage; additive response fields are preserved.
 * @example `GatewayInferenceCompletionUsageSchema.parse(value);`
 */
export type GatewayInferenceCompletionUsage = {
  completion_tokens: number;
  prompt_tokens: number;
  total_tokens: number;
  completion_tokens_details?: {
    reasoning_tokens?: number;
    accepted_prediction_tokens?: number;
    rejected_prediction_tokens?: number;
    [key: string]: unknown;
  } | null;
  prompt_tokens_details?: { cached_tokens?: number; [key: string]: unknown } | null;
  [key: string]: unknown;
};
export const GatewayInferenceCompletionUsageSchema: z.ZodType<GatewayInferenceCompletionUsage> =
  z.lazy(() =>
    z
      .object({
        completion_tokens: z.number().finite().int(),
        prompt_tokens: z.number().finite().int(),
        total_tokens: z.number().finite().int(),
        completion_tokens_details: z
          .object({
            reasoning_tokens: z.number().finite().int().optional(),
            accepted_prediction_tokens: z.number().finite().int().optional(),
            rejected_prediction_tokens: z.number().finite().int().optional(),
          })
          .passthrough()
          .nullable()
          .optional(),
        prompt_tokens_details: z
          .object({ cached_tokens: z.number().finite().int().optional() })
          .passthrough()
          .nullable()
          .optional(),
      })
      .passthrough(),
  );

/** Portkey CreatePromptCompletionRequest; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputCreatePromptCompletionRequestSchema.parse(value);`
 */
export type GatewayInferenceInputCreatePromptCompletionRequest =
  | {
      messages?: Array<GatewayInferenceInputChatCompletionRequestMessage>;
      model?:
        | string
        | 'gpt-5'
        | 'gpt-5-mini'
        | 'gpt-5-nano'
        | 'o4-mini'
        | 'o3'
        | 'o3-mini'
        | 'o1'
        | 'o1-mini'
        | 'gpt-4o'
        | 'gpt-4o-mini'
        | 'gpt-4o-2024-05-13'
        | 'gpt-4-turbo'
        | 'gpt-4-turbo-2024-04-09'
        | 'gpt-4-0125-preview'
        | 'gpt-4-turbo-preview'
        | 'gpt-4-1106-preview'
        | 'gpt-4-vision-preview'
        | 'gpt-4'
        | 'gpt-4-0314'
        | 'gpt-4-0613'
        | 'gpt-4-32k'
        | 'gpt-4-32k-0314'
        | 'gpt-4-32k-0613'
        | 'gpt-3.5-turbo'
        | 'gpt-3.5-turbo-16k'
        | 'gpt-3.5-turbo-0301'
        | 'gpt-3.5-turbo-0613'
        | 'gpt-3.5-turbo-1106'
        | 'gpt-3.5-turbo-0125'
        | 'gpt-3.5-turbo-16k-0613';
      frequency_penalty?: number | null;
      logit_bias?: { [key: string]: number } | null;
      logprobs?: boolean | null;
      top_logprobs?: number | null;
      max_tokens?: number | null;
      max_completion_tokens?: number | null;
      n?: number | null;
      presence_penalty?: number | null;
      response_format?:
        | GatewayInferenceInputResponseFormatText
        | GatewayInferenceInputResponseFormatJsonSchema
        | GatewayInferenceInputResponseFormatJsonObject;
      seed?: number | null;
      stop?: string | null | Array<string>;
      stream?: boolean;
      stream_options?: GatewayInferenceInputChatCompletionStreamOptions;
      thinking?: { type: 'enabled' | 'disabled'; budget_tokens?: number } | null;
      temperature?: number | null;
      top_p?: number | null;
      tools?: Array<GatewayInferenceInputChatCompletionTool>;
      tool_choice?: GatewayInferenceInputChatCompletionToolChoiceOption;
      parallel_tool_calls?: GatewayInferenceInputParallelToolCalls;
      user?: string;
      function_call?: 'none' | 'auto' | GatewayInferenceInputChatCompletionFunctionCallOption;
      functions?: Array<GatewayInferenceInputChatCompletionFunctions>;
      variables: { [key: string]: GatewayJsonValue };
    }
  | {
      model?: string | 'gpt-3.5-turbo-instruct' | 'davinci-002' | 'babbage-002';
      prompt?: (string | Array<string> | Array<number> | Array<Array<number>>) | null;
      best_of?: number | null;
      echo?: boolean | null;
      frequency_penalty?: number | null;
      logit_bias?: { [key: string]: number } | null;
      logprobs?: number | null;
      max_tokens?: number | null;
      n?: number | null;
      presence_penalty?: number | null;
      seed?: number | null;
      stop?: (string | null | Array<string>) | null;
      stream?: boolean;
      stream_options?: GatewayInferenceInputChatCompletionStreamOptions;
      suffix?: string | null;
      temperature?: number | null;
      top_p?: number | null;
      user?: string;
      variables: { [key: string]: GatewayJsonValue };
    };
export const GatewayInferenceInputCreatePromptCompletionRequestSchema: z.ZodType<GatewayInferenceInputCreatePromptCompletionRequest> =
  z.lazy(() =>
    z.union([
      z
        .object({
          messages: z
            .array(GatewayInferenceInputChatCompletionRequestMessageSchema)
            .min(1)
            .optional(),
          model: z
            .union([
              z.string(),
              z.union([
                z.literal('gpt-5'),
                z.literal('gpt-5-mini'),
                z.literal('gpt-5-nano'),
                z.literal('o4-mini'),
                z.literal('o3'),
                z.literal('o3-mini'),
                z.literal('o1'),
                z.literal('o1-mini'),
                z.literal('gpt-4o'),
                z.literal('gpt-4o-mini'),
                z.literal('gpt-4o-2024-05-13'),
                z.literal('gpt-4-turbo'),
                z.literal('gpt-4-turbo-2024-04-09'),
                z.literal('gpt-4-0125-preview'),
                z.literal('gpt-4-turbo-preview'),
                z.literal('gpt-4-1106-preview'),
                z.literal('gpt-4-vision-preview'),
                z.literal('gpt-4'),
                z.literal('gpt-4-0314'),
                z.literal('gpt-4-0613'),
                z.literal('gpt-4-32k'),
                z.literal('gpt-4-32k-0314'),
                z.literal('gpt-4-32k-0613'),
                z.literal('gpt-3.5-turbo'),
                z.literal('gpt-3.5-turbo-16k'),
                z.literal('gpt-3.5-turbo-0301'),
                z.literal('gpt-3.5-turbo-0613'),
                z.literal('gpt-3.5-turbo-1106'),
                z.literal('gpt-3.5-turbo-0125'),
                z.literal('gpt-3.5-turbo-16k-0613'),
              ]),
            ])
            .optional(),
          frequency_penalty: z.number().finite().min(-2).max(2).nullable().optional(),
          logit_bias: z
            .object({})
            .catchall(z.number().finite().int())
            .and(GatewayJsonObjectSchema)
            .nullable()
            .optional(),
          logprobs: z.boolean().nullable().optional(),
          top_logprobs: z.number().finite().int().min(0).max(20).nullable().optional(),
          max_tokens: z.number().finite().int().nullable().optional(),
          max_completion_tokens: z.number().finite().int().nullable().optional(),
          n: z.number().finite().int().min(1).max(128).nullable().optional(),
          presence_penalty: z.number().finite().min(-2).max(2).nullable().optional(),
          response_format: z
            .union([
              GatewayInferenceInputResponseFormatTextSchema,
              GatewayInferenceInputResponseFormatJsonSchemaSchema,
              GatewayInferenceInputResponseFormatJsonObjectSchema,
            ])
            .optional(),
          seed: z
            .number()
            .finite()
            .int()
            .min(-9223372036854776000)
            .max(9223372036854776000)
            .nullable()
            .optional(),
          stop: z.union([z.string().nullable(), z.array(z.string()).min(1).max(4)]).optional(),
          stream: z.boolean().optional(),
          stream_options: GatewayInferenceInputChatCompletionStreamOptionsSchema.optional(),
          thinking: z
            .object({
              type: z.union([z.literal('enabled'), z.literal('disabled')]),
              budget_tokens: z.number().finite().int().min(1).optional(),
            })
            .strict()
            .nullable()
            .optional(),
          temperature: z.number().finite().min(0).max(2).nullable().optional(),
          top_p: z.number().finite().min(0).max(1).nullable().optional(),
          tools: z.array(GatewayInferenceInputChatCompletionToolSchema).optional(),
          tool_choice: GatewayInferenceInputChatCompletionToolChoiceOptionSchema.optional(),
          parallel_tool_calls: GatewayInferenceInputParallelToolCallsSchema.optional(),
          user: z.string().optional(),
          function_call: z
            .union([
              z.union([z.literal('none'), z.literal('auto')]),
              GatewayInferenceInputChatCompletionFunctionCallOptionSchema,
            ])
            .optional(),
          functions: z
            .array(GatewayInferenceInputChatCompletionFunctionsSchema)
            .min(1)
            .max(128)
            .optional(),
          variables: z.object({}).catchall(GatewayJsonValueSchema).and(GatewayJsonObjectSchema),
        })
        .strict(),
      z
        .object({
          model: z
            .union([
              z.string(),
              z.union([
                z.literal('gpt-3.5-turbo-instruct'),
                z.literal('davinci-002'),
                z.literal('babbage-002'),
              ]),
            ])
            .optional(),
          prompt: z
            .union([
              z.string(),
              z.array(z.string()),
              z.array(z.number().finite().int()).min(1),
              z.array(z.array(z.number().finite().int()).min(1)).min(1),
            ])
            .nullable()
            .optional(),
          best_of: z.number().finite().int().min(0).max(20).nullable().optional(),
          echo: z.boolean().nullable().optional(),
          frequency_penalty: z.number().finite().min(-2).max(2).nullable().optional(),
          logit_bias: z
            .object({})
            .catchall(z.number().finite().int())
            .and(GatewayJsonObjectSchema)
            .nullable()
            .optional(),
          logprobs: z.number().finite().int().min(0).max(5).nullable().optional(),
          max_tokens: z.number().finite().int().min(0).nullable().optional(),
          n: z.number().finite().int().min(1).max(128).nullable().optional(),
          presence_penalty: z.number().finite().min(-2).max(2).nullable().optional(),
          seed: z
            .number()
            .finite()
            .int()
            .min(-9223372036854776000)
            .max(9223372036854776000)
            .nullable()
            .optional(),
          stop: z
            .union([z.string().nullable(), z.array(z.string()).min(1).max(4)])
            .nullable()
            .optional(),
          stream: z.boolean().optional(),
          stream_options: GatewayInferenceInputChatCompletionStreamOptionsSchema.optional(),
          suffix: z.string().nullable().optional(),
          temperature: z.number().finite().min(0).max(2).nullable().optional(),
          top_p: z.number().finite().min(0).max(1).nullable().optional(),
          user: z.string().optional(),
          variables: z.object({}).catchall(GatewayJsonValueSchema).and(GatewayJsonObjectSchema),
        })
        .strict(),
    ]),
  );

/** Portkey ChatCompletionRequestMessage; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputChatCompletionRequestMessageSchema.parse(value);`
 */
export type GatewayInferenceInputChatCompletionRequestMessage =
  | GatewayInferenceInputChatCompletionRequestSystemMessage
  | GatewayInferenceInputChatCompletionRequestDeveloperMessage
  | GatewayInferenceInputChatCompletionRequestUserMessage
  | GatewayInferenceInputChatCompletionRequestAssistantMessage
  | GatewayInferenceInputChatCompletionRequestToolMessage
  | GatewayInferenceInputChatCompletionRequestFunctionMessage;
export const GatewayInferenceInputChatCompletionRequestMessageSchema: z.ZodType<GatewayInferenceInputChatCompletionRequestMessage> =
  z.lazy(() =>
    z.union([
      GatewayInferenceInputChatCompletionRequestSystemMessageSchema,
      GatewayInferenceInputChatCompletionRequestDeveloperMessageSchema,
      GatewayInferenceInputChatCompletionRequestUserMessageSchema,
      GatewayInferenceInputChatCompletionRequestAssistantMessageSchema,
      GatewayInferenceInputChatCompletionRequestToolMessageSchema,
      GatewayInferenceInputChatCompletionRequestFunctionMessageSchema,
    ]),
  );

/** Portkey ChatCompletionRequestSystemMessage; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputChatCompletionRequestSystemMessageSchema.parse(value);`
 */
export type GatewayInferenceInputChatCompletionRequestSystemMessage = {
  content: string;
  role: 'system';
  name?: string;
};
export const GatewayInferenceInputChatCompletionRequestSystemMessageSchema: z.ZodType<GatewayInferenceInputChatCompletionRequestSystemMessage> =
  z.lazy(() =>
    z
      .object({ content: z.string(), role: z.literal('system'), name: z.string().optional() })
      .strict(),
  );

/** Portkey ChatCompletionRequestDeveloperMessage; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputChatCompletionRequestDeveloperMessageSchema.parse(value);`
 */
export type GatewayInferenceInputChatCompletionRequestDeveloperMessage = {
  content: string;
  role: 'developer';
  name?: string;
};
export const GatewayInferenceInputChatCompletionRequestDeveloperMessageSchema: z.ZodType<GatewayInferenceInputChatCompletionRequestDeveloperMessage> =
  z.lazy(() =>
    z
      .object({ content: z.string(), role: z.literal('developer'), name: z.string().optional() })
      .strict(),
  );

/** Portkey ChatCompletionRequestUserMessage; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputChatCompletionRequestUserMessageSchema.parse(value);`
 */
export type GatewayInferenceInputChatCompletionRequestUserMessage = {
  content: string | Array<GatewayInferenceInputChatCompletionRequestMessageContentPart>;
  role: 'user';
  name?: string;
};
export const GatewayInferenceInputChatCompletionRequestUserMessageSchema: z.ZodType<GatewayInferenceInputChatCompletionRequestUserMessage> =
  z.lazy(() =>
    z
      .object({
        content: z.union([
          z.string(),
          z.array(GatewayInferenceInputChatCompletionRequestMessageContentPartSchema).min(1),
        ]),
        role: z.literal('user'),
        name: z.string().optional(),
      })
      .strict(),
  );

/** Portkey ChatCompletionRequestMessageContentPart; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputChatCompletionRequestMessageContentPartSchema.parse(value);`
 */
export type GatewayInferenceInputChatCompletionRequestMessageContentPart =
  | GatewayInferenceInputChatCompletionRequestMessageContentPartText
  | GatewayInferenceInputChatCompletionRequestMessageContentPartImage;
export const GatewayInferenceInputChatCompletionRequestMessageContentPartSchema: z.ZodType<GatewayInferenceInputChatCompletionRequestMessageContentPart> =
  z.lazy(() =>
    z.union([
      GatewayInferenceInputChatCompletionRequestMessageContentPartTextSchema,
      GatewayInferenceInputChatCompletionRequestMessageContentPartImageSchema,
    ]),
  );

/** Portkey ChatCompletionRequestMessageContentPartText; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputChatCompletionRequestMessageContentPartTextSchema.parse(value);`
 */
export type GatewayInferenceInputChatCompletionRequestMessageContentPartText = {
  type: 'text';
  text: string;
};
export const GatewayInferenceInputChatCompletionRequestMessageContentPartTextSchema: z.ZodType<GatewayInferenceInputChatCompletionRequestMessageContentPartText> =
  z.lazy(() => z.object({ type: z.literal('text'), text: z.string() }).strict());

/** Portkey ChatCompletionRequestMessageContentPartImage; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputChatCompletionRequestMessageContentPartImageSchema.parse(value);`
 */
export type GatewayInferenceInputChatCompletionRequestMessageContentPartImage = {
  type: 'image_url';
  image_url: { url: string; detail?: 'auto' | 'low' | 'high' };
};
export const GatewayInferenceInputChatCompletionRequestMessageContentPartImageSchema: z.ZodType<GatewayInferenceInputChatCompletionRequestMessageContentPartImage> =
  z.lazy(() =>
    z
      .object({
        type: z.literal('image_url'),
        image_url: z
          .object({
            url: z.string(),
            detail: z.union([z.literal('auto'), z.literal('low'), z.literal('high')]).optional(),
          })
          .strict(),
      })
      .strict(),
  );

/** Portkey ChatCompletionRequestAssistantMessage; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputChatCompletionRequestAssistantMessageSchema.parse(value);`
 */
export type GatewayInferenceInputChatCompletionRequestAssistantMessage = {
  content?: string | null;
  role: 'assistant';
  name?: string;
  tool_calls?: GatewayInferenceInputChatCompletionMessageToolCalls;
  function_call?: { arguments: string; name: string } | null;
};
export const GatewayInferenceInputChatCompletionRequestAssistantMessageSchema: z.ZodType<GatewayInferenceInputChatCompletionRequestAssistantMessage> =
  z.lazy(() =>
    z
      .object({
        content: z.string().nullable().optional(),
        role: z.literal('assistant'),
        name: z.string().optional(),
        tool_calls: GatewayInferenceInputChatCompletionMessageToolCallsSchema.optional(),
        function_call: z
          .object({ arguments: z.string(), name: z.string() })
          .strict()
          .nullable()
          .optional(),
      })
      .strict(),
  );

/** Portkey ChatCompletionMessageToolCalls; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputChatCompletionMessageToolCallsSchema.parse(value);`
 */
export type GatewayInferenceInputChatCompletionMessageToolCalls =
  Array<GatewayInferenceInputChatCompletionMessageToolCall>;
export const GatewayInferenceInputChatCompletionMessageToolCallsSchema: z.ZodType<GatewayInferenceInputChatCompletionMessageToolCalls> =
  z.lazy(() => z.array(GatewayInferenceInputChatCompletionMessageToolCallSchema));

/** Portkey ChatCompletionMessageToolCall; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputChatCompletionMessageToolCallSchema.parse(value);`
 */
export type GatewayInferenceInputChatCompletionMessageToolCall = {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
};
export const GatewayInferenceInputChatCompletionMessageToolCallSchema: z.ZodType<GatewayInferenceInputChatCompletionMessageToolCall> =
  z.lazy(() =>
    z
      .object({
        id: z.string(),
        type: z.literal('function'),
        function: z.object({ name: z.string(), arguments: z.string() }).strict(),
      })
      .strict(),
  );

/** Portkey ChatCompletionRequestToolMessage; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputChatCompletionRequestToolMessageSchema.parse(value);`
 */
export type GatewayInferenceInputChatCompletionRequestToolMessage = {
  role: 'tool';
  content: string;
  tool_call_id: string;
};
export const GatewayInferenceInputChatCompletionRequestToolMessageSchema: z.ZodType<GatewayInferenceInputChatCompletionRequestToolMessage> =
  z.lazy(() =>
    z.object({ role: z.literal('tool'), content: z.string(), tool_call_id: z.string() }).strict(),
  );

/** Portkey ChatCompletionRequestFunctionMessage; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputChatCompletionRequestFunctionMessageSchema.parse(value);`
 */
export type GatewayInferenceInputChatCompletionRequestFunctionMessage = {
  role: 'function';
  content: string | null;
  name: string;
};
export const GatewayInferenceInputChatCompletionRequestFunctionMessageSchema: z.ZodType<GatewayInferenceInputChatCompletionRequestFunctionMessage> =
  z.lazy(() =>
    z
      .object({ role: z.literal('function'), content: z.string().nullable(), name: z.string() })
      .strict(),
  );

/** Portkey ResponseFormatText; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputResponseFormatTextSchema.parse(value);`
 */
export type GatewayInferenceInputResponseFormatText = { type: 'text' };
export const GatewayInferenceInputResponseFormatTextSchema: z.ZodType<GatewayInferenceInputResponseFormatText> =
  z.lazy(() => z.object({ type: z.literal('text') }).strict());

/** Portkey ResponseFormatJsonSchema; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputResponseFormatJsonSchemaSchema.parse(value);`
 */
export type GatewayInferenceInputResponseFormatJsonSchema = {
  type: 'json_schema';
  json_schema: {
    description?: string;
    name: string;
    schema?: GatewayInferenceInputResponseFormatJsonSchemaSchema;
    strict?: boolean | null;
  };
};
export const GatewayInferenceInputResponseFormatJsonSchemaSchema: z.ZodType<GatewayInferenceInputResponseFormatJsonSchema> =
  z.lazy(() =>
    z
      .object({
        type: z.literal('json_schema'),
        json_schema: z
          .object({
            description: z.string().optional(),
            name: z.string(),
            schema: GatewayInferenceInputResponseFormatJsonSchemaSchemaSchema.optional(),
            strict: z.boolean().nullable().optional(),
          })
          .strict(),
      })
      .strict(),
  );

/** Portkey ResponseFormatJsonSchemaSchema; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputResponseFormatJsonSchemaSchemaSchema.parse(value);`
 */
export type GatewayInferenceInputResponseFormatJsonSchemaSchema = {
  [key: string]: GatewayJsonValue;
};
export const GatewayInferenceInputResponseFormatJsonSchemaSchemaSchema: z.ZodType<GatewayInferenceInputResponseFormatJsonSchemaSchema> =
  z.lazy(() => z.object({}).catchall(GatewayJsonValueSchema).and(GatewayJsonObjectSchema));

/** Portkey ResponseFormatJsonObject; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputResponseFormatJsonObjectSchema.parse(value);`
 */
export type GatewayInferenceInputResponseFormatJsonObject = { type: 'json_object' };
export const GatewayInferenceInputResponseFormatJsonObjectSchema: z.ZodType<GatewayInferenceInputResponseFormatJsonObject> =
  z.lazy(() => z.object({ type: z.literal('json_object') }).strict());

/** Portkey ChatCompletionTool; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputChatCompletionToolSchema.parse(value);`
 */
export type GatewayInferenceInputChatCompletionTool = {
  type: 'function';
  function: GatewayInferenceInputFunctionObject;
};
export const GatewayInferenceInputChatCompletionToolSchema: z.ZodType<GatewayInferenceInputChatCompletionTool> =
  z.lazy(() =>
    z
      .object({ type: z.literal('function'), function: GatewayInferenceInputFunctionObjectSchema })
      .strict(),
  );

/** Portkey FunctionObject; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputFunctionObjectSchema.parse(value);`
 */
export type GatewayInferenceInputFunctionObject = {
  description?: string;
  name: string;
  parameters?: GatewayInferenceInputFunctionParameters;
  strict?: boolean | null;
};
export const GatewayInferenceInputFunctionObjectSchema: z.ZodType<GatewayInferenceInputFunctionObject> =
  z.lazy(() =>
    z
      .object({
        description: z.string().optional(),
        name: z.string(),
        parameters: GatewayInferenceInputFunctionParametersSchema.optional(),
        strict: z.boolean().nullable().optional(),
      })
      .strict(),
  );

/** Portkey FunctionParameters; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputFunctionParametersSchema.parse(value);`
 */
export type GatewayInferenceInputFunctionParameters = { [key: string]: GatewayJsonValue };
export const GatewayInferenceInputFunctionParametersSchema: z.ZodType<GatewayInferenceInputFunctionParameters> =
  z.lazy(() => z.object({}).catchall(GatewayJsonValueSchema).and(GatewayJsonObjectSchema));

/** Portkey ChatCompletionToolChoiceOption; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputChatCompletionToolChoiceOptionSchema.parse(value);`
 */
export type GatewayInferenceInputChatCompletionToolChoiceOption =
  | 'none'
  | 'auto'
  | 'required'
  | GatewayInferenceInputChatCompletionNamedToolChoice;
export const GatewayInferenceInputChatCompletionToolChoiceOptionSchema: z.ZodType<GatewayInferenceInputChatCompletionToolChoiceOption> =
  z.lazy(() =>
    z.union([
      z.union([z.literal('none'), z.literal('auto'), z.literal('required')]),
      GatewayInferenceInputChatCompletionNamedToolChoiceSchema,
    ]),
  );

/** Portkey ChatCompletionNamedToolChoice; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputChatCompletionNamedToolChoiceSchema.parse(value);`
 */
export type GatewayInferenceInputChatCompletionNamedToolChoice = {
  type: 'function';
  function: { name: string };
};
export const GatewayInferenceInputChatCompletionNamedToolChoiceSchema: z.ZodType<GatewayInferenceInputChatCompletionNamedToolChoice> =
  z.lazy(() =>
    z
      .object({ type: z.literal('function'), function: z.object({ name: z.string() }).strict() })
      .strict(),
  );

/** Portkey ParallelToolCalls; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputParallelToolCallsSchema.parse(value);`
 */
export type GatewayInferenceInputParallelToolCalls = boolean;
export const GatewayInferenceInputParallelToolCallsSchema: z.ZodType<GatewayInferenceInputParallelToolCalls> =
  z.lazy(() => z.boolean());

/** Portkey ChatCompletionFunctionCallOption; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputChatCompletionFunctionCallOptionSchema.parse(value);`
 */
export type GatewayInferenceInputChatCompletionFunctionCallOption = { name: string };
export const GatewayInferenceInputChatCompletionFunctionCallOptionSchema: z.ZodType<GatewayInferenceInputChatCompletionFunctionCallOption> =
  z.lazy(() => z.object({ name: z.string() }).strict());

/** Portkey ChatCompletionFunctions; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputChatCompletionFunctionsSchema.parse(value);`
 */
export type GatewayInferenceInputChatCompletionFunctions = {
  description?: string;
  name: string;
  parameters?: GatewayInferenceInputFunctionParameters;
};
export const GatewayInferenceInputChatCompletionFunctionsSchema: z.ZodType<GatewayInferenceInputChatCompletionFunctions> =
  z.lazy(() =>
    z
      .object({
        description: z.string().optional(),
        name: z.string(),
        parameters: GatewayInferenceInputFunctionParametersSchema.optional(),
      })
      .strict(),
  );

/** Portkey CreatePromptCompletionResponse; additive response fields are preserved.
 * @example `GatewayInferenceCreatePromptCompletionResponseSchema.parse(value);`
 */
export type GatewayInferenceCreatePromptCompletionResponse =
  | GatewayInferenceCreateChatCompletionResponse
  | GatewayInferenceCreateCompletionResponse
  | {
      status?: string;
      headers?: { [key: string]: unknown };
      body?:
        | GatewayInferenceCreateChatCompletionResponse
        | GatewayInferenceCreateCompletionResponse;
      [key: string]: unknown;
    };
export const GatewayInferenceCreatePromptCompletionResponseSchema: z.ZodType<GatewayInferenceCreatePromptCompletionResponse> =
  z.lazy(() =>
    z.union([
      GatewayInferenceCreateChatCompletionResponseSchema,
      GatewayInferenceCreateCompletionResponseSchema,
      z
        .object({
          status: z.string().optional(),
          headers: z.object({}).passthrough().optional(),
          body: z
            .union([
              GatewayInferenceCreateChatCompletionResponseSchema,
              GatewayInferenceCreateCompletionResponseSchema,
            ])
            .optional(),
        })
        .passthrough(),
    ]),
  );

/** Portkey CreateChatCompletionResponse; additive response fields are preserved.
 * @example `GatewayInferenceCreateChatCompletionResponseSchema.parse(value);`
 */
export type GatewayInferenceCreateChatCompletionResponse = {
  id: string;
  choices: Array<{
    finish_reason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | 'function_call';
    index: number;
    message: GatewayInferenceChatCompletionResponseMessage;
    logprobs?: {
      content: Array<GatewayInferenceChatCompletionTokenLogprob> | null;
      [key: string]: unknown;
    } | null;
    [key: string]: unknown;
  }>;
  created: number;
  model: string;
  system_fingerprint?: string | null;
  object: 'chat.completion';
  usage?: GatewayInferenceCompletionUsage;
  [key: string]: unknown;
};
export const GatewayInferenceCreateChatCompletionResponseSchema: z.ZodType<GatewayInferenceCreateChatCompletionResponse> =
  z.lazy(() =>
    z
      .object({
        id: z.string(),
        choices: z.array(
          z
            .object({
              finish_reason: z.union([
                z.literal('stop'),
                z.literal('length'),
                z.literal('tool_calls'),
                z.literal('content_filter'),
                z.literal('function_call'),
              ]),
              index: z.number().finite().int(),
              message: GatewayInferenceChatCompletionResponseMessageSchema,
              logprobs: z
                .object({
                  content: z.array(GatewayInferenceChatCompletionTokenLogprobSchema).nullable(),
                })
                .passthrough()
                .nullable()
                .optional(),
            })
            .passthrough(),
        ),
        created: z.number().finite().int(),
        model: z.string(),
        system_fingerprint: z.string().nullable().optional(),
        object: z.literal('chat.completion'),
        usage: GatewayInferenceCompletionUsageSchema.optional(),
      })
      .passthrough(),
  );

/** Portkey ChatCompletionResponseMessage; additive response fields are preserved.
 * @example `GatewayInferenceChatCompletionResponseMessageSchema.parse(value);`
 */
export type GatewayInferenceChatCompletionResponseMessage = {
  content: string | null;
  tool_calls?: GatewayInferenceChatCompletionMessageToolCalls;
  role: 'assistant';
  function_call?: { arguments: string; name: string; [key: string]: unknown };
  content_blocks?: Array<GatewayInferenceChatCompletionMessageContentBlock> | null;
  [key: string]: unknown;
};
export const GatewayInferenceChatCompletionResponseMessageSchema: z.ZodType<GatewayInferenceChatCompletionResponseMessage> =
  z.lazy(() =>
    z
      .object({
        content: z.string().nullable(),
        tool_calls: GatewayInferenceChatCompletionMessageToolCallsSchema.optional(),
        role: z.literal('assistant'),
        function_call: z
          .object({ arguments: z.string(), name: z.string() })
          .passthrough()
          .optional(),
        content_blocks: z
          .array(GatewayInferenceChatCompletionMessageContentBlockSchema)
          .nullable()
          .optional(),
      })
      .passthrough(),
  );

/** Portkey ChatCompletionMessageToolCalls; additive response fields are preserved.
 * @example `GatewayInferenceChatCompletionMessageToolCallsSchema.parse(value);`
 */
export type GatewayInferenceChatCompletionMessageToolCalls =
  Array<GatewayInferenceChatCompletionMessageToolCall>;
export const GatewayInferenceChatCompletionMessageToolCallsSchema: z.ZodType<GatewayInferenceChatCompletionMessageToolCalls> =
  z.lazy(() => z.array(GatewayInferenceChatCompletionMessageToolCallSchema));

/** Portkey ChatCompletionMessageToolCall; additive response fields are preserved.
 * @example `GatewayInferenceChatCompletionMessageToolCallSchema.parse(value);`
 */
export type GatewayInferenceChatCompletionMessageToolCall = {
  id: string;
  type: 'function';
  function: { name: string; arguments: string; [key: string]: unknown };
  [key: string]: unknown;
};
export const GatewayInferenceChatCompletionMessageToolCallSchema: z.ZodType<GatewayInferenceChatCompletionMessageToolCall> =
  z.lazy(() =>
    z
      .object({
        id: z.string(),
        type: z.literal('function'),
        function: z.object({ name: z.string(), arguments: z.string() }).passthrough(),
      })
      .passthrough(),
  );

/** Portkey ChatCompletionMessageContentBlock; additive response fields are preserved.
 * @example `GatewayInferenceChatCompletionMessageContentBlockSchema.parse(value);`
 */
export type GatewayInferenceChatCompletionMessageContentBlock =
  | GatewayInferenceChatCompletionRequestMessageContentPartText
  | GatewayInferenceChatCompletionMessageContentPartThinking
  | GatewayInferenceChatCompletionMessageContentPartRedactedThinking;
export const GatewayInferenceChatCompletionMessageContentBlockSchema: z.ZodType<GatewayInferenceChatCompletionMessageContentBlock> =
  z.lazy(() =>
    z.union([
      GatewayInferenceChatCompletionRequestMessageContentPartTextSchema,
      GatewayInferenceChatCompletionMessageContentPartThinkingSchema,
      GatewayInferenceChatCompletionMessageContentPartRedactedThinkingSchema,
    ]),
  );

/** Portkey ChatCompletionRequestMessageContentPartText; additive response fields are preserved.
 * @example `GatewayInferenceChatCompletionRequestMessageContentPartTextSchema.parse(value);`
 */
export type GatewayInferenceChatCompletionRequestMessageContentPartText = {
  type: 'text';
  text: string;
  [key: string]: unknown;
};
export const GatewayInferenceChatCompletionRequestMessageContentPartTextSchema: z.ZodType<GatewayInferenceChatCompletionRequestMessageContentPartText> =
  z.lazy(() => z.object({ type: z.literal('text'), text: z.string() }).passthrough());

/** Portkey ChatCompletionMessageContentPartThinking; additive response fields are preserved.
 * @example `GatewayInferenceChatCompletionMessageContentPartThinkingSchema.parse(value);`
 */
export type GatewayInferenceChatCompletionMessageContentPartThinking = {
  type: 'thinking';
  thinking: string;
  [key: string]: unknown;
};
export const GatewayInferenceChatCompletionMessageContentPartThinkingSchema: z.ZodType<GatewayInferenceChatCompletionMessageContentPartThinking> =
  z.lazy(() => z.object({ type: z.literal('thinking'), thinking: z.string() }).passthrough());

/** Portkey ChatCompletionMessageContentPartRedactedThinking; additive response fields are preserved.
 * @example `GatewayInferenceChatCompletionMessageContentPartRedactedThinkingSchema.parse(value);`
 */
export type GatewayInferenceChatCompletionMessageContentPartRedactedThinking = {
  type: 'redacted_thinking';
  data: string;
  [key: string]: unknown;
};
export const GatewayInferenceChatCompletionMessageContentPartRedactedThinkingSchema: z.ZodType<GatewayInferenceChatCompletionMessageContentPartRedactedThinking> =
  z.lazy(() => z.object({ type: z.literal('redacted_thinking'), data: z.string() }).passthrough());

/** Portkey ChatCompletionTokenLogprob; additive response fields are preserved.
 * @example `GatewayInferenceChatCompletionTokenLogprobSchema.parse(value);`
 */
export type GatewayInferenceChatCompletionTokenLogprob = {
  token: string;
  logprob: number;
  bytes: Array<number> | null;
  top_logprobs: Array<{
    token: string;
    logprob: number;
    bytes: Array<number> | null;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
};
export const GatewayInferenceChatCompletionTokenLogprobSchema: z.ZodType<GatewayInferenceChatCompletionTokenLogprob> =
  z.lazy(() =>
    z
      .object({
        token: z.string(),
        logprob: z.number().finite(),
        bytes: z.array(z.number().finite().int()).nullable(),
        top_logprobs: z.array(
          z
            .object({
              token: z.string(),
              logprob: z.number().finite(),
              bytes: z.array(z.number().finite().int()).nullable(),
            })
            .passthrough(),
        ),
      })
      .passthrough(),
  );

/** Portkey CreatePromptCompletionStreamResponse; additive response fields are preserved.
 * @example `GatewayInferenceCreatePromptCompletionStreamResponseSchema.parse(value);`
 */
export type GatewayInferenceCreatePromptCompletionStreamResponse =
  | GatewayInferenceCreateChatCompletionStreamResponse
  | GatewayInferenceCreateCompletionResponse;
export const GatewayInferenceCreatePromptCompletionStreamResponseSchema: z.ZodType<GatewayInferenceCreatePromptCompletionStreamResponse> =
  z.lazy(() =>
    z.union([
      GatewayInferenceCreateChatCompletionStreamResponseSchema,
      GatewayInferenceCreateCompletionResponseSchema,
    ]),
  );

/** Portkey CreateChatCompletionStreamResponse; additive response fields are preserved.
 * @example `GatewayInferenceCreateChatCompletionStreamResponseSchema.parse(value);`
 */
export type GatewayInferenceCreateChatCompletionStreamResponse = {
  id: string;
  choices: Array<{
    delta: GatewayInferenceChatCompletionStreamResponseDelta;
    logprobs?: {
      content: Array<GatewayInferenceChatCompletionTokenLogprob> | null;
      [key: string]: unknown;
    } | null;
    finish_reason: ('stop' | 'length' | 'tool_calls' | 'content_filter' | 'function_call') | null;
    index: number;
    [key: string]: unknown;
  }>;
  created: number;
  model: string;
  system_fingerprint?: string | null;
  object: 'chat.completion.chunk';
  usage?: {
    completion_tokens: number;
    prompt_tokens: number;
    total_tokens: number;
    [key: string]: unknown;
  } | null;
  [key: string]: unknown;
};
export const GatewayInferenceCreateChatCompletionStreamResponseSchema: z.ZodType<GatewayInferenceCreateChatCompletionStreamResponse> =
  z.lazy(() =>
    z
      .object({
        id: z.string(),
        choices: z.array(
          z
            .object({
              delta: GatewayInferenceChatCompletionStreamResponseDeltaSchema,
              logprobs: z
                .object({
                  content: z.array(GatewayInferenceChatCompletionTokenLogprobSchema).nullable(),
                })
                .passthrough()
                .nullable()
                .optional(),
              finish_reason: z
                .union([
                  z.literal('stop'),
                  z.literal('length'),
                  z.literal('tool_calls'),
                  z.literal('content_filter'),
                  z.literal('function_call'),
                ])
                .nullable(),
              index: z.number().finite().int(),
            })
            .passthrough(),
        ),
        created: z.number().finite().int(),
        model: z.string(),
        system_fingerprint: z.string().nullable().optional(),
        object: z.literal('chat.completion.chunk'),
        usage: z
          .object({
            completion_tokens: z.number().finite().int(),
            prompt_tokens: z.number().finite().int(),
            total_tokens: z.number().finite().int(),
          })
          .passthrough()
          .nullable()
          .optional(),
      })
      .passthrough(),
  );

/** Portkey ChatCompletionStreamResponseDelta; additive response fields are preserved.
 * @example `GatewayInferenceChatCompletionStreamResponseDeltaSchema.parse(value);`
 */
export type GatewayInferenceChatCompletionStreamResponseDelta = {
  content?: string | null;
  function_call?: { arguments?: string; name?: string; [key: string]: unknown };
  tool_calls?: Array<GatewayInferenceChatCompletionMessageToolCallChunk>;
  role?: 'system' | 'user' | 'assistant' | 'tool';
  [key: string]: unknown;
};
export const GatewayInferenceChatCompletionStreamResponseDeltaSchema: z.ZodType<GatewayInferenceChatCompletionStreamResponseDelta> =
  z.lazy(() =>
    z
      .object({
        content: z.string().nullable().optional(),
        function_call: z
          .object({ arguments: z.string().optional(), name: z.string().optional() })
          .passthrough()
          .optional(),
        tool_calls: z.array(GatewayInferenceChatCompletionMessageToolCallChunkSchema).optional(),
        role: z
          .union([
            z.literal('system'),
            z.literal('user'),
            z.literal('assistant'),
            z.literal('tool'),
          ])
          .optional(),
      })
      .passthrough(),
  );

/** Portkey ChatCompletionMessageToolCallChunk; additive response fields are preserved.
 * @example `GatewayInferenceChatCompletionMessageToolCallChunkSchema.parse(value);`
 */
export type GatewayInferenceChatCompletionMessageToolCallChunk = {
  index: number;
  id?: string;
  type?: 'function';
  function?: { name?: string; arguments?: string; [key: string]: unknown };
  [key: string]: unknown;
};
export const GatewayInferenceChatCompletionMessageToolCallChunkSchema: z.ZodType<GatewayInferenceChatCompletionMessageToolCallChunk> =
  z.lazy(() =>
    z
      .object({
        index: z.number().finite().int(),
        id: z.string().optional(),
        type: z.literal('function').optional(),
        function: z
          .object({ name: z.string().optional(), arguments: z.string().optional() })
          .passthrough()
          .optional(),
      })
      .passthrough(),
  );

/** Portkey CreatePromptRenderRequest; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputCreatePromptRenderRequestSchema.parse(value);`
 */
export type GatewayInferenceInputCreatePromptRenderRequest =
  | {
      messages?: Array<GatewayInferenceInputChatCompletionRequestMessage>;
      model?:
        | string
        | 'gpt-5'
        | 'gpt-5-mini'
        | 'gpt-5-nano'
        | 'o4-mini'
        | 'o3'
        | 'o3-mini'
        | 'o1'
        | 'o1-mini'
        | 'gpt-4o'
        | 'gpt-4o-mini'
        | 'gpt-4o-2024-05-13'
        | 'gpt-4-turbo'
        | 'gpt-4-turbo-2024-04-09'
        | 'gpt-4-0125-preview'
        | 'gpt-4-turbo-preview'
        | 'gpt-4-1106-preview'
        | 'gpt-4-vision-preview'
        | 'gpt-4'
        | 'gpt-4-0314'
        | 'gpt-4-0613'
        | 'gpt-4-32k'
        | 'gpt-4-32k-0314'
        | 'gpt-4-32k-0613'
        | 'gpt-3.5-turbo'
        | 'gpt-3.5-turbo-16k'
        | 'gpt-3.5-turbo-0301'
        | 'gpt-3.5-turbo-0613'
        | 'gpt-3.5-turbo-1106'
        | 'gpt-3.5-turbo-0125'
        | 'gpt-3.5-turbo-16k-0613';
      frequency_penalty?: number | null;
      logit_bias?: { [key: string]: number } | null;
      logprobs?: boolean | null;
      top_logprobs?: number | null;
      max_tokens?: number | null;
      max_completion_tokens?: number | null;
      n?: number | null;
      presence_penalty?: number | null;
      response_format?:
        | GatewayInferenceInputResponseFormatText
        | GatewayInferenceInputResponseFormatJsonSchema
        | GatewayInferenceInputResponseFormatJsonObject;
      seed?: number | null;
      stop?: string | null | Array<string>;
      stream?: boolean | null;
      stream_options?: GatewayInferenceInputChatCompletionStreamOptions;
      thinking?: { type: 'enabled' | 'disabled'; budget_tokens?: number } | null;
      temperature?: number | null;
      top_p?: number | null;
      tools?: Array<GatewayInferenceInputChatCompletionTool>;
      tool_choice?: GatewayInferenceInputChatCompletionToolChoiceOption;
      parallel_tool_calls?: GatewayInferenceInputParallelToolCalls;
      user?: string;
      function_call?: 'none' | 'auto' | GatewayInferenceInputChatCompletionFunctionCallOption;
      functions?: Array<GatewayInferenceInputChatCompletionFunctions>;
      variables: { [key: string]: GatewayJsonValue };
    }
  | {
      model?: string | 'gpt-3.5-turbo-instruct' | 'davinci-002' | 'babbage-002';
      prompt?: (string | Array<string> | Array<number> | Array<Array<number>>) | null;
      best_of?: number | null;
      echo?: boolean | null;
      frequency_penalty?: number | null;
      logit_bias?: { [key: string]: number } | null;
      logprobs?: number | null;
      max_tokens?: number | null;
      n?: number | null;
      presence_penalty?: number | null;
      seed?: number | null;
      stop?: (string | null | Array<string>) | null;
      stream?: boolean | null;
      stream_options?: GatewayInferenceInputChatCompletionStreamOptions;
      suffix?: string | null;
      temperature?: number | null;
      top_p?: number | null;
      user?: string;
      variables: { [key: string]: GatewayJsonValue };
    };
export const GatewayInferenceInputCreatePromptRenderRequestSchema: z.ZodType<GatewayInferenceInputCreatePromptRenderRequest> =
  z.lazy(() =>
    z.union([
      z
        .object({
          messages: z
            .array(GatewayInferenceInputChatCompletionRequestMessageSchema)
            .min(1)
            .optional(),
          model: z
            .union([
              z.string(),
              z.union([
                z.literal('gpt-5'),
                z.literal('gpt-5-mini'),
                z.literal('gpt-5-nano'),
                z.literal('o4-mini'),
                z.literal('o3'),
                z.literal('o3-mini'),
                z.literal('o1'),
                z.literal('o1-mini'),
                z.literal('gpt-4o'),
                z.literal('gpt-4o-mini'),
                z.literal('gpt-4o-2024-05-13'),
                z.literal('gpt-4-turbo'),
                z.literal('gpt-4-turbo-2024-04-09'),
                z.literal('gpt-4-0125-preview'),
                z.literal('gpt-4-turbo-preview'),
                z.literal('gpt-4-1106-preview'),
                z.literal('gpt-4-vision-preview'),
                z.literal('gpt-4'),
                z.literal('gpt-4-0314'),
                z.literal('gpt-4-0613'),
                z.literal('gpt-4-32k'),
                z.literal('gpt-4-32k-0314'),
                z.literal('gpt-4-32k-0613'),
                z.literal('gpt-3.5-turbo'),
                z.literal('gpt-3.5-turbo-16k'),
                z.literal('gpt-3.5-turbo-0301'),
                z.literal('gpt-3.5-turbo-0613'),
                z.literal('gpt-3.5-turbo-1106'),
                z.literal('gpt-3.5-turbo-0125'),
                z.literal('gpt-3.5-turbo-16k-0613'),
              ]),
            ])
            .optional(),
          frequency_penalty: z.number().finite().min(-2).max(2).nullable().optional(),
          logit_bias: z
            .object({})
            .catchall(z.number().finite().int())
            .and(GatewayJsonObjectSchema)
            .nullable()
            .optional(),
          logprobs: z.boolean().nullable().optional(),
          top_logprobs: z.number().finite().int().min(0).max(20).nullable().optional(),
          max_tokens: z.number().finite().int().nullable().optional(),
          max_completion_tokens: z.number().finite().int().nullable().optional(),
          n: z.number().finite().int().min(1).max(128).nullable().optional(),
          presence_penalty: z.number().finite().min(-2).max(2).nullable().optional(),
          response_format: z
            .union([
              GatewayInferenceInputResponseFormatTextSchema,
              GatewayInferenceInputResponseFormatJsonSchemaSchema,
              GatewayInferenceInputResponseFormatJsonObjectSchema,
            ])
            .optional(),
          seed: z
            .number()
            .finite()
            .int()
            .min(-9223372036854776000)
            .max(9223372036854776000)
            .nullable()
            .optional(),
          stop: z.union([z.string().nullable(), z.array(z.string()).min(1).max(4)]).optional(),
          stream: z.boolean().nullable().optional(),
          stream_options: GatewayInferenceInputChatCompletionStreamOptionsSchema.optional(),
          thinking: z
            .object({
              type: z.union([z.literal('enabled'), z.literal('disabled')]),
              budget_tokens: z.number().finite().int().min(1).optional(),
            })
            .strict()
            .nullable()
            .optional(),
          temperature: z.number().finite().min(0).max(2).nullable().optional(),
          top_p: z.number().finite().min(0).max(1).nullable().optional(),
          tools: z.array(GatewayInferenceInputChatCompletionToolSchema).optional(),
          tool_choice: GatewayInferenceInputChatCompletionToolChoiceOptionSchema.optional(),
          parallel_tool_calls: GatewayInferenceInputParallelToolCallsSchema.optional(),
          user: z.string().optional(),
          function_call: z
            .union([
              z.union([z.literal('none'), z.literal('auto')]),
              GatewayInferenceInputChatCompletionFunctionCallOptionSchema,
            ])
            .optional(),
          functions: z
            .array(GatewayInferenceInputChatCompletionFunctionsSchema)
            .min(1)
            .max(128)
            .optional(),
          variables: z.object({}).catchall(GatewayJsonValueSchema).and(GatewayJsonObjectSchema),
        })
        .strict(),
      z
        .object({
          model: z
            .union([
              z.string(),
              z.union([
                z.literal('gpt-3.5-turbo-instruct'),
                z.literal('davinci-002'),
                z.literal('babbage-002'),
              ]),
            ])
            .optional(),
          prompt: z
            .union([
              z.string(),
              z.array(z.string()),
              z.array(z.number().finite().int()).min(1),
              z.array(z.array(z.number().finite().int()).min(1)).min(1),
            ])
            .nullable()
            .optional(),
          best_of: z.number().finite().int().min(0).max(20).nullable().optional(),
          echo: z.boolean().nullable().optional(),
          frequency_penalty: z.number().finite().min(-2).max(2).nullable().optional(),
          logit_bias: z
            .object({})
            .catchall(z.number().finite().int())
            .and(GatewayJsonObjectSchema)
            .nullable()
            .optional(),
          logprobs: z.number().finite().int().min(0).max(5).nullable().optional(),
          max_tokens: z.number().finite().int().min(0).nullable().optional(),
          n: z.number().finite().int().min(1).max(128).nullable().optional(),
          presence_penalty: z.number().finite().min(-2).max(2).nullable().optional(),
          seed: z
            .number()
            .finite()
            .int()
            .min(-9223372036854776000)
            .max(9223372036854776000)
            .nullable()
            .optional(),
          stop: z
            .union([z.string().nullable(), z.array(z.string()).min(1).max(4)])
            .nullable()
            .optional(),
          stream: z.boolean().nullable().optional(),
          stream_options: GatewayInferenceInputChatCompletionStreamOptionsSchema.optional(),
          suffix: z.string().nullable().optional(),
          temperature: z.number().finite().min(0).max(2).nullable().optional(),
          top_p: z.number().finite().min(0).max(1).nullable().optional(),
          user: z.string().optional(),
          variables: z.object({}).catchall(GatewayJsonValueSchema).and(GatewayJsonObjectSchema),
        })
        .strict(),
    ]),
  );

/** Portkey CreatePromptRenderResponse; additive response fields are preserved.
 * @example `GatewayInferenceCreatePromptRenderResponseSchema.parse(value);`
 */
export type GatewayInferenceCreatePromptRenderResponse = GatewayInferencePromptRenderResponse;
export const GatewayInferenceCreatePromptRenderResponseSchema: z.ZodType<GatewayInferenceCreatePromptRenderResponse> =
  z.lazy(() => GatewayInferencePromptRenderResponseSchema);

/** Portkey PromptRenderResponse; additive response fields are preserved.
 * @example `GatewayInferencePromptRenderResponseSchema.parse(value);`
 */
export type GatewayInferencePromptRenderResponse = {
  success: boolean;
  data: GatewayInferenceCreateChatCompletionRequest | GatewayInferenceCreateCompletionRequest;
  [key: string]: unknown;
};
export const GatewayInferencePromptRenderResponseSchema: z.ZodType<GatewayInferencePromptRenderResponse> =
  z.lazy(() =>
    z
      .object({
        success: z.boolean(),
        data: z.union([
          GatewayInferenceCreateChatCompletionRequestSchema,
          GatewayInferenceCreateCompletionRequestSchema,
        ]),
      })
      .passthrough(),
  );

/** Portkey CreateChatCompletionRequest; additive response fields are preserved.
 * @example `GatewayInferenceCreateChatCompletionRequestSchema.parse(value);`
 */
export type GatewayInferenceCreateChatCompletionRequest = {
  messages: Array<GatewayInferenceChatCompletionRequestMessage>;
  model:
    | string
    | 'gpt-5'
    | 'gpt-5-mini'
    | 'gpt-5-nano'
    | 'o4-mini'
    | 'o3'
    | 'o3-mini'
    | 'o1'
    | 'o1-mini'
    | 'gpt-4o'
    | 'gpt-4o-mini'
    | 'gpt-4o-2024-05-13'
    | 'gpt-4-turbo'
    | 'gpt-4-turbo-2024-04-09'
    | 'gpt-4-0125-preview'
    | 'gpt-4-turbo-preview'
    | 'gpt-4-1106-preview'
    | 'gpt-4-vision-preview'
    | 'gpt-4'
    | 'gpt-4-0314'
    | 'gpt-4-0613'
    | 'gpt-4-32k'
    | 'gpt-4-32k-0314'
    | 'gpt-4-32k-0613'
    | 'gpt-3.5-turbo'
    | 'gpt-3.5-turbo-16k'
    | 'gpt-3.5-turbo-0301'
    | 'gpt-3.5-turbo-0613'
    | 'gpt-3.5-turbo-1106'
    | 'gpt-3.5-turbo-0125'
    | 'gpt-3.5-turbo-16k-0613';
  frequency_penalty?: number | null;
  logit_bias?: { [key: string]: unknown } | null;
  logprobs?: boolean | null;
  top_logprobs?: number | null;
  max_tokens?: number | null;
  max_completion_tokens?: number | null;
  n?: number | null;
  presence_penalty?: number | null;
  response_format?:
    | GatewayInferenceResponseFormatText
    | GatewayInferenceResponseFormatJsonSchema
    | GatewayInferenceResponseFormatJsonObject;
  seed?: number | null;
  stop?: string | null | Array<string>;
  stream?: boolean | null;
  stream_options?: GatewayInferenceChatCompletionStreamOptions;
  thinking?: {
    type: 'enabled' | 'disabled';
    budget_tokens?: number;
    [key: string]: unknown;
  } | null;
  temperature?: number | null;
  top_p?: number | null;
  tools?: Array<GatewayInferenceChatCompletionTool>;
  tool_choice?: GatewayInferenceChatCompletionToolChoiceOption;
  parallel_tool_calls?: GatewayInferenceParallelToolCalls;
  user?: string;
  function_call?: 'none' | 'auto' | GatewayInferenceChatCompletionFunctionCallOption;
  functions?: Array<GatewayInferenceChatCompletionFunctions>;
  [key: string]: unknown;
};
export const GatewayInferenceCreateChatCompletionRequestSchema: z.ZodType<GatewayInferenceCreateChatCompletionRequest> =
  z.lazy(() =>
    z
      .object({
        messages: z.array(GatewayInferenceChatCompletionRequestMessageSchema).min(1),
        model: z.union([
          z.string(),
          z.union([
            z.literal('gpt-5'),
            z.literal('gpt-5-mini'),
            z.literal('gpt-5-nano'),
            z.literal('o4-mini'),
            z.literal('o3'),
            z.literal('o3-mini'),
            z.literal('o1'),
            z.literal('o1-mini'),
            z.literal('gpt-4o'),
            z.literal('gpt-4o-mini'),
            z.literal('gpt-4o-2024-05-13'),
            z.literal('gpt-4-turbo'),
            z.literal('gpt-4-turbo-2024-04-09'),
            z.literal('gpt-4-0125-preview'),
            z.literal('gpt-4-turbo-preview'),
            z.literal('gpt-4-1106-preview'),
            z.literal('gpt-4-vision-preview'),
            z.literal('gpt-4'),
            z.literal('gpt-4-0314'),
            z.literal('gpt-4-0613'),
            z.literal('gpt-4-32k'),
            z.literal('gpt-4-32k-0314'),
            z.literal('gpt-4-32k-0613'),
            z.literal('gpt-3.5-turbo'),
            z.literal('gpt-3.5-turbo-16k'),
            z.literal('gpt-3.5-turbo-0301'),
            z.literal('gpt-3.5-turbo-0613'),
            z.literal('gpt-3.5-turbo-1106'),
            z.literal('gpt-3.5-turbo-0125'),
            z.literal('gpt-3.5-turbo-16k-0613'),
          ]),
        ]),
        frequency_penalty: z.number().finite().min(-2).max(2).nullable().optional(),
        logit_bias: z.object({}).passthrough().nullable().optional(),
        logprobs: z.boolean().nullable().optional(),
        top_logprobs: z.number().finite().int().min(0).max(20).nullable().optional(),
        max_tokens: z.number().finite().int().nullable().optional(),
        max_completion_tokens: z.number().finite().int().nullable().optional(),
        n: z.number().finite().int().min(1).max(128).nullable().optional(),
        presence_penalty: z.number().finite().min(-2).max(2).nullable().optional(),
        response_format: z
          .union([
            GatewayInferenceResponseFormatTextSchema,
            GatewayInferenceResponseFormatJsonSchemaSchema,
            GatewayInferenceResponseFormatJsonObjectSchema,
          ])
          .optional(),
        seed: z
          .number()
          .finite()
          .int()
          .min(-9223372036854776000)
          .max(9223372036854776000)
          .nullable()
          .optional(),
        stop: z.union([z.string().nullable(), z.array(z.string()).min(1).max(4)]).optional(),
        stream: z.boolean().nullable().optional(),
        stream_options: GatewayInferenceChatCompletionStreamOptionsSchema.optional(),
        thinking: z
          .object({
            type: z.union([z.literal('enabled'), z.literal('disabled')]),
            budget_tokens: z.number().finite().int().min(1).optional(),
          })
          .passthrough()
          .nullable()
          .optional(),
        temperature: z.number().finite().min(0).max(2).nullable().optional(),
        top_p: z.number().finite().min(0).max(1).nullable().optional(),
        tools: z.array(GatewayInferenceChatCompletionToolSchema).optional(),
        tool_choice: GatewayInferenceChatCompletionToolChoiceOptionSchema.optional(),
        parallel_tool_calls: GatewayInferenceParallelToolCallsSchema.optional(),
        user: z.string().optional(),
        function_call: z
          .union([
            z.union([z.literal('none'), z.literal('auto')]),
            GatewayInferenceChatCompletionFunctionCallOptionSchema,
          ])
          .optional(),
        functions: z
          .array(GatewayInferenceChatCompletionFunctionsSchema)
          .min(1)
          .max(128)
          .optional(),
      })
      .passthrough(),
  );

/** Portkey ChatCompletionRequestMessage; additive response fields are preserved.
 * @example `GatewayInferenceChatCompletionRequestMessageSchema.parse(value);`
 */
export type GatewayInferenceChatCompletionRequestMessage =
  | GatewayInferenceChatCompletionRequestSystemMessage
  | GatewayInferenceChatCompletionRequestDeveloperMessage
  | GatewayInferenceChatCompletionRequestUserMessage
  | GatewayInferenceChatCompletionRequestAssistantMessage
  | GatewayInferenceChatCompletionRequestToolMessage
  | GatewayInferenceChatCompletionRequestFunctionMessage;
export const GatewayInferenceChatCompletionRequestMessageSchema: z.ZodType<GatewayInferenceChatCompletionRequestMessage> =
  z.lazy(() =>
    z.union([
      GatewayInferenceChatCompletionRequestSystemMessageSchema,
      GatewayInferenceChatCompletionRequestDeveloperMessageSchema,
      GatewayInferenceChatCompletionRequestUserMessageSchema,
      GatewayInferenceChatCompletionRequestAssistantMessageSchema,
      GatewayInferenceChatCompletionRequestToolMessageSchema,
      GatewayInferenceChatCompletionRequestFunctionMessageSchema,
    ]),
  );

/** Portkey ChatCompletionRequestSystemMessage; additive response fields are preserved.
 * @example `GatewayInferenceChatCompletionRequestSystemMessageSchema.parse(value);`
 */
export type GatewayInferenceChatCompletionRequestSystemMessage = {
  content: string;
  role: 'system';
  name?: string;
  [key: string]: unknown;
};
export const GatewayInferenceChatCompletionRequestSystemMessageSchema: z.ZodType<GatewayInferenceChatCompletionRequestSystemMessage> =
  z.lazy(() =>
    z
      .object({ content: z.string(), role: z.literal('system'), name: z.string().optional() })
      .passthrough(),
  );

/** Portkey ChatCompletionRequestDeveloperMessage; additive response fields are preserved.
 * @example `GatewayInferenceChatCompletionRequestDeveloperMessageSchema.parse(value);`
 */
export type GatewayInferenceChatCompletionRequestDeveloperMessage = {
  content: string;
  role: 'developer';
  name?: string;
  [key: string]: unknown;
};
export const GatewayInferenceChatCompletionRequestDeveloperMessageSchema: z.ZodType<GatewayInferenceChatCompletionRequestDeveloperMessage> =
  z.lazy(() =>
    z
      .object({ content: z.string(), role: z.literal('developer'), name: z.string().optional() })
      .passthrough(),
  );

/** Portkey ChatCompletionRequestUserMessage; additive response fields are preserved.
 * @example `GatewayInferenceChatCompletionRequestUserMessageSchema.parse(value);`
 */
export type GatewayInferenceChatCompletionRequestUserMessage = {
  content: string | Array<GatewayInferenceChatCompletionRequestMessageContentPart>;
  role: 'user';
  name?: string;
  [key: string]: unknown;
};
export const GatewayInferenceChatCompletionRequestUserMessageSchema: z.ZodType<GatewayInferenceChatCompletionRequestUserMessage> =
  z.lazy(() =>
    z
      .object({
        content: z.union([
          z.string(),
          z.array(GatewayInferenceChatCompletionRequestMessageContentPartSchema).min(1),
        ]),
        role: z.literal('user'),
        name: z.string().optional(),
      })
      .passthrough(),
  );

/** Portkey ChatCompletionRequestMessageContentPart; additive response fields are preserved.
 * @example `GatewayInferenceChatCompletionRequestMessageContentPartSchema.parse(value);`
 */
export type GatewayInferenceChatCompletionRequestMessageContentPart =
  | GatewayInferenceChatCompletionRequestMessageContentPartText
  | GatewayInferenceChatCompletionRequestMessageContentPartImage;
export const GatewayInferenceChatCompletionRequestMessageContentPartSchema: z.ZodType<GatewayInferenceChatCompletionRequestMessageContentPart> =
  z.lazy(() =>
    z.union([
      GatewayInferenceChatCompletionRequestMessageContentPartTextSchema,
      GatewayInferenceChatCompletionRequestMessageContentPartImageSchema,
    ]),
  );

/** Portkey ChatCompletionRequestMessageContentPartImage; additive response fields are preserved.
 * @example `GatewayInferenceChatCompletionRequestMessageContentPartImageSchema.parse(value);`
 */
export type GatewayInferenceChatCompletionRequestMessageContentPartImage = {
  type: 'image_url';
  image_url: { url: string; detail?: 'auto' | 'low' | 'high'; [key: string]: unknown };
  [key: string]: unknown;
};
export const GatewayInferenceChatCompletionRequestMessageContentPartImageSchema: z.ZodType<GatewayInferenceChatCompletionRequestMessageContentPartImage> =
  z.lazy(() =>
    z
      .object({
        type: z.literal('image_url'),
        image_url: z
          .object({
            url: z.string(),
            detail: z.union([z.literal('auto'), z.literal('low'), z.literal('high')]).optional(),
          })
          .passthrough(),
      })
      .passthrough(),
  );

/** Portkey ChatCompletionRequestAssistantMessage; additive response fields are preserved.
 * @example `GatewayInferenceChatCompletionRequestAssistantMessageSchema.parse(value);`
 */
export type GatewayInferenceChatCompletionRequestAssistantMessage = {
  content?: string | null;
  role: 'assistant';
  name?: string;
  tool_calls?: GatewayInferenceChatCompletionMessageToolCalls;
  function_call?: { arguments: string; name: string; [key: string]: unknown } | null;
  [key: string]: unknown;
};
export const GatewayInferenceChatCompletionRequestAssistantMessageSchema: z.ZodType<GatewayInferenceChatCompletionRequestAssistantMessage> =
  z.lazy(() =>
    z
      .object({
        content: z.string().nullable().optional(),
        role: z.literal('assistant'),
        name: z.string().optional(),
        tool_calls: GatewayInferenceChatCompletionMessageToolCallsSchema.optional(),
        function_call: z
          .object({ arguments: z.string(), name: z.string() })
          .passthrough()
          .nullable()
          .optional(),
      })
      .passthrough(),
  );

/** Portkey ChatCompletionRequestToolMessage; additive response fields are preserved.
 * @example `GatewayInferenceChatCompletionRequestToolMessageSchema.parse(value);`
 */
export type GatewayInferenceChatCompletionRequestToolMessage = {
  role: 'tool';
  content: string;
  tool_call_id: string;
  [key: string]: unknown;
};
export const GatewayInferenceChatCompletionRequestToolMessageSchema: z.ZodType<GatewayInferenceChatCompletionRequestToolMessage> =
  z.lazy(() =>
    z
      .object({ role: z.literal('tool'), content: z.string(), tool_call_id: z.string() })
      .passthrough(),
  );

/** Portkey ChatCompletionRequestFunctionMessage; additive response fields are preserved.
 * @example `GatewayInferenceChatCompletionRequestFunctionMessageSchema.parse(value);`
 */
export type GatewayInferenceChatCompletionRequestFunctionMessage = {
  role: 'function';
  content: string | null;
  name: string;
  [key: string]: unknown;
};
export const GatewayInferenceChatCompletionRequestFunctionMessageSchema: z.ZodType<GatewayInferenceChatCompletionRequestFunctionMessage> =
  z.lazy(() =>
    z
      .object({ role: z.literal('function'), content: z.string().nullable(), name: z.string() })
      .passthrough(),
  );

/** Portkey ResponseFormatText; additive response fields are preserved.
 * @example `GatewayInferenceResponseFormatTextSchema.parse(value);`
 */
export type GatewayInferenceResponseFormatText = { type: 'text'; [key: string]: unknown };
export const GatewayInferenceResponseFormatTextSchema: z.ZodType<GatewayInferenceResponseFormatText> =
  z.lazy(() => z.object({ type: z.literal('text') }).passthrough());

/** Portkey ResponseFormatJsonSchema; additive response fields are preserved.
 * @example `GatewayInferenceResponseFormatJsonSchemaSchema.parse(value);`
 */
export type GatewayInferenceResponseFormatJsonSchema = {
  type: 'json_schema';
  json_schema: {
    description?: string;
    name: string;
    schema?: GatewayInferenceResponseFormatJsonSchemaSchema;
    strict?: boolean | null;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};
export const GatewayInferenceResponseFormatJsonSchemaSchema: z.ZodType<GatewayInferenceResponseFormatJsonSchema> =
  z.lazy(() =>
    z
      .object({
        type: z.literal('json_schema'),
        json_schema: z
          .object({
            description: z.string().optional(),
            name: z.string(),
            schema: GatewayInferenceResponseFormatJsonSchemaSchemaSchema.optional(),
            strict: z.boolean().nullable().optional(),
          })
          .passthrough(),
      })
      .passthrough(),
  );

/** Portkey ResponseFormatJsonSchemaSchema; additive response fields are preserved.
 * @example `GatewayInferenceResponseFormatJsonSchemaSchemaSchema.parse(value);`
 */
export type GatewayInferenceResponseFormatJsonSchemaSchema = { [key: string]: unknown };
export const GatewayInferenceResponseFormatJsonSchemaSchemaSchema: z.ZodType<GatewayInferenceResponseFormatJsonSchemaSchema> =
  z.lazy(() => z.object({}).passthrough());

/** Portkey ResponseFormatJsonObject; additive response fields are preserved.
 * @example `GatewayInferenceResponseFormatJsonObjectSchema.parse(value);`
 */
export type GatewayInferenceResponseFormatJsonObject = {
  type: 'json_object';
  [key: string]: unknown;
};
export const GatewayInferenceResponseFormatJsonObjectSchema: z.ZodType<GatewayInferenceResponseFormatJsonObject> =
  z.lazy(() => z.object({ type: z.literal('json_object') }).passthrough());

/** Portkey ChatCompletionStreamOptions; additive response fields are preserved.
 * @example `GatewayInferenceChatCompletionStreamOptionsSchema.parse(value);`
 */
export type GatewayInferenceChatCompletionStreamOptions = {
  include_usage?: boolean;
  [key: string]: unknown;
} | null;
export const GatewayInferenceChatCompletionStreamOptionsSchema: z.ZodType<GatewayInferenceChatCompletionStreamOptions> =
  z.lazy(() => z.object({ include_usage: z.boolean().optional() }).passthrough().nullable());

/** Portkey ChatCompletionTool; additive response fields are preserved.
 * @example `GatewayInferenceChatCompletionToolSchema.parse(value);`
 */
export type GatewayInferenceChatCompletionTool = {
  type: 'function';
  function: GatewayInferenceFunctionObject;
  [key: string]: unknown;
};
export const GatewayInferenceChatCompletionToolSchema: z.ZodType<GatewayInferenceChatCompletionTool> =
  z.lazy(() =>
    z
      .object({ type: z.literal('function'), function: GatewayInferenceFunctionObjectSchema })
      .passthrough(),
  );

/** Portkey FunctionObject; additive response fields are preserved.
 * @example `GatewayInferenceFunctionObjectSchema.parse(value);`
 */
export type GatewayInferenceFunctionObject = {
  description?: string;
  name: string;
  parameters?: GatewayInferenceFunctionParameters;
  strict?: boolean | null;
  [key: string]: unknown;
};
export const GatewayInferenceFunctionObjectSchema: z.ZodType<GatewayInferenceFunctionObject> =
  z.lazy(() =>
    z
      .object({
        description: z.string().optional(),
        name: z.string(),
        parameters: GatewayInferenceFunctionParametersSchema.optional(),
        strict: z.boolean().nullable().optional(),
      })
      .passthrough(),
  );

/** Portkey FunctionParameters; additive response fields are preserved.
 * @example `GatewayInferenceFunctionParametersSchema.parse(value);`
 */
export type GatewayInferenceFunctionParameters = { [key: string]: unknown };
export const GatewayInferenceFunctionParametersSchema: z.ZodType<GatewayInferenceFunctionParameters> =
  z.lazy(() => z.object({}).passthrough());

/** Portkey ChatCompletionToolChoiceOption; additive response fields are preserved.
 * @example `GatewayInferenceChatCompletionToolChoiceOptionSchema.parse(value);`
 */
export type GatewayInferenceChatCompletionToolChoiceOption =
  | 'none'
  | 'auto'
  | 'required'
  | GatewayInferenceChatCompletionNamedToolChoice;
export const GatewayInferenceChatCompletionToolChoiceOptionSchema: z.ZodType<GatewayInferenceChatCompletionToolChoiceOption> =
  z.lazy(() =>
    z.union([
      z.union([z.literal('none'), z.literal('auto'), z.literal('required')]),
      GatewayInferenceChatCompletionNamedToolChoiceSchema,
    ]),
  );

/** Portkey ChatCompletionNamedToolChoice; additive response fields are preserved.
 * @example `GatewayInferenceChatCompletionNamedToolChoiceSchema.parse(value);`
 */
export type GatewayInferenceChatCompletionNamedToolChoice = {
  type: 'function';
  function: { name: string; [key: string]: unknown };
  [key: string]: unknown;
};
export const GatewayInferenceChatCompletionNamedToolChoiceSchema: z.ZodType<GatewayInferenceChatCompletionNamedToolChoice> =
  z.lazy(() =>
    z
      .object({
        type: z.literal('function'),
        function: z.object({ name: z.string() }).passthrough(),
      })
      .passthrough(),
  );

/** Portkey ParallelToolCalls; additive response fields are preserved.
 * @example `GatewayInferenceParallelToolCallsSchema.parse(value);`
 */
export type GatewayInferenceParallelToolCalls = boolean;
export const GatewayInferenceParallelToolCallsSchema: z.ZodType<GatewayInferenceParallelToolCalls> =
  z.lazy(() => z.boolean());

/** Portkey ChatCompletionFunctionCallOption; additive response fields are preserved.
 * @example `GatewayInferenceChatCompletionFunctionCallOptionSchema.parse(value);`
 */
export type GatewayInferenceChatCompletionFunctionCallOption = {
  name: string;
  [key: string]: unknown;
};
export const GatewayInferenceChatCompletionFunctionCallOptionSchema: z.ZodType<GatewayInferenceChatCompletionFunctionCallOption> =
  z.lazy(() => z.object({ name: z.string() }).passthrough());

/** Portkey ChatCompletionFunctions; additive response fields are preserved.
 * @example `GatewayInferenceChatCompletionFunctionsSchema.parse(value);`
 */
export type GatewayInferenceChatCompletionFunctions = {
  description?: string;
  name: string;
  parameters?: GatewayInferenceFunctionParameters;
  [key: string]: unknown;
};
export const GatewayInferenceChatCompletionFunctionsSchema: z.ZodType<GatewayInferenceChatCompletionFunctions> =
  z.lazy(() =>
    z
      .object({
        description: z.string().optional(),
        name: z.string(),
        parameters: GatewayInferenceFunctionParametersSchema.optional(),
      })
      .passthrough(),
  );

/** Portkey CreateCompletionRequest; additive response fields are preserved.
 * @example `GatewayInferenceCreateCompletionRequestSchema.parse(value);`
 */
export type GatewayInferenceCreateCompletionRequest = {
  model: string | 'gpt-3.5-turbo-instruct' | 'davinci-002' | 'babbage-002';
  prompt: (string | Array<string> | Array<number> | Array<Array<number>>) | null;
  best_of?: number | null;
  echo?: boolean | null;
  frequency_penalty?: number | null;
  logit_bias?: { [key: string]: unknown } | null;
  logprobs?: number | null;
  max_tokens?: number | null;
  n?: number | null;
  presence_penalty?: number | null;
  seed?: number | null;
  stop?: (string | null | Array<string>) | null;
  stream?: boolean | null;
  stream_options?: GatewayInferenceChatCompletionStreamOptions;
  suffix?: string | null;
  temperature?: number | null;
  top_p?: number | null;
  user?: string;
  [key: string]: unknown;
};
export const GatewayInferenceCreateCompletionRequestSchema: z.ZodType<GatewayInferenceCreateCompletionRequest> =
  z.lazy(() =>
    z
      .object({
        model: z.union([
          z.string(),
          z.union([
            z.literal('gpt-3.5-turbo-instruct'),
            z.literal('davinci-002'),
            z.literal('babbage-002'),
          ]),
        ]),
        prompt: z
          .union([
            z.string(),
            z.array(z.string()),
            z.array(z.number().finite().int()).min(1),
            z.array(z.array(z.number().finite().int()).min(1)).min(1),
          ])
          .nullable(),
        best_of: z.number().finite().int().min(0).max(20).nullable().optional(),
        echo: z.boolean().nullable().optional(),
        frequency_penalty: z.number().finite().min(-2).max(2).nullable().optional(),
        logit_bias: z.object({}).passthrough().nullable().optional(),
        logprobs: z.number().finite().int().min(0).max(5).nullable().optional(),
        max_tokens: z.number().finite().int().min(0).nullable().optional(),
        n: z.number().finite().int().min(1).max(128).nullable().optional(),
        presence_penalty: z.number().finite().min(-2).max(2).nullable().optional(),
        seed: z
          .number()
          .finite()
          .int()
          .min(-9223372036854776000)
          .max(9223372036854776000)
          .nullable()
          .optional(),
        stop: z
          .union([z.string().nullable(), z.array(z.string()).min(1).max(4)])
          .nullable()
          .optional(),
        stream: z.boolean().nullable().optional(),
        stream_options: GatewayInferenceChatCompletionStreamOptionsSchema.optional(),
        suffix: z.string().nullable().optional(),
        temperature: z.number().finite().min(0).max(2).nullable().optional(),
        top_p: z.number().finite().min(0).max(1).nullable().optional(),
        user: z.string().optional(),
      })
      .passthrough(),
  );

/** Portkey CreateChatCompletionRequest; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputCreateChatCompletionRequestSchema.parse(value);`
 */
export type GatewayInferenceInputCreateChatCompletionRequest = {
  messages: Array<GatewayInferenceInputChatCompletionRequestMessage>;
  model:
    | string
    | 'gpt-5'
    | 'gpt-5-mini'
    | 'gpt-5-nano'
    | 'o4-mini'
    | 'o3'
    | 'o3-mini'
    | 'o1'
    | 'o1-mini'
    | 'gpt-4o'
    | 'gpt-4o-mini'
    | 'gpt-4o-2024-05-13'
    | 'gpt-4-turbo'
    | 'gpt-4-turbo-2024-04-09'
    | 'gpt-4-0125-preview'
    | 'gpt-4-turbo-preview'
    | 'gpt-4-1106-preview'
    | 'gpt-4-vision-preview'
    | 'gpt-4'
    | 'gpt-4-0314'
    | 'gpt-4-0613'
    | 'gpt-4-32k'
    | 'gpt-4-32k-0314'
    | 'gpt-4-32k-0613'
    | 'gpt-3.5-turbo'
    | 'gpt-3.5-turbo-16k'
    | 'gpt-3.5-turbo-0301'
    | 'gpt-3.5-turbo-0613'
    | 'gpt-3.5-turbo-1106'
    | 'gpt-3.5-turbo-0125'
    | 'gpt-3.5-turbo-16k-0613';
  frequency_penalty?: number | null;
  logit_bias?: { [key: string]: number } | null;
  logprobs?: boolean | null;
  top_logprobs?: number | null;
  max_tokens?: number | null;
  max_completion_tokens?: number | null;
  n?: number | null;
  presence_penalty?: number | null;
  response_format?:
    | GatewayInferenceInputResponseFormatText
    | GatewayInferenceInputResponseFormatJsonSchema
    | GatewayInferenceInputResponseFormatJsonObject;
  seed?: number | null;
  stop?: string | null | Array<string>;
  stream?: boolean | null;
  stream_options?: GatewayInferenceInputChatCompletionStreamOptions;
  thinking?: { type: 'enabled' | 'disabled'; budget_tokens?: number } | null;
  temperature?: number | null;
  top_p?: number | null;
  tools?: Array<GatewayInferenceInputChatCompletionTool>;
  tool_choice?: GatewayInferenceInputChatCompletionToolChoiceOption;
  parallel_tool_calls?: GatewayInferenceInputParallelToolCalls;
  user?: string;
  function_call?: 'none' | 'auto' | GatewayInferenceInputChatCompletionFunctionCallOption;
  functions?: Array<GatewayInferenceInputChatCompletionFunctions>;
};
export const GatewayInferenceInputCreateChatCompletionRequestSchema: z.ZodType<GatewayInferenceInputCreateChatCompletionRequest> =
  z.lazy(() =>
    z
      .object({
        messages: z.array(GatewayInferenceInputChatCompletionRequestMessageSchema).min(1),
        model: z.union([
          z.string(),
          z.union([
            z.literal('gpt-5'),
            z.literal('gpt-5-mini'),
            z.literal('gpt-5-nano'),
            z.literal('o4-mini'),
            z.literal('o3'),
            z.literal('o3-mini'),
            z.literal('o1'),
            z.literal('o1-mini'),
            z.literal('gpt-4o'),
            z.literal('gpt-4o-mini'),
            z.literal('gpt-4o-2024-05-13'),
            z.literal('gpt-4-turbo'),
            z.literal('gpt-4-turbo-2024-04-09'),
            z.literal('gpt-4-0125-preview'),
            z.literal('gpt-4-turbo-preview'),
            z.literal('gpt-4-1106-preview'),
            z.literal('gpt-4-vision-preview'),
            z.literal('gpt-4'),
            z.literal('gpt-4-0314'),
            z.literal('gpt-4-0613'),
            z.literal('gpt-4-32k'),
            z.literal('gpt-4-32k-0314'),
            z.literal('gpt-4-32k-0613'),
            z.literal('gpt-3.5-turbo'),
            z.literal('gpt-3.5-turbo-16k'),
            z.literal('gpt-3.5-turbo-0301'),
            z.literal('gpt-3.5-turbo-0613'),
            z.literal('gpt-3.5-turbo-1106'),
            z.literal('gpt-3.5-turbo-0125'),
            z.literal('gpt-3.5-turbo-16k-0613'),
          ]),
        ]),
        frequency_penalty: z.number().finite().min(-2).max(2).nullable().optional(),
        logit_bias: z
          .object({})
          .catchall(z.number().finite().int())
          .and(GatewayJsonObjectSchema)
          .nullable()
          .optional(),
        logprobs: z.boolean().nullable().optional(),
        top_logprobs: z.number().finite().int().min(0).max(20).nullable().optional(),
        max_tokens: z.number().finite().int().nullable().optional(),
        max_completion_tokens: z.number().finite().int().nullable().optional(),
        n: z.number().finite().int().min(1).max(128).nullable().optional(),
        presence_penalty: z.number().finite().min(-2).max(2).nullable().optional(),
        response_format: z
          .union([
            GatewayInferenceInputResponseFormatTextSchema,
            GatewayInferenceInputResponseFormatJsonSchemaSchema,
            GatewayInferenceInputResponseFormatJsonObjectSchema,
          ])
          .optional(),
        seed: z
          .number()
          .finite()
          .int()
          .min(-9223372036854776000)
          .max(9223372036854776000)
          .nullable()
          .optional(),
        stop: z.union([z.string().nullable(), z.array(z.string()).min(1).max(4)]).optional(),
        stream: z.boolean().nullable().optional(),
        stream_options: GatewayInferenceInputChatCompletionStreamOptionsSchema.optional(),
        thinking: z
          .object({
            type: z.union([z.literal('enabled'), z.literal('disabled')]),
            budget_tokens: z.number().finite().int().min(1).optional(),
          })
          .strict()
          .nullable()
          .optional(),
        temperature: z.number().finite().min(0).max(2).nullable().optional(),
        top_p: z.number().finite().min(0).max(1).nullable().optional(),
        tools: z.array(GatewayInferenceInputChatCompletionToolSchema).optional(),
        tool_choice: GatewayInferenceInputChatCompletionToolChoiceOptionSchema.optional(),
        parallel_tool_calls: GatewayInferenceInputParallelToolCallsSchema.optional(),
        user: z.string().optional(),
        function_call: z
          .union([
            z.union([z.literal('none'), z.literal('auto')]),
            GatewayInferenceInputChatCompletionFunctionCallOptionSchema,
          ])
          .optional(),
        functions: z
          .array(GatewayInferenceInputChatCompletionFunctionsSchema)
          .min(1)
          .max(128)
          .optional(),
      })
      .strict(),
  );

/** Portkey CreateEmbeddingRequest; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputCreateEmbeddingRequestSchema.parse(value);`
 */
export type GatewayInferenceInputCreateEmbeddingRequest = {
  input: string | Array<string> | Array<number> | Array<Array<number>>;
  model: string | 'text-embedding-ada-002' | 'text-embedding-3-small' | 'text-embedding-3-large';
  encoding_format?: 'float' | 'base64';
  dimensions?: number;
  user?: string;
};
export const GatewayInferenceInputCreateEmbeddingRequestSchema: z.ZodType<GatewayInferenceInputCreateEmbeddingRequest> =
  z.lazy(() =>
    z
      .object({
        input: z.union([
          z.string(),
          z.array(z.string()).min(1).max(2048),
          z.array(z.number().finite().int()).min(1).max(2048),
          z.array(z.array(z.number().finite().int()).min(1)).min(1).max(2048),
        ]),
        model: z.union([
          z.string(),
          z.union([
            z.literal('text-embedding-ada-002'),
            z.literal('text-embedding-3-small'),
            z.literal('text-embedding-3-large'),
          ]),
        ]),
        encoding_format: z.union([z.literal('float'), z.literal('base64')]).optional(),
        dimensions: z.number().finite().int().min(1).optional(),
        user: z.string().optional(),
      })
      .strict(),
  );

/** Portkey CreateEmbeddingResponse; additive response fields are preserved.
 * @example `GatewayInferenceCreateEmbeddingResponseSchema.parse(value);`
 */
export type GatewayInferenceCreateEmbeddingResponse = {
  data: Array<GatewayInferenceEmbedding>;
  model: string;
  object: 'list';
  usage: { prompt_tokens: number; total_tokens: number; [key: string]: unknown };
  [key: string]: unknown;
};
export const GatewayInferenceCreateEmbeddingResponseSchema: z.ZodType<GatewayInferenceCreateEmbeddingResponse> =
  z.lazy(() =>
    z
      .object({
        data: z.array(GatewayInferenceEmbeddingSchema),
        model: z.string(),
        object: z.literal('list'),
        usage: z
          .object({
            prompt_tokens: z.number().finite().int(),
            total_tokens: z.number().finite().int(),
          })
          .passthrough(),
      })
      .passthrough(),
  );

/** Portkey Embedding; additive response fields are preserved.
 * @example `GatewayInferenceEmbeddingSchema.parse(value);`
 */
export type GatewayInferenceEmbedding = {
  index: number;
  embedding: Array<number> | string;
  object: 'embedding';
  [key: string]: unknown;
};
export const GatewayInferenceEmbeddingSchema: z.ZodType<GatewayInferenceEmbedding> = z.lazy(() =>
  z
    .object({
      index: z.number().finite().int(),
      embedding: z.union([z.array(z.number().finite()), z.string()]),
      object: z.literal('embedding'),
    })
    .passthrough(),
);

/** Portkey CreateResponse; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputCreateResponseSchema.parse(value);`
 */
export type GatewayInferenceInputCreateResponse = {
  metadata?: GatewayInferenceInputMetadata;
  temperature?: number | null;
  top_p?: number | null;
  user?: string;
  previous_response_id?: string | null;
  model: GatewayInferenceInputModelIdsResponses;
  reasoning?: GatewayInferenceInputReasoning | null;
  max_output_tokens?: number | null;
  instructions?: string | null;
  text?: { format?: GatewayInferenceInputTextResponseFormatConfiguration };
  tools?: Array<GatewayInferenceInputTool>;
  tool_choice?:
    | GatewayInferenceInputToolChoiceOptions
    | GatewayInferenceInputToolChoiceTypes
    | GatewayInferenceInputToolChoiceFunction;
  truncation?: ('auto' | 'disabled') | null;
  input: string | Array<GatewayInferenceInputInputItem>;
  include?: Array<GatewayInferenceInputIncludable> | null;
  parallel_tool_calls?: boolean | null;
  store?: boolean | null;
  stream?: boolean | null;
};
export const GatewayInferenceInputCreateResponseSchema: z.ZodType<GatewayInferenceInputCreateResponse> =
  z.lazy(() =>
    z
      .object({
        metadata: GatewayInferenceInputMetadataSchema.optional(),
        temperature: z.number().finite().min(0).max(2).nullable().optional(),
        top_p: z.number().finite().min(0).max(1).nullable().optional(),
        user: z.string().optional(),
        previous_response_id: z.string().nullable().optional(),
        model: GatewayInferenceInputModelIdsResponsesSchema,
        reasoning: GatewayInferenceInputReasoningSchema.nullable().optional(),
        max_output_tokens: z.number().finite().int().nullable().optional(),
        instructions: z.string().nullable().optional(),
        text: z
          .object({ format: GatewayInferenceInputTextResponseFormatConfigurationSchema.optional() })
          .strict()
          .optional(),
        tools: z.array(GatewayInferenceInputToolSchema).optional(),
        tool_choice: z
          .union([
            GatewayInferenceInputToolChoiceOptionsSchema,
            GatewayInferenceInputToolChoiceTypesSchema,
            GatewayInferenceInputToolChoiceFunctionSchema,
          ])
          .optional(),
        truncation: z
          .union([z.literal('auto'), z.literal('disabled')])
          .nullable()
          .optional(),
        input: z.union([z.string(), z.array(GatewayInferenceInputInputItemSchema)]),
        include: z.array(GatewayInferenceInputIncludableSchema).nullable().optional(),
        parallel_tool_calls: z.boolean().nullable().optional(),
        store: z.boolean().nullable().optional(),
        stream: z.boolean().nullable().optional(),
      })
      .strict(),
  );

/** Portkey Metadata; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputMetadataSchema.parse(value);`
 */
export type GatewayInferenceInputMetadata = { [key: string]: string } | null;
export const GatewayInferenceInputMetadataSchema: z.ZodType<GatewayInferenceInputMetadata> = z.lazy(
  () => z.object({}).catchall(z.string()).and(GatewayJsonObjectSchema).nullable(),
);

/** Portkey ModelIdsResponses; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputModelIdsResponsesSchema.parse(value);`
 */
export type GatewayInferenceInputModelIdsResponses = string;
export const GatewayInferenceInputModelIdsResponsesSchema: z.ZodType<GatewayInferenceInputModelIdsResponses> =
  z.lazy(() => z.string().min(1));

/** Portkey Reasoning; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputReasoningSchema.parse(value);`
 */
export type GatewayInferenceInputReasoning = {
  effort?: GatewayInferenceInputReasoningEffort;
  generate_summary?: ('concise' | 'detailed') | null;
};
export const GatewayInferenceInputReasoningSchema: z.ZodType<GatewayInferenceInputReasoning> =
  z.lazy(() =>
    z
      .object({
        effort: GatewayInferenceInputReasoningEffortSchema.optional(),
        generate_summary: z
          .union([z.literal('concise'), z.literal('detailed')])
          .nullable()
          .optional(),
      })
      .strict(),
  );

/** Portkey ReasoningEffort; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputReasoningEffortSchema.parse(value);`
 */
export type GatewayInferenceInputReasoningEffort = ('low' | 'medium' | 'high') | null;
export const GatewayInferenceInputReasoningEffortSchema: z.ZodType<GatewayInferenceInputReasoningEffort> =
  z.lazy(() => z.union([z.literal('low'), z.literal('medium'), z.literal('high')]).nullable());

/** Portkey TextResponseFormatConfiguration; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputTextResponseFormatConfigurationSchema.parse(value);`
 */
export type GatewayInferenceInputTextResponseFormatConfiguration =
  | GatewayInferenceInputResponseFormatText
  | GatewayInferenceInputTextResponseFormatJsonSchema
  | GatewayInferenceInputResponseFormatJsonObject;
export const GatewayInferenceInputTextResponseFormatConfigurationSchema: z.ZodType<GatewayInferenceInputTextResponseFormatConfiguration> =
  z.lazy(() =>
    z.union([
      GatewayInferenceInputResponseFormatTextSchema,
      GatewayInferenceInputTextResponseFormatJsonSchemaSchema,
      GatewayInferenceInputResponseFormatJsonObjectSchema,
    ]),
  );

/** Portkey TextResponseFormatJsonSchema; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputTextResponseFormatJsonSchemaSchema.parse(value);`
 */
export type GatewayInferenceInputTextResponseFormatJsonSchema = {
  type: 'json_schema';
  description?: string;
  name?: string;
  schema: GatewayInferenceInputResponseFormatJsonSchemaSchema;
  strict?: boolean | null;
};
export const GatewayInferenceInputTextResponseFormatJsonSchemaSchema: z.ZodType<GatewayInferenceInputTextResponseFormatJsonSchema> =
  z.lazy(() =>
    z
      .object({
        type: z.literal('json_schema'),
        description: z.string().optional(),
        name: z.string().optional(),
        schema: GatewayInferenceInputResponseFormatJsonSchemaSchemaSchema,
        strict: z.boolean().nullable().optional(),
      })
      .strict(),
  );

/** Portkey Tool; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputToolSchema.parse(value);`
 */
export type GatewayInferenceInputTool =
  | GatewayInferenceInputFileSearchTool
  | GatewayInferenceInputFunctionTool
  | GatewayInferenceInputComputerTool
  | GatewayInferenceInputWebSearchTool;
export const GatewayInferenceInputToolSchema: z.ZodType<GatewayInferenceInputTool> = z.lazy(() =>
  z.union([
    GatewayInferenceInputFileSearchToolSchema,
    GatewayInferenceInputFunctionToolSchema,
    GatewayInferenceInputComputerToolSchema,
    GatewayInferenceInputWebSearchToolSchema,
  ]),
);

/** Portkey FileSearchTool; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputFileSearchToolSchema.parse(value);`
 */
export type GatewayInferenceInputFileSearchTool = {
  type: 'file_search';
  vector_store_ids: Array<string>;
  max_num_results?: number;
  filters?: GatewayInferenceInputComparisonFilter | GatewayInferenceInputCompoundFilter;
  ranking_options?: { ranker?: 'auto' | 'default-2024-11-15'; score_threshold?: number };
};
export const GatewayInferenceInputFileSearchToolSchema: z.ZodType<GatewayInferenceInputFileSearchTool> =
  z.lazy(() =>
    z
      .object({
        type: z.literal('file_search'),
        vector_store_ids: z.array(z.string()),
        max_num_results: z.number().finite().int().optional(),
        filters: z
          .union([
            GatewayInferenceInputComparisonFilterSchema,
            GatewayInferenceInputCompoundFilterSchema,
          ])
          .optional(),
        ranking_options: z
          .object({
            ranker: z.union([z.literal('auto'), z.literal('default-2024-11-15')]).optional(),
            score_threshold: z.number().finite().min(0).max(1).optional(),
          })
          .strict()
          .optional(),
      })
      .strict(),
  );

/** Portkey ComparisonFilter; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputComparisonFilterSchema.parse(value);`
 */
export type GatewayInferenceInputComparisonFilter = {
  type: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte';
  key: string;
  value: string | number | boolean;
};
export const GatewayInferenceInputComparisonFilterSchema: z.ZodType<GatewayInferenceInputComparisonFilter> =
  z.lazy(() =>
    z
      .object({
        type: z.union([
          z.literal('eq'),
          z.literal('ne'),
          z.literal('gt'),
          z.literal('gte'),
          z.literal('lt'),
          z.literal('lte'),
        ]),
        key: z.string(),
        value: z.union([z.string(), z.number().finite(), z.boolean()]),
      })
      .strict(),
  );

/** Portkey CompoundFilter; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputCompoundFilterSchema.parse(value);`
 */
export type GatewayInferenceInputCompoundFilter = {
  type: 'and' | 'or';
  filters: Array<GatewayInferenceInputComparisonFilter | { [key: string]: GatewayJsonValue }>;
};
export const GatewayInferenceInputCompoundFilterSchema: z.ZodType<GatewayInferenceInputCompoundFilter> =
  z.lazy(() =>
    z
      .object({
        type: z.union([z.literal('and'), z.literal('or')]),
        filters: z.array(
          z.union([
            GatewayInferenceInputComparisonFilterSchema,
            z.object({}).catchall(GatewayJsonValueSchema).and(GatewayJsonObjectSchema),
          ]),
        ),
      })
      .strict(),
  );

/** Portkey FunctionTool; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputFunctionToolSchema.parse(value);`
 */
export type GatewayInferenceInputFunctionTool = {
  type: 'function';
  name: string;
  description?: string | null;
  parameters: { [key: string]: GatewayJsonValue };
  strict: boolean;
};
export const GatewayInferenceInputFunctionToolSchema: z.ZodType<GatewayInferenceInputFunctionTool> =
  z.lazy(() =>
    z
      .object({
        type: z.literal('function'),
        name: z.string(),
        description: z.string().nullable().optional(),
        parameters: z.object({}).catchall(GatewayJsonValueSchema).and(GatewayJsonObjectSchema),
        strict: z.boolean(),
      })
      .strict(),
  );

/** Portkey ComputerTool; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputComputerToolSchema.parse(value);`
 */
export type GatewayInferenceInputComputerTool = {
  type: 'computer_use_preview';
  display_width: number;
  display_height: number;
  environment: 'mac' | 'windows' | 'ubuntu' | 'browser';
};
export const GatewayInferenceInputComputerToolSchema: z.ZodType<GatewayInferenceInputComputerTool> =
  z.lazy(() =>
    z
      .object({
        type: z.literal('computer_use_preview'),
        display_width: z.number().finite(),
        display_height: z.number().finite(),
        environment: z.union([
          z.literal('mac'),
          z.literal('windows'),
          z.literal('ubuntu'),
          z.literal('browser'),
        ]),
      })
      .strict(),
  );

/** Portkey WebSearchTool; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputWebSearchToolSchema.parse(value);`
 */
export type GatewayInferenceInputWebSearchTool = {
  type: 'web_search_preview' | 'web_search_preview_2025_03_11';
  user_location?: {
    country?: string;
    region?: string;
    city?: string;
    timezone?: string;
    type: 'approximate';
  } | null;
  search_context_size?: GatewayInferenceInputWebSearchContextSize;
};
export const GatewayInferenceInputWebSearchToolSchema: z.ZodType<GatewayInferenceInputWebSearchTool> =
  z.lazy(() =>
    z
      .object({
        type: z.union([
          z.literal('web_search_preview'),
          z.literal('web_search_preview_2025_03_11'),
        ]),
        user_location: z
          .object({
            country: z.string().optional(),
            region: z.string().optional(),
            city: z.string().optional(),
            timezone: z.string().optional(),
            type: z.literal('approximate'),
          })
          .strict()
          .nullable()
          .optional(),
        search_context_size: GatewayInferenceInputWebSearchContextSizeSchema.optional(),
      })
      .strict(),
  );

/** Portkey WebSearchContextSize; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputWebSearchContextSizeSchema.parse(value);`
 */
export type GatewayInferenceInputWebSearchContextSize = 'low' | 'medium' | 'high';
export const GatewayInferenceInputWebSearchContextSizeSchema: z.ZodType<GatewayInferenceInputWebSearchContextSize> =
  z.lazy(() => z.union([z.literal('low'), z.literal('medium'), z.literal('high')]));

/** Portkey ToolChoiceOptions; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputToolChoiceOptionsSchema.parse(value);`
 */
export type GatewayInferenceInputToolChoiceOptions = 'none' | 'auto' | 'required';
export const GatewayInferenceInputToolChoiceOptionsSchema: z.ZodType<GatewayInferenceInputToolChoiceOptions> =
  z.lazy(() => z.union([z.literal('none'), z.literal('auto'), z.literal('required')]));

/** Portkey ToolChoiceTypes; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputToolChoiceTypesSchema.parse(value);`
 */
export type GatewayInferenceInputToolChoiceTypes = {
  type:
    | 'file_search'
    | 'web_search_preview'
    | 'computer_use_preview'
    | 'web_search_preview_2025_03_11';
};
export const GatewayInferenceInputToolChoiceTypesSchema: z.ZodType<GatewayInferenceInputToolChoiceTypes> =
  z.lazy(() =>
    z
      .object({
        type: z.union([
          z.literal('file_search'),
          z.literal('web_search_preview'),
          z.literal('computer_use_preview'),
          z.literal('web_search_preview_2025_03_11'),
        ]),
      })
      .strict(),
  );

/** Portkey ToolChoiceFunction; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputToolChoiceFunctionSchema.parse(value);`
 */
export type GatewayInferenceInputToolChoiceFunction = { type: 'function'; name: string };
export const GatewayInferenceInputToolChoiceFunctionSchema: z.ZodType<GatewayInferenceInputToolChoiceFunction> =
  z.lazy(() => z.object({ type: z.literal('function'), name: z.string() }).strict());

/** Portkey InputItem; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputInputItemSchema.parse(value);`
 */
export type GatewayInferenceInputInputItem =
  | GatewayInferenceInputEasyInputMessage
  | GatewayInferenceInputItem
  | GatewayInferenceInputItemReference;
export const GatewayInferenceInputInputItemSchema: z.ZodType<GatewayInferenceInputInputItem> =
  z.lazy(() =>
    z.union([
      GatewayInferenceInputEasyInputMessageSchema,
      GatewayInferenceInputItemSchema,
      GatewayInferenceInputItemReferenceSchema,
    ]),
  );

/** Portkey EasyInputMessage; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputEasyInputMessageSchema.parse(value);`
 */
export type GatewayInferenceInputEasyInputMessage = {
  role: 'user' | 'assistant' | 'system' | 'developer';
  content: string | GatewayInferenceInputInputMessageContentList;
  type?: 'message';
};
export const GatewayInferenceInputEasyInputMessageSchema: z.ZodType<GatewayInferenceInputEasyInputMessage> =
  z.lazy(() =>
    z
      .object({
        role: z.union([
          z.literal('user'),
          z.literal('assistant'),
          z.literal('system'),
          z.literal('developer'),
        ]),
        content: z.union([z.string(), GatewayInferenceInputInputMessageContentListSchema]),
        type: z.literal('message').optional(),
      })
      .strict(),
  );

/** Portkey InputMessageContentList; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputInputMessageContentListSchema.parse(value);`
 */
export type GatewayInferenceInputInputMessageContentList = Array<GatewayInferenceInputInputContent>;
export const GatewayInferenceInputInputMessageContentListSchema: z.ZodType<GatewayInferenceInputInputMessageContentList> =
  z.lazy(() => z.array(GatewayInferenceInputInputContentSchema));

/** Portkey InputContent; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputInputContentSchema.parse(value);`
 */
export type GatewayInferenceInputInputContent =
  | GatewayInferenceInputInputText
  | GatewayInferenceInputInputImage
  | GatewayInferenceInputInputFile;
export const GatewayInferenceInputInputContentSchema: z.ZodType<GatewayInferenceInputInputContent> =
  z.lazy(() =>
    z.union([
      GatewayInferenceInputInputTextSchema,
      GatewayInferenceInputInputImageSchema,
      GatewayInferenceInputInputFileSchema,
    ]),
  );

/** Portkey InputText; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputInputTextSchema.parse(value);`
 */
export type GatewayInferenceInputInputText = { type: 'input_text'; text: string };
export const GatewayInferenceInputInputTextSchema: z.ZodType<GatewayInferenceInputInputText> =
  z.lazy(() => z.object({ type: z.literal('input_text'), text: z.string() }).strict());

/** Portkey InputImage; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputInputImageSchema.parse(value);`
 */
export type GatewayInferenceInputInputImage = {
  type: 'input_image';
  image_url?: string | null;
  file_id?: string | null;
  detail: 'high' | 'low' | 'auto';
};
export const GatewayInferenceInputInputImageSchema: z.ZodType<GatewayInferenceInputInputImage> =
  z.lazy(() =>
    z
      .object({
        type: z.literal('input_image'),
        image_url: z.string().nullable().optional(),
        file_id: z.string().nullable().optional(),
        detail: z.union([z.literal('high'), z.literal('low'), z.literal('auto')]),
      })
      .strict(),
  );

/** Portkey InputFile; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputInputFileSchema.parse(value);`
 */
export type GatewayInferenceInputInputFile = {
  type: 'input_file';
  file_id?: string;
  filename?: string;
  file_data?: string;
};
export const GatewayInferenceInputInputFileSchema: z.ZodType<GatewayInferenceInputInputFile> =
  z.lazy(() =>
    z
      .object({
        type: z.literal('input_file'),
        file_id: z.string().optional(),
        filename: z.string().optional(),
        file_data: z.string().optional(),
      })
      .strict(),
  );

/** Portkey Item; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputItemSchema.parse(value);`
 */
export type GatewayInferenceInputItem =
  | GatewayInferenceInputInputMessage
  | GatewayInferenceInputOutputMessage
  | GatewayInferenceInputFileSearchToolCall
  | GatewayInferenceInputComputerToolCall
  | GatewayInferenceInputComputerToolCallOutput
  | GatewayInferenceInputWebSearchToolCall
  | GatewayInferenceInputFunctionToolCall
  | GatewayInferenceInputFunctionToolCallOutput
  | GatewayInferenceInputReasoningItem;
export const GatewayInferenceInputItemSchema: z.ZodType<GatewayInferenceInputItem> = z.lazy(() =>
  z.union([
    GatewayInferenceInputInputMessageSchema,
    GatewayInferenceInputOutputMessageSchema,
    GatewayInferenceInputFileSearchToolCallSchema,
    GatewayInferenceInputComputerToolCallSchema,
    GatewayInferenceInputComputerToolCallOutputSchema,
    GatewayInferenceInputWebSearchToolCallSchema,
    GatewayInferenceInputFunctionToolCallSchema,
    GatewayInferenceInputFunctionToolCallOutputSchema,
    GatewayInferenceInputReasoningItemSchema,
  ]),
);

/** Portkey InputMessage; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputInputMessageSchema.parse(value);`
 */
export type GatewayInferenceInputInputMessage = {
  type?: 'message';
  role: 'user' | 'system' | 'developer';
  status?: 'in_progress' | 'completed' | 'incomplete';
  content: GatewayInferenceInputInputMessageContentList;
};
export const GatewayInferenceInputInputMessageSchema: z.ZodType<GatewayInferenceInputInputMessage> =
  z.lazy(() =>
    z
      .object({
        type: z.literal('message').optional(),
        role: z.union([z.literal('user'), z.literal('system'), z.literal('developer')]),
        status: z
          .union([z.literal('in_progress'), z.literal('completed'), z.literal('incomplete')])
          .optional(),
        content: GatewayInferenceInputInputMessageContentListSchema,
      })
      .strict(),
  );

/** Portkey OutputMessage; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputOutputMessageSchema.parse(value);`
 */
export type GatewayInferenceInputOutputMessage = {
  id: string;
  type: 'message';
  role: 'assistant';
  content: Array<GatewayInferenceInputOutputContent>;
  status: 'in_progress' | 'completed' | 'incomplete';
};
export const GatewayInferenceInputOutputMessageSchema: z.ZodType<GatewayInferenceInputOutputMessage> =
  z.lazy(() =>
    z
      .object({
        id: z.string(),
        type: z.literal('message'),
        role: z.literal('assistant'),
        content: z.array(GatewayInferenceInputOutputContentSchema),
        status: z.union([
          z.literal('in_progress'),
          z.literal('completed'),
          z.literal('incomplete'),
        ]),
      })
      .strict(),
  );

/** Portkey OutputContent; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputOutputContentSchema.parse(value);`
 */
export type GatewayInferenceInputOutputContent =
  | GatewayInferenceInputOutputText
  | GatewayInferenceInputRefusal;
export const GatewayInferenceInputOutputContentSchema: z.ZodType<GatewayInferenceInputOutputContent> =
  z.lazy(() =>
    z.union([GatewayInferenceInputOutputTextSchema, GatewayInferenceInputRefusalSchema]),
  );

/** Portkey OutputText; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputOutputTextSchema.parse(value);`
 */
export type GatewayInferenceInputOutputText = {
  type: 'output_text';
  text: string;
  annotations: Array<GatewayInferenceInputAnnotation>;
};
export const GatewayInferenceInputOutputTextSchema: z.ZodType<GatewayInferenceInputOutputText> =
  z.lazy(() =>
    z
      .object({
        type: z.literal('output_text'),
        text: z.string(),
        annotations: z.array(GatewayInferenceInputAnnotationSchema),
      })
      .strict(),
  );

/** Portkey Annotation; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputAnnotationSchema.parse(value);`
 */
export type GatewayInferenceInputAnnotation =
  | GatewayInferenceInputFileCitation
  | GatewayInferenceInputUrlCitation
  | GatewayInferenceInputFilePath;
export const GatewayInferenceInputAnnotationSchema: z.ZodType<GatewayInferenceInputAnnotation> =
  z.lazy(() =>
    z.union([
      GatewayInferenceInputFileCitationSchema,
      GatewayInferenceInputUrlCitationSchema,
      GatewayInferenceInputFilePathSchema,
    ]),
  );

/** Portkey FileCitation; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputFileCitationSchema.parse(value);`
 */
export type GatewayInferenceInputFileCitation = {
  type: 'file_citation';
  index: number;
  file_id: string;
};
export const GatewayInferenceInputFileCitationSchema: z.ZodType<GatewayInferenceInputFileCitation> =
  z.lazy(() =>
    z
      .object({
        type: z.literal('file_citation'),
        index: z.number().finite().int(),
        file_id: z.string(),
      })
      .strict(),
  );

/** Portkey UrlCitation; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputUrlCitationSchema.parse(value);`
 */
export type GatewayInferenceInputUrlCitation = {
  url: string;
  title: string;
  type: 'url_citation';
  start_index: number;
  end_index: number;
};
export const GatewayInferenceInputUrlCitationSchema: z.ZodType<GatewayInferenceInputUrlCitation> =
  z.lazy(() =>
    z
      .object({
        url: z.string(),
        title: z.string(),
        type: z.literal('url_citation'),
        start_index: z.number().finite().int(),
        end_index: z.number().finite().int(),
      })
      .strict(),
  );

/** Portkey FilePath; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputFilePathSchema.parse(value);`
 */
export type GatewayInferenceInputFilePath = { type: 'file_path'; file_id: string; index: number };
export const GatewayInferenceInputFilePathSchema: z.ZodType<GatewayInferenceInputFilePath> = z.lazy(
  () =>
    z
      .object({
        type: z.literal('file_path'),
        file_id: z.string(),
        index: z.number().finite().int(),
      })
      .strict(),
);

/** Portkey Refusal; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputRefusalSchema.parse(value);`
 */
export type GatewayInferenceInputRefusal = { type: 'refusal'; refusal: string };
export const GatewayInferenceInputRefusalSchema: z.ZodType<GatewayInferenceInputRefusal> = z.lazy(
  () => z.object({ type: z.literal('refusal'), refusal: z.string() }).strict(),
);

/** Portkey FileSearchToolCall; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputFileSearchToolCallSchema.parse(value);`
 */
export type GatewayInferenceInputFileSearchToolCall = {
  id: string;
  type: 'file_search_call';
  status: 'in_progress' | 'searching' | 'completed' | 'incomplete' | 'failed';
  queries: Array<string>;
  results?: Array<{
    file_id?: string;
    text?: string;
    filename?: string;
    attributes?: GatewayInferenceInputVectorStoreFileAttributes;
    score?: number;
  }> | null;
};
export const GatewayInferenceInputFileSearchToolCallSchema: z.ZodType<GatewayInferenceInputFileSearchToolCall> =
  z.lazy(() =>
    z
      .object({
        id: z.string(),
        type: z.literal('file_search_call'),
        status: z.union([
          z.literal('in_progress'),
          z.literal('searching'),
          z.literal('completed'),
          z.literal('incomplete'),
          z.literal('failed'),
        ]),
        queries: z.array(z.string()),
        results: z
          .array(
            z
              .object({
                file_id: z.string().optional(),
                text: z.string().optional(),
                filename: z.string().optional(),
                attributes: GatewayInferenceInputVectorStoreFileAttributesSchema.optional(),
                score: z.number().finite().optional(),
              })
              .strict(),
          )
          .nullable()
          .optional(),
      })
      .strict(),
  );

/** Portkey VectorStoreFileAttributes; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputVectorStoreFileAttributesSchema.parse(value);`
 */
export type GatewayInferenceInputVectorStoreFileAttributes = {
  [key: string]: string | number | boolean;
} | null;
export const GatewayInferenceInputVectorStoreFileAttributesSchema: z.ZodType<GatewayInferenceInputVectorStoreFileAttributes> =
  z.lazy(() =>
    z
      .object({})
      .catchall(z.union([z.string().max(512), z.number().finite(), z.boolean()]))
      .and(GatewayJsonObjectSchema)
      .nullable(),
  );

/** Portkey ComputerToolCall; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputComputerToolCallSchema.parse(value);`
 */
export type GatewayInferenceInputComputerToolCall = {
  type: 'computer_call';
  id: string;
  call_id: string;
  action: GatewayInferenceInputComputerAction;
  pending_safety_checks: Array<GatewayInferenceInputComputerToolCallSafetyCheck>;
  status: 'in_progress' | 'completed' | 'incomplete';
};
export const GatewayInferenceInputComputerToolCallSchema: z.ZodType<GatewayInferenceInputComputerToolCall> =
  z.lazy(() =>
    z
      .object({
        type: z.literal('computer_call'),
        id: z.string(),
        call_id: z.string(),
        action: GatewayInferenceInputComputerActionSchema,
        pending_safety_checks: z.array(GatewayInferenceInputComputerToolCallSafetyCheckSchema),
        status: z.union([
          z.literal('in_progress'),
          z.literal('completed'),
          z.literal('incomplete'),
        ]),
      })
      .strict(),
  );

/** Portkey ComputerAction; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputComputerActionSchema.parse(value);`
 */
export type GatewayInferenceInputComputerAction =
  | GatewayInferenceInputClick
  | GatewayInferenceInputDoubleClick
  | GatewayInferenceInputDrag
  | GatewayInferenceInputKeyPress
  | GatewayInferenceInputMove
  | GatewayInferenceInputScreenshot
  | GatewayInferenceInputScroll
  | GatewayInferenceInputType
  | GatewayInferenceInputWait;
export const GatewayInferenceInputComputerActionSchema: z.ZodType<GatewayInferenceInputComputerAction> =
  z.lazy(() =>
    z.union([
      GatewayInferenceInputClickSchema,
      GatewayInferenceInputDoubleClickSchema,
      GatewayInferenceInputDragSchema,
      GatewayInferenceInputKeyPressSchema,
      GatewayInferenceInputMoveSchema,
      GatewayInferenceInputScreenshotSchema,
      GatewayInferenceInputScrollSchema,
      GatewayInferenceInputTypeSchema,
      GatewayInferenceInputWaitSchema,
    ]),
  );

/** Portkey Click; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputClickSchema.parse(value);`
 */
export type GatewayInferenceInputClick = {
  type: 'click';
  button: 'left' | 'right' | 'wheel' | 'back' | 'forward';
  x: number;
  y: number;
};
export const GatewayInferenceInputClickSchema: z.ZodType<GatewayInferenceInputClick> = z.lazy(() =>
  z
    .object({
      type: z.literal('click'),
      button: z.union([
        z.literal('left'),
        z.literal('right'),
        z.literal('wheel'),
        z.literal('back'),
        z.literal('forward'),
      ]),
      x: z.number().finite().int(),
      y: z.number().finite().int(),
    })
    .strict(),
);

/** Portkey DoubleClick; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputDoubleClickSchema.parse(value);`
 */
export type GatewayInferenceInputDoubleClick = { type: 'double_click'; x: number; y: number };
export const GatewayInferenceInputDoubleClickSchema: z.ZodType<GatewayInferenceInputDoubleClick> =
  z.lazy(() =>
    z
      .object({
        type: z.literal('double_click'),
        x: z.number().finite().int(),
        y: z.number().finite().int(),
      })
      .strict(),
  );

/** Portkey Drag; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputDragSchema.parse(value);`
 */
export type GatewayInferenceInputDrag = {
  type: 'drag';
  path: Array<GatewayInferenceInputCoordinate>;
};
export const GatewayInferenceInputDragSchema: z.ZodType<GatewayInferenceInputDrag> = z.lazy(() =>
  z
    .object({ type: z.literal('drag'), path: z.array(GatewayInferenceInputCoordinateSchema) })
    .strict(),
);

/** Portkey Coordinate; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputCoordinateSchema.parse(value);`
 */
export type GatewayInferenceInputCoordinate = { x: number; y: number };
export const GatewayInferenceInputCoordinateSchema: z.ZodType<GatewayInferenceInputCoordinate> =
  z.lazy(() => z.object({ x: z.number().finite().int(), y: z.number().finite().int() }).strict());

/** Portkey KeyPress; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputKeyPressSchema.parse(value);`
 */
export type GatewayInferenceInputKeyPress = { type: 'keypress'; keys: Array<string> };
export const GatewayInferenceInputKeyPressSchema: z.ZodType<GatewayInferenceInputKeyPress> = z.lazy(
  () => z.object({ type: z.literal('keypress'), keys: z.array(z.string()) }).strict(),
);

/** Portkey Move; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputMoveSchema.parse(value);`
 */
export type GatewayInferenceInputMove = { type: 'move'; x: number; y: number };
export const GatewayInferenceInputMoveSchema: z.ZodType<GatewayInferenceInputMove> = z.lazy(() =>
  z
    .object({ type: z.literal('move'), x: z.number().finite().int(), y: z.number().finite().int() })
    .strict(),
);

/** Portkey Screenshot; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputScreenshotSchema.parse(value);`
 */
export type GatewayInferenceInputScreenshot = { type: 'screenshot' };
export const GatewayInferenceInputScreenshotSchema: z.ZodType<GatewayInferenceInputScreenshot> =
  z.lazy(() => z.object({ type: z.literal('screenshot') }).strict());

/** Portkey Scroll; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputScrollSchema.parse(value);`
 */
export type GatewayInferenceInputScroll = {
  type: 'scroll';
  x: number;
  y: number;
  scroll_x: number;
  scroll_y: number;
};
export const GatewayInferenceInputScrollSchema: z.ZodType<GatewayInferenceInputScroll> = z.lazy(
  () =>
    z
      .object({
        type: z.literal('scroll'),
        x: z.number().finite().int(),
        y: z.number().finite().int(),
        scroll_x: z.number().finite().int(),
        scroll_y: z.number().finite().int(),
      })
      .strict(),
);

/** Portkey Type; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputTypeSchema.parse(value);`
 */
export type GatewayInferenceInputType = { type: 'type'; text: string };
export const GatewayInferenceInputTypeSchema: z.ZodType<GatewayInferenceInputType> = z.lazy(() =>
  z.object({ type: z.literal('type'), text: z.string() }).strict(),
);

/** Portkey Wait; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputWaitSchema.parse(value);`
 */
export type GatewayInferenceInputWait = { type: 'wait' };
export const GatewayInferenceInputWaitSchema: z.ZodType<GatewayInferenceInputWait> = z.lazy(() =>
  z.object({ type: z.literal('wait') }).strict(),
);

/** Portkey ComputerToolCallSafetyCheck; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputComputerToolCallSafetyCheckSchema.parse(value);`
 */
export type GatewayInferenceInputComputerToolCallSafetyCheck = {
  id: string;
  code: string;
  message: string;
};
export const GatewayInferenceInputComputerToolCallSafetyCheckSchema: z.ZodType<GatewayInferenceInputComputerToolCallSafetyCheck> =
  z.lazy(() => z.object({ id: z.string(), code: z.string(), message: z.string() }).strict());

/** Portkey ComputerToolCallOutput; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputComputerToolCallOutputSchema.parse(value);`
 */
export type GatewayInferenceInputComputerToolCallOutput = {
  type: 'computer_call_output';
  id?: string;
  call_id: string;
  acknowledged_safety_checks?: Array<GatewayInferenceInputComputerToolCallSafetyCheck>;
  output: GatewayInferenceInputComputerScreenshotImage;
  status?: 'in_progress' | 'completed' | 'incomplete';
};
export const GatewayInferenceInputComputerToolCallOutputSchema: z.ZodType<GatewayInferenceInputComputerToolCallOutput> =
  z.lazy(() =>
    z
      .object({
        type: z.literal('computer_call_output'),
        id: z.string().optional(),
        call_id: z.string(),
        acknowledged_safety_checks: z
          .array(GatewayInferenceInputComputerToolCallSafetyCheckSchema)
          .optional(),
        output: GatewayInferenceInputComputerScreenshotImageSchema,
        status: z
          .union([z.literal('in_progress'), z.literal('completed'), z.literal('incomplete')])
          .optional(),
      })
      .strict(),
  );

/** Portkey ComputerScreenshotImage; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputComputerScreenshotImageSchema.parse(value);`
 */
export type GatewayInferenceInputComputerScreenshotImage = {
  type: 'computer_screenshot';
  image_url?: string;
  file_id?: string;
};
export const GatewayInferenceInputComputerScreenshotImageSchema: z.ZodType<GatewayInferenceInputComputerScreenshotImage> =
  z.lazy(() =>
    z
      .object({
        type: z.literal('computer_screenshot'),
        image_url: z.string().optional(),
        file_id: z.string().optional(),
      })
      .strict(),
  );

/** Portkey WebSearchToolCall; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputWebSearchToolCallSchema.parse(value);`
 */
export type GatewayInferenceInputWebSearchToolCall = {
  id: string;
  type: 'web_search_call';
  status: 'in_progress' | 'searching' | 'completed' | 'failed';
};
export const GatewayInferenceInputWebSearchToolCallSchema: z.ZodType<GatewayInferenceInputWebSearchToolCall> =
  z.lazy(() =>
    z
      .object({
        id: z.string(),
        type: z.literal('web_search_call'),
        status: z.union([
          z.literal('in_progress'),
          z.literal('searching'),
          z.literal('completed'),
          z.literal('failed'),
        ]),
      })
      .strict(),
  );

/** Portkey FunctionToolCall; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputFunctionToolCallSchema.parse(value);`
 */
export type GatewayInferenceInputFunctionToolCall = {
  id?: string;
  type: 'function_call';
  call_id: string;
  name: string;
  arguments: string;
  status?: 'in_progress' | 'completed' | 'incomplete';
};
export const GatewayInferenceInputFunctionToolCallSchema: z.ZodType<GatewayInferenceInputFunctionToolCall> =
  z.lazy(() =>
    z
      .object({
        id: z.string().optional(),
        type: z.literal('function_call'),
        call_id: z.string(),
        name: z.string(),
        arguments: z.string(),
        status: z
          .union([z.literal('in_progress'), z.literal('completed'), z.literal('incomplete')])
          .optional(),
      })
      .strict(),
  );

/** Portkey FunctionToolCallOutput; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputFunctionToolCallOutputSchema.parse(value);`
 */
export type GatewayInferenceInputFunctionToolCallOutput = {
  id?: string;
  type: 'function_call_output';
  call_id: string;
  output: string;
  status?: 'in_progress' | 'completed' | 'incomplete';
};
export const GatewayInferenceInputFunctionToolCallOutputSchema: z.ZodType<GatewayInferenceInputFunctionToolCallOutput> =
  z.lazy(() =>
    z
      .object({
        id: z.string().optional(),
        type: z.literal('function_call_output'),
        call_id: z.string(),
        output: z.string(),
        status: z
          .union([z.literal('in_progress'), z.literal('completed'), z.literal('incomplete')])
          .optional(),
      })
      .strict(),
  );

/** Portkey ReasoningItem; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputReasoningItemSchema.parse(value);`
 */
export type GatewayInferenceInputReasoningItem = {
  type: 'reasoning';
  id: string;
  summary: Array<{ type: 'summary_text'; text: string }>;
  status?: 'in_progress' | 'completed' | 'incomplete';
};
export const GatewayInferenceInputReasoningItemSchema: z.ZodType<GatewayInferenceInputReasoningItem> =
  z.lazy(() =>
    z
      .object({
        type: z.literal('reasoning'),
        id: z.string(),
        summary: z.array(z.object({ type: z.literal('summary_text'), text: z.string() }).strict()),
        status: z
          .union([z.literal('in_progress'), z.literal('completed'), z.literal('incomplete')])
          .optional(),
      })
      .strict(),
  );

/** Portkey ItemReference; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputItemReferenceSchema.parse(value);`
 */
export type GatewayInferenceInputItemReference = { id: string; type: 'item_reference' };
export const GatewayInferenceInputItemReferenceSchema: z.ZodType<GatewayInferenceInputItemReference> =
  z.lazy(() => z.object({ id: z.string(), type: z.literal('item_reference') }).strict());

/** Portkey Includable; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputIncludableSchema.parse(value);`
 */
export type GatewayInferenceInputIncludable =
  | 'file_search_call.results'
  | 'message.input_image.image_url'
  | 'computer_call_output.output.image_url';
export const GatewayInferenceInputIncludableSchema: z.ZodType<GatewayInferenceInputIncludable> =
  z.lazy(() =>
    z.union([
      z.literal('file_search_call.results'),
      z.literal('message.input_image.image_url'),
      z.literal('computer_call_output.output.image_url'),
    ]),
  );

/** Portkey Response; additive response fields are preserved.
 * @example `GatewayInferenceResponseSchema.parse(value);`
 */
export type GatewayInferenceResponse = {
  metadata: GatewayInferenceMetadata;
  temperature: number | null;
  top_p: number | null;
  user?: string | null;
  previous_response_id?: string | null;
  model: GatewayInferenceModelIdsResponses;
  reasoning?: GatewayInferenceReasoning | null;
  max_output_tokens?: number | null;
  instructions: string | null;
  text?: { format?: GatewayInferenceTextResponseFormatConfiguration; [key: string]: unknown };
  tools: Array<GatewayInferenceTool>;
  tool_choice:
    | GatewayInferenceToolChoiceOptions
    | GatewayInferenceToolChoiceTypes
    | GatewayInferenceToolChoiceFunction;
  truncation?: ('auto' | 'disabled') | null;
  id: string;
  object: 'response';
  status?: 'completed' | 'failed' | 'in_progress' | 'incomplete';
  created_at: number;
  error: GatewayInferenceResponseError;
  incomplete_details: {
    reason?: 'max_output_tokens' | 'content_filter';
    [key: string]: unknown;
  } | null;
  output: Array<GatewayInferenceOutputItem>;
  output_text?: string | null;
  usage?: GatewayInferenceResponseUsage;
  parallel_tool_calls: boolean;
  [key: string]: unknown;
};
export const GatewayInferenceResponseSchema: z.ZodType<GatewayInferenceResponse> = z.lazy(() =>
  z
    .object({
      metadata: GatewayInferenceMetadataSchema,
      temperature: z.number().finite().min(0).max(2).nullable(),
      top_p: z.number().finite().min(0).max(1).nullable(),
      user: z.string().nullable().optional(),
      previous_response_id: z.string().nullable().optional(),
      model: GatewayInferenceModelIdsResponsesSchema,
      reasoning: GatewayInferenceReasoningSchema.nullable().optional(),
      max_output_tokens: z.number().finite().int().nullable().optional(),
      instructions: z.string().nullable(),
      text: z
        .object({ format: GatewayInferenceTextResponseFormatConfigurationSchema.optional() })
        .passthrough()
        .optional(),
      tools: z.array(GatewayInferenceToolSchema),
      tool_choice: z.union([
        GatewayInferenceToolChoiceOptionsSchema,
        GatewayInferenceToolChoiceTypesSchema,
        GatewayInferenceToolChoiceFunctionSchema,
      ]),
      truncation: z
        .union([z.literal('auto'), z.literal('disabled')])
        .nullable()
        .optional(),
      id: z.string(),
      object: z.literal('response'),
      status: z
        .union([
          z.literal('completed'),
          z.literal('failed'),
          z.literal('in_progress'),
          z.literal('incomplete'),
        ])
        .optional(),
      created_at: z.number().finite(),
      error: GatewayInferenceResponseErrorSchema,
      incomplete_details: z
        .object({
          reason: z.union([z.literal('max_output_tokens'), z.literal('content_filter')]).optional(),
        })
        .passthrough()
        .nullable(),
      output: z.array(GatewayInferenceOutputItemSchema),
      output_text: z.string().nullable().optional(),
      usage: GatewayInferenceResponseUsageSchema.optional(),
      parallel_tool_calls: z.boolean(),
    })
    .passthrough(),
);

/** Portkey Metadata; additive response fields are preserved.
 * @example `GatewayInferenceMetadataSchema.parse(value);`
 */
export type GatewayInferenceMetadata = { [key: string]: unknown } | null;
export const GatewayInferenceMetadataSchema: z.ZodType<GatewayInferenceMetadata> = z.lazy(() =>
  z.object({}).passthrough().nullable(),
);

/** Portkey ModelIdsResponses; additive response fields are preserved.
 * @example `GatewayInferenceModelIdsResponsesSchema.parse(value);`
 */
export type GatewayInferenceModelIdsResponses = string;
export const GatewayInferenceModelIdsResponsesSchema: z.ZodType<GatewayInferenceModelIdsResponses> =
  z.lazy(() => z.string().min(1));

/** Portkey Reasoning; additive response fields are preserved.
 * @example `GatewayInferenceReasoningSchema.parse(value);`
 */
export type GatewayInferenceReasoning = {
  effort?: GatewayInferenceReasoningEffort;
  generate_summary?: ('concise' | 'detailed') | null;
  [key: string]: unknown;
};
export const GatewayInferenceReasoningSchema: z.ZodType<GatewayInferenceReasoning> = z.lazy(() =>
  z
    .object({
      effort: GatewayInferenceReasoningEffortSchema.optional(),
      generate_summary: z
        .union([z.literal('concise'), z.literal('detailed')])
        .nullable()
        .optional(),
    })
    .passthrough(),
);

/** Portkey ReasoningEffort; additive response fields are preserved.
 * @example `GatewayInferenceReasoningEffortSchema.parse(value);`
 */
export type GatewayInferenceReasoningEffort = ('low' | 'medium' | 'high') | null;
export const GatewayInferenceReasoningEffortSchema: z.ZodType<GatewayInferenceReasoningEffort> =
  z.lazy(() => z.union([z.literal('low'), z.literal('medium'), z.literal('high')]).nullable());

/** Portkey TextResponseFormatConfiguration; additive response fields are preserved.
 * @example `GatewayInferenceTextResponseFormatConfigurationSchema.parse(value);`
 */
export type GatewayInferenceTextResponseFormatConfiguration =
  | GatewayInferenceResponseFormatText
  | GatewayInferenceTextResponseFormatJsonSchema
  | GatewayInferenceResponseFormatJsonObject;
export const GatewayInferenceTextResponseFormatConfigurationSchema: z.ZodType<GatewayInferenceTextResponseFormatConfiguration> =
  z.lazy(() =>
    z.union([
      GatewayInferenceResponseFormatTextSchema,
      GatewayInferenceTextResponseFormatJsonSchemaSchema,
      GatewayInferenceResponseFormatJsonObjectSchema,
    ]),
  );

/** Portkey TextResponseFormatJsonSchema; additive response fields are preserved.
 * @example `GatewayInferenceTextResponseFormatJsonSchemaSchema.parse(value);`
 */
export type GatewayInferenceTextResponseFormatJsonSchema = {
  type: 'json_schema';
  description?: string;
  name?: string;
  schema: GatewayInferenceResponseFormatJsonSchemaSchema;
  strict?: boolean | null;
  [key: string]: unknown;
};
export const GatewayInferenceTextResponseFormatJsonSchemaSchema: z.ZodType<GatewayInferenceTextResponseFormatJsonSchema> =
  z.lazy(() =>
    z
      .object({
        type: z.literal('json_schema'),
        description: z.string().optional(),
        name: z.string().optional(),
        schema: GatewayInferenceResponseFormatJsonSchemaSchemaSchema,
        strict: z.boolean().nullable().optional(),
      })
      .passthrough(),
  );

/** Portkey Tool; additive response fields are preserved.
 * @example `GatewayInferenceToolSchema.parse(value);`
 */
export type GatewayInferenceTool =
  | GatewayInferenceFileSearchTool
  | GatewayInferenceFunctionTool
  | GatewayInferenceComputerTool
  | GatewayInferenceWebSearchTool;
export const GatewayInferenceToolSchema: z.ZodType<GatewayInferenceTool> = z.lazy(() =>
  z.union([
    GatewayInferenceFileSearchToolSchema,
    GatewayInferenceFunctionToolSchema,
    GatewayInferenceComputerToolSchema,
    GatewayInferenceWebSearchToolSchema,
  ]),
);

/** Portkey FileSearchTool; additive response fields are preserved.
 * @example `GatewayInferenceFileSearchToolSchema.parse(value);`
 */
export type GatewayInferenceFileSearchTool = {
  type: 'file_search';
  vector_store_ids: Array<string>;
  max_num_results?: number;
  filters?: GatewayInferenceComparisonFilter | GatewayInferenceCompoundFilter;
  ranking_options?: {
    ranker?: 'auto' | 'default-2024-11-15';
    score_threshold?: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};
export const GatewayInferenceFileSearchToolSchema: z.ZodType<GatewayInferenceFileSearchTool> =
  z.lazy(() =>
    z
      .object({
        type: z.literal('file_search'),
        vector_store_ids: z.array(z.string()),
        max_num_results: z.number().finite().int().optional(),
        filters: z
          .union([GatewayInferenceComparisonFilterSchema, GatewayInferenceCompoundFilterSchema])
          .optional(),
        ranking_options: z
          .object({
            ranker: z.union([z.literal('auto'), z.literal('default-2024-11-15')]).optional(),
            score_threshold: z.number().finite().min(0).max(1).optional(),
          })
          .passthrough()
          .optional(),
      })
      .passthrough(),
  );

/** Portkey ComparisonFilter; additive response fields are preserved.
 * @example `GatewayInferenceComparisonFilterSchema.parse(value);`
 */
export type GatewayInferenceComparisonFilter = {
  type: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte';
  key: string;
  value: string | number | boolean;
  [key: string]: unknown;
};
export const GatewayInferenceComparisonFilterSchema: z.ZodType<GatewayInferenceComparisonFilter> =
  z.lazy(() =>
    z
      .object({
        type: z.union([
          z.literal('eq'),
          z.literal('ne'),
          z.literal('gt'),
          z.literal('gte'),
          z.literal('lt'),
          z.literal('lte'),
        ]),
        key: z.string(),
        value: z.union([z.string(), z.number().finite(), z.boolean()]),
      })
      .passthrough(),
  );

/** Portkey CompoundFilter; additive response fields are preserved.
 * @example `GatewayInferenceCompoundFilterSchema.parse(value);`
 */
export type GatewayInferenceCompoundFilter = {
  type: 'and' | 'or';
  filters: Array<GatewayInferenceComparisonFilter | { [key: string]: unknown }>;
  [key: string]: unknown;
};
export const GatewayInferenceCompoundFilterSchema: z.ZodType<GatewayInferenceCompoundFilter> =
  z.lazy(() =>
    z
      .object({
        type: z.union([z.literal('and'), z.literal('or')]),
        filters: z.array(
          z.union([GatewayInferenceComparisonFilterSchema, z.object({}).passthrough()]),
        ),
      })
      .passthrough(),
  );

/** Portkey FunctionTool; additive response fields are preserved.
 * @example `GatewayInferenceFunctionToolSchema.parse(value);`
 */
export type GatewayInferenceFunctionTool = {
  type: 'function';
  name: string;
  description?: string | null;
  parameters: { [key: string]: unknown };
  strict: boolean;
  [key: string]: unknown;
};
export const GatewayInferenceFunctionToolSchema: z.ZodType<GatewayInferenceFunctionTool> = z.lazy(
  () =>
    z
      .object({
        type: z.literal('function'),
        name: z.string(),
        description: z.string().nullable().optional(),
        parameters: z.object({}).passthrough(),
        strict: z.boolean(),
      })
      .passthrough(),
);

/** Portkey ComputerTool; additive response fields are preserved.
 * @example `GatewayInferenceComputerToolSchema.parse(value);`
 */
export type GatewayInferenceComputerTool = {
  type: 'computer_use_preview';
  display_width: number;
  display_height: number;
  environment: 'mac' | 'windows' | 'ubuntu' | 'browser';
  [key: string]: unknown;
};
export const GatewayInferenceComputerToolSchema: z.ZodType<GatewayInferenceComputerTool> = z.lazy(
  () =>
    z
      .object({
        type: z.literal('computer_use_preview'),
        display_width: z.number().finite(),
        display_height: z.number().finite(),
        environment: z.union([
          z.literal('mac'),
          z.literal('windows'),
          z.literal('ubuntu'),
          z.literal('browser'),
        ]),
      })
      .passthrough(),
);

/** Portkey WebSearchTool; additive response fields are preserved.
 * @example `GatewayInferenceWebSearchToolSchema.parse(value);`
 */
export type GatewayInferenceWebSearchTool = {
  type: 'web_search_preview' | 'web_search_preview_2025_03_11';
  user_location?: {
    country?: string;
    region?: string;
    city?: string;
    timezone?: string;
    type: 'approximate';
    [key: string]: unknown;
  } | null;
  search_context_size?: GatewayInferenceWebSearchContextSize;
  [key: string]: unknown;
};
export const GatewayInferenceWebSearchToolSchema: z.ZodType<GatewayInferenceWebSearchTool> = z.lazy(
  () =>
    z
      .object({
        type: z.union([
          z.literal('web_search_preview'),
          z.literal('web_search_preview_2025_03_11'),
        ]),
        user_location: z
          .object({
            country: z.string().optional(),
            region: z.string().optional(),
            city: z.string().optional(),
            timezone: z.string().optional(),
            type: z.literal('approximate'),
          })
          .passthrough()
          .nullable()
          .optional(),
        search_context_size: GatewayInferenceWebSearchContextSizeSchema.optional(),
      })
      .passthrough(),
);

/** Portkey WebSearchContextSize; additive response fields are preserved.
 * @example `GatewayInferenceWebSearchContextSizeSchema.parse(value);`
 */
export type GatewayInferenceWebSearchContextSize = 'low' | 'medium' | 'high';
export const GatewayInferenceWebSearchContextSizeSchema: z.ZodType<GatewayInferenceWebSearchContextSize> =
  z.lazy(() => z.union([z.literal('low'), z.literal('medium'), z.literal('high')]));

/** Portkey ToolChoiceOptions; additive response fields are preserved.
 * @example `GatewayInferenceToolChoiceOptionsSchema.parse(value);`
 */
export type GatewayInferenceToolChoiceOptions = 'none' | 'auto' | 'required';
export const GatewayInferenceToolChoiceOptionsSchema: z.ZodType<GatewayInferenceToolChoiceOptions> =
  z.lazy(() => z.union([z.literal('none'), z.literal('auto'), z.literal('required')]));

/** Portkey ToolChoiceTypes; additive response fields are preserved.
 * @example `GatewayInferenceToolChoiceTypesSchema.parse(value);`
 */
export type GatewayInferenceToolChoiceTypes = {
  type:
    | 'file_search'
    | 'web_search_preview'
    | 'computer_use_preview'
    | 'web_search_preview_2025_03_11';
  [key: string]: unknown;
};
export const GatewayInferenceToolChoiceTypesSchema: z.ZodType<GatewayInferenceToolChoiceTypes> =
  z.lazy(() =>
    z
      .object({
        type: z.union([
          z.literal('file_search'),
          z.literal('web_search_preview'),
          z.literal('computer_use_preview'),
          z.literal('web_search_preview_2025_03_11'),
        ]),
      })
      .passthrough(),
  );

/** Portkey ToolChoiceFunction; additive response fields are preserved.
 * @example `GatewayInferenceToolChoiceFunctionSchema.parse(value);`
 */
export type GatewayInferenceToolChoiceFunction = {
  type: 'function';
  name: string;
  [key: string]: unknown;
};
export const GatewayInferenceToolChoiceFunctionSchema: z.ZodType<GatewayInferenceToolChoiceFunction> =
  z.lazy(() => z.object({ type: z.literal('function'), name: z.string() }).passthrough());

/** Portkey ResponseError; additive response fields are preserved.
 * @example `GatewayInferenceResponseErrorSchema.parse(value);`
 */
export type GatewayInferenceResponseError = {
  code: GatewayInferenceResponseErrorCode;
  message: string;
  [key: string]: unknown;
} | null;
export const GatewayInferenceResponseErrorSchema: z.ZodType<GatewayInferenceResponseError> = z.lazy(
  () =>
    z
      .object({ code: GatewayInferenceResponseErrorCodeSchema, message: z.string() })
      .passthrough()
      .nullable(),
);

/** Portkey ResponseErrorCode; additive response fields are preserved.
 * @example `GatewayInferenceResponseErrorCodeSchema.parse(value);`
 */
export type GatewayInferenceResponseErrorCode =
  | 'server_error'
  | 'rate_limit_exceeded'
  | 'invalid_prompt'
  | 'vector_store_timeout'
  | 'invalid_image'
  | 'invalid_image_format'
  | 'invalid_base64_image'
  | 'invalid_image_url'
  | 'image_too_large'
  | 'image_too_small'
  | 'image_parse_error'
  | 'image_content_policy_violation'
  | 'invalid_image_mode'
  | 'image_file_too_large'
  | 'unsupported_image_media_type'
  | 'empty_image_file'
  | 'failed_to_download_image'
  | 'image_file_not_found';
export const GatewayInferenceResponseErrorCodeSchema: z.ZodType<GatewayInferenceResponseErrorCode> =
  z.lazy(() =>
    z.union([
      z.literal('server_error'),
      z.literal('rate_limit_exceeded'),
      z.literal('invalid_prompt'),
      z.literal('vector_store_timeout'),
      z.literal('invalid_image'),
      z.literal('invalid_image_format'),
      z.literal('invalid_base64_image'),
      z.literal('invalid_image_url'),
      z.literal('image_too_large'),
      z.literal('image_too_small'),
      z.literal('image_parse_error'),
      z.literal('image_content_policy_violation'),
      z.literal('invalid_image_mode'),
      z.literal('image_file_too_large'),
      z.literal('unsupported_image_media_type'),
      z.literal('empty_image_file'),
      z.literal('failed_to_download_image'),
      z.literal('image_file_not_found'),
    ]),
  );

/** Portkey OutputItem; additive response fields are preserved.
 * @example `GatewayInferenceOutputItemSchema.parse(value);`
 */
export type GatewayInferenceOutputItem =
  | GatewayInferenceOutputMessage
  | GatewayInferenceFileSearchToolCall
  | GatewayInferenceFunctionToolCall
  | GatewayInferenceWebSearchToolCall
  | GatewayInferenceComputerToolCall
  | GatewayInferenceReasoningItem;
export const GatewayInferenceOutputItemSchema: z.ZodType<GatewayInferenceOutputItem> = z.lazy(() =>
  z.union([
    GatewayInferenceOutputMessageSchema,
    GatewayInferenceFileSearchToolCallSchema,
    GatewayInferenceFunctionToolCallSchema,
    GatewayInferenceWebSearchToolCallSchema,
    GatewayInferenceComputerToolCallSchema,
    GatewayInferenceReasoningItemSchema,
  ]),
);

/** Portkey OutputMessage; additive response fields are preserved.
 * @example `GatewayInferenceOutputMessageSchema.parse(value);`
 */
export type GatewayInferenceOutputMessage = {
  id: string;
  type: 'message';
  role: 'assistant';
  content: Array<GatewayInferenceOutputContent>;
  status: 'in_progress' | 'completed' | 'incomplete';
  [key: string]: unknown;
};
export const GatewayInferenceOutputMessageSchema: z.ZodType<GatewayInferenceOutputMessage> = z.lazy(
  () =>
    z
      .object({
        id: z.string(),
        type: z.literal('message'),
        role: z.literal('assistant'),
        content: z.array(GatewayInferenceOutputContentSchema),
        status: z.union([
          z.literal('in_progress'),
          z.literal('completed'),
          z.literal('incomplete'),
        ]),
      })
      .passthrough(),
);

/** Portkey OutputContent; additive response fields are preserved.
 * @example `GatewayInferenceOutputContentSchema.parse(value);`
 */
export type GatewayInferenceOutputContent = GatewayInferenceOutputText | GatewayInferenceRefusal;
export const GatewayInferenceOutputContentSchema: z.ZodType<GatewayInferenceOutputContent> = z.lazy(
  () => z.union([GatewayInferenceOutputTextSchema, GatewayInferenceRefusalSchema]),
);

/** Portkey OutputText; additive response fields are preserved.
 * @example `GatewayInferenceOutputTextSchema.parse(value);`
 */
export type GatewayInferenceOutputText = {
  type: 'output_text';
  text: string;
  annotations: Array<GatewayInferenceAnnotation>;
  [key: string]: unknown;
};
export const GatewayInferenceOutputTextSchema: z.ZodType<GatewayInferenceOutputText> = z.lazy(() =>
  z
    .object({
      type: z.literal('output_text'),
      text: z.string(),
      annotations: z.array(GatewayInferenceAnnotationSchema),
    })
    .passthrough(),
);

/** Portkey Annotation; additive response fields are preserved.
 * @example `GatewayInferenceAnnotationSchema.parse(value);`
 */
export type GatewayInferenceAnnotation =
  | GatewayInferenceFileCitation
  | GatewayInferenceUrlCitation
  | GatewayInferenceFilePath;
export const GatewayInferenceAnnotationSchema: z.ZodType<GatewayInferenceAnnotation> = z.lazy(() =>
  z.union([
    GatewayInferenceFileCitationSchema,
    GatewayInferenceUrlCitationSchema,
    GatewayInferenceFilePathSchema,
  ]),
);

/** Portkey FileCitation; additive response fields are preserved.
 * @example `GatewayInferenceFileCitationSchema.parse(value);`
 */
export type GatewayInferenceFileCitation = {
  type: 'file_citation';
  index: number;
  file_id: string;
  [key: string]: unknown;
};
export const GatewayInferenceFileCitationSchema: z.ZodType<GatewayInferenceFileCitation> = z.lazy(
  () =>
    z
      .object({
        type: z.literal('file_citation'),
        index: z.number().finite().int(),
        file_id: z.string(),
      })
      .passthrough(),
);

/** Portkey UrlCitation; additive response fields are preserved.
 * @example `GatewayInferenceUrlCitationSchema.parse(value);`
 */
export type GatewayInferenceUrlCitation = {
  url: string;
  title: string;
  type: 'url_citation';
  start_index: number;
  end_index: number;
  [key: string]: unknown;
};
export const GatewayInferenceUrlCitationSchema: z.ZodType<GatewayInferenceUrlCitation> = z.lazy(
  () =>
    z
      .object({
        url: z.string(),
        title: z.string(),
        type: z.literal('url_citation'),
        start_index: z.number().finite().int(),
        end_index: z.number().finite().int(),
      })
      .passthrough(),
);

/** Portkey FilePath; additive response fields are preserved.
 * @example `GatewayInferenceFilePathSchema.parse(value);`
 */
export type GatewayInferenceFilePath = {
  type: 'file_path';
  file_id: string;
  index: number;
  [key: string]: unknown;
};
export const GatewayInferenceFilePathSchema: z.ZodType<GatewayInferenceFilePath> = z.lazy(() =>
  z
    .object({ type: z.literal('file_path'), file_id: z.string(), index: z.number().finite().int() })
    .passthrough(),
);

/** Portkey Refusal; additive response fields are preserved.
 * @example `GatewayInferenceRefusalSchema.parse(value);`
 */
export type GatewayInferenceRefusal = { type: 'refusal'; refusal: string; [key: string]: unknown };
export const GatewayInferenceRefusalSchema: z.ZodType<GatewayInferenceRefusal> = z.lazy(() =>
  z.object({ type: z.literal('refusal'), refusal: z.string() }).passthrough(),
);

/** Portkey FileSearchToolCall; additive response fields are preserved.
 * @example `GatewayInferenceFileSearchToolCallSchema.parse(value);`
 */
export type GatewayInferenceFileSearchToolCall = {
  id: string;
  type: 'file_search_call';
  status: 'in_progress' | 'searching' | 'completed' | 'incomplete' | 'failed';
  queries: Array<string>;
  results?: Array<{
    file_id?: string;
    text?: string;
    filename?: string;
    attributes?: GatewayInferenceVectorStoreFileAttributes;
    score?: number;
    [key: string]: unknown;
  }> | null;
  [key: string]: unknown;
};
export const GatewayInferenceFileSearchToolCallSchema: z.ZodType<GatewayInferenceFileSearchToolCall> =
  z.lazy(() =>
    z
      .object({
        id: z.string(),
        type: z.literal('file_search_call'),
        status: z.union([
          z.literal('in_progress'),
          z.literal('searching'),
          z.literal('completed'),
          z.literal('incomplete'),
          z.literal('failed'),
        ]),
        queries: z.array(z.string()),
        results: z
          .array(
            z
              .object({
                file_id: z.string().optional(),
                text: z.string().optional(),
                filename: z.string().optional(),
                attributes: GatewayInferenceVectorStoreFileAttributesSchema.optional(),
                score: z.number().finite().optional(),
              })
              .passthrough(),
          )
          .nullable()
          .optional(),
      })
      .passthrough(),
  );

/** Portkey VectorStoreFileAttributes; additive response fields are preserved.
 * @example `GatewayInferenceVectorStoreFileAttributesSchema.parse(value);`
 */
export type GatewayInferenceVectorStoreFileAttributes = { [key: string]: unknown } | null;
export const GatewayInferenceVectorStoreFileAttributesSchema: z.ZodType<GatewayInferenceVectorStoreFileAttributes> =
  z.lazy(() => z.object({}).passthrough().nullable());

/** Portkey FunctionToolCall; additive response fields are preserved.
 * @example `GatewayInferenceFunctionToolCallSchema.parse(value);`
 */
export type GatewayInferenceFunctionToolCall = {
  id?: string;
  type: 'function_call';
  call_id: string;
  name: string;
  arguments: string;
  status?: 'in_progress' | 'completed' | 'incomplete';
  [key: string]: unknown;
};
export const GatewayInferenceFunctionToolCallSchema: z.ZodType<GatewayInferenceFunctionToolCall> =
  z.lazy(() =>
    z
      .object({
        id: z.string().optional(),
        type: z.literal('function_call'),
        call_id: z.string(),
        name: z.string(),
        arguments: z.string(),
        status: z
          .union([z.literal('in_progress'), z.literal('completed'), z.literal('incomplete')])
          .optional(),
      })
      .passthrough(),
  );

/** Portkey WebSearchToolCall; additive response fields are preserved.
 * @example `GatewayInferenceWebSearchToolCallSchema.parse(value);`
 */
export type GatewayInferenceWebSearchToolCall = {
  id: string;
  type: 'web_search_call';
  status: 'in_progress' | 'searching' | 'completed' | 'failed';
  [key: string]: unknown;
};
export const GatewayInferenceWebSearchToolCallSchema: z.ZodType<GatewayInferenceWebSearchToolCall> =
  z.lazy(() =>
    z
      .object({
        id: z.string(),
        type: z.literal('web_search_call'),
        status: z.union([
          z.literal('in_progress'),
          z.literal('searching'),
          z.literal('completed'),
          z.literal('failed'),
        ]),
      })
      .passthrough(),
  );

/** Portkey ComputerToolCall; additive response fields are preserved.
 * @example `GatewayInferenceComputerToolCallSchema.parse(value);`
 */
export type GatewayInferenceComputerToolCall = {
  type: 'computer_call';
  id: string;
  call_id: string;
  action: GatewayInferenceComputerAction;
  pending_safety_checks: Array<GatewayInferenceComputerToolCallSafetyCheck>;
  status: 'in_progress' | 'completed' | 'incomplete';
  [key: string]: unknown;
};
export const GatewayInferenceComputerToolCallSchema: z.ZodType<GatewayInferenceComputerToolCall> =
  z.lazy(() =>
    z
      .object({
        type: z.literal('computer_call'),
        id: z.string(),
        call_id: z.string(),
        action: GatewayInferenceComputerActionSchema,
        pending_safety_checks: z.array(GatewayInferenceComputerToolCallSafetyCheckSchema),
        status: z.union([
          z.literal('in_progress'),
          z.literal('completed'),
          z.literal('incomplete'),
        ]),
      })
      .passthrough(),
  );

/** Portkey ComputerAction; additive response fields are preserved.
 * @example `GatewayInferenceComputerActionSchema.parse(value);`
 */
export type GatewayInferenceComputerAction =
  | GatewayInferenceClick
  | GatewayInferenceDoubleClick
  | GatewayInferenceDrag
  | GatewayInferenceKeyPress
  | GatewayInferenceMove
  | GatewayInferenceScreenshot
  | GatewayInferenceScroll
  | GatewayInferenceType
  | GatewayInferenceWait;
export const GatewayInferenceComputerActionSchema: z.ZodType<GatewayInferenceComputerAction> =
  z.lazy(() =>
    z.union([
      GatewayInferenceClickSchema,
      GatewayInferenceDoubleClickSchema,
      GatewayInferenceDragSchema,
      GatewayInferenceKeyPressSchema,
      GatewayInferenceMoveSchema,
      GatewayInferenceScreenshotSchema,
      GatewayInferenceScrollSchema,
      GatewayInferenceTypeSchema,
      GatewayInferenceWaitSchema,
    ]),
  );

/** Portkey Click; additive response fields are preserved.
 * @example `GatewayInferenceClickSchema.parse(value);`
 */
export type GatewayInferenceClick = {
  type: 'click';
  button: 'left' | 'right' | 'wheel' | 'back' | 'forward';
  x: number;
  y: number;
  [key: string]: unknown;
};
export const GatewayInferenceClickSchema: z.ZodType<GatewayInferenceClick> = z.lazy(() =>
  z
    .object({
      type: z.literal('click'),
      button: z.union([
        z.literal('left'),
        z.literal('right'),
        z.literal('wheel'),
        z.literal('back'),
        z.literal('forward'),
      ]),
      x: z.number().finite().int(),
      y: z.number().finite().int(),
    })
    .passthrough(),
);

/** Portkey DoubleClick; additive response fields are preserved.
 * @example `GatewayInferenceDoubleClickSchema.parse(value);`
 */
export type GatewayInferenceDoubleClick = {
  type: 'double_click';
  x: number;
  y: number;
  [key: string]: unknown;
};
export const GatewayInferenceDoubleClickSchema: z.ZodType<GatewayInferenceDoubleClick> = z.lazy(
  () =>
    z
      .object({
        type: z.literal('double_click'),
        x: z.number().finite().int(),
        y: z.number().finite().int(),
      })
      .passthrough(),
);

/** Portkey Drag; additive response fields are preserved.
 * @example `GatewayInferenceDragSchema.parse(value);`
 */
export type GatewayInferenceDrag = {
  type: 'drag';
  path: Array<GatewayInferenceCoordinate>;
  [key: string]: unknown;
};
export const GatewayInferenceDragSchema: z.ZodType<GatewayInferenceDrag> = z.lazy(() =>
  z
    .object({ type: z.literal('drag'), path: z.array(GatewayInferenceCoordinateSchema) })
    .passthrough(),
);

/** Portkey Coordinate; additive response fields are preserved.
 * @example `GatewayInferenceCoordinateSchema.parse(value);`
 */
export type GatewayInferenceCoordinate = { x: number; y: number; [key: string]: unknown };
export const GatewayInferenceCoordinateSchema: z.ZodType<GatewayInferenceCoordinate> = z.lazy(() =>
  z.object({ x: z.number().finite().int(), y: z.number().finite().int() }).passthrough(),
);

/** Portkey KeyPress; additive response fields are preserved.
 * @example `GatewayInferenceKeyPressSchema.parse(value);`
 */
export type GatewayInferenceKeyPress = {
  type: 'keypress';
  keys: Array<string>;
  [key: string]: unknown;
};
export const GatewayInferenceKeyPressSchema: z.ZodType<GatewayInferenceKeyPress> = z.lazy(() =>
  z.object({ type: z.literal('keypress'), keys: z.array(z.string()) }).passthrough(),
);

/** Portkey Move; additive response fields are preserved.
 * @example `GatewayInferenceMoveSchema.parse(value);`
 */
export type GatewayInferenceMove = { type: 'move'; x: number; y: number; [key: string]: unknown };
export const GatewayInferenceMoveSchema: z.ZodType<GatewayInferenceMove> = z.lazy(() =>
  z
    .object({ type: z.literal('move'), x: z.number().finite().int(), y: z.number().finite().int() })
    .passthrough(),
);

/** Portkey Screenshot; additive response fields are preserved.
 * @example `GatewayInferenceScreenshotSchema.parse(value);`
 */
export type GatewayInferenceScreenshot = { type: 'screenshot'; [key: string]: unknown };
export const GatewayInferenceScreenshotSchema: z.ZodType<GatewayInferenceScreenshot> = z.lazy(() =>
  z.object({ type: z.literal('screenshot') }).passthrough(),
);

/** Portkey Scroll; additive response fields are preserved.
 * @example `GatewayInferenceScrollSchema.parse(value);`
 */
export type GatewayInferenceScroll = {
  type: 'scroll';
  x: number;
  y: number;
  scroll_x: number;
  scroll_y: number;
  [key: string]: unknown;
};
export const GatewayInferenceScrollSchema: z.ZodType<GatewayInferenceScroll> = z.lazy(() =>
  z
    .object({
      type: z.literal('scroll'),
      x: z.number().finite().int(),
      y: z.number().finite().int(),
      scroll_x: z.number().finite().int(),
      scroll_y: z.number().finite().int(),
    })
    .passthrough(),
);

/** Portkey Type; additive response fields are preserved.
 * @example `GatewayInferenceTypeSchema.parse(value);`
 */
export type GatewayInferenceType = { type: 'type'; text: string; [key: string]: unknown };
export const GatewayInferenceTypeSchema: z.ZodType<GatewayInferenceType> = z.lazy(() =>
  z.object({ type: z.literal('type'), text: z.string() }).passthrough(),
);

/** Portkey Wait; additive response fields are preserved.
 * @example `GatewayInferenceWaitSchema.parse(value);`
 */
export type GatewayInferenceWait = { type: 'wait'; [key: string]: unknown };
export const GatewayInferenceWaitSchema: z.ZodType<GatewayInferenceWait> = z.lazy(() =>
  z.object({ type: z.literal('wait') }).passthrough(),
);

/** Portkey ComputerToolCallSafetyCheck; additive response fields are preserved.
 * @example `GatewayInferenceComputerToolCallSafetyCheckSchema.parse(value);`
 */
export type GatewayInferenceComputerToolCallSafetyCheck = {
  id: string;
  code: string;
  message: string;
  [key: string]: unknown;
};
export const GatewayInferenceComputerToolCallSafetyCheckSchema: z.ZodType<GatewayInferenceComputerToolCallSafetyCheck> =
  z.lazy(() => z.object({ id: z.string(), code: z.string(), message: z.string() }).passthrough());

/** Portkey ReasoningItem; additive response fields are preserved.
 * @example `GatewayInferenceReasoningItemSchema.parse(value);`
 */
export type GatewayInferenceReasoningItem = {
  type: 'reasoning';
  id: string;
  summary: Array<{ type: 'summary_text'; text: string; [key: string]: unknown }>;
  status?: 'in_progress' | 'completed' | 'incomplete';
  [key: string]: unknown;
};
export const GatewayInferenceReasoningItemSchema: z.ZodType<GatewayInferenceReasoningItem> = z.lazy(
  () =>
    z
      .object({
        type: z.literal('reasoning'),
        id: z.string(),
        summary: z.array(
          z.object({ type: z.literal('summary_text'), text: z.string() }).passthrough(),
        ),
        status: z
          .union([z.literal('in_progress'), z.literal('completed'), z.literal('incomplete')])
          .optional(),
      })
      .passthrough(),
);

/** Portkey ResponseUsage; additive response fields are preserved.
 * @example `GatewayInferenceResponseUsageSchema.parse(value);`
 */
export type GatewayInferenceResponseUsage = {
  input_tokens: number;
  input_tokens_details: { cached_tokens: number; [key: string]: unknown };
  output_tokens: number;
  output_tokens_details: { reasoning_tokens: number; [key: string]: unknown };
  total_tokens: number;
  [key: string]: unknown;
} | null;
export const GatewayInferenceResponseUsageSchema: z.ZodType<GatewayInferenceResponseUsage> = z.lazy(
  () =>
    z
      .object({
        input_tokens: z.number().finite().int(),
        input_tokens_details: z.object({ cached_tokens: z.number().finite().int() }).passthrough(),
        output_tokens: z.number().finite().int(),
        output_tokens_details: z
          .object({ reasoning_tokens: z.number().finite().int() })
          .passthrough(),
        total_tokens: z.number().finite().int(),
      })
      .passthrough()
      .nullable(),
);

/** Portkey ResponseStreamEvent; additive response fields are preserved.
 * @example `GatewayInferenceResponseStreamEventSchema.parse(value);`
 */
export type GatewayInferenceResponseStreamEvent =
  | GatewayInferenceResponseAudioDeltaEvent
  | GatewayInferenceResponseAudioDoneEvent
  | GatewayInferenceResponseAudioTranscriptDeltaEvent
  | GatewayInferenceResponseAudioTranscriptDoneEvent
  | GatewayInferenceResponseCodeInterpreterCallCodeDeltaEvent
  | GatewayInferenceResponseCodeInterpreterCallCodeDoneEvent
  | GatewayInferenceResponseCodeInterpreterCallCompletedEvent
  | GatewayInferenceResponseCodeInterpreterCallInProgressEvent
  | GatewayInferenceResponseCodeInterpreterCallInterpretingEvent
  | GatewayInferenceResponseCompletedEvent
  | GatewayInferenceResponseContentPartAddedEvent
  | GatewayInferenceResponseContentPartDoneEvent
  | GatewayInferenceResponseCreatedEvent
  | GatewayInferenceResponseErrorEvent
  | GatewayInferenceResponseFileSearchCallCompletedEvent
  | GatewayInferenceResponseFileSearchCallInProgressEvent
  | GatewayInferenceResponseFileSearchCallSearchingEvent
  | GatewayInferenceResponseFunctionCallArgumentsDeltaEvent
  | GatewayInferenceResponseFunctionCallArgumentsDoneEvent
  | GatewayInferenceResponseInProgressEvent
  | GatewayInferenceResponseFailedEvent
  | GatewayInferenceResponseIncompleteEvent
  | GatewayInferenceResponseOutputItemAddedEvent
  | GatewayInferenceResponseOutputItemDoneEvent
  | GatewayInferenceResponseRefusalDeltaEvent
  | GatewayInferenceResponseRefusalDoneEvent
  | GatewayInferenceResponseTextAnnotationDeltaEvent
  | GatewayInferenceResponseTextDeltaEvent
  | GatewayInferenceResponseTextDoneEvent
  | GatewayInferenceResponseWebSearchCallCompletedEvent
  | GatewayInferenceResponseWebSearchCallInProgressEvent
  | GatewayInferenceResponseWebSearchCallSearchingEvent;
export const GatewayInferenceResponseStreamEventSchema: z.ZodType<GatewayInferenceResponseStreamEvent> =
  z.lazy(() =>
    z.union([
      GatewayInferenceResponseAudioDeltaEventSchema,
      GatewayInferenceResponseAudioDoneEventSchema,
      GatewayInferenceResponseAudioTranscriptDeltaEventSchema,
      GatewayInferenceResponseAudioTranscriptDoneEventSchema,
      GatewayInferenceResponseCodeInterpreterCallCodeDeltaEventSchema,
      GatewayInferenceResponseCodeInterpreterCallCodeDoneEventSchema,
      GatewayInferenceResponseCodeInterpreterCallCompletedEventSchema,
      GatewayInferenceResponseCodeInterpreterCallInProgressEventSchema,
      GatewayInferenceResponseCodeInterpreterCallInterpretingEventSchema,
      GatewayInferenceResponseCompletedEventSchema,
      GatewayInferenceResponseContentPartAddedEventSchema,
      GatewayInferenceResponseContentPartDoneEventSchema,
      GatewayInferenceResponseCreatedEventSchema,
      GatewayInferenceResponseErrorEventSchema,
      GatewayInferenceResponseFileSearchCallCompletedEventSchema,
      GatewayInferenceResponseFileSearchCallInProgressEventSchema,
      GatewayInferenceResponseFileSearchCallSearchingEventSchema,
      GatewayInferenceResponseFunctionCallArgumentsDeltaEventSchema,
      GatewayInferenceResponseFunctionCallArgumentsDoneEventSchema,
      GatewayInferenceResponseInProgressEventSchema,
      GatewayInferenceResponseFailedEventSchema,
      GatewayInferenceResponseIncompleteEventSchema,
      GatewayInferenceResponseOutputItemAddedEventSchema,
      GatewayInferenceResponseOutputItemDoneEventSchema,
      GatewayInferenceResponseRefusalDeltaEventSchema,
      GatewayInferenceResponseRefusalDoneEventSchema,
      GatewayInferenceResponseTextAnnotationDeltaEventSchema,
      GatewayInferenceResponseTextDeltaEventSchema,
      GatewayInferenceResponseTextDoneEventSchema,
      GatewayInferenceResponseWebSearchCallCompletedEventSchema,
      GatewayInferenceResponseWebSearchCallInProgressEventSchema,
      GatewayInferenceResponseWebSearchCallSearchingEventSchema,
    ]),
  );

/** Portkey ResponseAudioDeltaEvent; additive response fields are preserved.
 * @example `GatewayInferenceResponseAudioDeltaEventSchema.parse(value);`
 */
export type GatewayInferenceResponseAudioDeltaEvent = {
  type: 'response.audio.delta';
  delta: string;
  [key: string]: unknown;
};
export const GatewayInferenceResponseAudioDeltaEventSchema: z.ZodType<GatewayInferenceResponseAudioDeltaEvent> =
  z.lazy(() =>
    z.object({ type: z.literal('response.audio.delta'), delta: z.string() }).passthrough(),
  );

/** Portkey ResponseAudioDoneEvent; additive response fields are preserved.
 * @example `GatewayInferenceResponseAudioDoneEventSchema.parse(value);`
 */
export type GatewayInferenceResponseAudioDoneEvent = {
  type: 'response.audio.done';
  [key: string]: unknown;
};
export const GatewayInferenceResponseAudioDoneEventSchema: z.ZodType<GatewayInferenceResponseAudioDoneEvent> =
  z.lazy(() => z.object({ type: z.literal('response.audio.done') }).passthrough());

/** Portkey ResponseAudioTranscriptDeltaEvent; additive response fields are preserved.
 * @example `GatewayInferenceResponseAudioTranscriptDeltaEventSchema.parse(value);`
 */
export type GatewayInferenceResponseAudioTranscriptDeltaEvent = {
  type: 'response.audio.transcript.delta';
  delta: string;
  [key: string]: unknown;
};
export const GatewayInferenceResponseAudioTranscriptDeltaEventSchema: z.ZodType<GatewayInferenceResponseAudioTranscriptDeltaEvent> =
  z.lazy(() =>
    z
      .object({ type: z.literal('response.audio.transcript.delta'), delta: z.string() })
      .passthrough(),
  );

/** Portkey ResponseAudioTranscriptDoneEvent; additive response fields are preserved.
 * @example `GatewayInferenceResponseAudioTranscriptDoneEventSchema.parse(value);`
 */
export type GatewayInferenceResponseAudioTranscriptDoneEvent = {
  type: 'response.audio.transcript.done';
  [key: string]: unknown;
};
export const GatewayInferenceResponseAudioTranscriptDoneEventSchema: z.ZodType<GatewayInferenceResponseAudioTranscriptDoneEvent> =
  z.lazy(() => z.object({ type: z.literal('response.audio.transcript.done') }).passthrough());

/** Portkey ResponseCodeInterpreterCallCodeDeltaEvent; additive response fields are preserved.
 * @example `GatewayInferenceResponseCodeInterpreterCallCodeDeltaEventSchema.parse(value);`
 */
export type GatewayInferenceResponseCodeInterpreterCallCodeDeltaEvent = {
  type: 'response.code_interpreter_call.code.delta';
  output_index: number;
  delta: string;
  [key: string]: unknown;
};
export const GatewayInferenceResponseCodeInterpreterCallCodeDeltaEventSchema: z.ZodType<GatewayInferenceResponseCodeInterpreterCallCodeDeltaEvent> =
  z.lazy(() =>
    z
      .object({
        type: z.literal('response.code_interpreter_call.code.delta'),
        output_index: z.number().finite().int(),
        delta: z.string(),
      })
      .passthrough(),
  );

/** Portkey ResponseCodeInterpreterCallCodeDoneEvent; additive response fields are preserved.
 * @example `GatewayInferenceResponseCodeInterpreterCallCodeDoneEventSchema.parse(value);`
 */
export type GatewayInferenceResponseCodeInterpreterCallCodeDoneEvent = {
  type: 'response.code_interpreter_call.code.done';
  output_index: number;
  code: string;
  [key: string]: unknown;
};
export const GatewayInferenceResponseCodeInterpreterCallCodeDoneEventSchema: z.ZodType<GatewayInferenceResponseCodeInterpreterCallCodeDoneEvent> =
  z.lazy(() =>
    z
      .object({
        type: z.literal('response.code_interpreter_call.code.done'),
        output_index: z.number().finite().int(),
        code: z.string(),
      })
      .passthrough(),
  );

/** Portkey ResponseCodeInterpreterCallCompletedEvent; additive response fields are preserved.
 * @example `GatewayInferenceResponseCodeInterpreterCallCompletedEventSchema.parse(value);`
 */
export type GatewayInferenceResponseCodeInterpreterCallCompletedEvent = {
  type: 'response.code_interpreter_call.completed';
  output_index: number;
  code_interpreter_call: GatewayInferenceCodeInterpreterToolCall;
  [key: string]: unknown;
};
export const GatewayInferenceResponseCodeInterpreterCallCompletedEventSchema: z.ZodType<GatewayInferenceResponseCodeInterpreterCallCompletedEvent> =
  z.lazy(() =>
    z
      .object({
        type: z.literal('response.code_interpreter_call.completed'),
        output_index: z.number().finite().int(),
        code_interpreter_call: GatewayInferenceCodeInterpreterToolCallSchema,
      })
      .passthrough(),
  );

/** Portkey CodeInterpreterToolCall; additive response fields are preserved.
 * @example `GatewayInferenceCodeInterpreterToolCallSchema.parse(value);`
 */
export type GatewayInferenceCodeInterpreterToolCall = {
  id: string;
  type: 'code_interpreter_call';
  code: string;
  status: 'in_progress' | 'interpreting' | 'completed';
  results: Array<GatewayInferenceCodeInterpreterToolOutput>;
  [key: string]: unknown;
};
export const GatewayInferenceCodeInterpreterToolCallSchema: z.ZodType<GatewayInferenceCodeInterpreterToolCall> =
  z.lazy(() =>
    z
      .object({
        id: z.string(),
        type: z.literal('code_interpreter_call'),
        code: z.string(),
        status: z.union([
          z.literal('in_progress'),
          z.literal('interpreting'),
          z.literal('completed'),
        ]),
        results: z.array(GatewayInferenceCodeInterpreterToolOutputSchema),
      })
      .passthrough(),
  );

/** Portkey CodeInterpreterToolOutput; additive response fields are preserved.
 * @example `GatewayInferenceCodeInterpreterToolOutputSchema.parse(value);`
 */
export type GatewayInferenceCodeInterpreterToolOutput =
  | GatewayInferenceCodeInterpreterTextOutput
  | GatewayInferenceCodeInterpreterFileOutput;
export const GatewayInferenceCodeInterpreterToolOutputSchema: z.ZodType<GatewayInferenceCodeInterpreterToolOutput> =
  z.lazy(() =>
    z.union([
      GatewayInferenceCodeInterpreterTextOutputSchema,
      GatewayInferenceCodeInterpreterFileOutputSchema,
    ]),
  );

/** Portkey CodeInterpreterTextOutput; additive response fields are preserved.
 * @example `GatewayInferenceCodeInterpreterTextOutputSchema.parse(value);`
 */
export type GatewayInferenceCodeInterpreterTextOutput = {
  type: 'logs';
  logs: string;
  [key: string]: unknown;
};
export const GatewayInferenceCodeInterpreterTextOutputSchema: z.ZodType<GatewayInferenceCodeInterpreterTextOutput> =
  z.lazy(() => z.object({ type: z.literal('logs'), logs: z.string() }).passthrough());

/** Portkey CodeInterpreterFileOutput; additive response fields are preserved.
 * @example `GatewayInferenceCodeInterpreterFileOutputSchema.parse(value);`
 */
export type GatewayInferenceCodeInterpreterFileOutput = {
  type: 'files';
  files: Array<{ mime_type: string; file_id: string; [key: string]: unknown }>;
  [key: string]: unknown;
};
export const GatewayInferenceCodeInterpreterFileOutputSchema: z.ZodType<GatewayInferenceCodeInterpreterFileOutput> =
  z.lazy(() =>
    z
      .object({
        type: z.literal('files'),
        files: z.array(z.object({ mime_type: z.string(), file_id: z.string() }).passthrough()),
      })
      .passthrough(),
  );

/** Portkey ResponseCodeInterpreterCallInProgressEvent; additive response fields are preserved.
 * @example `GatewayInferenceResponseCodeInterpreterCallInProgressEventSchema.parse(value);`
 */
export type GatewayInferenceResponseCodeInterpreterCallInProgressEvent = {
  type: 'response.code_interpreter_call.in_progress';
  output_index: number;
  code_interpreter_call: GatewayInferenceCodeInterpreterToolCall;
  [key: string]: unknown;
};
export const GatewayInferenceResponseCodeInterpreterCallInProgressEventSchema: z.ZodType<GatewayInferenceResponseCodeInterpreterCallInProgressEvent> =
  z.lazy(() =>
    z
      .object({
        type: z.literal('response.code_interpreter_call.in_progress'),
        output_index: z.number().finite().int(),
        code_interpreter_call: GatewayInferenceCodeInterpreterToolCallSchema,
      })
      .passthrough(),
  );

/** Portkey ResponseCodeInterpreterCallInterpretingEvent; additive response fields are preserved.
 * @example `GatewayInferenceResponseCodeInterpreterCallInterpretingEventSchema.parse(value);`
 */
export type GatewayInferenceResponseCodeInterpreterCallInterpretingEvent = {
  type: 'response.code_interpreter_call.interpreting';
  output_index: number;
  code_interpreter_call: GatewayInferenceCodeInterpreterToolCall;
  [key: string]: unknown;
};
export const GatewayInferenceResponseCodeInterpreterCallInterpretingEventSchema: z.ZodType<GatewayInferenceResponseCodeInterpreterCallInterpretingEvent> =
  z.lazy(() =>
    z
      .object({
        type: z.literal('response.code_interpreter_call.interpreting'),
        output_index: z.number().finite().int(),
        code_interpreter_call: GatewayInferenceCodeInterpreterToolCallSchema,
      })
      .passthrough(),
  );

/** Portkey ResponseCompletedEvent; additive response fields are preserved.
 * @example `GatewayInferenceResponseCompletedEventSchema.parse(value);`
 */
export type GatewayInferenceResponseCompletedEvent = {
  type: 'response.completed';
  response: GatewayInferenceResponse;
  [key: string]: unknown;
};
export const GatewayInferenceResponseCompletedEventSchema: z.ZodType<GatewayInferenceResponseCompletedEvent> =
  z.lazy(() =>
    z
      .object({ type: z.literal('response.completed'), response: GatewayInferenceResponseSchema })
      .passthrough(),
  );

/** Portkey ResponseContentPartAddedEvent; additive response fields are preserved.
 * @example `GatewayInferenceResponseContentPartAddedEventSchema.parse(value);`
 */
export type GatewayInferenceResponseContentPartAddedEvent = {
  type: 'response.content_part.added';
  item_id: string;
  output_index: number;
  content_index: number;
  part: GatewayInferenceOutputContent;
  [key: string]: unknown;
};
export const GatewayInferenceResponseContentPartAddedEventSchema: z.ZodType<GatewayInferenceResponseContentPartAddedEvent> =
  z.lazy(() =>
    z
      .object({
        type: z.literal('response.content_part.added'),
        item_id: z.string(),
        output_index: z.number().finite().int(),
        content_index: z.number().finite().int(),
        part: GatewayInferenceOutputContentSchema,
      })
      .passthrough(),
  );

/** Portkey ResponseContentPartDoneEvent; additive response fields are preserved.
 * @example `GatewayInferenceResponseContentPartDoneEventSchema.parse(value);`
 */
export type GatewayInferenceResponseContentPartDoneEvent = {
  type: 'response.content_part.done';
  item_id: string;
  output_index: number;
  content_index: number;
  part: GatewayInferenceOutputContent;
  [key: string]: unknown;
};
export const GatewayInferenceResponseContentPartDoneEventSchema: z.ZodType<GatewayInferenceResponseContentPartDoneEvent> =
  z.lazy(() =>
    z
      .object({
        type: z.literal('response.content_part.done'),
        item_id: z.string(),
        output_index: z.number().finite().int(),
        content_index: z.number().finite().int(),
        part: GatewayInferenceOutputContentSchema,
      })
      .passthrough(),
  );

/** Portkey ResponseCreatedEvent; additive response fields are preserved.
 * @example `GatewayInferenceResponseCreatedEventSchema.parse(value);`
 */
export type GatewayInferenceResponseCreatedEvent = {
  type: 'response.created';
  response: GatewayInferenceResponse;
  [key: string]: unknown;
};
export const GatewayInferenceResponseCreatedEventSchema: z.ZodType<GatewayInferenceResponseCreatedEvent> =
  z.lazy(() =>
    z
      .object({ type: z.literal('response.created'), response: GatewayInferenceResponseSchema })
      .passthrough(),
  );

/** Portkey ResponseErrorEvent; additive response fields are preserved.
 * @example `GatewayInferenceResponseErrorEventSchema.parse(value);`
 */
export type GatewayInferenceResponseErrorEvent = {
  type: 'error';
  code: string | null;
  message: string;
  param: string | null;
  [key: string]: unknown;
};
export const GatewayInferenceResponseErrorEventSchema: z.ZodType<GatewayInferenceResponseErrorEvent> =
  z.lazy(() =>
    z
      .object({
        type: z.literal('error'),
        code: z.string().nullable(),
        message: z.string(),
        param: z.string().nullable(),
      })
      .passthrough(),
  );

/** Portkey ResponseFileSearchCallCompletedEvent; additive response fields are preserved.
 * @example `GatewayInferenceResponseFileSearchCallCompletedEventSchema.parse(value);`
 */
export type GatewayInferenceResponseFileSearchCallCompletedEvent = {
  type: 'response.file_search_call.completed';
  output_index: number;
  item_id: string;
  [key: string]: unknown;
};
export const GatewayInferenceResponseFileSearchCallCompletedEventSchema: z.ZodType<GatewayInferenceResponseFileSearchCallCompletedEvent> =
  z.lazy(() =>
    z
      .object({
        type: z.literal('response.file_search_call.completed'),
        output_index: z.number().finite().int(),
        item_id: z.string(),
      })
      .passthrough(),
  );

/** Portkey ResponseFileSearchCallInProgressEvent; additive response fields are preserved.
 * @example `GatewayInferenceResponseFileSearchCallInProgressEventSchema.parse(value);`
 */
export type GatewayInferenceResponseFileSearchCallInProgressEvent = {
  type: 'response.file_search_call.in_progress';
  output_index: number;
  item_id: string;
  [key: string]: unknown;
};
export const GatewayInferenceResponseFileSearchCallInProgressEventSchema: z.ZodType<GatewayInferenceResponseFileSearchCallInProgressEvent> =
  z.lazy(() =>
    z
      .object({
        type: z.literal('response.file_search_call.in_progress'),
        output_index: z.number().finite().int(),
        item_id: z.string(),
      })
      .passthrough(),
  );

/** Portkey ResponseFileSearchCallSearchingEvent; additive response fields are preserved.
 * @example `GatewayInferenceResponseFileSearchCallSearchingEventSchema.parse(value);`
 */
export type GatewayInferenceResponseFileSearchCallSearchingEvent = {
  type: 'response.file_search_call.searching';
  output_index: number;
  item_id: string;
  [key: string]: unknown;
};
export const GatewayInferenceResponseFileSearchCallSearchingEventSchema: z.ZodType<GatewayInferenceResponseFileSearchCallSearchingEvent> =
  z.lazy(() =>
    z
      .object({
        type: z.literal('response.file_search_call.searching'),
        output_index: z.number().finite().int(),
        item_id: z.string(),
      })
      .passthrough(),
  );

/** Portkey ResponseFunctionCallArgumentsDeltaEvent; additive response fields are preserved.
 * @example `GatewayInferenceResponseFunctionCallArgumentsDeltaEventSchema.parse(value);`
 */
export type GatewayInferenceResponseFunctionCallArgumentsDeltaEvent = {
  type: 'response.function_call_arguments.delta';
  item_id: string;
  output_index: number;
  delta: string;
  [key: string]: unknown;
};
export const GatewayInferenceResponseFunctionCallArgumentsDeltaEventSchema: z.ZodType<GatewayInferenceResponseFunctionCallArgumentsDeltaEvent> =
  z.lazy(() =>
    z
      .object({
        type: z.literal('response.function_call_arguments.delta'),
        item_id: z.string(),
        output_index: z.number().finite().int(),
        delta: z.string(),
      })
      .passthrough(),
  );

/** Portkey ResponseFunctionCallArgumentsDoneEvent; additive response fields are preserved.
 * @example `GatewayInferenceResponseFunctionCallArgumentsDoneEventSchema.parse(value);`
 */
export type GatewayInferenceResponseFunctionCallArgumentsDoneEvent = {
  type: 'response.function_call_arguments.done';
  item_id: string;
  output_index: number;
  arguments: string;
  [key: string]: unknown;
};
export const GatewayInferenceResponseFunctionCallArgumentsDoneEventSchema: z.ZodType<GatewayInferenceResponseFunctionCallArgumentsDoneEvent> =
  z.lazy(() =>
    z
      .object({
        type: z.literal('response.function_call_arguments.done'),
        item_id: z.string(),
        output_index: z.number().finite().int(),
        arguments: z.string(),
      })
      .passthrough(),
  );

/** Portkey ResponseInProgressEvent; additive response fields are preserved.
 * @example `GatewayInferenceResponseInProgressEventSchema.parse(value);`
 */
export type GatewayInferenceResponseInProgressEvent = {
  type: 'response.in_progress';
  response: GatewayInferenceResponse;
  [key: string]: unknown;
};
export const GatewayInferenceResponseInProgressEventSchema: z.ZodType<GatewayInferenceResponseInProgressEvent> =
  z.lazy(() =>
    z
      .object({ type: z.literal('response.in_progress'), response: GatewayInferenceResponseSchema })
      .passthrough(),
  );

/** Portkey ResponseFailedEvent; additive response fields are preserved.
 * @example `GatewayInferenceResponseFailedEventSchema.parse(value);`
 */
export type GatewayInferenceResponseFailedEvent = {
  type: 'response.failed';
  response: GatewayInferenceResponse;
  [key: string]: unknown;
};
export const GatewayInferenceResponseFailedEventSchema: z.ZodType<GatewayInferenceResponseFailedEvent> =
  z.lazy(() =>
    z
      .object({ type: z.literal('response.failed'), response: GatewayInferenceResponseSchema })
      .passthrough(),
  );

/** Portkey ResponseIncompleteEvent; additive response fields are preserved.
 * @example `GatewayInferenceResponseIncompleteEventSchema.parse(value);`
 */
export type GatewayInferenceResponseIncompleteEvent = {
  type: 'response.incomplete';
  response: GatewayInferenceResponse;
  [key: string]: unknown;
};
export const GatewayInferenceResponseIncompleteEventSchema: z.ZodType<GatewayInferenceResponseIncompleteEvent> =
  z.lazy(() =>
    z
      .object({ type: z.literal('response.incomplete'), response: GatewayInferenceResponseSchema })
      .passthrough(),
  );

/** Portkey ResponseOutputItemAddedEvent; additive response fields are preserved.
 * @example `GatewayInferenceResponseOutputItemAddedEventSchema.parse(value);`
 */
export type GatewayInferenceResponseOutputItemAddedEvent = {
  type: 'response.output_item.added';
  output_index: number;
  item: GatewayInferenceOutputItem;
  [key: string]: unknown;
};
export const GatewayInferenceResponseOutputItemAddedEventSchema: z.ZodType<GatewayInferenceResponseOutputItemAddedEvent> =
  z.lazy(() =>
    z
      .object({
        type: z.literal('response.output_item.added'),
        output_index: z.number().finite().int(),
        item: GatewayInferenceOutputItemSchema,
      })
      .passthrough(),
  );

/** Portkey ResponseOutputItemDoneEvent; additive response fields are preserved.
 * @example `GatewayInferenceResponseOutputItemDoneEventSchema.parse(value);`
 */
export type GatewayInferenceResponseOutputItemDoneEvent = {
  type: 'response.output_item.done';
  output_index: number;
  item: GatewayInferenceOutputItem;
  [key: string]: unknown;
};
export const GatewayInferenceResponseOutputItemDoneEventSchema: z.ZodType<GatewayInferenceResponseOutputItemDoneEvent> =
  z.lazy(() =>
    z
      .object({
        type: z.literal('response.output_item.done'),
        output_index: z.number().finite().int(),
        item: GatewayInferenceOutputItemSchema,
      })
      .passthrough(),
  );

/** Portkey ResponseRefusalDeltaEvent; additive response fields are preserved.
 * @example `GatewayInferenceResponseRefusalDeltaEventSchema.parse(value);`
 */
export type GatewayInferenceResponseRefusalDeltaEvent = {
  type: 'response.refusal.delta';
  item_id: string;
  output_index: number;
  content_index: number;
  delta: string;
  [key: string]: unknown;
};
export const GatewayInferenceResponseRefusalDeltaEventSchema: z.ZodType<GatewayInferenceResponseRefusalDeltaEvent> =
  z.lazy(() =>
    z
      .object({
        type: z.literal('response.refusal.delta'),
        item_id: z.string(),
        output_index: z.number().finite().int(),
        content_index: z.number().finite().int(),
        delta: z.string(),
      })
      .passthrough(),
  );

/** Portkey ResponseRefusalDoneEvent; additive response fields are preserved.
 * @example `GatewayInferenceResponseRefusalDoneEventSchema.parse(value);`
 */
export type GatewayInferenceResponseRefusalDoneEvent = {
  type: 'response.refusal.done';
  item_id: string;
  output_index: number;
  content_index: number;
  refusal: string;
  [key: string]: unknown;
};
export const GatewayInferenceResponseRefusalDoneEventSchema: z.ZodType<GatewayInferenceResponseRefusalDoneEvent> =
  z.lazy(() =>
    z
      .object({
        type: z.literal('response.refusal.done'),
        item_id: z.string(),
        output_index: z.number().finite().int(),
        content_index: z.number().finite().int(),
        refusal: z.string(),
      })
      .passthrough(),
  );

/** Portkey ResponseTextAnnotationDeltaEvent; additive response fields are preserved.
 * @example `GatewayInferenceResponseTextAnnotationDeltaEventSchema.parse(value);`
 */
export type GatewayInferenceResponseTextAnnotationDeltaEvent = {
  type: 'response.output_text.annotation.added';
  item_id: string;
  output_index: number;
  content_index: number;
  annotation_index: number;
  annotation: GatewayInferenceAnnotation;
  [key: string]: unknown;
};
export const GatewayInferenceResponseTextAnnotationDeltaEventSchema: z.ZodType<GatewayInferenceResponseTextAnnotationDeltaEvent> =
  z.lazy(() =>
    z
      .object({
        type: z.literal('response.output_text.annotation.added'),
        item_id: z.string(),
        output_index: z.number().finite().int(),
        content_index: z.number().finite().int(),
        annotation_index: z.number().finite().int(),
        annotation: GatewayInferenceAnnotationSchema,
      })
      .passthrough(),
  );

/** Portkey ResponseTextDeltaEvent; additive response fields are preserved.
 * @example `GatewayInferenceResponseTextDeltaEventSchema.parse(value);`
 */
export type GatewayInferenceResponseTextDeltaEvent = {
  type: 'response.output_text.delta';
  item_id: string;
  output_index: number;
  content_index: number;
  delta: string;
  [key: string]: unknown;
};
export const GatewayInferenceResponseTextDeltaEventSchema: z.ZodType<GatewayInferenceResponseTextDeltaEvent> =
  z.lazy(() =>
    z
      .object({
        type: z.literal('response.output_text.delta'),
        item_id: z.string(),
        output_index: z.number().finite().int(),
        content_index: z.number().finite().int(),
        delta: z.string(),
      })
      .passthrough(),
  );

/** Portkey ResponseTextDoneEvent; additive response fields are preserved.
 * @example `GatewayInferenceResponseTextDoneEventSchema.parse(value);`
 */
export type GatewayInferenceResponseTextDoneEvent = {
  type: 'response.output_text.done';
  item_id: string;
  output_index: number;
  content_index: number;
  text: string;
  [key: string]: unknown;
};
export const GatewayInferenceResponseTextDoneEventSchema: z.ZodType<GatewayInferenceResponseTextDoneEvent> =
  z.lazy(() =>
    z
      .object({
        type: z.literal('response.output_text.done'),
        item_id: z.string(),
        output_index: z.number().finite().int(),
        content_index: z.number().finite().int(),
        text: z.string(),
      })
      .passthrough(),
  );

/** Portkey ResponseWebSearchCallCompletedEvent; additive response fields are preserved.
 * @example `GatewayInferenceResponseWebSearchCallCompletedEventSchema.parse(value);`
 */
export type GatewayInferenceResponseWebSearchCallCompletedEvent = {
  type: 'response.web_search_call.completed';
  output_index: number;
  item_id: string;
  [key: string]: unknown;
};
export const GatewayInferenceResponseWebSearchCallCompletedEventSchema: z.ZodType<GatewayInferenceResponseWebSearchCallCompletedEvent> =
  z.lazy(() =>
    z
      .object({
        type: z.literal('response.web_search_call.completed'),
        output_index: z.number().finite().int(),
        item_id: z.string(),
      })
      .passthrough(),
  );

/** Portkey ResponseWebSearchCallInProgressEvent; additive response fields are preserved.
 * @example `GatewayInferenceResponseWebSearchCallInProgressEventSchema.parse(value);`
 */
export type GatewayInferenceResponseWebSearchCallInProgressEvent = {
  type: 'response.web_search_call.in_progress';
  output_index: number;
  item_id: string;
  [key: string]: unknown;
};
export const GatewayInferenceResponseWebSearchCallInProgressEventSchema: z.ZodType<GatewayInferenceResponseWebSearchCallInProgressEvent> =
  z.lazy(() =>
    z
      .object({
        type: z.literal('response.web_search_call.in_progress'),
        output_index: z.number().finite().int(),
        item_id: z.string(),
      })
      .passthrough(),
  );

/** Portkey ResponseWebSearchCallSearchingEvent; additive response fields are preserved.
 * @example `GatewayInferenceResponseWebSearchCallSearchingEventSchema.parse(value);`
 */
export type GatewayInferenceResponseWebSearchCallSearchingEvent = {
  type: 'response.web_search_call.searching';
  output_index: number;
  item_id: string;
  [key: string]: unknown;
};
export const GatewayInferenceResponseWebSearchCallSearchingEventSchema: z.ZodType<GatewayInferenceResponseWebSearchCallSearchingEvent> =
  z.lazy(() =>
    z
      .object({
        type: z.literal('response.web_search_call.searching'),
        output_index: z.number().finite().int(),
        item_id: z.string(),
      })
      .passthrough(),
  );

/** Portkey CreateImageRequest; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputCreateImageRequestSchema.parse(value);`
 */
export type GatewayInferenceInputCreateImageRequest = {
  prompt: string;
  model?: (string | 'dall-e-2' | 'dall-e-3') | null;
  n?: number | null;
  quality?: 'standard' | 'hd';
  response_format?: ('url' | 'b64_json') | null;
  size?: ('256x256' | '512x512' | '1024x1024' | '1792x1024' | '1024x1792') | null;
  style?: ('vivid' | 'natural') | null;
  user?: string;
};
export const GatewayInferenceInputCreateImageRequestSchema: z.ZodType<GatewayInferenceInputCreateImageRequest> =
  z.lazy(() =>
    z
      .object({
        prompt: z.string(),
        model: z
          .union([z.string(), z.union([z.literal('dall-e-2'), z.literal('dall-e-3')])])
          .nullable()
          .optional(),
        n: z.number().finite().int().min(1).max(10).nullable().optional(),
        quality: z.union([z.literal('standard'), z.literal('hd')]).optional(),
        response_format: z
          .union([z.literal('url'), z.literal('b64_json')])
          .nullable()
          .optional(),
        size: z
          .union([
            z.literal('256x256'),
            z.literal('512x512'),
            z.literal('1024x1024'),
            z.literal('1792x1024'),
            z.literal('1024x1792'),
          ])
          .nullable()
          .optional(),
        style: z
          .union([z.literal('vivid'), z.literal('natural')])
          .nullable()
          .optional(),
        user: z.string().optional(),
      })
      .strict(),
  );

/** Portkey ImagesResponse; additive response fields are preserved.
 * @example `GatewayInferenceImagesResponseSchema.parse(value);`
 */
export type GatewayInferenceImagesResponse = {
  created: number;
  data: Array<GatewayInferenceImage>;
  [key: string]: unknown;
};
export const GatewayInferenceImagesResponseSchema: z.ZodType<GatewayInferenceImagesResponse> =
  z.lazy(() =>
    z
      .object({ created: z.number().finite().int(), data: z.array(GatewayInferenceImageSchema) })
      .passthrough(),
  );

/** Portkey Image; additive response fields are preserved.
 * @example `GatewayInferenceImageSchema.parse(value);`
 */
export type GatewayInferenceImage = {
  b64_json?: string;
  url?: string;
  revised_prompt?: string;
  [key: string]: unknown;
};
export const GatewayInferenceImageSchema: z.ZodType<GatewayInferenceImage> = z.lazy(() =>
  z
    .object({
      b64_json: z.string().optional(),
      url: z.string().optional(),
      revised_prompt: z.string().optional(),
    })
    .passthrough(),
);

/** Portkey CreateImageEditRequest; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputCreateImageEditRequestSchema.parse(value);`
 */
export type GatewayInferenceInputCreateImageEditRequest = {
  image: Blob;
  prompt: string;
  mask?: Blob;
  model?: (string | 'dall-e-2') | null;
  n?: number | null;
  size?: ('256x256' | '512x512' | '1024x1024') | null;
  response_format?: ('url' | 'b64_json') | null;
  user?: string;
};
export const GatewayInferenceInputCreateImageEditRequestSchema: z.ZodType<GatewayInferenceInputCreateImageEditRequest> =
  z.lazy(() =>
    z
      .object({
        image: z.instanceof(Blob),
        prompt: z.string(),
        mask: z.instanceof(Blob).optional(),
        model: z
          .union([z.string(), z.literal('dall-e-2')])
          .nullable()
          .optional(),
        n: z.number().finite().int().min(1).max(10).nullable().optional(),
        size: z
          .union([z.literal('256x256'), z.literal('512x512'), z.literal('1024x1024')])
          .nullable()
          .optional(),
        response_format: z
          .union([z.literal('url'), z.literal('b64_json')])
          .nullable()
          .optional(),
        user: z.string().optional(),
      })
      .strict(),
  );

/** Portkey CreateImageVariationRequest; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputCreateImageVariationRequestSchema.parse(value);`
 */
export type GatewayInferenceInputCreateImageVariationRequest = {
  image: Blob;
  model?: (string | 'dall-e-2') | null;
  n?: number | null;
  response_format?: ('url' | 'b64_json') | null;
  size?: ('256x256' | '512x512' | '1024x1024') | null;
  user?: string;
};
export const GatewayInferenceInputCreateImageVariationRequestSchema: z.ZodType<GatewayInferenceInputCreateImageVariationRequest> =
  z.lazy(() =>
    z
      .object({
        image: z.instanceof(Blob),
        model: z
          .union([z.string(), z.literal('dall-e-2')])
          .nullable()
          .optional(),
        n: z.number().finite().int().min(1).max(10).nullable().optional(),
        response_format: z
          .union([z.literal('url'), z.literal('b64_json')])
          .nullable()
          .optional(),
        size: z
          .union([z.literal('256x256'), z.literal('512x512'), z.literal('1024x1024')])
          .nullable()
          .optional(),
        user: z.string().optional(),
      })
      .strict(),
  );

/** Portkey CreateRerankRequest; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputCreateRerankRequestSchema.parse(value);`
 */
export type GatewayInferenceInputCreateRerankRequest = {
  model: string;
  query: string;
  documents: Array<GatewayInferenceInputRerankDocument>;
  top_n?: number;
  return_documents?: boolean;
  max_tokens_per_doc?: number;
  priority?: number;
  rank_fields?: Array<string>;
  truncation?: boolean;
  parameters?: { [key: string]: GatewayJsonValue };
};
export const GatewayInferenceInputCreateRerankRequestSchema: z.ZodType<GatewayInferenceInputCreateRerankRequest> =
  z.lazy(() =>
    z
      .object({
        model: z.string(),
        query: z.string(),
        documents: z.array(GatewayInferenceInputRerankDocumentSchema).min(1),
        top_n: z.number().finite().int().min(1).optional(),
        return_documents: z.boolean().optional(),
        max_tokens_per_doc: z.number().finite().int().min(1).optional(),
        priority: z.number().finite().optional(),
        rank_fields: z.array(z.string()).optional(),
        truncation: z.boolean().optional(),
        parameters: z
          .object({})
          .catchall(GatewayJsonValueSchema)
          .and(GatewayJsonObjectSchema)
          .optional(),
      })
      .strict(),
  );

/** Portkey RerankDocument; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputRerankDocumentSchema.parse(value);`
 */
export type GatewayInferenceInputRerankDocument =
  | string
  | { text: string; [key: string]: GatewayJsonValue | undefined };
export const GatewayInferenceInputRerankDocumentSchema: z.ZodType<GatewayInferenceInputRerankDocument> =
  z.lazy(() =>
    z.union([
      z.string(),
      z.object({ text: z.string() }).catchall(GatewayJsonValueSchema).and(GatewayJsonObjectSchema),
    ]),
  );

/** Portkey CreateRerankResponse; additive response fields are preserved.
 * @example `GatewayInferenceCreateRerankResponseSchema.parse(value);`
 */
export type GatewayInferenceCreateRerankResponse = {
  id?: string;
  object: 'list';
  results: Array<GatewayInferenceRerankResult>;
  model: string;
  usage?: GatewayInferenceRerankUsage;
  provider?: string;
  [key: string]: unknown;
};
export const GatewayInferenceCreateRerankResponseSchema: z.ZodType<GatewayInferenceCreateRerankResponse> =
  z.lazy(() =>
    z
      .object({
        id: z.string().optional(),
        object: z.literal('list'),
        results: z.array(GatewayInferenceRerankResultSchema),
        model: z.string(),
        usage: GatewayInferenceRerankUsageSchema.optional(),
        provider: z.string().optional(),
      })
      .passthrough(),
  );

/** Portkey RerankResult; additive response fields are preserved.
 * @example `GatewayInferenceRerankResultSchema.parse(value);`
 */
export type GatewayInferenceRerankResult = {
  index: number;
  relevance_score: number;
  document?: { text?: string; [key: string]: unknown };
  [key: string]: unknown;
};
export const GatewayInferenceRerankResultSchema: z.ZodType<GatewayInferenceRerankResult> = z.lazy(
  () =>
    z
      .object({
        index: z.number().finite().int(),
        relevance_score: z.number().finite(),
        document: z.object({ text: z.string().optional() }).passthrough().optional(),
      })
      .passthrough(),
);

/** Portkey RerankUsage; additive response fields are preserved.
 * @example `GatewayInferenceRerankUsageSchema.parse(value);`
 */
export type GatewayInferenceRerankUsage = { search_units?: number; [key: string]: unknown };
export const GatewayInferenceRerankUsageSchema: z.ZodType<GatewayInferenceRerankUsage> = z.lazy(
  () => z.object({ search_units: z.number().finite().int().optional() }).passthrough(),
);

/** Portkey CreateOcrRequest; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputCreateOcrRequestSchema.parse(value);`
 */
export type GatewayInferenceInputCreateOcrRequest = {
  model: string;
  document: { type: 'document_url' | 'image_url'; document_url?: string; image_url?: string };
  include_image_base64?: boolean;
  image_limit?: number;
  image_min_size?: number;
  pages?: Array<number>;
};
export const GatewayInferenceInputCreateOcrRequestSchema: z.ZodType<GatewayInferenceInputCreateOcrRequest> =
  z.lazy(() =>
    z
      .object({
        model: z.string(),
        document: z
          .object({
            type: z.union([z.literal('document_url'), z.literal('image_url')]),
            document_url: z.string().optional(),
            image_url: z.string().optional(),
          })
          .strict(),
        include_image_base64: z.boolean().optional(),
        image_limit: z.number().finite().int().min(1).optional(),
        image_min_size: z.number().finite().int().min(1).optional(),
        pages: z.array(z.number().finite().int()).optional(),
      })
      .strict(),
  );

/** Portkey CreateOcrResponse; additive response fields are preserved.
 * @example `GatewayInferenceCreateOcrResponseSchema.parse(value);`
 */
export type GatewayInferenceCreateOcrResponse = {
  pages: Array<GatewayInferenceOcrPage>;
  model: string;
  usage_info?: { pages_processed?: number; [key: string]: unknown };
  [key: string]: unknown;
};
export const GatewayInferenceCreateOcrResponseSchema: z.ZodType<GatewayInferenceCreateOcrResponse> =
  z.lazy(() =>
    z
      .object({
        pages: z.array(GatewayInferenceOcrPageSchema),
        model: z.string(),
        usage_info: z
          .object({ pages_processed: z.number().finite().int().optional() })
          .passthrough()
          .optional(),
      })
      .passthrough(),
  );

/** Portkey OcrPage; additive response fields are preserved.
 * @example `GatewayInferenceOcrPageSchema.parse(value);`
 */
export type GatewayInferenceOcrPage = {
  index: number;
  markdown: string;
  images?: Array<{ id?: string; image_base64?: string; [key: string]: unknown }>;
  [key: string]: unknown;
};
export const GatewayInferenceOcrPageSchema: z.ZodType<GatewayInferenceOcrPage> = z.lazy(() =>
  z
    .object({
      index: z.number().finite().int(),
      markdown: z.string(),
      images: z
        .array(
          z
            .object({ id: z.string().optional(), image_base64: z.string().optional() })
            .passthrough(),
        )
        .optional(),
    })
    .passthrough(),
);

/** Portkey CreateSpeechRequest; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputCreateSpeechRequestSchema.parse(value);`
 */
export type GatewayInferenceInputCreateSpeechRequest = {
  model: string | 'tts-1' | 'tts-1-hd';
  input: string;
  voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  response_format?: 'mp3' | 'opus' | 'aac' | 'flac' | 'wav' | 'pcm';
  speed?: number;
};
export const GatewayInferenceInputCreateSpeechRequestSchema: z.ZodType<GatewayInferenceInputCreateSpeechRequest> =
  z.lazy(() =>
    z
      .object({
        model: z.union([z.string(), z.union([z.literal('tts-1'), z.literal('tts-1-hd')])]),
        input: z.string().max(4096),
        voice: z.union([
          z.literal('alloy'),
          z.literal('echo'),
          z.literal('fable'),
          z.literal('onyx'),
          z.literal('nova'),
          z.literal('shimmer'),
        ]),
        response_format: z
          .union([
            z.literal('mp3'),
            z.literal('opus'),
            z.literal('aac'),
            z.literal('flac'),
            z.literal('wav'),
            z.literal('pcm'),
          ])
          .optional(),
        speed: z.number().finite().min(0.25).max(4).optional(),
      })
      .strict(),
  );

/** Portkey CreateTranscriptionRequest; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputCreateTranscriptionRequestSchema.parse(value);`
 */
export type GatewayInferenceInputCreateTranscriptionRequest = {
  file: Blob;
  model: string | 'whisper-1';
  language?: string;
  prompt?: string;
  response_format?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt';
  temperature?: number;
  'timestamp_granularities[]'?: Array<'word' | 'segment'>;
};
export const GatewayInferenceInputCreateTranscriptionRequestSchema: z.ZodType<GatewayInferenceInputCreateTranscriptionRequest> =
  z.lazy(() =>
    z
      .object({
        file: z.instanceof(Blob),
        model: z.union([z.string(), z.literal('whisper-1')]),
        language: z.string().optional(),
        prompt: z.string().optional(),
        response_format: z
          .union([
            z.literal('json'),
            z.literal('text'),
            z.literal('srt'),
            z.literal('verbose_json'),
            z.literal('vtt'),
          ])
          .optional(),
        temperature: z.number().finite().optional(),
        'timestamp_granularities[]': z
          .array(z.union([z.literal('word'), z.literal('segment')]))
          .optional(),
      })
      .strict(),
  );

/** Portkey CreateTranscriptionResponseJson; additive response fields are preserved.
 * @example `GatewayInferenceCreateTranscriptionResponseJsonSchema.parse(value);`
 */
export type GatewayInferenceCreateTranscriptionResponseJson = {
  text: string;
  [key: string]: unknown;
};
export const GatewayInferenceCreateTranscriptionResponseJsonSchema: z.ZodType<GatewayInferenceCreateTranscriptionResponseJson> =
  z.lazy(() => z.object({ text: z.string() }).passthrough());

/** Portkey CreateTranscriptionResponseVerboseJson; additive response fields are preserved.
 * @example `GatewayInferenceCreateTranscriptionResponseVerboseJsonSchema.parse(value);`
 */
export type GatewayInferenceCreateTranscriptionResponseVerboseJson = {
  language: string;
  duration: string | number;
  text: string;
  words?: Array<GatewayInferenceTranscriptionWord>;
  segments?: Array<GatewayInferenceTranscriptionSegment>;
  [key: string]: unknown;
};
export const GatewayInferenceCreateTranscriptionResponseVerboseJsonSchema: z.ZodType<GatewayInferenceCreateTranscriptionResponseVerboseJson> =
  z.lazy(() =>
    z
      .object({
        language: z.string(),
        duration: z.union([z.string(), z.number().finite()]),
        text: z.string(),
        words: z.array(GatewayInferenceTranscriptionWordSchema).optional(),
        segments: z.array(GatewayInferenceTranscriptionSegmentSchema).optional(),
      })
      .passthrough(),
  );

/** Portkey TranscriptionWord; additive response fields are preserved.
 * @example `GatewayInferenceTranscriptionWordSchema.parse(value);`
 */
export type GatewayInferenceTranscriptionWord = {
  word: string;
  start: number;
  end: number;
  [key: string]: unknown;
};
export const GatewayInferenceTranscriptionWordSchema: z.ZodType<GatewayInferenceTranscriptionWord> =
  z.lazy(() =>
    z
      .object({ word: z.string(), start: z.number().finite(), end: z.number().finite() })
      .passthrough(),
  );

/** Portkey TranscriptionSegment; additive response fields are preserved.
 * @example `GatewayInferenceTranscriptionSegmentSchema.parse(value);`
 */
export type GatewayInferenceTranscriptionSegment = {
  id: number;
  seek: number;
  start: number;
  end: number;
  text: string;
  tokens: Array<number>;
  temperature: number;
  avg_logprob: number;
  compression_ratio: number;
  no_speech_prob: number;
  [key: string]: unknown;
};
export const GatewayInferenceTranscriptionSegmentSchema: z.ZodType<GatewayInferenceTranscriptionSegment> =
  z.lazy(() =>
    z
      .object({
        id: z.number().finite().int(),
        seek: z.number().finite().int(),
        start: z.number().finite(),
        end: z.number().finite(),
        text: z.string(),
        tokens: z.array(z.number().finite().int()),
        temperature: z.number().finite(),
        avg_logprob: z.number().finite(),
        compression_ratio: z.number().finite(),
        no_speech_prob: z.number().finite(),
      })
      .passthrough(),
  );

/** Portkey CreateTranslationRequest; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputCreateTranslationRequestSchema.parse(value);`
 */
export type GatewayInferenceInputCreateTranslationRequest = {
  file: Blob;
  model: string | 'whisper-1';
  prompt?: string;
  response_format?: string;
  temperature?: number;
};
export const GatewayInferenceInputCreateTranslationRequestSchema: z.ZodType<GatewayInferenceInputCreateTranslationRequest> =
  z.lazy(() =>
    z
      .object({
        file: z.instanceof(Blob),
        model: z.union([z.string(), z.literal('whisper-1')]),
        prompt: z.string().optional(),
        response_format: z.string().optional(),
        temperature: z.number().finite().optional(),
      })
      .strict(),
  );

/** Portkey CreateTranslationResponseJson; additive response fields are preserved.
 * @example `GatewayInferenceCreateTranslationResponseJsonSchema.parse(value);`
 */
export type GatewayInferenceCreateTranslationResponseJson = {
  text: string;
  [key: string]: unknown;
};
export const GatewayInferenceCreateTranslationResponseJsonSchema: z.ZodType<GatewayInferenceCreateTranslationResponseJson> =
  z.lazy(() => z.object({ text: z.string() }).passthrough());

/** Portkey CreateTranslationResponseVerboseJson; additive response fields are preserved.
 * @example `GatewayInferenceCreateTranslationResponseVerboseJsonSchema.parse(value);`
 */
export type GatewayInferenceCreateTranslationResponseVerboseJson = {
  language: string;
  duration: string | number;
  text: string;
  segments?: Array<GatewayInferenceTranscriptionSegment>;
  [key: string]: unknown;
};
export const GatewayInferenceCreateTranslationResponseVerboseJsonSchema: z.ZodType<GatewayInferenceCreateTranslationResponseVerboseJson> =
  z.lazy(() =>
    z
      .object({
        language: z.string(),
        duration: z.union([z.string(), z.number().finite()]),
        text: z.string(),
        segments: z.array(GatewayInferenceTranscriptionSegmentSchema).optional(),
      })
      .passthrough(),
  );

/** Portkey ListFilesQuery; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputListFilesQuerySchema.parse(value);`
 */
export type GatewayInferenceInputListFilesQuery = { purpose?: string };
export const GatewayInferenceInputListFilesQuerySchema: z.ZodType<GatewayInferenceInputListFilesQuery> =
  z.lazy(() => z.object({ purpose: z.string().optional() }).strict());

/** Portkey ListFilesResponse; additive response fields are preserved.
 * @example `GatewayInferenceListFilesResponseSchema.parse(value);`
 */
export type GatewayInferenceListFilesResponse = {
  data: Array<GatewayInferenceOpenAIFile>;
  object: 'list';
  [key: string]: unknown;
};
export const GatewayInferenceListFilesResponseSchema: z.ZodType<GatewayInferenceListFilesResponse> =
  z.lazy(() =>
    z
      .object({ data: z.array(GatewayInferenceOpenAIFileSchema), object: z.literal('list') })
      .passthrough(),
  );

/** Portkey OpenAIFile; additive response fields are preserved.
 * @example `GatewayInferenceOpenAIFileSchema.parse(value);`
 */
export type GatewayInferenceOpenAIFile = {
  id: string;
  bytes: number;
  created_at: number;
  filename: string;
  object: 'file';
  purpose:
    | 'assistants'
    | 'assistants_output'
    | 'batch'
    | 'batch_output'
    | 'fine-tune'
    | 'fine-tune-results'
    | 'vision';
  status: 'uploaded' | 'processed' | 'error';
  status_details?: string | null;
  [key: string]: unknown;
};
export const GatewayInferenceOpenAIFileSchema: z.ZodType<GatewayInferenceOpenAIFile> = z.lazy(() =>
  z
    .object({
      id: z.string(),
      bytes: z.number().finite().int(),
      created_at: z.number().finite().int(),
      filename: z.string(),
      object: z.literal('file'),
      purpose: z.union([
        z.literal('assistants'),
        z.literal('assistants_output'),
        z.literal('batch'),
        z.literal('batch_output'),
        z.literal('fine-tune'),
        z.literal('fine-tune-results'),
        z.literal('vision'),
      ]),
      status: z.union([z.literal('uploaded'), z.literal('processed'), z.literal('error')]),
      status_details: z.string().nullable().optional(),
    })
    .passthrough(),
);

/** Portkey CreateFileRequest; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputCreateFileRequestSchema.parse(value);`
 */
export type GatewayInferenceInputCreateFileRequest = {
  file: Blob;
  purpose: 'assistants' | 'batch' | 'fine-tune' | 'vision';
};
export const GatewayInferenceInputCreateFileRequestSchema: z.ZodType<GatewayInferenceInputCreateFileRequest> =
  z.lazy(() =>
    z
      .object({
        file: z.instanceof(Blob),
        purpose: z.union([
          z.literal('assistants'),
          z.literal('batch'),
          z.literal('fine-tune'),
          z.literal('vision'),
        ]),
      })
      .strict(),
  );

/** Portkey DeleteFileResponse; additive response fields are preserved.
 * @example `GatewayInferenceDeleteFileResponseSchema.parse(value);`
 */
export type GatewayInferenceDeleteFileResponse = {
  id: string;
  object: 'file';
  deleted: boolean;
  [key: string]: unknown;
};
export const GatewayInferenceDeleteFileResponseSchema: z.ZodType<GatewayInferenceDeleteFileResponse> =
  z.lazy(() =>
    z.object({ id: z.string(), object: z.literal('file'), deleted: z.boolean() }).passthrough(),
  );

/** Portkey CreateFineTuningJobRequest; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputCreateFineTuningJobRequestSchema.parse(value);`
 */
export type GatewayInferenceInputCreateFineTuningJobRequest =
  | GatewayInferenceInputOpenAIFinetuneJob
  | GatewayInferenceInputBedrockFinetuneJob
  | GatewayInferenceInputPortkeyFinetuneJob;
export const GatewayInferenceInputCreateFineTuningJobRequestSchema: z.ZodType<GatewayInferenceInputCreateFineTuningJobRequest> =
  z.lazy(() =>
    z.union([
      GatewayInferenceInputOpenAIFinetuneJobSchema,
      GatewayInferenceInputBedrockFinetuneJobSchema,
      GatewayInferenceInputPortkeyFinetuneJobSchema,
    ]),
  );

/** Portkey OpenAIFinetuneJob; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputOpenAIFinetuneJobSchema.parse(value);`
 */
export type GatewayInferenceInputOpenAIFinetuneJob = {
  model: string;
  training_file: string;
  validation_file?: string;
  suffix: string;
  method: {
    type: 'supervised' | 'dpo';
    supervised?: {
      hyperparameters: { n_epochs: number; learning_rate_multiplier: number; batch_size: number };
    };
    dpo?: {
      hyperparameters: { n_epochs: number; learning_rate_multiplier: number; batch_size: number };
    };
  };
};
export const GatewayInferenceInputOpenAIFinetuneJobSchema: z.ZodType<GatewayInferenceInputOpenAIFinetuneJob> =
  z.lazy(() =>
    z
      .object({
        model: z.string(),
        training_file: z.string(),
        validation_file: z.string().optional(),
        suffix: z.string(),
        method: z
          .object({
            type: z.union([z.literal('supervised'), z.literal('dpo')]),
            supervised: z
              .object({
                hyperparameters: z
                  .object({
                    n_epochs: z.number().finite().int(),
                    learning_rate_multiplier: z.number().finite(),
                    batch_size: z.number().finite().int(),
                  })
                  .strict(),
              })
              .strict()
              .optional(),
            dpo: z
              .object({
                hyperparameters: z
                  .object({
                    n_epochs: z.number().finite().int(),
                    learning_rate_multiplier: z.number().finite(),
                    batch_size: z.number().finite().int(),
                  })
                  .strict(),
              })
              .strict()
              .optional(),
          })
          .strict(),
      })
      .strict(),
  );

/** Portkey BedrockFinetuneJob; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputBedrockFinetuneJobSchema.parse(value);`
 */
export type GatewayInferenceInputBedrockFinetuneJob = {
  model: string;
  training_file: string;
  validation_file?: string;
  suffix: string;
  method: {
    type: 'supervised' | 'dpo';
    supervised?: {
      hyperparameters: { n_epochs: number; learning_rate_multiplier: number; batch_size: number };
    };
    dpo?: {
      hyperparameters: { n_epochs: number; learning_rate_multiplier: number; batch_size: number };
    };
  };
  job_name?: string;
  role_arn?: string;
  output_file?: string;
};
export const GatewayInferenceInputBedrockFinetuneJobSchema: z.ZodType<GatewayInferenceInputBedrockFinetuneJob> =
  z.lazy(() =>
    z
      .object({
        model: z.string(),
        training_file: z.string(),
        validation_file: z.string().optional(),
        suffix: z.string(),
        method: z
          .object({
            type: z.union([z.literal('supervised'), z.literal('dpo')]),
            supervised: z
              .object({
                hyperparameters: z
                  .object({
                    n_epochs: z.number().finite().int(),
                    learning_rate_multiplier: z.number().finite(),
                    batch_size: z.number().finite().int(),
                  })
                  .strict(),
              })
              .strict()
              .optional(),
            dpo: z
              .object({
                hyperparameters: z
                  .object({
                    n_epochs: z.number().finite().int(),
                    learning_rate_multiplier: z.number().finite(),
                    batch_size: z.number().finite().int(),
                  })
                  .strict(),
              })
              .strict()
              .optional(),
          })
          .strict(),
        job_name: z.string().optional(),
        role_arn: z.string().optional(),
        output_file: z.string().optional(),
      })
      .strict(),
  );

/** Portkey PortkeyFinetuneJob; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputPortkeyFinetuneJobSchema.parse(value);`
 */
export type GatewayInferenceInputPortkeyFinetuneJob = {
  model: string;
  training_file: string;
  validation_file?: string;
  suffix: string;
  method: {
    type: 'supervised' | 'dpo';
    supervised?: {
      hyperparameters: { n_epochs: number; learning_rate_multiplier: number; batch_size: number };
    };
    dpo?: {
      hyperparameters: { n_epochs: number; learning_rate_multiplier: number; batch_size: number };
    };
  };
  job_name?: string;
  role_arn?: string;
  output_file?: string;
  portkey_options?: {
    'x-portkey-virtual-key': string;
    'x-portkey-aws-s3-bucket'?: string;
    'x-portkey-vertex-storage-bucket-name'?: string;
  };
  provider_options?: { job_name?: string; role_arn?: string; output_file?: string };
};
export const GatewayInferenceInputPortkeyFinetuneJobSchema: z.ZodType<GatewayInferenceInputPortkeyFinetuneJob> =
  z.lazy(() =>
    z
      .object({
        model: z.string(),
        training_file: z.string(),
        validation_file: z.string().optional(),
        suffix: z.string(),
        method: z
          .object({
            type: z.union([z.literal('supervised'), z.literal('dpo')]),
            supervised: z
              .object({
                hyperparameters: z
                  .object({
                    n_epochs: z.number().finite().int(),
                    learning_rate_multiplier: z.number().finite(),
                    batch_size: z.number().finite().int(),
                  })
                  .strict(),
              })
              .strict()
              .optional(),
            dpo: z
              .object({
                hyperparameters: z
                  .object({
                    n_epochs: z.number().finite().int(),
                    learning_rate_multiplier: z.number().finite(),
                    batch_size: z.number().finite().int(),
                  })
                  .strict(),
              })
              .strict()
              .optional(),
          })
          .strict(),
        job_name: z.string().optional(),
        role_arn: z.string().optional(),
        output_file: z.string().optional(),
        portkey_options: z
          .object({
            'x-portkey-virtual-key': z.string(),
            'x-portkey-aws-s3-bucket': z.string().optional(),
            'x-portkey-vertex-storage-bucket-name': z.string().optional(),
          })
          .strict()
          .optional(),
        provider_options: z
          .object({
            job_name: z.string().optional(),
            role_arn: z.string().optional(),
            output_file: z.string().optional(),
          })
          .strict()
          .optional(),
      })
      .strict(),
  );

/** Portkey FineTuningJob; additive response fields are preserved.
 * @example `GatewayInferenceFineTuningJobSchema.parse(value);`
 */
export type GatewayInferenceFineTuningJob = {
  id: string;
  created_at: number;
  error: { code: string; message: string; param: string | null; [key: string]: unknown } | null;
  fine_tuned_model: string | null;
  finished_at: number | null;
  hyperparameters: { n_epochs: 'auto' | number; [key: string]: unknown };
  model: string;
  object: 'fine_tuning.job';
  organization_id: string;
  result_files: Array<string>;
  status: 'validating_files' | 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
  trained_tokens: number | null;
  training_file: string;
  validation_file: string | null;
  integrations?: Array<GatewayInferenceFineTuningIntegration> | null;
  seed: number;
  estimated_finish?: number | null;
  [key: string]: unknown;
};
export const GatewayInferenceFineTuningJobSchema: z.ZodType<GatewayInferenceFineTuningJob> = z.lazy(
  () =>
    z
      .object({
        id: z.string(),
        created_at: z.number().finite().int(),
        error: z
          .object({ code: z.string(), message: z.string(), param: z.string().nullable() })
          .passthrough()
          .nullable(),
        fine_tuned_model: z.string().nullable(),
        finished_at: z.number().finite().int().nullable(),
        hyperparameters: z
          .object({
            n_epochs: z.union([z.literal('auto'), z.number().finite().int().min(1).max(50)]),
          })
          .passthrough(),
        model: z.string(),
        object: z.literal('fine_tuning.job'),
        organization_id: z.string(),
        result_files: z.array(z.string()),
        status: z.union([
          z.literal('validating_files'),
          z.literal('queued'),
          z.literal('running'),
          z.literal('succeeded'),
          z.literal('failed'),
          z.literal('cancelled'),
        ]),
        trained_tokens: z.number().finite().int().nullable(),
        training_file: z.string(),
        validation_file: z.string().nullable(),
        integrations: z
          .array(GatewayInferenceFineTuningIntegrationSchema)
          .max(5)
          .nullable()
          .optional(),
        seed: z.number().finite().int(),
        estimated_finish: z.number().finite().int().nullable().optional(),
      })
      .passthrough(),
);

/** Portkey FineTuningIntegration; additive response fields are preserved.
 * @example `GatewayInferenceFineTuningIntegrationSchema.parse(value);`
 */
export type GatewayInferenceFineTuningIntegration = {
  type: 'wandb';
  wandb: {
    project: string;
    name?: string | null;
    entity?: string | null;
    tags?: Array<string>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};
export const GatewayInferenceFineTuningIntegrationSchema: z.ZodType<GatewayInferenceFineTuningIntegration> =
  z.lazy(() =>
    z
      .object({
        type: z.literal('wandb'),
        wandb: z
          .object({
            project: z.string(),
            name: z.string().nullable().optional(),
            entity: z.string().nullable().optional(),
            tags: z.array(z.string()).optional(),
          })
          .passthrough(),
      })
      .passthrough(),
  );

/** Portkey ListPaginatedFineTuningJobsQuery; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputListPaginatedFineTuningJobsQuerySchema.parse(value);`
 */
export type GatewayInferenceInputListPaginatedFineTuningJobsQuery = {
  after?: string;
  limit?: number;
};
export const GatewayInferenceInputListPaginatedFineTuningJobsQuerySchema: z.ZodType<GatewayInferenceInputListPaginatedFineTuningJobsQuery> =
  z.lazy(() =>
    z
      .object({ after: z.string().optional(), limit: z.number().finite().int().optional() })
      .strict(),
  );

/** Portkey ListPaginatedFineTuningJobsResponse; additive response fields are preserved.
 * @example `GatewayInferenceListPaginatedFineTuningJobsResponseSchema.parse(value);`
 */
export type GatewayInferenceListPaginatedFineTuningJobsResponse = {
  data: Array<GatewayInferenceFineTuningJob>;
  has_more: boolean;
  object: 'list';
  [key: string]: unknown;
};
export const GatewayInferenceListPaginatedFineTuningJobsResponseSchema: z.ZodType<GatewayInferenceListPaginatedFineTuningJobsResponse> =
  z.lazy(() =>
    z
      .object({
        data: z.array(GatewayInferenceFineTuningJobSchema),
        has_more: z.boolean(),
        object: z.literal('list'),
      })
      .passthrough(),
  );

/** Portkey ListFineTuningEventsQuery; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputListFineTuningEventsQuerySchema.parse(value);`
 */
export type GatewayInferenceInputListFineTuningEventsQuery = { after?: string; limit?: number };
export const GatewayInferenceInputListFineTuningEventsQuerySchema: z.ZodType<GatewayInferenceInputListFineTuningEventsQuery> =
  z.lazy(() =>
    z
      .object({ after: z.string().optional(), limit: z.number().finite().int().optional() })
      .strict(),
  );

/** Portkey ListFineTuningJobEventsResponse; additive response fields are preserved.
 * @example `GatewayInferenceListFineTuningJobEventsResponseSchema.parse(value);`
 */
export type GatewayInferenceListFineTuningJobEventsResponse = {
  data: Array<GatewayInferenceFineTuningJobEvent>;
  object: 'list';
  [key: string]: unknown;
};
export const GatewayInferenceListFineTuningJobEventsResponseSchema: z.ZodType<GatewayInferenceListFineTuningJobEventsResponse> =
  z.lazy(() =>
    z
      .object({
        data: z.array(GatewayInferenceFineTuningJobEventSchema),
        object: z.literal('list'),
      })
      .passthrough(),
  );

/** Portkey FineTuningJobEvent; additive response fields are preserved.
 * @example `GatewayInferenceFineTuningJobEventSchema.parse(value);`
 */
export type GatewayInferenceFineTuningJobEvent = {
  id: string;
  created_at: number;
  level: 'info' | 'warn' | 'error';
  message: string;
  object: 'fine_tuning.job.event';
  [key: string]: unknown;
};
export const GatewayInferenceFineTuningJobEventSchema: z.ZodType<GatewayInferenceFineTuningJobEvent> =
  z.lazy(() =>
    z
      .object({
        id: z.string(),
        created_at: z.number().finite().int(),
        level: z.union([z.literal('info'), z.literal('warn'), z.literal('error')]),
        message: z.string(),
        object: z.literal('fine_tuning.job.event'),
      })
      .passthrough(),
  );

/** Portkey ListFineTuningJobCheckpointsQuery; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputListFineTuningJobCheckpointsQuerySchema.parse(value);`
 */
export type GatewayInferenceInputListFineTuningJobCheckpointsQuery = {
  after?: string;
  limit?: number;
};
export const GatewayInferenceInputListFineTuningJobCheckpointsQuerySchema: z.ZodType<GatewayInferenceInputListFineTuningJobCheckpointsQuery> =
  z.lazy(() =>
    z
      .object({ after: z.string().optional(), limit: z.number().finite().int().optional() })
      .strict(),
  );

/** Portkey ListFineTuningJobCheckpointsResponse; additive response fields are preserved.
 * @example `GatewayInferenceListFineTuningJobCheckpointsResponseSchema.parse(value);`
 */
export type GatewayInferenceListFineTuningJobCheckpointsResponse = {
  data: Array<GatewayInferenceFineTuningJobCheckpoint>;
  object: 'list';
  first_id?: string | null;
  last_id?: string | null;
  has_more: boolean;
  [key: string]: unknown;
};
export const GatewayInferenceListFineTuningJobCheckpointsResponseSchema: z.ZodType<GatewayInferenceListFineTuningJobCheckpointsResponse> =
  z.lazy(() =>
    z
      .object({
        data: z.array(GatewayInferenceFineTuningJobCheckpointSchema),
        object: z.literal('list'),
        first_id: z.string().nullable().optional(),
        last_id: z.string().nullable().optional(),
        has_more: z.boolean(),
      })
      .passthrough(),
  );

/** Portkey FineTuningJobCheckpoint; additive response fields are preserved.
 * @example `GatewayInferenceFineTuningJobCheckpointSchema.parse(value);`
 */
export type GatewayInferenceFineTuningJobCheckpoint = {
  id: string;
  created_at: number;
  fine_tuned_model_checkpoint: string;
  step_number: number;
  metrics: {
    step?: number;
    train_loss?: number;
    train_mean_token_accuracy?: number;
    valid_loss?: number;
    valid_mean_token_accuracy?: number;
    full_valid_loss?: number;
    full_valid_mean_token_accuracy?: number;
    [key: string]: unknown;
  };
  fine_tuning_job_id: string;
  object: 'fine_tuning.job.checkpoint';
  [key: string]: unknown;
};
export const GatewayInferenceFineTuningJobCheckpointSchema: z.ZodType<GatewayInferenceFineTuningJobCheckpoint> =
  z.lazy(() =>
    z
      .object({
        id: z.string(),
        created_at: z.number().finite().int(),
        fine_tuned_model_checkpoint: z.string(),
        step_number: z.number().finite().int(),
        metrics: z
          .object({
            step: z.number().finite().optional(),
            train_loss: z.number().finite().optional(),
            train_mean_token_accuracy: z.number().finite().optional(),
            valid_loss: z.number().finite().optional(),
            valid_mean_token_accuracy: z.number().finite().optional(),
            full_valid_loss: z.number().finite().optional(),
            full_valid_mean_token_accuracy: z.number().finite().optional(),
          })
          .passthrough(),
        fine_tuning_job_id: z.string(),
        object: z.literal('fine_tuning.job.checkpoint'),
      })
      .passthrough(),
  );

/** Portkey ListModelsQuery; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputListModelsQuerySchema.parse(value);`
 */
export type GatewayInferenceInputListModelsQuery = {
  ai_service?: string;
  provider?: string;
  limit?: number;
  offset?: number;
  sort?: 'name' | 'provider' | 'ai_service';
  order?: 'asc' | 'desc';
};
export const GatewayInferenceInputListModelsQuerySchema: z.ZodType<GatewayInferenceInputListModelsQuery> =
  z.lazy(() =>
    z
      .object({
        ai_service: z.string().optional(),
        provider: z.string().optional(),
        limit: z.number().finite().int().optional(),
        offset: z.number().finite().int().optional(),
        sort: z
          .union([z.literal('name'), z.literal('provider'), z.literal('ai_service')])
          .optional(),
        order: z.union([z.literal('asc'), z.literal('desc')]).optional(),
      })
      .strict(),
  );

/** Portkey ListModelsResponse; additive response fields are preserved.
 * @example `GatewayInferenceListModelsResponseSchema.parse(value);`
 */
export type GatewayInferenceListModelsResponse = {
  object: 'list';
  data: Array<GatewayInferenceModel>;
  [key: string]: unknown;
};
export const GatewayInferenceListModelsResponseSchema: z.ZodType<GatewayInferenceListModelsResponse> =
  z.lazy(() =>
    z
      .object({ object: z.literal('list'), data: z.array(GatewayInferenceModelSchema) })
      .passthrough(),
  );

/** Portkey Model; additive response fields are preserved.
 * @example `GatewayInferenceModelSchema.parse(value);`
 */
export type GatewayInferenceModel = {
  id: string;
  created: number;
  object: 'model';
  owned_by: string;
  [key: string]: unknown;
};
export const GatewayInferenceModelSchema: z.ZodType<GatewayInferenceModel> = z.lazy(() =>
  z
    .object({
      id: z.string(),
      created: z.number().finite().int(),
      object: z.literal('model'),
      owned_by: z.string(),
    })
    .passthrough(),
);

/** Portkey DeleteModelResponse; additive response fields are preserved.
 * @example `GatewayInferenceDeleteModelResponseSchema.parse(value);`
 */
export type GatewayInferenceDeleteModelResponse = {
  id: string;
  deleted: boolean;
  object: string;
  [key: string]: unknown;
};
export const GatewayInferenceDeleteModelResponseSchema: z.ZodType<GatewayInferenceDeleteModelResponse> =
  z.lazy(() =>
    z.object({ id: z.string(), deleted: z.boolean(), object: z.string() }).passthrough(),
  );

/** Portkey CreateModerationRequest; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputCreateModerationRequestSchema.parse(value);`
 */
export type GatewayInferenceInputCreateModerationRequest = {
  input: string | Array<string>;
  model?: string | 'text-moderation-latest' | 'text-moderation-stable';
};
export const GatewayInferenceInputCreateModerationRequestSchema: z.ZodType<GatewayInferenceInputCreateModerationRequest> =
  z.lazy(() =>
    z
      .object({
        input: z.union([z.string(), z.array(z.string())]),
        model: z
          .union([
            z.string(),
            z.union([z.literal('text-moderation-latest'), z.literal('text-moderation-stable')]),
          ])
          .optional(),
      })
      .strict(),
  );

/** Portkey CreateModerationResponse; additive response fields are preserved.
 * @example `GatewayInferenceCreateModerationResponseSchema.parse(value);`
 */
export type GatewayInferenceCreateModerationResponse = {
  id: string;
  model: string;
  results: Array<{
    flagged: boolean;
    categories: {
      hate: boolean;
      'hate/threatening': boolean;
      harassment: boolean;
      'harassment/threatening': boolean;
      'self-harm': boolean;
      'self-harm/intent': boolean;
      'self-harm/instructions': boolean;
      sexual: boolean;
      'sexual/minors': boolean;
      violence: boolean;
      'violence/graphic': boolean;
      [key: string]: unknown;
    };
    category_scores: {
      hate: number;
      'hate/threatening': number;
      harassment: number;
      'harassment/threatening': number;
      'self-harm': number;
      'self-harm/intent': number;
      'self-harm/instructions': number;
      sexual: number;
      'sexual/minors': number;
      violence: number;
      'violence/graphic': number;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
};
export const GatewayInferenceCreateModerationResponseSchema: z.ZodType<GatewayInferenceCreateModerationResponse> =
  z.lazy(() =>
    z
      .object({
        id: z.string(),
        model: z.string(),
        results: z.array(
          z
            .object({
              flagged: z.boolean(),
              categories: z
                .object({
                  hate: z.boolean(),
                  'hate/threatening': z.boolean(),
                  harassment: z.boolean(),
                  'harassment/threatening': z.boolean(),
                  'self-harm': z.boolean(),
                  'self-harm/intent': z.boolean(),
                  'self-harm/instructions': z.boolean(),
                  sexual: z.boolean(),
                  'sexual/minors': z.boolean(),
                  violence: z.boolean(),
                  'violence/graphic': z.boolean(),
                })
                .passthrough(),
              category_scores: z
                .object({
                  hate: z.number().finite(),
                  'hate/threatening': z.number().finite(),
                  harassment: z.number().finite(),
                  'harassment/threatening': z.number().finite(),
                  'self-harm': z.number().finite(),
                  'self-harm/intent': z.number().finite(),
                  'self-harm/instructions': z.number().finite(),
                  sexual: z.number().finite(),
                  'sexual/minors': z.number().finite(),
                  violence: z.number().finite(),
                  'violence/graphic': z.number().finite(),
                })
                .passthrough(),
            })
            .passthrough(),
        ),
      })
      .passthrough(),
  );

/** Portkey GetResponseQuery; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputGetResponseQuerySchema.parse(value);`
 */
export type GatewayInferenceInputGetResponseQuery = {
  include?: Array<GatewayInferenceInputIncludable>;
};
export const GatewayInferenceInputGetResponseQuerySchema: z.ZodType<GatewayInferenceInputGetResponseQuery> =
  z.lazy(() =>
    z.object({ include: z.array(GatewayInferenceInputIncludableSchema).optional() }).strict(),
  );

/** Portkey ListInputItemsQuery; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputListInputItemsQuerySchema.parse(value);`
 */
export type GatewayInferenceInputListInputItemsQuery = {
  limit?: number;
  order?: 'asc' | 'desc';
  after?: string;
  before?: string;
};
export const GatewayInferenceInputListInputItemsQuerySchema: z.ZodType<GatewayInferenceInputListInputItemsQuery> =
  z.lazy(() =>
    z
      .object({
        limit: z.number().finite().int().optional(),
        order: z.union([z.literal('asc'), z.literal('desc')]).optional(),
        after: z.string().optional(),
        before: z.string().optional(),
      })
      .strict(),
  );

/** Portkey ResponseItemList; additive response fields are preserved.
 * @example `GatewayInferenceResponseItemListSchema.parse(value);`
 */
export type GatewayInferenceResponseItemList = {
  object: 'list';
  data: Array<GatewayInferenceItemResource>;
  has_more: boolean;
  first_id: string;
  last_id: string;
  [key: string]: unknown;
};
export const GatewayInferenceResponseItemListSchema: z.ZodType<GatewayInferenceResponseItemList> =
  z.lazy(() =>
    z
      .object({
        object: z.literal('list'),
        data: z.array(GatewayInferenceItemResourceSchema),
        has_more: z.boolean(),
        first_id: z.string(),
        last_id: z.string(),
      })
      .passthrough(),
  );

/** Portkey ItemResource; additive response fields are preserved.
 * @example `GatewayInferenceItemResourceSchema.parse(value);`
 */
export type GatewayInferenceItemResource =
  | GatewayInferenceInputMessageResource
  | GatewayInferenceOutputMessage
  | GatewayInferenceFileSearchToolCall
  | GatewayInferenceComputerToolCall
  | GatewayInferenceComputerToolCallOutputResource
  | GatewayInferenceWebSearchToolCall
  | GatewayInferenceFunctionToolCallResource
  | GatewayInferenceFunctionToolCallOutputResource;
export const GatewayInferenceItemResourceSchema: z.ZodType<GatewayInferenceItemResource> = z.lazy(
  () =>
    z.union([
      GatewayInferenceInputMessageResourceSchema,
      GatewayInferenceOutputMessageSchema,
      GatewayInferenceFileSearchToolCallSchema,
      GatewayInferenceComputerToolCallSchema,
      GatewayInferenceComputerToolCallOutputResourceSchema,
      GatewayInferenceWebSearchToolCallSchema,
      GatewayInferenceFunctionToolCallResourceSchema,
      GatewayInferenceFunctionToolCallOutputResourceSchema,
    ]),
);

/** Portkey InputMessageResource; additive response fields are preserved.
 * @example `GatewayInferenceInputMessageResourceSchema.parse(value);`
 */
export type GatewayInferenceInputMessageResource = {
  type?: 'message';
  role: 'user' | 'system' | 'developer';
  status?: 'in_progress' | 'completed' | 'incomplete';
  content: GatewayInferenceInputMessageContentList;
  id: string;
  [key: string]: unknown;
};
export const GatewayInferenceInputMessageResourceSchema: z.ZodType<GatewayInferenceInputMessageResource> =
  z.lazy(() =>
    z
      .object({
        type: z.literal('message').optional(),
        role: z.union([z.literal('user'), z.literal('system'), z.literal('developer')]),
        status: z
          .union([z.literal('in_progress'), z.literal('completed'), z.literal('incomplete')])
          .optional(),
        content: GatewayInferenceInputMessageContentListSchema,
        id: z.string(),
      })
      .passthrough(),
  );

/** Portkey InputMessageContentList; additive response fields are preserved.
 * @example `GatewayInferenceInputMessageContentListSchema.parse(value);`
 */
export type GatewayInferenceInputMessageContentList = Array<GatewayInferenceInputContent>;
export const GatewayInferenceInputMessageContentListSchema: z.ZodType<GatewayInferenceInputMessageContentList> =
  z.lazy(() => z.array(GatewayInferenceInputContentSchema));

/** Portkey InputContent; additive response fields are preserved.
 * @example `GatewayInferenceInputContentSchema.parse(value);`
 */
export type GatewayInferenceInputContent =
  | GatewayInferenceInputText
  | GatewayInferenceInputImage
  | GatewayInferenceInputFile;
export const GatewayInferenceInputContentSchema: z.ZodType<GatewayInferenceInputContent> = z.lazy(
  () =>
    z.union([
      GatewayInferenceInputTextSchema,
      GatewayInferenceInputImageSchema,
      GatewayInferenceInputFileSchema,
    ]),
);

/** Portkey InputText; additive response fields are preserved.
 * @example `GatewayInferenceInputTextSchema.parse(value);`
 */
export type GatewayInferenceInputText = {
  type: 'input_text';
  text: string;
  [key: string]: unknown;
};
export const GatewayInferenceInputTextSchema: z.ZodType<GatewayInferenceInputText> = z.lazy(() =>
  z.object({ type: z.literal('input_text'), text: z.string() }).passthrough(),
);

/** Portkey InputImage; additive response fields are preserved.
 * @example `GatewayInferenceInputImageSchema.parse(value);`
 */
export type GatewayInferenceInputImage = {
  type: 'input_image';
  image_url?: string | null;
  file_id?: string | null;
  detail: 'high' | 'low' | 'auto';
  [key: string]: unknown;
};
export const GatewayInferenceInputImageSchema: z.ZodType<GatewayInferenceInputImage> = z.lazy(() =>
  z
    .object({
      type: z.literal('input_image'),
      image_url: z.string().nullable().optional(),
      file_id: z.string().nullable().optional(),
      detail: z.union([z.literal('high'), z.literal('low'), z.literal('auto')]),
    })
    .passthrough(),
);

/** Portkey InputFile; additive response fields are preserved.
 * @example `GatewayInferenceInputFileSchema.parse(value);`
 */
export type GatewayInferenceInputFile = {
  type: 'input_file';
  file_id?: string;
  filename?: string;
  file_data?: string;
  [key: string]: unknown;
};
export const GatewayInferenceInputFileSchema: z.ZodType<GatewayInferenceInputFile> = z.lazy(() =>
  z
    .object({
      type: z.literal('input_file'),
      file_id: z.string().optional(),
      filename: z.string().optional(),
      file_data: z.string().optional(),
    })
    .passthrough(),
);

/** Portkey ComputerToolCallOutputResource; additive response fields are preserved.
 * @example `GatewayInferenceComputerToolCallOutputResourceSchema.parse(value);`
 */
export type GatewayInferenceComputerToolCallOutputResource = {
  type: 'computer_call_output';
  id: string;
  call_id: string;
  acknowledged_safety_checks?: Array<GatewayInferenceComputerToolCallSafetyCheck>;
  output: GatewayInferenceComputerScreenshotImage;
  status?: 'in_progress' | 'completed' | 'incomplete';
  [key: string]: unknown;
};
export const GatewayInferenceComputerToolCallOutputResourceSchema: z.ZodType<GatewayInferenceComputerToolCallOutputResource> =
  z.lazy(() =>
    z
      .object({
        type: z.literal('computer_call_output'),
        id: z.string(),
        call_id: z.string(),
        acknowledged_safety_checks: z
          .array(GatewayInferenceComputerToolCallSafetyCheckSchema)
          .optional(),
        output: GatewayInferenceComputerScreenshotImageSchema,
        status: z
          .union([z.literal('in_progress'), z.literal('completed'), z.literal('incomplete')])
          .optional(),
      })
      .passthrough(),
  );

/** Portkey ComputerScreenshotImage; additive response fields are preserved.
 * @example `GatewayInferenceComputerScreenshotImageSchema.parse(value);`
 */
export type GatewayInferenceComputerScreenshotImage = {
  type: 'computer_screenshot';
  image_url?: string;
  file_id?: string;
  [key: string]: unknown;
};
export const GatewayInferenceComputerScreenshotImageSchema: z.ZodType<GatewayInferenceComputerScreenshotImage> =
  z.lazy(() =>
    z
      .object({
        type: z.literal('computer_screenshot'),
        image_url: z.string().optional(),
        file_id: z.string().optional(),
      })
      .passthrough(),
  );

/** Portkey FunctionToolCallResource; additive response fields are preserved.
 * @example `GatewayInferenceFunctionToolCallResourceSchema.parse(value);`
 */
export type GatewayInferenceFunctionToolCallResource = {
  id: string;
  type: 'function_call';
  call_id: string;
  name: string;
  arguments: string;
  status?: 'in_progress' | 'completed' | 'incomplete';
  [key: string]: unknown;
};
export const GatewayInferenceFunctionToolCallResourceSchema: z.ZodType<GatewayInferenceFunctionToolCallResource> =
  z.lazy(() =>
    z
      .object({
        id: z.string(),
        type: z.literal('function_call'),
        call_id: z.string(),
        name: z.string(),
        arguments: z.string(),
        status: z
          .union([z.literal('in_progress'), z.literal('completed'), z.literal('incomplete')])
          .optional(),
      })
      .passthrough(),
  );

/** Portkey FunctionToolCallOutputResource; additive response fields are preserved.
 * @example `GatewayInferenceFunctionToolCallOutputResourceSchema.parse(value);`
 */
export type GatewayInferenceFunctionToolCallOutputResource = {
  id: string;
  type: 'function_call_output';
  call_id: string;
  output: string;
  status?: 'in_progress' | 'completed' | 'incomplete';
  [key: string]: unknown;
};
export const GatewayInferenceFunctionToolCallOutputResourceSchema: z.ZodType<GatewayInferenceFunctionToolCallOutputResource> =
  z.lazy(() =>
    z
      .object({
        id: z.string(),
        type: z.literal('function_call_output'),
        call_id: z.string(),
        output: z.string(),
        status: z
          .union([z.literal('in_progress'), z.literal('completed'), z.literal('incomplete')])
          .optional(),
      })
      .passthrough(),
  );

/** Portkey ListVectorStoresQuery; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputListVectorStoresQuerySchema.parse(value);`
 */
export type GatewayInferenceInputListVectorStoresQuery = {
  limit?: number;
  order?: 'asc' | 'desc';
  after?: string;
  before?: string;
};
export const GatewayInferenceInputListVectorStoresQuerySchema: z.ZodType<GatewayInferenceInputListVectorStoresQuery> =
  z.lazy(() =>
    z
      .object({
        limit: z.number().finite().int().optional(),
        order: z.union([z.literal('asc'), z.literal('desc')]).optional(),
        after: z.string().optional(),
        before: z.string().optional(),
      })
      .strict(),
  );

/** Portkey ListVectorStoresResponse; additive response fields are preserved.
 * @example `GatewayInferenceListVectorStoresResponseSchema.parse(value);`
 */
export type GatewayInferenceListVectorStoresResponse = {
  object: string;
  data: Array<GatewayInferenceVectorStoreObject>;
  first_id: string | null;
  last_id: string | null;
  has_more: boolean;
  [key: string]: unknown;
};
export const GatewayInferenceListVectorStoresResponseSchema: z.ZodType<GatewayInferenceListVectorStoresResponse> =
  z.lazy(() =>
    z
      .object({
        object: z.string(),
        data: z.array(GatewayInferenceVectorStoreObjectSchema),
        first_id: z.string().nullable(),
        last_id: z.string().nullable(),
        has_more: z.boolean(),
      })
      .passthrough(),
  );

/** Portkey VectorStoreObject; additive response fields are preserved.
 * @example `GatewayInferenceVectorStoreObjectSchema.parse(value);`
 */
export type GatewayInferenceVectorStoreObject = {
  id: string;
  object: 'vector_store';
  created_at: number;
  name: string;
  usage_bytes: number;
  file_counts: {
    in_progress: number;
    completed: number;
    failed: number;
    cancelled: number;
    total: number;
    [key: string]: unknown;
  };
  status: 'expired' | 'in_progress' | 'completed';
  expires_after?: GatewayInferenceVectorStoreExpirationAfter;
  expires_at?: number | null;
  last_active_at: number | null;
  metadata: { [key: string]: unknown } | null;
  [key: string]: unknown;
};
export const GatewayInferenceVectorStoreObjectSchema: z.ZodType<GatewayInferenceVectorStoreObject> =
  z.lazy(() =>
    z
      .object({
        id: z.string(),
        object: z.literal('vector_store'),
        created_at: z.number().finite().int(),
        name: z.string(),
        usage_bytes: z.number().finite().int(),
        file_counts: z
          .object({
            in_progress: z.number().finite().int(),
            completed: z.number().finite().int(),
            failed: z.number().finite().int(),
            cancelled: z.number().finite().int(),
            total: z.number().finite().int(),
          })
          .passthrough(),
        status: z.union([z.literal('expired'), z.literal('in_progress'), z.literal('completed')]),
        expires_after: GatewayInferenceVectorStoreExpirationAfterSchema.optional(),
        expires_at: z.number().finite().int().nullable().optional(),
        last_active_at: z.number().finite().int().nullable(),
        metadata: z.object({}).passthrough().nullable(),
      })
      .passthrough(),
  );

/** Portkey VectorStoreExpirationAfter; additive response fields are preserved.
 * @example `GatewayInferenceVectorStoreExpirationAfterSchema.parse(value);`
 */
export type GatewayInferenceVectorStoreExpirationAfter = {
  anchor: 'last_active_at';
  days: number;
  [key: string]: unknown;
};
export const GatewayInferenceVectorStoreExpirationAfterSchema: z.ZodType<GatewayInferenceVectorStoreExpirationAfter> =
  z.lazy(() =>
    z
      .object({
        anchor: z.literal('last_active_at'),
        days: z.number().finite().int().min(1).max(365),
      })
      .passthrough(),
  );

/** Portkey CreateVectorStoreRequest; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputCreateVectorStoreRequestSchema.parse(value);`
 */
export type GatewayInferenceInputCreateVectorStoreRequest = {
  file_ids?: Array<string>;
  name?: string;
  expires_after?: GatewayInferenceInputVectorStoreExpirationAfter;
  chunking_strategy?:
    | GatewayInferenceInputAutoChunkingStrategyRequestParam
    | GatewayInferenceInputStaticChunkingStrategyRequestParam;
  metadata?: { [key: string]: GatewayJsonValue } | null;
};
export const GatewayInferenceInputCreateVectorStoreRequestSchema: z.ZodType<GatewayInferenceInputCreateVectorStoreRequest> =
  z.lazy(() =>
    z
      .object({
        file_ids: z.array(z.string()).max(500).optional(),
        name: z.string().optional(),
        expires_after: GatewayInferenceInputVectorStoreExpirationAfterSchema.optional(),
        chunking_strategy: z
          .union([
            GatewayInferenceInputAutoChunkingStrategyRequestParamSchema,
            GatewayInferenceInputStaticChunkingStrategyRequestParamSchema,
          ])
          .optional(),
        metadata: z
          .object({})
          .catchall(GatewayJsonValueSchema)
          .and(GatewayJsonObjectSchema)
          .nullable()
          .optional(),
      })
      .strict(),
  );

/** Portkey VectorStoreExpirationAfter; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputVectorStoreExpirationAfterSchema.parse(value);`
 */
export type GatewayInferenceInputVectorStoreExpirationAfter = {
  anchor: 'last_active_at';
  days: number;
};
export const GatewayInferenceInputVectorStoreExpirationAfterSchema: z.ZodType<GatewayInferenceInputVectorStoreExpirationAfter> =
  z.lazy(() =>
    z
      .object({
        anchor: z.literal('last_active_at'),
        days: z.number().finite().int().min(1).max(365),
      })
      .strict(),
  );

/** Portkey AutoChunkingStrategyRequestParam; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputAutoChunkingStrategyRequestParamSchema.parse(value);`
 */
export type GatewayInferenceInputAutoChunkingStrategyRequestParam = { type: 'auto' };
export const GatewayInferenceInputAutoChunkingStrategyRequestParamSchema: z.ZodType<GatewayInferenceInputAutoChunkingStrategyRequestParam> =
  z.lazy(() => z.object({ type: z.literal('auto') }).strict());

/** Portkey StaticChunkingStrategyRequestParam; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputStaticChunkingStrategyRequestParamSchema.parse(value);`
 */
export type GatewayInferenceInputStaticChunkingStrategyRequestParam = {
  type: 'static';
  static: GatewayInferenceInputStaticChunkingStrategy;
};
export const GatewayInferenceInputStaticChunkingStrategyRequestParamSchema: z.ZodType<GatewayInferenceInputStaticChunkingStrategyRequestParam> =
  z.lazy(() =>
    z
      .object({
        type: z.literal('static'),
        static: GatewayInferenceInputStaticChunkingStrategySchema,
      })
      .strict(),
  );

/** Portkey StaticChunkingStrategy; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputStaticChunkingStrategySchema.parse(value);`
 */
export type GatewayInferenceInputStaticChunkingStrategy = {
  max_chunk_size_tokens: number;
  chunk_overlap_tokens: number;
};
export const GatewayInferenceInputStaticChunkingStrategySchema: z.ZodType<GatewayInferenceInputStaticChunkingStrategy> =
  z.lazy(() =>
    z
      .object({
        max_chunk_size_tokens: z.number().finite().int().min(100).max(4096),
        chunk_overlap_tokens: z.number().finite().int(),
      })
      .strict(),
  );

/** Portkey UpdateVectorStoreRequest; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputUpdateVectorStoreRequestSchema.parse(value);`
 */
export type GatewayInferenceInputUpdateVectorStoreRequest = {
  name?: string | null;
  expires_after?: GatewayInferenceInputVectorStoreExpirationAfter | null;
  metadata?: { [key: string]: GatewayJsonValue } | null;
};
export const GatewayInferenceInputUpdateVectorStoreRequestSchema: z.ZodType<GatewayInferenceInputUpdateVectorStoreRequest> =
  z.lazy(() =>
    z
      .object({
        name: z.string().nullable().optional(),
        expires_after: GatewayInferenceInputVectorStoreExpirationAfterSchema.nullable().optional(),
        metadata: z
          .object({})
          .catchall(GatewayJsonValueSchema)
          .and(GatewayJsonObjectSchema)
          .nullable()
          .optional(),
      })
      .strict(),
  );

/** Portkey DeleteVectorStoreResponse; additive response fields are preserved.
 * @example `GatewayInferenceDeleteVectorStoreResponseSchema.parse(value);`
 */
export type GatewayInferenceDeleteVectorStoreResponse = {
  id: string;
  deleted: boolean;
  object: 'vector_store.deleted';
  [key: string]: unknown;
};
export const GatewayInferenceDeleteVectorStoreResponseSchema: z.ZodType<GatewayInferenceDeleteVectorStoreResponse> =
  z.lazy(() =>
    z
      .object({ id: z.string(), deleted: z.boolean(), object: z.literal('vector_store.deleted') })
      .passthrough(),
  );

/** Portkey ListVectorStoreFilesQuery; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputListVectorStoreFilesQuerySchema.parse(value);`
 */
export type GatewayInferenceInputListVectorStoreFilesQuery = {
  limit?: number;
  order?: 'asc' | 'desc';
  after?: string;
  before?: string;
  filter?: 'in_progress' | 'completed' | 'failed' | 'cancelled';
};
export const GatewayInferenceInputListVectorStoreFilesQuerySchema: z.ZodType<GatewayInferenceInputListVectorStoreFilesQuery> =
  z.lazy(() =>
    z
      .object({
        limit: z.number().finite().int().optional(),
        order: z.union([z.literal('asc'), z.literal('desc')]).optional(),
        after: z.string().optional(),
        before: z.string().optional(),
        filter: z
          .union([
            z.literal('in_progress'),
            z.literal('completed'),
            z.literal('failed'),
            z.literal('cancelled'),
          ])
          .optional(),
      })
      .strict(),
  );

/** Portkey ListVectorStoreFilesResponse; additive response fields are preserved.
 * @example `GatewayInferenceListVectorStoreFilesResponseSchema.parse(value);`
 */
export type GatewayInferenceListVectorStoreFilesResponse = {
  object: string;
  data: Array<GatewayInferenceVectorStoreFileObject>;
  first_id: string | null;
  last_id: string | null;
  has_more: boolean;
  [key: string]: unknown;
};
export const GatewayInferenceListVectorStoreFilesResponseSchema: z.ZodType<GatewayInferenceListVectorStoreFilesResponse> =
  z.lazy(() =>
    z
      .object({
        object: z.string(),
        data: z.array(GatewayInferenceVectorStoreFileObjectSchema),
        first_id: z.string().nullable(),
        last_id: z.string().nullable(),
        has_more: z.boolean(),
      })
      .passthrough(),
  );

/** Portkey VectorStoreFileObject; additive response fields are preserved.
 * @example `GatewayInferenceVectorStoreFileObjectSchema.parse(value);`
 */
export type GatewayInferenceVectorStoreFileObject = {
  id: string;
  object: 'vector_store.file';
  usage_bytes: number;
  created_at: number;
  vector_store_id: string;
  status: 'in_progress' | 'completed' | 'cancelled' | 'failed';
  last_error: {
    code: 'internal_error' | 'file_not_found' | 'parsing_error' | 'unhandled_mime_type';
    message: string;
    [key: string]: unknown;
  } | null;
  chunking_strategy?:
    | GatewayInferenceStaticChunkingStrategyResponseParam
    | GatewayInferenceOtherChunkingStrategyResponseParam;
  [key: string]: unknown;
};
export const GatewayInferenceVectorStoreFileObjectSchema: z.ZodType<GatewayInferenceVectorStoreFileObject> =
  z.lazy(() =>
    z
      .object({
        id: z.string(),
        object: z.literal('vector_store.file'),
        usage_bytes: z.number().finite().int(),
        created_at: z.number().finite().int(),
        vector_store_id: z.string(),
        status: z.union([
          z.literal('in_progress'),
          z.literal('completed'),
          z.literal('cancelled'),
          z.literal('failed'),
        ]),
        last_error: z
          .object({
            code: z.union([
              z.literal('internal_error'),
              z.literal('file_not_found'),
              z.literal('parsing_error'),
              z.literal('unhandled_mime_type'),
            ]),
            message: z.string(),
          })
          .passthrough()
          .nullable(),
        chunking_strategy: z
          .union([
            GatewayInferenceStaticChunkingStrategyResponseParamSchema,
            GatewayInferenceOtherChunkingStrategyResponseParamSchema,
          ])
          .optional(),
      })
      .passthrough(),
  );

/** Portkey StaticChunkingStrategyResponseParam; additive response fields are preserved.
 * @example `GatewayInferenceStaticChunkingStrategyResponseParamSchema.parse(value);`
 */
export type GatewayInferenceStaticChunkingStrategyResponseParam = {
  type: 'static';
  static: GatewayInferenceStaticChunkingStrategy;
  [key: string]: unknown;
};
export const GatewayInferenceStaticChunkingStrategyResponseParamSchema: z.ZodType<GatewayInferenceStaticChunkingStrategyResponseParam> =
  z.lazy(() =>
    z
      .object({ type: z.literal('static'), static: GatewayInferenceStaticChunkingStrategySchema })
      .passthrough(),
  );

/** Portkey StaticChunkingStrategy; additive response fields are preserved.
 * @example `GatewayInferenceStaticChunkingStrategySchema.parse(value);`
 */
export type GatewayInferenceStaticChunkingStrategy = {
  max_chunk_size_tokens: number | 0;
  chunk_overlap_tokens: number;
  [key: string]: unknown;
};
export const GatewayInferenceStaticChunkingStrategySchema: z.ZodType<GatewayInferenceStaticChunkingStrategy> =
  z.lazy(() =>
    z
      .object({
        max_chunk_size_tokens: z.union([
          z.number().finite().int().min(100).max(4096),
          z.literal(0),
        ]),
        chunk_overlap_tokens: z.number().finite().int(),
      })
      .passthrough(),
  );

/** Portkey OtherChunkingStrategyResponseParam; additive response fields are preserved.
 * @example `GatewayInferenceOtherChunkingStrategyResponseParamSchema.parse(value);`
 */
export type GatewayInferenceOtherChunkingStrategyResponseParam = {
  type: 'other';
  [key: string]: unknown;
};
export const GatewayInferenceOtherChunkingStrategyResponseParamSchema: z.ZodType<GatewayInferenceOtherChunkingStrategyResponseParam> =
  z.lazy(() => z.object({ type: z.literal('other') }).passthrough());

/** Portkey CreateVectorStoreFileRequest; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputCreateVectorStoreFileRequestSchema.parse(value);`
 */
export type GatewayInferenceInputCreateVectorStoreFileRequest = {
  file_id: string;
  chunking_strategy?: GatewayInferenceInputChunkingStrategyRequestParam;
};
export const GatewayInferenceInputCreateVectorStoreFileRequestSchema: z.ZodType<GatewayInferenceInputCreateVectorStoreFileRequest> =
  z.lazy(() =>
    z
      .object({
        file_id: z.string(),
        chunking_strategy: GatewayInferenceInputChunkingStrategyRequestParamSchema.optional(),
      })
      .strict(),
  );

/** Portkey ChunkingStrategyRequestParam; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputChunkingStrategyRequestParamSchema.parse(value);`
 */
export type GatewayInferenceInputChunkingStrategyRequestParam =
  | GatewayInferenceInputAutoChunkingStrategyRequestParam
  | GatewayInferenceInputStaticChunkingStrategyRequestParam;
export const GatewayInferenceInputChunkingStrategyRequestParamSchema: z.ZodType<GatewayInferenceInputChunkingStrategyRequestParam> =
  z.lazy(() =>
    z.union([
      GatewayInferenceInputAutoChunkingStrategyRequestParamSchema,
      GatewayInferenceInputStaticChunkingStrategyRequestParamSchema,
    ]),
  );

/** Portkey DeleteVectorStoreFileResponse; additive response fields are preserved.
 * @example `GatewayInferenceDeleteVectorStoreFileResponseSchema.parse(value);`
 */
export type GatewayInferenceDeleteVectorStoreFileResponse = {
  id: string;
  deleted: boolean;
  object: 'vector_store.file.deleted';
  [key: string]: unknown;
};
export const GatewayInferenceDeleteVectorStoreFileResponseSchema: z.ZodType<GatewayInferenceDeleteVectorStoreFileResponse> =
  z.lazy(() =>
    z
      .object({
        id: z.string(),
        deleted: z.boolean(),
        object: z.literal('vector_store.file.deleted'),
      })
      .passthrough(),
  );

/** Portkey CreateVectorStoreFileBatchRequest; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputCreateVectorStoreFileBatchRequestSchema.parse(value);`
 */
export type GatewayInferenceInputCreateVectorStoreFileBatchRequest = {
  file_ids: Array<string>;
  chunking_strategy?: GatewayInferenceInputChunkingStrategyRequestParam;
};
export const GatewayInferenceInputCreateVectorStoreFileBatchRequestSchema: z.ZodType<GatewayInferenceInputCreateVectorStoreFileBatchRequest> =
  z.lazy(() =>
    z
      .object({
        file_ids: z.array(z.string()).min(1).max(500),
        chunking_strategy: GatewayInferenceInputChunkingStrategyRequestParamSchema.optional(),
      })
      .strict(),
  );

/** Portkey VectorStoreFileBatchObject; additive response fields are preserved.
 * @example `GatewayInferenceVectorStoreFileBatchObjectSchema.parse(value);`
 */
export type GatewayInferenceVectorStoreFileBatchObject = {
  id: string;
  object: 'vector_store.files_batch' | 'vector_store.file_batch';
  created_at: number;
  vector_store_id: string;
  status: 'in_progress' | 'completed' | 'cancelled' | 'failed';
  file_counts: {
    in_progress: number;
    completed: number;
    failed: number;
    cancelled: number;
    total: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};
export const GatewayInferenceVectorStoreFileBatchObjectSchema: z.ZodType<GatewayInferenceVectorStoreFileBatchObject> =
  z.lazy(() =>
    z
      .object({
        id: z.string(),
        object: z.union([
          z.literal('vector_store.files_batch'),
          z.literal('vector_store.file_batch'),
        ]),
        created_at: z.number().finite().int(),
        vector_store_id: z.string(),
        status: z.union([
          z.literal('in_progress'),
          z.literal('completed'),
          z.literal('cancelled'),
          z.literal('failed'),
        ]),
        file_counts: z
          .object({
            in_progress: z.number().finite().int(),
            completed: z.number().finite().int(),
            failed: z.number().finite().int(),
            cancelled: z.number().finite().int(),
            total: z.number().finite().int(),
          })
          .passthrough(),
      })
      .passthrough(),
  );

/** Portkey ListFilesInVectorStoreBatchQuery; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputListFilesInVectorStoreBatchQuerySchema.parse(value);`
 */
export type GatewayInferenceInputListFilesInVectorStoreBatchQuery = {
  limit?: number;
  order?: 'asc' | 'desc';
  after?: string;
  before?: string;
  filter?: 'in_progress' | 'completed' | 'failed' | 'cancelled';
};
export const GatewayInferenceInputListFilesInVectorStoreBatchQuerySchema: z.ZodType<GatewayInferenceInputListFilesInVectorStoreBatchQuery> =
  z.lazy(() =>
    z
      .object({
        limit: z.number().finite().int().optional(),
        order: z.union([z.literal('asc'), z.literal('desc')]).optional(),
        after: z.string().optional(),
        before: z.string().optional(),
        filter: z
          .union([
            z.literal('in_progress'),
            z.literal('completed'),
            z.literal('failed'),
            z.literal('cancelled'),
          ])
          .optional(),
      })
      .strict(),
  );

/** Portkey CreateBatchRequest; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputCreateBatchRequestSchema.parse(value);`
 */
export type GatewayInferenceInputCreateBatchRequest =
  | GatewayInferenceInputOpenAIBatchJob
  | GatewayInferenceInputBedrockBatchJob
  | GatewayInferenceInputVertexBatchJob
  | GatewayInferenceInputPortkeyBatchJob;
export const GatewayInferenceInputCreateBatchRequestSchema: z.ZodType<GatewayInferenceInputCreateBatchRequest> =
  z.lazy(() =>
    z.union([
      GatewayInferenceInputOpenAIBatchJobSchema,
      GatewayInferenceInputBedrockBatchJobSchema,
      GatewayInferenceInputVertexBatchJobSchema,
      GatewayInferenceInputPortkeyBatchJobSchema,
    ]),
  );

/** Portkey OpenAIBatchJob; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputOpenAIBatchJobSchema.parse(value);`
 */
export type GatewayInferenceInputOpenAIBatchJob = {
  input_file_id: string;
  completion_window: 'immediate' | '24h';
  endpoint: '/v1/chat/completions' | '/v1/completions' | '/v1/embeddings';
  metadata?: { [key: string]: GatewayJsonValue } | null;
};
export const GatewayInferenceInputOpenAIBatchJobSchema: z.ZodType<GatewayInferenceInputOpenAIBatchJob> =
  z.lazy(() =>
    z
      .object({
        input_file_id: z.string(),
        completion_window: z.union([z.literal('immediate'), z.literal('24h')]),
        endpoint: z.union([
          z.literal('/v1/chat/completions'),
          z.literal('/v1/completions'),
          z.literal('/v1/embeddings'),
        ]),
        metadata: z
          .object({})
          .catchall(GatewayJsonValueSchema)
          .and(GatewayJsonObjectSchema)
          .nullable()
          .optional(),
      })
      .strict(),
  );

/** Portkey BedrockBatchJob; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputBedrockBatchJobSchema.parse(value);`
 */
export type GatewayInferenceInputBedrockBatchJob = {
  input_file_id: string;
  completion_window: 'immediate' | '24h';
  endpoint: '/v1/chat/completions' | '/v1/completions' | '/v1/embeddings';
  metadata?: { [key: string]: GatewayJsonValue } | null;
  job_name?: string;
  output_data_config?: string;
  model: string;
  role_arn: string;
};
export const GatewayInferenceInputBedrockBatchJobSchema: z.ZodType<GatewayInferenceInputBedrockBatchJob> =
  z.lazy(() =>
    z
      .object({
        input_file_id: z.string(),
        completion_window: z.union([z.literal('immediate'), z.literal('24h')]),
        endpoint: z.union([
          z.literal('/v1/chat/completions'),
          z.literal('/v1/completions'),
          z.literal('/v1/embeddings'),
        ]),
        metadata: z
          .object({})
          .catchall(GatewayJsonValueSchema)
          .and(GatewayJsonObjectSchema)
          .nullable()
          .optional(),
        job_name: z.string().optional(),
        output_data_config: z.string().optional(),
        model: z.string(),
        role_arn: z.string(),
      })
      .strict(),
  );

/** Portkey VertexBatchJob; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputVertexBatchJobSchema.parse(value);`
 */
export type GatewayInferenceInputVertexBatchJob = {
  input_file_id: string;
  completion_window: 'immediate' | '24h';
  endpoint: '/v1/chat/completions' | '/v1/completions' | '/v1/embeddings';
  metadata?: { [key: string]: GatewayJsonValue } | null;
  job_name?: string;
  output_data_config?: string;
  model: string;
};
export const GatewayInferenceInputVertexBatchJobSchema: z.ZodType<GatewayInferenceInputVertexBatchJob> =
  z.lazy(() =>
    z
      .object({
        input_file_id: z.string(),
        completion_window: z.union([z.literal('immediate'), z.literal('24h')]),
        endpoint: z.union([
          z.literal('/v1/chat/completions'),
          z.literal('/v1/completions'),
          z.literal('/v1/embeddings'),
        ]),
        metadata: z
          .object({})
          .catchall(GatewayJsonValueSchema)
          .and(GatewayJsonObjectSchema)
          .nullable()
          .optional(),
        job_name: z.string().optional(),
        output_data_config: z.string().optional(),
        model: z.string(),
      })
      .strict(),
  );

/** Portkey PortkeyBatchJob; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputPortkeyBatchJobSchema.parse(value);`
 */
export type GatewayInferenceInputPortkeyBatchJob = {
  input_file_id: string;
  completion_window: 'immediate' | '24h';
  endpoint: '/v1/chat/completions' | '/v1/completions' | '/v1/embeddings';
  metadata?: { [key: string]: GatewayJsonValue } | null;
  job_name?: string;
  output_data_config?: string;
  model: string;
  role_arn?: string;
  portkey_options?: {
    'x-portkey-virtual-key': string;
    'x-portkey-aws-s3-bucket'?: string;
    'x-portkey-vertex-storage-bucket-name'?: string;
    'x-portkey-provider-model'?: string;
  };
  provider_options?:
    | { job_name?: string; output_data_config?: string; model: string; role_arn: string }
    | { job_name?: string; output_data_config?: string; model: string };
};
export const GatewayInferenceInputPortkeyBatchJobSchema: z.ZodType<GatewayInferenceInputPortkeyBatchJob> =
  z.lazy(() =>
    z
      .object({
        input_file_id: z.string(),
        completion_window: z.union([z.literal('immediate'), z.literal('24h')]),
        endpoint: z.union([
          z.literal('/v1/chat/completions'),
          z.literal('/v1/completions'),
          z.literal('/v1/embeddings'),
        ]),
        metadata: z
          .object({})
          .catchall(GatewayJsonValueSchema)
          .and(GatewayJsonObjectSchema)
          .nullable()
          .optional(),
        job_name: z.string().optional(),
        output_data_config: z.string().optional(),
        model: z.string(),
        role_arn: z.string().optional(),
        portkey_options: z
          .object({
            'x-portkey-virtual-key': z.string(),
            'x-portkey-aws-s3-bucket': z.string().optional(),
            'x-portkey-vertex-storage-bucket-name': z.string().optional(),
            'x-portkey-provider-model': z.string().optional(),
          })
          .strict()
          .optional(),
        provider_options: z
          .union([
            z
              .object({
                job_name: z.string().optional(),
                output_data_config: z.string().optional(),
                model: z.string(),
                role_arn: z.string(),
              })
              .strict(),
            z
              .object({
                job_name: z.string().optional(),
                output_data_config: z.string().optional(),
                model: z.string(),
              })
              .strict(),
          ])
          .optional(),
      })
      .strict(),
  );

/** Portkey Batch; additive response fields are preserved.
 * @example `GatewayInferenceBatchSchema.parse(value);`
 */
export type GatewayInferenceBatch = {
  id: string;
  object: 'batch';
  endpoint: string;
  errors?: {
    object?: string;
    data?: Array<{
      code?: string;
      message?: string;
      param?: string | null;
      line?: number | null;
      [key: string]: unknown;
    }>;
    [key: string]: unknown;
  } | null;
  input_file_id: string;
  completion_window: string;
  status:
    | 'validating'
    | 'failed'
    | 'in_progress'
    | 'finalizing'
    | 'completed'
    | 'expired'
    | 'cancelling'
    | 'cancelled';
  output_file_id?: string | null;
  error_file_id?: string | null;
  created_at: number;
  in_progress_at?: number | null;
  expires_at?: number;
  finalizing_at?: number | null;
  completed_at?: number | null;
  failed_at?: number | null;
  expired_at?: number | null;
  cancelling_at?: number | null;
  cancelled_at?: number | null;
  request_counts?: { total: number; completed: number; failed: number; [key: string]: unknown };
  metadata?: { [key: string]: unknown } | null;
  [key: string]: unknown;
};
export const GatewayInferenceBatchSchema: z.ZodType<GatewayInferenceBatch> = z.lazy(() =>
  z
    .object({
      id: z.string(),
      object: z.literal('batch'),
      endpoint: z.string(),
      errors: z
        .object({
          object: z.string().optional(),
          data: z
            .array(
              z
                .object({
                  code: z.string().optional(),
                  message: z.string().optional(),
                  param: z.string().nullable().optional(),
                  line: z.number().finite().int().nullable().optional(),
                })
                .passthrough(),
            )
            .optional(),
        })
        .passthrough()
        .nullable()
        .optional(),
      input_file_id: z.string(),
      completion_window: z.string(),
      status: z.union([
        z.literal('validating'),
        z.literal('failed'),
        z.literal('in_progress'),
        z.literal('finalizing'),
        z.literal('completed'),
        z.literal('expired'),
        z.literal('cancelling'),
        z.literal('cancelled'),
      ]),
      output_file_id: z.string().nullable().optional(),
      error_file_id: z.string().nullable().optional(),
      created_at: z.number().finite().int(),
      in_progress_at: z.number().finite().int().nullable().optional(),
      expires_at: z.number().finite().int().optional(),
      finalizing_at: z.number().finite().int().nullable().optional(),
      completed_at: z.number().finite().int().nullable().optional(),
      failed_at: z.number().finite().int().nullable().optional(),
      expired_at: z.number().finite().int().nullable().optional(),
      cancelling_at: z.number().finite().int().nullable().optional(),
      cancelled_at: z.number().finite().int().nullable().optional(),
      request_counts: z
        .object({
          total: z.number().finite().int(),
          completed: z.number().finite().int(),
          failed: z.number().finite().int(),
        })
        .passthrough()
        .optional(),
      metadata: z.object({}).passthrough().nullable().optional(),
    })
    .passthrough(),
);

/** Portkey ListBatchesQuery; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputListBatchesQuerySchema.parse(value);`
 */
export type GatewayInferenceInputListBatchesQuery = { after?: string; limit?: number };
export const GatewayInferenceInputListBatchesQuerySchema: z.ZodType<GatewayInferenceInputListBatchesQuery> =
  z.lazy(() =>
    z
      .object({ after: z.string().optional(), limit: z.number().finite().int().optional() })
      .strict(),
  );

/** Portkey ListBatchesResponse; additive response fields are preserved.
 * @example `GatewayInferenceListBatchesResponseSchema.parse(value);`
 */
export type GatewayInferenceListBatchesResponse = {
  data: Array<GatewayInferenceBatch>;
  first_id?: string | null;
  last_id?: string | null;
  has_more: boolean;
  object: 'list';
  [key: string]: unknown;
};
export const GatewayInferenceListBatchesResponseSchema: z.ZodType<GatewayInferenceListBatchesResponse> =
  z.lazy(() =>
    z
      .object({
        data: z.array(GatewayInferenceBatchSchema),
        first_id: z.string().nullable().optional(),
        last_id: z.string().nullable().optional(),
        has_more: z.boolean(),
        object: z.literal('list'),
      })
      .passthrough(),
  );

/** Portkey FeedbackRequest; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputFeedbackRequestSchema.parse(value);`
 */
export type GatewayInferenceInputFeedbackRequest = {
  trace_id: string;
  value: number;
  weight?: number;
  metadata?: { [key: string]: GatewayJsonValue };
};
export const GatewayInferenceInputFeedbackRequestSchema: z.ZodType<GatewayInferenceInputFeedbackRequest> =
  z.lazy(() =>
    z
      .object({
        trace_id: z.string(),
        value: z.number().finite().int().min(-10).max(10),
        weight: z.number().finite().min(0).max(1).optional(),
        metadata: z
          .object({})
          .catchall(GatewayJsonValueSchema)
          .and(GatewayJsonObjectSchema)
          .optional(),
      })
      .strict(),
  );

/** Portkey FeedbackResponse; additive response fields are preserved.
 * @example `GatewayInferenceFeedbackResponseSchema.parse(value);`
 */
export type GatewayInferenceFeedbackResponse = {
  status?: string;
  message?: string;
  feedback_ids?: Array<string>;
  [key: string]: unknown;
};
export const GatewayInferenceFeedbackResponseSchema: z.ZodType<GatewayInferenceFeedbackResponse> =
  z.lazy(() =>
    z
      .object({
        status: z.string().optional(),
        message: z.string().optional(),
        feedback_ids: z.array(z.string()).optional(),
      })
      .passthrough(),
  );

/** Portkey FeedbackUpdateRequest; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputFeedbackUpdateRequestSchema.parse(value);`
 */
export type GatewayInferenceInputFeedbackUpdateRequest = {
  value: number;
  weight?: number;
  metadata?: { [key: string]: GatewayJsonValue };
};
export const GatewayInferenceInputFeedbackUpdateRequestSchema: z.ZodType<GatewayInferenceInputFeedbackUpdateRequest> =
  z.lazy(() =>
    z
      .object({
        value: z.number().finite().int().min(-10).max(10),
        weight: z.number().finite().min(0).max(1).optional(),
        metadata: z
          .object({})
          .catchall(GatewayJsonValueSchema)
          .and(GatewayJsonObjectSchema)
          .optional(),
      })
      .strict(),
  );

/** Portkey CreateLogsRequest; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputCreateLogsRequestSchema.parse(value);`
 */
export type GatewayInferenceInputCreateLogsRequest =
  | GatewayInferenceInputCustomLog
  | Array<GatewayInferenceInputCustomLog>;
export const GatewayInferenceInputCreateLogsRequestSchema: z.ZodType<GatewayInferenceInputCreateLogsRequest> =
  z.lazy(() =>
    z.union([GatewayInferenceInputCustomLogSchema, z.array(GatewayInferenceInputCustomLogSchema)]),
  );

/** Portkey CustomLog; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputCustomLogSchema.parse(value);`
 */
export type GatewayInferenceInputCustomLog = {
  request: {
    url: string;
    method?: string;
    headers?: { [key: string]: string };
    body: { [key: string]: GatewayJsonValue };
  };
  response: {
    status?: number;
    headers?: { [key: string]: string };
    body: { [key: string]: GatewayJsonValue };
    response_time?: number;
  };
  metadata?: {
    trace_id?: string;
    span_id?: string;
    span_name?: string;
    additionalProperties?: string;
    [key: string]: GatewayJsonValue | undefined;
  };
};
export const GatewayInferenceInputCustomLogSchema: z.ZodType<GatewayInferenceInputCustomLog> =
  z.lazy(() =>
    z
      .object({
        request: z
          .object({
            url: z.string(),
            method: z.string().optional(),
            headers: z.object({}).catchall(z.string()).and(GatewayJsonObjectSchema).optional(),
            body: z.object({}).catchall(GatewayJsonValueSchema).and(GatewayJsonObjectSchema),
          })
          .strict(),
        response: z
          .object({
            status: z.number().finite().int().optional(),
            headers: z.object({}).catchall(z.string()).and(GatewayJsonObjectSchema).optional(),
            body: z.object({}).catchall(GatewayJsonValueSchema).and(GatewayJsonObjectSchema),
            response_time: z.number().finite().int().optional(),
          })
          .strict(),
        metadata: z
          .object({
            trace_id: z.string().optional(),
            span_id: z.string().optional(),
            span_name: z.string().optional(),
            additionalProperties: z.string().optional(),
          })
          .catchall(GatewayJsonValueSchema)
          .and(GatewayJsonObjectSchema)
          .optional(),
      })
      .strict(),
  );

/** Portkey GetLogQuery; strict modeled input with explicit JSON extension maps.
 * @example `GatewayInferenceInputGetLogQuerySchema.parse(value);`
 */
export type GatewayInferenceInputGetLogQuery =
  | { path_format?: 'v1'; created_at?: string; type?: 'hooks' }
  | { path_format: 'v2'; created_at: string; type?: 'hooks' };
export const GatewayInferenceInputGetLogQuerySchema: z.ZodType<GatewayInferenceInputGetLogQuery> =
  z.lazy(() =>
    z.union([
      z
        .object({
          path_format: z.literal('v1').optional(),
          created_at: z.string().datetime({ offset: true }).optional(),
          type: z.literal('hooks').optional(),
        })
        .strict(),
      z
        .object({
          path_format: z.literal('v2'),
          created_at: z.string().datetime({ offset: true }),
          type: z.literal('hooks').optional(),
        })
        .strict(),
    ]),
  );

/** Portkey LogObject; additive response fields are preserved.
 * @example `GatewayInferenceLogObjectSchema.parse(value);`
 */
export type GatewayInferenceLogObject = {
  _id: string | null;
  request: GatewayInferenceLogRequest;
  response: GatewayInferenceLogResponse;
  organisation_id: string | null;
  created_at: string | null;
  metrics?: GatewayInferenceAnalyticsMetrics;
  finalUntransformedRequest?: GatewayInferenceRequestResponseObject;
  originalResponse?: GatewayInferenceRequestResponseObject;
  transformedRequest?: GatewayInferenceRequestResponseObject;
  [key: string]: unknown;
};
export const GatewayInferenceLogObjectSchema: z.ZodType<GatewayInferenceLogObject> = z.lazy(() =>
  z
    .object({
      _id: z.string().nullable(),
      request: GatewayInferenceLogRequestSchema,
      response: GatewayInferenceLogResponseSchema,
      organisation_id: z.string().nullable(),
      created_at: z.string().nullable(),
      metrics: GatewayInferenceAnalyticsMetricsSchema.optional(),
      finalUntransformedRequest: GatewayInferenceRequestResponseObjectSchema.optional(),
      originalResponse: GatewayInferenceRequestResponseObjectSchema.optional(),
      transformedRequest: GatewayInferenceRequestResponseObjectSchema.optional(),
    })
    .passthrough(),
);

/** Portkey LogRequest; additive response fields are preserved.
 * @example `GatewayInferenceLogRequestSchema.parse(value);`
 */
export type GatewayInferenceLogRequest = {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD';
  headers?: { [key: string]: unknown };
  body?: { [key: string]: unknown };
  portkeyHeaders: { [key: string]: unknown };
  [key: string]: unknown;
};
export const GatewayInferenceLogRequestSchema: z.ZodType<GatewayInferenceLogRequest> = z.lazy(() =>
  z
    .object({
      url: z.string(),
      method: z.union([
        z.literal('GET'),
        z.literal('POST'),
        z.literal('PUT'),
        z.literal('DELETE'),
        z.literal('PATCH'),
        z.literal('OPTIONS'),
        z.literal('HEAD'),
      ]),
      headers: z.object({}).passthrough().optional(),
      body: z.object({}).passthrough().optional(),
      portkeyHeaders: z.object({}).passthrough(),
    })
    .passthrough(),
);

/** Portkey LogResponse; additive response fields are preserved.
 * @example `GatewayInferenceLogResponseSchema.parse(value);`
 */
export type GatewayInferenceLogResponse = {
  status: number;
  headers?: { [key: string]: unknown };
  body?: { [key: string]: unknown };
  responseTime: number;
  lastUsedOptionJsonPath: string;
  [key: string]: unknown;
};
export const GatewayInferenceLogResponseSchema: z.ZodType<GatewayInferenceLogResponse> = z.lazy(
  () =>
    z
      .object({
        status: z.number().finite().int(),
        headers: z.object({}).passthrough().optional(),
        body: z.object({}).passthrough().optional(),
        responseTime: z.number().finite().int(),
        lastUsedOptionJsonPath: z.string(),
      })
      .passthrough(),
);

/** Portkey AnalyticsMetrics; additive response fields are preserved.
 * @example `GatewayInferenceAnalyticsMetricsSchema.parse(value);`
 */
export type GatewayInferenceAnalyticsMetrics = {
  id?: string;
  organisation_id?: string;
  organisation_name?: string;
  prompt_id?: string;
  prompt_version_id?: string;
  config_id?: string;
  created_at?: string;
  is_success?: boolean;
  ai_org?: string;
  ai_model?: string;
  req_units?: number;
  res_units?: number;
  total_units?: number;
  cost?: number;
  cost_currency?: string;
  request_url?: string;
  request_method?: string;
  response_status_code?: number;
  response_time?: number;
  is_proxy_call?: boolean;
  cache_status?: string | null;
  cache_type?: string | null;
  stream_mode?: number | null;
  retry_success_count?: number;
  trace_id?: string;
  span_id?: string;
  span_name?: string;
  parent_span_id?: string;
  mode?: string;
  virtual_key?: string;
  source?: string;
  runtime?: string;
  runtime_version?: string;
  sdk_version?: string;
  config?: string;
  internal_trace_id?: string;
  last_used_option_index?: number;
  config_version_id?: string;
  prompt_slug?: string;
  workspace_slug?: string | null;
  log_store_file_path_format?: string;
  'metadata.key'?: Array<string | null>;
  'metadata.value'?: Array<string | null>;
  api_key_id?: string;
  request_parsing_time?: number;
  pre_processing_time?: number;
  cache_processing_time?: number;
  response_parsing_time?: number;
  gateway_processing_time?: number;
  upstream_response_time?: number;
  [key: string]: unknown;
};
export const GatewayInferenceAnalyticsMetricsSchema: z.ZodType<GatewayInferenceAnalyticsMetrics> =
  z.lazy(() =>
    z
      .object({
        id: z.string().optional(),
        organisation_id: z.string().optional(),
        organisation_name: z.string().optional(),
        prompt_id: z.string().optional(),
        prompt_version_id: z.string().optional(),
        config_id: z.string().optional(),
        created_at: z.string().optional(),
        is_success: z.boolean().optional(),
        ai_org: z.string().optional(),
        ai_model: z.string().optional(),
        req_units: z.number().finite().optional(),
        res_units: z.number().finite().optional(),
        total_units: z.number().finite().optional(),
        cost: z.number().finite().optional(),
        cost_currency: z.string().optional(),
        request_url: z.string().optional(),
        request_method: z.string().optional(),
        response_status_code: z.number().finite().int().optional(),
        response_time: z.number().finite().int().optional(),
        is_proxy_call: z.boolean().optional(),
        cache_status: z.string().nullable().optional(),
        cache_type: z.string().nullable().optional(),
        stream_mode: z.number().finite().int().nullable().optional(),
        retry_success_count: z.number().finite().int().optional(),
        trace_id: z.string().optional(),
        span_id: z.string().optional(),
        span_name: z.string().optional(),
        parent_span_id: z.string().optional(),
        mode: z.string().optional(),
        virtual_key: z.string().optional(),
        source: z.string().optional(),
        runtime: z.string().optional(),
        runtime_version: z.string().optional(),
        sdk_version: z.string().optional(),
        config: z.string().optional(),
        internal_trace_id: z.string().optional(),
        last_used_option_index: z.number().finite().int().optional(),
        config_version_id: z.string().optional(),
        prompt_slug: z.string().optional(),
        workspace_slug: z.string().nullable().optional(),
        log_store_file_path_format: z.string().optional(),
        'metadata.key': z.array(z.string().nullable()).optional(),
        'metadata.value': z.array(z.string().nullable()).optional(),
        api_key_id: z.string().optional(),
        request_parsing_time: z.number().finite().int().optional(),
        pre_processing_time: z.number().finite().int().optional(),
        cache_processing_time: z.number().finite().int().optional(),
        response_parsing_time: z.number().finite().int().optional(),
        gateway_processing_time: z.number().finite().int().optional(),
        upstream_response_time: z.number().finite().int().optional(),
      })
      .passthrough(),
  );

/** Portkey RequestResponseObject; additive response fields are preserved.
 * @example `GatewayInferenceRequestResponseObjectSchema.parse(value);`
 */
export type GatewayInferenceRequestResponseObject = {
  body?: { [key: string]: unknown };
  headers?: { [key: string]: unknown };
  url?: string;
  method?: string;
  [key: string]: unknown;
};
export const GatewayInferenceRequestResponseObjectSchema: z.ZodType<GatewayInferenceRequestResponseObject> =
  z.lazy(() =>
    z
      .object({
        body: z.object({}).passthrough().optional(),
        headers: z.object({}).passthrough().optional(),
        url: z.string().optional(),
        method: z.string().optional(),
      })
      .passthrough(),
  );
