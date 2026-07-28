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

/**
 * @internal
 * ISO-8601 with a **numeric** UTC offset (`2026-07-20T00:00:00+02:00`), which is what the
 * gateway's validator requires. A `Z` suffix is rejected with `AB01`. `URLSearchParams`
 * percent-encodes the `+` correctly, so no manual escaping is needed downstream.
 */
export function toOffsetIso(d: Date): string {
  const pad = (n: number): string => String(Math.floor(Math.abs(n))).padStart(2, '0');
  const offsetMin = -d.getTimezoneOffset();
  const sign = offsetMin >= 0 ? '+' : '-';
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}` +
    `${sign}${pad(offsetMin / 60)}:${pad(offsetMin % 60)}`
  );
}

/** @internal Build the four query params every telemetry endpoint requires. */
export function serializeWindow(
  tsgId: string,
  opts: AIGatewayWindowOptions,
): Record<string, string> {
  const end = opts.end ?? new Date();
  const start = opts.start ?? new Date(end.getTime() - (opts.days ?? 7) * 86_400_000);
  return {
    organisationId: tsgId,
    workspaceSlug: opts.workspaceSlug,
    timeOfGenerationMin: toOffsetIso(start),
    timeOfGenerationMax: toOffsetIso(end),
  };
}
