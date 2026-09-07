import { z } from 'zod';
import { AISecSDKException, ErrorType } from '../errors.js';

/** Time window for an AI Gateway telemetry query. */
export interface AIGatewayWindowOptions {
  /** Workspace slug, e.g. `ws-main-a-349e0e`. Required by every telemetry endpoint. */
  workspaceSlug: string;
  /** Rolling window size in days, counted back from now. Defaults to 7. Ignored if `start` is set. */
  days?: number;
  /** Explicit window start. Overrides `days`. */
  start?: Date;
  /** Explicit window end. Defaults to now. */
  end?: Date;
}

/** @internal Shared strict option fields; extended only by the corresponding query methods. */
export const telemetryWindowSchema = z
  .object({
    workspaceSlug: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/),
    days: z.number().finite().optional(),
    start: z.date().optional(),
    end: z.date().optional(),
  })
  .strict();

function invalidWindow(): never {
  throw new AISecSDKException(
    'Invalid telemetry query options or time window',
    ErrorType.USER_REQUEST_PAYLOAD_ERROR,
  );
}

/**
 * @internal
 * ISO-8601 with a **numeric** UTC offset (`2026-07-20T00:00:00+02:00`), which is what the
 * gateway's validator requires. A `Z` suffix is rejected with `AB01`. `URLSearchParams`
 * percent-encodes the `+` correctly, so no manual escaping is needed downstream.
 */
export function toOffsetIso(d: Date): string {
  if (
    !(d instanceof Date) ||
    !Number.isFinite(d.getTime()) ||
    d.getFullYear() < 0 ||
    d.getFullYear() > 9999
  )
    invalidWindow();
  const pad = (n: number): string => String(Math.floor(Math.abs(n))).padStart(2, '0');
  const offsetMin = -d.getTimezoneOffset();
  const sign = offsetMin >= 0 ? '+' : '-';
  return (
    `${String(d.getFullYear()).padStart(4, '0')}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}` +
    `${sign}${pad(offsetMin / 60)}:${pad(offsetMin % 60)}`
  );
}

/** @internal Build the four query params every telemetry endpoint requires. */
export function serializeWindow(
  tsgId: string,
  opts: AIGatewayWindowOptions,
  schema: z.ZodType<AIGatewayWindowOptions, z.ZodTypeDef, unknown> = telemetryWindowSchema,
): Record<string, string> {
  return serializeWindowWithOptions(tsgId, opts, schema).params;
}

/** @internal Validate once, retaining the parsed copy for endpoint-specific query serialization. */
export function serializeWindowWithOptions<T extends AIGatewayWindowOptions>(
  tsgId: string,
  opts: T,
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
): { params: Record<string, string>; options: T } {
  const result = schema.safeParse(opts);
  if (!result.success || typeof tsgId !== 'string' || !/^\d+$/.test(tsgId)) invalidWindow();
  const end = result.data.end ?? new Date();
  const start = result.data.start ?? new Date(end.getTime() - (result.data.days ?? 7) * 86_400_000);
  if (start.getTime() > end.getTime()) invalidWindow();
  return {
    options: result.data,
    params: {
      organisationId: tsgId,
      workspaceSlug: result.data.workspaceSlug,
      timeOfGenerationMin: toOffsetIso(start),
      timeOfGenerationMax: toOffsetIso(end),
    },
  };
}
