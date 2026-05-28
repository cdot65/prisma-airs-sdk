import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DataProfilesClient } from '../../../src/management/dlp/data-profiles.js';
import type { AuthAdapter } from '../../../src/http/types.js';
import { ErrorType } from '../../../src/errors.js';

function passthroughAuth(): AuthAdapter {
  return { prepare: async (req) => req };
}

function mockFetch(data: unknown, status = 200) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: () =>
      Promise.resolve(
        data === undefined ? '' : typeof data === 'string' ? data : JSON.stringify(data),
      ),
  });
}

const profileFixture = {
  id: 'prof-1',
  name: 'Confidential',
  profile_type: 'advanced',
  profile_status: 'active',
};

const pageFixture = {
  content: [profileFixture],
  empty: false,
  first: true,
  last: true,
  number: 0,
  numberOfElements: 1,
  size: 20,
  totalElements: 1,
  totalPages: 1,
};

const treeRuleBody = {
  name: 'P1',
  detection_rules: [
    {
      rule_type: 'expression_tree' as const,
      expression_tree: {
        operator_type: 'and' as const,
        rule_item: { detection_technique: 'regex' as const, match_type: 'include' as const },
      },
    },
  ],
};

describe('DataProfilesClient', () => {
  const originalFetch = globalThis.fetch;
  let client: DataProfilesClient;

  beforeEach(() => {
    client = new DataProfilesClient({
      baseUrl: 'https://api.dlp.paloaltonetworks.com',
      auth: passthroughAuth(),
      numRetries: 1,
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('list', () => {
    it('GETs /v2/api/data-profiles with no params', async () => {
      mockFetch(pageFixture);
      const r = await client.list();
      expect(r.content).toHaveLength(1);
      expect(r.content[0].id).toBe('prof-1');
      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toBe('https://api.dlp.paloaltonetworks.com/v2/api/data-profiles');
      expect(init.method).toBe('GET');
    });

    it('passes page + size as query params', async () => {
      mockFetch(pageFixture);
      await client.list({ page: 2, size: 50 });
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('page=2');
      expect(url).toContain('size=50');
    });

    it('repeats sort once per array entry', async () => {
      mockFetch(pageFixture);
      await client.list({ sort: ['name,asc', 'id,desc'] });
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(new URL(url).searchParams.getAll('sort')).toEqual(['name,asc', 'id,desc']);
    });

    it('throws RESPONSE_VALIDATION on schema mismatch', async () => {
      mockFetch({ content: 'not-an-array' });
      await expect(client.list()).rejects.toMatchObject({
        errorType: ErrorType.RESPONSE_VALIDATION,
      });
    });
  });

  describe('create', () => {
    it('POSTs the JSON body to /v2/api/data-profiles', async () => {
      mockFetch(profileFixture, 201);
      const r = await client.create(treeRuleBody);
      expect(r.id).toBe('prof-1');
      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toBe('https://api.dlp.paloaltonetworks.com/v2/api/data-profiles');
      expect(init.method).toBe('POST');
      expect(init.body).toBe(JSON.stringify(treeRuleBody));
      expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    });
  });

  describe('get', () => {
    it('GETs /v2/api/data-profiles/{resourceId}', async () => {
      mockFetch(profileFixture);
      const r = await client.get('prof-1');
      expect(r.id).toBe('prof-1');
      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toBe('https://api.dlp.paloaltonetworks.com/v2/api/data-profiles/prof-1');
      expect(init.method).toBe('GET');
    });

    it('URL-encodes resourceIds with special characters', async () => {
      mockFetch(profileFixture);
      await client.get('weird id/slash');
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('weird%20id%2Fslash');
    });

    // Regression for #162 — see data-patterns.spec.ts for context.
    it('sends service-name: api header', async () => {
      mockFetch(profileFixture);
      await client.get('prof-1');
      const [, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect((init.headers as Record<string, string>)['service-name']).toBe('api');
    });
  });

  describe('replace', () => {
    it('PUTs the JSON body to /v2/api/data-profiles/{resourceId}', async () => {
      mockFetch(profileFixture);
      const r = await client.replace('prof-1', treeRuleBody);
      expect(r.id).toBe('prof-1');
      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toBe('https://api.dlp.paloaltonetworks.com/v2/api/data-profiles/prof-1');
      expect(init.method).toBe('PUT');
      expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    });
  });

  describe('patch', () => {
    it('PATCHes with Content-Type application/merge-patch+json', async () => {
      mockFetch(profileFixture);
      const body = {
        name: 'Renamed',
        profile_type: 'basic' as const,
        description: null,
      };
      const r = await client.patch('prof-1', body);
      expect(r.id).toBe('prof-1');
      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toBe('https://api.dlp.paloaltonetworks.com/v2/api/data-profiles/prof-1');
      expect(init.method).toBe('PATCH');
      expect((init.headers as Record<string, string>)['Content-Type']).toBe(
        'application/merge-patch+json',
      );
      expect(init.body).toBe(JSON.stringify(body));
    });
  });

  describe('no delete method', () => {
    it('does not expose a delete method (spec has no DELETE)', () => {
      expect((client as unknown as { delete?: unknown }).delete).toBeUndefined();
    });
  });
});
