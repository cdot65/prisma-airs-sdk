import { describe, it, expect } from 'vitest';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
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

  describe('setter validation', () => {
    it('sets prompt via setter', () => {
      const c = new Content({ prompt: 'a' });
      c.prompt = 'updated';
      expect(c.prompt).toBe('updated');
    });

    it('clears prompt by setting undefined', () => {
      const c = new Content({ prompt: 'a', response: 'b' });
      c.prompt = undefined;
      expect(c.prompt).toBeUndefined();
    });

    it('throws if codePrompt exceeds max via setter', () => {
      const c = new Content({ prompt: 'ok' });
      expect(() => {
        c.codePrompt = 'x'.repeat(3 * 1024 * 1024);
      }).toThrow(/codePrompt exceeds/);
    });

    it('throws if codeResponse exceeds max via setter', () => {
      const c = new Content({ prompt: 'ok' });
      expect(() => {
        c.codeResponse = 'x'.repeat(3 * 1024 * 1024);
      }).toThrow(/codeResponse exceeds/);
    });

    it('throws if context exceeds max via setter', () => {
      const c = new Content({ prompt: 'ok' });
      expect(() => {
        c.context = 'x'.repeat(101 * 1024 * 1024);
      }).toThrow(/context exceeds/);
    });

    it('sets valid codePrompt via setter', () => {
      const c = new Content({ prompt: 'ok' });
      c.codePrompt = 'code';
      expect(c.codePrompt).toBe('code');
    });

    it('sets valid codeResponse via setter', () => {
      const c = new Content({ prompt: 'ok' });
      c.codeResponse = 'result';
      expect(c.codeResponse).toBe('result');
    });

    it('sets valid context via setter', () => {
      const c = new Content({ prompt: 'ok' });
      c.context = 'ctx';
      expect(c.context).toBe('ctx');
    });

    it('sets and gets toolEvent via setter', () => {
      const c = new Content({ prompt: 'ok' });
      const te = { metadata: { ecosystem: 'mcp', method: 'x', server_name: 's' } };
      c.toolEvent = te;
      expect(c.toolEvent).toBe(te);
      c.toolEvent = undefined;
      expect(c.toolEvent).toBeUndefined();
    });
  });

  describe('length', () => {
    it('includes codePrompt and codeResponse in length', () => {
      const c = new Content({ codePrompt: 'ab', codeResponse: 'cd' });
      expect(c.length).toBe(4);
    });

    it('includes context in length', () => {
      const c = new Content({ prompt: 'a', context: 'bbb' });
      expect(c.length).toBe(4);
    });

    it('returns 0 for toolEvent-only content', () => {
      const c = new Content({
        toolEvent: { metadata: { ecosystem: 'mcp', method: 'x', server_name: 's' } },
      });
      expect(c.length).toBe(0);
    });
  });

  describe('toJSON', () => {
    it('serializes codeResponse as code_response', () => {
      const c = new Content({ codeResponse: 'out' });
      expect(c.toJSON()).toEqual({ code_response: 'out' });
    });

    it('serializes toolEvent as tool_event', () => {
      const te = { metadata: { ecosystem: 'mcp', method: 'x', server_name: 's' }, input: '{}' };
      const c = new Content({ toolEvent: te });
      expect(c.toJSON().tool_event).toEqual(te);
    });

    it('serializes context', () => {
      const c = new Content({ prompt: 'p', context: 'ctx' });
      expect(c.toJSON()).toEqual({ prompt: 'p', context: 'ctx' });
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

    it('restores codePrompt and codeResponse', () => {
      const c = Content.fromJSON({ code_prompt: 'cp', code_response: 'cr' });
      expect(c.codePrompt).toBe('cp');
      expect(c.codeResponse).toBe('cr');
    });

    it('restores toolEvent', () => {
      const te = { metadata: { ecosystem: 'mcp', method: 'x', server_name: 's' } };
      const c = Content.fromJSON({ tool_event: te });
      expect(c.toolEvent).toEqual(te);
    });
  });

  describe('fromJSONFile', () => {
    it('loads content from a JSON file', () => {
      const dir = mkdtempSync(join(tmpdir(), 'content-test-'));
      const filePath = join(dir, 'content.json');
      writeFileSync(filePath, JSON.stringify({ prompt: 'from file', response: 'resp' }));

      const c = Content.fromJSONFile(filePath);
      expect(c.prompt).toBe('from file');
      expect(c.response).toBe('resp');

      rmSync(dir, { recursive: true });
    });

    it('loads content with code fields from file', () => {
      const dir = mkdtempSync(join(tmpdir(), 'content-test-'));
      const filePath = join(dir, 'code.json');
      writeFileSync(filePath, JSON.stringify({ code_prompt: 'cp', code_response: 'cr' }));

      const c = Content.fromJSONFile(filePath);
      expect(c.codePrompt).toBe('cp');
      expect(c.codeResponse).toBe('cr');

      rmSync(dir, { recursive: true });
    });
  });
});
