/** @internal Retain bounded failure categories without child argv, stdout or raw stderr. */
import { AISecSDKException, ErrorType } from '../../src/errors.js';

export function cliQueryError(error: unknown): Error {
  const child =
    error && typeof error === 'object'
      ? (error as { code?: unknown; stderr?: unknown; signal?: unknown })
      : {};
  const status =
    typeof child.stderr === 'string'
      ? child.stderr.match(/^\s*HTTP ([1-5]\d{2})\s*$/m)?.[1]
      : undefined;
  if (status) {
    return new AISecSDKException(
      'CLI query returned an HTTP failure',
      Number(status) >= 500 ? ErrorType.SERVER_SIDE_ERROR : ErrorType.CLIENT_SIDE_ERROR,
      { statusCode: Number(status), failureKind: 'http' },
    );
  }
  const result = new Error('CLI subprocess query failed; raw child output omitted');
  result.name =
    child.code === 'ETIMEDOUT'
      ? 'CLIChildTimeout'
      : child.code === 1
        ? 'CLIExit1'
        : child.code === 2
          ? 'CLIExit2'
          : 'CLIChildError';
  return result;
}
