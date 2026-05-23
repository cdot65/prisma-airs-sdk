import { describe, it, expect } from 'vitest';
import { AuditResponseSchema } from '../../src/models/dlp-audit.js';

describe('AuditResponseSchema', () => {
  it('parses a full audit_metadata block', () => {
    const r = AuditResponseSchema.safeParse({
      created_at: '2026-05-23T08:17:00Z',
      created_by: 'calvin@cdot.io',
      updated_at: '2026-05-23T09:30:00Z',
      updated_by: 'service-account',
    });
    expect(r.success).toBe(true);
  });

  it('treats all four fields as optional', () => {
    const r = AuditResponseSchema.safeParse({});
    expect(r.success).toBe(true);
  });

  it('rejects non-string created_by', () => {
    const r = AuditResponseSchema.safeParse({ created_by: 42 });
    expect(r.success).toBe(false);
  });

  it('passes through unknown fields (forward compat)', () => {
    const r = AuditResponseSchema.safeParse({
      created_at: '2026-05-23T08:17:00Z',
      future_field: 'whatever',
    });
    expect(r.success).toBe(true);
  });

  it('accepts null for all four fields (live API emits null on unset)', () => {
    const r = AuditResponseSchema.safeParse({
      created_at: null,
      created_by: null,
      updated_at: null,
      updated_by: null,
    });
    expect(r.success).toBe(true);
  });

  it('accepts numeric epoch (ms) for created_at and updated_at', () => {
    const r = AuditResponseSchema.safeParse({
      created_at: 1779560642845,
      updated_at: 1779560642999,
    });
    expect(r.success).toBe(true);
  });
});
