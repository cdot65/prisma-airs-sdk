import { describe, expect, it } from 'vitest';
import { AISecSDKException, ErrorType } from '../../src/errors.js';
import { buildDottedObject, setDottedValue } from '../../src/ai-gateway/nested-values.js';

describe('buildDottedObject', () => {
  it('builds nested objects and dense arrays independent of entry order', () => {
    const entries = [
      { path: 'targets[1].provider', value: '@backup' },
      { path: 'retry.attempts', value: 3 },
      { path: 'targets[0].provider', value: '@primary' },
      { path: 'retry.on_status_codes', value: [429, 503] },
    ] as const;

    expect(buildDottedObject(entries)).toEqual({
      targets: [{ provider: '@primary' }, { provider: '@backup' }],
      retry: { attempts: 3, on_status_codes: [429, 503] },
    });
    expect(buildDottedObject([...entries].reverse())).toEqual(buildDottedObject(entries));
  });

  it('supports escaped property punctuation', () => {
    expect(
      buildDottedObject([{ path: 'metadata.example\\.com.value\\[raw\\]', value: true }]),
    ).toEqual({ metadata: { 'example.com': { 'value[raw]': true } } });
  });

  it('does not retain mutable references from entry values', () => {
    const value = { nested: ['original'] };
    const result = buildDottedObject([{ path: 'metadata', value }]);

    (result.metadata as { nested: string[] }).nested[0] = 'changed';
    expect(value).toEqual({ nested: ['original'] });
  });

  it.each([
    [
      [
        { path: 'retry', value: 3 },
        { path: 'retry.attempts', value: 3 },
      ],
    ],
    [
      [
        { path: 'retry.attempts', value: 3 },
        { path: 'retry.attempts', value: 4 },
      ],
    ],
    [[{ path: 'targets[1].provider', value: '@backup' }]],
    [[{ path: 'a..b', value: true }]],
    [[{ path: 'a[-1]', value: true }]],
    [[{ path: '__proto__.polluted', value: true }]],
    [[{ path: 'safe.constructor.polluted', value: true }]],
    [[{ path: 'retry.attempts', value: Number.NaN }]],
  ])(
    'rejects conflicts, malformed paths, unsafe keys, sparse arrays, and non-JSON values',
    (entries) => {
      expect(() => buildDottedObject(entries)).toThrow(AISecSDKException);
    },
  );
});

describe('setDottedValue', () => {
  it('returns an updated clone without mutating the input', () => {
    const input = { retry: { attempts: 2 }, cache: { mode: 'simple' } };
    const result = setDottedValue(input, 'retry.attempts', 5);

    expect(result).toEqual({ retry: { attempts: 5 }, cache: { mode: 'simple' } });
    expect(input).toEqual({ retry: { attempts: 2 }, cache: { mode: 'simple' } });
    expect(result).not.toBe(input);
    expect(result.retry).not.toBe(input.retry);
  });

  it('classifies invalid input as a user payload error', () => {
    try {
      setDottedValue({}, 'prototype.polluted', true);
      throw new Error('expected failure');
    } catch (error) {
      expect(error).toBeInstanceOf(AISecSDKException);
      expect((error as AISecSDKException).errorType).toBe(ErrorType.USER_REQUEST_PAYLOAD_ERROR);
    }
  });
});
