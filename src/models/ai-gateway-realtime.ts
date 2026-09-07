import { z } from 'zod';
import { GatewayJsonObjectSchema, type GatewayJsonObject } from './ai-gateway-routing.js';

/** Realtime query strings; the upstream contract explicitly permits additional query parameters.
 * @example `const query: GatewayRealtimeConnectRequest = { model: '@provider/model' };`
 */
export const GatewayRealtimeConnectRequestSchema = GatewayJsonObjectSchema.pipe(
  z.object({ model: z.string().optional() }).catchall(z.string()),
);
export type GatewayRealtimeConnectRequest = z.infer<typeof GatewayRealtimeConnectRequestSchema>;

/** Provider event envelope. Event-specific payloads are finite JSON, not a promise of provider support.
 * @example `const event: GatewayRealtimeEvent = { type: 'session.update', session: { instructions: 'Hello' } };`
 */
export interface GatewayRealtimeEvent extends GatewayJsonObject {
  type: string;
}

/** Validate the common text-event envelope without closing the provider's evolving event catalog.
 * @example `GatewayRealtimeEventSchema.parse({ type: 'session.created', session: {} });`
 */
export const GatewayRealtimeEventSchema = GatewayJsonObjectSchema.refine(
  (value) => typeof value.type === 'string' && value.type.length > 0,
  'Expected a nonempty event type',
).transform((value) => value as GatewayRealtimeEvent);
