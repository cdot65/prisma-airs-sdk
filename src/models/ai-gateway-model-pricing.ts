import { z } from 'zod';

/** Public catalog price in USD cents per token/unit, not dollars or a tenant invoice. */
export const GatewayModelTokenPriceSchema = z
  .object({ price: z.number().finite().optional() })
  .passthrough();
export type GatewayModelTokenPrice = z.infer<typeof GatewayModelTokenPriceSchema>;

/** Image prices keyed by provider-defined quality and image size. */
export const GatewayModelImagePricingSchema = z.record(z.record(GatewayModelTokenPriceSchema));
export type GatewayModelImagePricing = z.infer<typeof GatewayModelImagePricingSchema>;

/** Token, audio, image and provider-specific catalog rates; all prices remain unconverted. */
export const GatewayModelPayAsYouGoSchema = z
  .object({
    request_token: GatewayModelTokenPriceSchema.optional(),
    response_token: GatewayModelTokenPriceSchema.optional(),
    cache_write_input_token: GatewayModelTokenPriceSchema.optional(),
    cache_read_input_token: GatewayModelTokenPriceSchema.optional(),
    request_audio_token: GatewayModelTokenPriceSchema.optional(),
    response_audio_token: GatewayModelTokenPriceSchema.optional(),
    cache_read_audio_input_token: GatewayModelTokenPriceSchema.optional(),
    additional_units: z.record(GatewayModelTokenPriceSchema).optional(),
    image: GatewayModelImagePricingSchema.optional(),
  })
  .passthrough();
export type GatewayModelPayAsYouGo = z.infer<typeof GatewayModelPayAsYouGoSchema>;

/** A calculation operation or value-reference node. Formula data is never executed by the SDK. */
export interface GatewayModelPricingCalculation {
  operation?: 'sum' | 'multiply';
  operands?: GatewayModelPricingCalculation[];
  value?: string;
  [key: string]: unknown;
}

// The pinned operation/reference variants have optional fields and overlap. Model both sets of
// declared fields on each node, so an optional variant cannot bypass nested field validation.
export const GatewayModelPricingCalculationSchema: z.ZodType<GatewayModelPricingCalculation> =
  z.lazy(() =>
    z
      .object({
        operation: z.enum(['sum', 'multiply']).optional(),
        operands: z.array(GatewayModelPricingCalculationSchema).optional(),
        value: z.string().optional(),
      })
      .passthrough(),
  );

/** Optional request/response calculation expressions returned by the public catalog. */
export const GatewayModelCalculateConfigSchema = z
  .object({
    request: GatewayModelPricingCalculationSchema.optional(),
    response: GatewayModelPricingCalculationSchema.optional(),
  })
  .passthrough();
export type GatewayModelCalculateConfig = z.infer<typeof GatewayModelCalculateConfigSchema>;

/** Fine-tuning catalog prices, without starting or selecting a training job. */
export const GatewayModelFinetuneConfigSchema = z
  .object({
    pay_per_token: GatewayModelTokenPriceSchema.optional(),
    pay_per_hour: GatewayModelTokenPriceSchema.optional(),
  })
  .passthrough();
export type GatewayModelFinetuneConfig = z.infer<typeof GatewayModelFinetuneConfigSchema>;

/** Public Portkey catalog configuration. Unknown response fields are preserved for compatibility. */
export const GatewayModelPricingConfigSchema = z
  .object({
    pay_as_you_go: GatewayModelPayAsYouGoSchema.optional(),
    calculate: GatewayModelCalculateConfigSchema.optional(),
    currency: z.literal('USD').optional(),
    finetune_config: GatewayModelFinetuneConfigSchema.optional(),
  })
  .passthrough();
export type GatewayModelPricingConfig = z.infer<typeof GatewayModelPricingConfigSchema>;
