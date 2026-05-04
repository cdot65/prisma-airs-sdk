---
'@cdot65/prisma-airs-sdk': minor
---

**Breaking type changes** to `ScanResponse.tool_detected` to match the actual AIRS API shape (verified against a live response). Confirms and supersedes the partial fix from #129.

### Changes

`IODetected` shape change. The schema for `tool_detected.input_detected` and `tool_detected.output_detected` is now a wrapper:

Before: `{ url_cats?, dlp?, injection?, toxic_content?, malicious_code? }`
After: `{ detection_entries?: ToolDetectionEntry[] }`

The flag fields moved into `ToolDetectionEntry.detections`. Code reading `result.tool_detected.input_detected.url_cats` was already getting `undefined` from the API — the type just didn't reflect that. Now correct.

`ScanSummary` shape change. The schema for `tool_detected.summary` changed:

Before: `{ verdict?, action? }`
After: `{ detections: ToolDetectionFlags, threats: string[] }` (both required)

Top-level `verdict`/`action` remain available on `ScanResponse.category` and `ScanResponse.action`.

`ScanResponse` required fields. `timeout`, `error`, and `errors` are now typed as required (the API always returns them).

### New exports

- `ToolDetectionFlagsSchema` / `ToolDetectionFlags` — boolean flags (8 detection types)
- `ToolDetectionEntrySchema` / `ToolDetectionEntry` — per-tool detection entry
- `ToolDetectionDetailsSchema` / `ToolDetectionDetails` — nested per-tool details

### Migration

If you read tool flags from `tool_detected.input_detected.<flag>`, walk `detection_entries` instead:

```ts
// before
const hadInjection = response.tool_detected?.input_detected?.injection;

// after
const hadInjection = response.tool_detected?.input_detected?.detection_entries?.some(
  (entry) => entry.detections?.injection === true,
);
```

Pre-flight drift count: 81 → 39 (-42).
