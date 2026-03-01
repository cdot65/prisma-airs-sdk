import { describe, it, expect } from 'vitest';
import { Content } from '../../src/scan/content.js';
import { AISecSDKException } from '../../src/errors.js';

describe('Content', () => {
  it('creates with prompt', () => {
    const c = new Content({ prompt: 'hello' });
    expect(c.prompt).toBe('hello');
    expect(c.response).toBeUndefined();
  });

  it('creates with response', () => {
    const c = new Content({ response: 'world' });
    expect(c.response).toBe('world');
  });

  it('creates with codePrompt', () => {
    const c = new Content({ codePrompt: 'fn()' });
    expect(c.codePrompt).toBe('fn()');
  });

  it('creates with toolEvent', () => {
    const c = new Content({
      toolEvent: {
        metadata: { ecosystem: 'mcp', method: 'invoke', server_name: 'test' },
        input: '{}',
      },
    });
    expect(c.toolEvent).toBeDefined();
  });

  it('throws if no content fields provided', () => {
    expect(() => new Content({})).toThrow(AISecSDKException);
  });

  it('throws if prompt exceeds max length', () => {
    const big = 'x'.repeat(3 * 1024 * 1024);
    expect(() => new Content({ prompt: big })).toThrow(AISecSDKException);
  });

  it('throws if response exceeds max length', () => {
    const big = 'x'.repeat(3 * 1024 * 1024);
    expect(() => new Content({ response: big })).toThrow(AISecSDKException);
  });

  it('computes length as byte sum of all text fields', () => {
    const c = new Content({ prompt: 'ab', response: 'cd' });
    expect(c.length).toBe(4);
  });

  describe('toJSON', () => {
    it('serializes prompt and response', () => {
      const c = new Content({ prompt: 'p', response: 'r' });
      expect(c.toJSON()).toEqual({ prompt: 'p', response: 'r' });
    });

    it('serializes codePrompt as code_prompt', () => {
      const c = new Content({ codePrompt: 'fn()' });
      expect(c.toJSON()).toEqual({ code_prompt: 'fn()' });
    });
  });

  describe('fromJSON', () => {
    it('round-trips through toJSON/fromJSON', () => {
      const original = new Content({ prompt: 'p', response: 'r', context: 'ctx' });
      const restored = Content.fromJSON(original.toJSON());
      expect(restored.prompt).toBe('p');
      expect(restored.response).toBe('r');
      expect(restored.context).toBe('ctx');
    });
  });
});
