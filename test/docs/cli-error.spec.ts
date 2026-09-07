import { describe, expect, it } from 'vitest';
import { cliQueryError } from '../../scripts/e2e/cli-error.js';
import { AISecSDKException, ErrorType } from '../../src/errors.js';

describe('secret-free CLI subprocess failure categories', () => {
  it.each([401, 403, 429, 500, 503])('retains only the rendered HTTP %s status', (statusCode) => {
    const error = cliQueryError({
      code: 1,
      stderr: `secret-value\n    HTTP ${statusCode}\nraw-body-secret`,
    });
    expect(error).toBeInstanceOf(AISecSDKException);
    expect(error).toMatchObject({
      statusCode,
      failureKind: 'http',
      errorType: statusCode >= 500 ? ErrorType.SERVER_SIDE_ERROR : ErrorType.CLIENT_SIDE_ERROR,
    });
    expect(String(error) + JSON.stringify(error)).not.toContain('secret');
  });
  it.each([
    [1, 'CLIExit1'],
    [2, 'CLIExit2'],
    ['ETIMEDOUT', 'CLIChildTimeout'],
    ['private-error-code', 'CLIChildError'],
  ])('classifies %j without exposing output', (code, name) => {
    const error = cliQueryError({
      code,
      stdout: 'secret-stdout',
      stderr: 'secret-stderr',
      cmd: 'secret-argv',
    });
    expect(error.name).toBe(name);
    expect(String(error) + JSON.stringify(error)).not.toMatch(
      /secret-stdout|secret-stderr|secret-argv|private-error-code/,
    );
  });
  it.each([
    undefined,
    null,
    'secret-value',
    { stderr: 'not a rendered HTTP 503 line' },
    { stderr: 'HTTP 999' },
  ])('does not invent HTTP evidence from %j', (input) => {
    const error = cliQueryError(input);
    expect(error.name).toBe('CLIChildError');
    expect(error).not.toBeInstanceOf(AISecSDKException);
    expect(String(error)).not.toContain('secret-value');
  });
});
