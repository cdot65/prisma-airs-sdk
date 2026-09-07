/** @internal Keep every released SDK version in independent key-retirement auditing. */
export function isReleaseInferenceHistoryFile(name: string): boolean {
  return /^(?:release-sdk-inference(?:-0(?:22|23|24)|-v\d+\.\d+\.\d+)?|cli-inference)-\d{4}-\d{2}-\d{2}T[\dZ.-]+\.json$/.test(
    name,
  );
}
