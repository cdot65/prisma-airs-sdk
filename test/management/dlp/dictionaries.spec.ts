import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DictionariesClient } from '../../../src/management/dlp/dictionaries.js';
import type { AuthAdapter } from '../../../src/http/types.js';

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

const dictionaryFixture = {
  id: 'dict-1',
  name: 'PII',
  category: 'Confidential',
  region_name: 'us',
  type: 'custom',
};

const pageFixture = {
  content: [dictionaryFixture],
  empty: false,
  first: true,
  last: true,
  number: 0,
  numberOfElements: 1,
  size: 20,
  totalElements: 1,
  totalPages: 1,
};

describe('DictionariesClient', () => {
  const originalFetch = globalThis.fetch;
  let client: DictionariesClient;

  beforeEach(() => {
    client = new DictionariesClient({
      baseUrl: 'https://api.dlp.paloaltonetworks.com',
      auth: passthroughAuth(),
      numRetries: 1,
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('list', () => {
    it('GETs /v2/api/dictionaries with no params', async () => {
      mockFetch(pageFixture);
      const r = await client.list();
      expect(r.content[0].id).toBe('dict-1');
      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toBe('https://api.dlp.paloaltonetworks.com/v2/api/dictionaries');
      expect(init.method).toBe('GET');
    });

    it('passes page/size/sort + keywords=true', async () => {
      mockFetch(pageFixture);
      await client.list({ page: 1, size: 50, sort: ['name,asc'], keywords: true });
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      const u = new URL(url);
      expect(u.searchParams.get('page')).toBe('1');
      expect(u.searchParams.get('size')).toBe('50');
      expect(u.searchParams.getAll('sort')).toEqual(['name,asc']);
      expect(u.searchParams.get('keywords')).toBe('true');
    });

    it('passes keywords=false explicitly when requested', async () => {
      mockFetch(pageFixture);
      await client.list({ keywords: false });
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(new URL(url).searchParams.get('keywords')).toBe('false');
    });
  });

  describe('create', () => {
    it('POSTs multipart with json + file parts, no Content-Type header', async () => {
      mockFetch(dictionaryFixture, 201);
      const file = new Blob(['ssn\ndob\n'], { type: 'text/plain' });
      const metadata = {
        category: 'Confidential' as const,
        name: 'PII',
        original_file_name: 'pii.txt',
        region_name: 'us',
      };
      const r = await client.create({ metadata, file });
      expect(r.id).toBe('dict-1');
      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toBe('https://api.dlp.paloaltonetworks.com/v2/api/dictionaries');
      expect(init.method).toBe('POST');
      expect(init.body).toBeInstanceOf(FormData);
      const fd = init.body as FormData;
      expect(fd.get('file')).toBeInstanceOf(Blob);
      const jsonPart = fd.get('json');
      expect(jsonPart).toBeInstanceOf(Blob);
      const jsonText = await (jsonPart as Blob).text();
      expect(JSON.parse(jsonText)).toEqual(metadata);
      expect((init.headers as Record<string, string>)['Content-Type']).toBeUndefined();
    });

    it('passes keywords=true query param when requested', async () => {
      mockFetch(dictionaryFixture, 201);
      await client.create({
        metadata: {
          category: 'Financial',
          name: 'D',
          original_file_name: 'd.txt',
          region_name: 'us',
        },
        file: new Blob(['x']),
        includeKeywords: true,
      });
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(new URL(url).searchParams.get('keywords')).toBe('true');
    });

    it('accepts string content as file (normalized to Blob)', async () => {
      mockFetch(dictionaryFixture, 201);
      await client.create({
        metadata: {
          category: 'Financial',
          name: 'D',
          original_file_name: 'd.txt',
          region_name: 'us',
        },
        file: 'hello',
      });
      const [, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      const fd = init.body as FormData;
      const filePart = fd.get('file');
      expect(filePart).toBeInstanceOf(Blob);
      expect(await (filePart as Blob).text()).toBe('hello');
    });
  });

  describe('get', () => {
    it('GETs /v2/api/dictionaries/{id} with no query', async () => {
      mockFetch(dictionaryFixture);
      const r = await client.get('dict-1');
      expect(r.id).toBe('dict-1');
      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toBe('https://api.dlp.paloaltonetworks.com/v2/api/dictionaries/dict-1');
      expect(init.method).toBe('GET');
    });

    it('passes keywords=true when includeKeywords requested', async () => {
      mockFetch(dictionaryFixture);
      await client.get('dict-1', { includeKeywords: true });
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(new URL(url).searchParams.get('keywords')).toBe('true');
    });

    it('URL-encodes resourceIds with special characters', async () => {
      mockFetch(dictionaryFixture);
      await client.get('weird id/slash');
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('weird%20id%2Fslash');
    });
  });

  describe('replace', () => {
    it('PUTs multipart with json + file parts', async () => {
      mockFetch(dictionaryFixture);
      await client.replace('dict-1', {
        metadata: {
          category: 'Confidential',
          name: 'PII',
          original_file_name: 'pii.txt',
          region_name: 'us',
        },
        file: new Blob(['new content']),
      });
      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toBe('https://api.dlp.paloaltonetworks.com/v2/api/dictionaries/dict-1');
      expect(init.method).toBe('PUT');
      expect(init.body).toBeInstanceOf(FormData);
      expect((init.headers as Record<string, string>)['Content-Type']).toBeUndefined();
    });

    it('returns DictionaryResponse on 200', async () => {
      mockFetch(dictionaryFixture, 200);
      const r = await client.replace('dict-1', {
        metadata: {
          category: 'Confidential',
          name: 'PII',
          original_file_name: 'pii.txt',
          region_name: 'us',
        },
        file: new Blob(['x']),
      });
      expect(r?.id).toBe('dict-1');
    });

    it('returns undefined on 204 no body', async () => {
      mockFetch(undefined, 204);
      const r = await client.replace('dict-1', {
        metadata: {
          category: 'Confidential',
          name: 'PII',
          original_file_name: 'pii.txt',
          region_name: 'us',
        },
        file: new Blob(['x']),
      });
      expect(r).toBeUndefined();
    });
  });

  describe('patch', () => {
    it('PATCHes with Content-Type application/merge-patch+json', async () => {
      mockFetch(dictionaryFixture);
      const body = {
        category: 'Confidential' as const,
        name: 'PII',
        original_file_name: 'pii.txt',
        description: null,
      };
      const r = await client.patch('dict-1', body);
      expect(r.id).toBe('dict-1');
      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toBe('https://api.dlp.paloaltonetworks.com/v2/api/dictionaries/dict-1');
      expect(init.method).toBe('PATCH');
      expect((init.headers as Record<string, string>)['Content-Type']).toBe(
        'application/merge-patch+json',
      );
      expect(init.body).toBe(JSON.stringify(body));
    });
  });

  describe('delete', () => {
    it('DELETEs /v2/api/dictionaries/{id} and resolves undefined on 204', async () => {
      mockFetch(undefined, 204);
      const r = await client.delete('dict-1');
      expect(r).toBeUndefined();
      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toBe('https://api.dlp.paloaltonetworks.com/v2/api/dictionaries/dict-1');
      expect(init.method).toBe('DELETE');
    });
  });
});
