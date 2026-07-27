import { describe, it, expect } from 'vitest';
import { toOffsetIso, serializeWindow } from '../../src/ai-gateway/window.js';

describe('toOffsetIso', () => {
  it('emits ISO-8601 with a numeric offset, not Z', () => {
    const s = toOffsetIso(new Date('2026-07-20T12:00:00Z'));
    expect(s).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
  });
});

describe('serializeWindow', () => {
  it('defaults to a 7-day window and includes the tsg as organisationId', () => {
    const p = serializeWindow('1852583913', { workspaceSlug: 'ws-x' });
    expect(p.organisationId).toBe('1852583913');
    expect(p.workspaceSlug).toBe('ws-x');
    expect(p.timeOfGenerationMin).toBeDefined();
    expect(p.timeOfGenerationMax).toBeDefined();
  });

  it('honours explicit start/end over days', () => {
    const p = serializeWindow('1', {
      workspaceSlug: 'ws-x',
      days: 30,
      start: new Date('2026-07-01T00:00:00Z'),
      end: new Date('2026-07-08T00:00:00Z'),
    });
    expect(
      p.timeOfGenerationMin.startsWith('2026-06-30') ||
        p.timeOfGenerationMin.startsWith('2026-07-01'),
    ).toBe(true);
  });
});
