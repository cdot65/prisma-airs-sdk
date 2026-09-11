import { describe, expect, it, vi } from 'vitest';
import { executeWithRetry, extractErrorMessage } from '../../src/http-retry.js';
import { parseProblemDetails } from '../../src/http/problem.js';
import { DictionariesClient } from '../../src/management/dlp/dictionaries.js';

const problem = {
  title: 'Bad Request',
  detail: 'Validation failed',
  status: 999,
  errors: [{ property: 'originalFileName', reason: 'must not be blank', rejectedValue: 'SECRET' }],
};

describe('safe problem diagnostics', () => {
  it('surfaces field details and preserves the actual HTTP status and retry metadata', async () => {
    const execute = vi.fn(
      async () =>
        new Response(JSON.stringify(problem), {
          status: 400,
          headers: { 'content-type': 'application/problem+json', 'retry-after': '2' },
        }),
    );
    await expect(executeWithRetry({ maxRetries: 3, execute })).rejects.toMatchObject({
      statusCode: 400,
      failureKind: 'http',
      retryAfterMs: 2000,
      message:
        'AISEC_CLIENT_SIDE_ERROR:API error 400; Bad Request; Validation failed; originalFileName: must not be blank',
      problem: {
        title: 'Bad Request',
        detail: 'Validation failed',
        errors: [{ property: 'originalFileName', reason: 'must not be blank' }],
        redacted: false,
      },
    });
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('withholds reflected values in every exposed field and drops extensions', async () => {
    const malicious = {
      title: 'SECRET',
      detail: 'Rejected SECRET',
      instance: 'SECRET',
      payload: 'SECRET',
      errors: [{ property: 'SECRET', reason: 'must not be blank SECRET', rejectedValue: 'SECRET' }],
    };
    const execute = async () => new Response(JSON.stringify(malicious), { status: 400 });
    try {
      await executeWithRetry({ maxRetries: 0, execute });
    } catch (error) {
      expect(String(error)).not.toContain('SECRET');
      expect(JSON.stringify(error)).not.toContain('SECRET');
      expect(error).toMatchObject({
        problem: {
          redacted: true,
          title: '[withheld]',
          detail: '[withheld]',
          errors: [{ property: '[withheld]', reason: '[withheld]' }],
        },
      });
      return;
    }
    throw new Error('Expected rejection');
  });

  it.each(['', '<html>SECRET</html>', 'null', '[]', '42', '"SECRET"', '{}'])(
    'ignores malformed/non-problem bodies: %s',
    (body) => {
      expect(parseProblemDetails(body)).toBeUndefined();
    },
  );

  it('handles nulls, wrong types, malformed fields and caps errors', () => {
    expect(parseProblemDetails('{"title":null,"detail":null,"errors":null}')).toEqual({
      redacted: false,
    });
    expect(parseProblemDetails('{"title":123,"detail":{},"errors":{}}')).toEqual({
      title: '[withheld]',
      detail: '[withheld]',
      redacted: true,
    });
    const parsed = parseProblemDetails(JSON.stringify({ errors: Array(21).fill(null) }));
    expect(parsed?.errors).toHaveLength(20);
    expect(parsed?.errors?.[0]).toEqual({ property: '[withheld]', reason: '[withheld]' });
    expect(parsed?.redacted).toBe(true);
  });

  it('renders title-only, detail-only, fields-only and equal title/detail', () => {
    expect(extractErrorMessage('{"title":"Bad Request"}', 400)).toBe('API error 400; Bad Request');
    expect(
      extractErrorMessage('{"detail":"Required request part \'json\' is not present"}', 400),
    ).toContain("Required request part 'json' is not present");
    expect(extractErrorMessage('{"errors":[]}', 400)).toBe('API error 400');
    expect(extractErrorMessage('{"title":"Bad Request","detail":"Bad Request"}', 400)).toBe(
      'API error 400; Bad Request',
    );
    expect(extractErrorMessage(JSON.stringify({ errors: problem.errors }), 400)).toBe(
      'API error 400; originalFileName: must not be blank',
    );
  });

  it.each(['SECRET', '{"message":"SECRET"}', '{"error_message":"SECRET"}', '{"msg":"SECRET"}'])(
    'DLP withholds non-problem errors through the real request pipeline: %s',
    async (body) => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => new Response(body, { status: 400 })),
      );
      try {
        const client = new DictionariesClient({
          baseUrl: 'https://dlp.test',
          auth: { prepare: async (r) => r },
          numRetries: 0,
        });
        await expect(
          client.create({
            metadata: {
              name: 'SECRET',
              category: 'Confidential',
              region_name: 'GLOBAL',
              original_file_name: 'SECRET.txt',
            },
            file: 'SECRET',
          }),
        ).rejects.toMatchObject({ message: 'AISEC_CLIENT_SIDE_ERROR:API error 400' });
      } finally {
        vi.unstubAllGlobals();
      }
    },
  );

  it('DLP preserves multipart validation diagnostics through the request pipeline', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify(problem), { status: 400 })),
    );
    try {
      const client = new DictionariesClient({
        baseUrl: 'https://dlp.test',
        auth: { prepare: async (r) => r },
        numRetries: 0,
      });
      await expect(
        client.create({
          metadata: {
            name: 'test',
            category: 'Confidential',
            region_name: 'GLOBAL',
            original_file_name: '',
          },
          file: 'SECRET',
        }),
      ).rejects.toMatchObject({
        problem: { errors: [{ property: 'originalFileName', reason: 'must not be blank' }] },
      });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it.each([
    [{ message: 'Existing message', errors: [] }, 'Existing message'],
    [{ error_message: 'Existing error', errors: {} }, 'Existing error'],
    [{ msg: 'Existing denial', errors: null }, 'Existing denial'],
    [
      { data: { message: 'Existing nested', errorCode: 'AB01' }, errors: [] },
      'Existing nested (errorCode: AB01)',
    ],
    [{ error: { message: 'Existing nested error' }, errors: [] }, 'Existing nested error'],
  ])('preserves established non-DLP error envelopes: %j', async (body, message) => {
    expect(extractErrorMessage(JSON.stringify(body), 400)).toBe(message);
    await expect(
      executeWithRetry({
        maxRetries: 0,
        execute: async () => new Response(JSON.stringify(body), { status: 400 }),
      }),
    ).rejects.toMatchObject({ message: `AISEC_CLIENT_SIDE_ERROR:${message}` });
    await expect(
      executeWithRetry({
        maxRetries: 0,
        safeErrorMessages: true,
        execute: async () => new Response(JSON.stringify(body), { status: 400 }),
      }),
    ).rejects.toMatchObject({ message: 'AISEC_CLIENT_SIDE_ERROR:API error 400' });
  });

  it('withholds network exception text for sensitive services', async () => {
    await expect(
      executeWithRetry({
        maxRetries: 0,
        safeErrorMessages: true,
        execute: async () => {
          throw new Error('SECRET');
        },
      }),
    ).rejects.toMatchObject({
      message: 'AISEC_CLIENT_SIDE_ERROR:Network request failed',
      failureKind: 'network',
    });
  });
});
