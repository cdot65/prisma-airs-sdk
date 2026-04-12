import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RedTeamTargetsClient } from '../../src/red-team/targets-client.js';
import { OAuthClient } from '../../src/management/oauth-client.js';
import { AISecSDKException } from '../../src/errors.js';

const validUuid = '550e8400-e29b-41d4-a716-446655440000';

function createMockOAuth(): OAuthClient {
  return {
    getToken: vi.fn().mockResolvedValue('tok'),
    clearToken: vi.fn(),
  } as unknown as OAuthClient;
}

function mockFetch(data: unknown, status = 200) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(data)),
  });
}

describe('RedTeamTargetsClient', () => {
  const originalFetch = globalThis.fetch;
  let client: RedTeamTargetsClient;

  beforeEach(() => {
    client = new RedTeamTargetsClient({
      baseUrl: 'https://mgmt.example.com',
      oauthClient: createMockOAuth(),
      numRetries: 0,
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  // -----------------------------------------------------------------------
  // create
  // -----------------------------------------------------------------------
  describe('create', () => {
    it('POSTs to /v1/target', async () => {
      const target = { id: validUuid, name: 'test-target' };
      mockFetch(target, 201);
      const result = await client.create({ name: 'test-target', target_type: 'API' });

      expect(result.id).toBe(validUuid);
      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toBe('https://mgmt.example.com/v1/target');
      expect(init.method).toBe('POST');
    });

    it('passes validate query param when true', async () => {
      mockFetch({ id: validUuid }, 201);
      await client.create({ name: 'test' }, { validate: true });

      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('validate=true');
    });

    it('passes validate query param when false', async () => {
      mockFetch({ id: validUuid }, 201);
      await client.create({ name: 'test' }, { validate: false });

      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('validate=false');
    });

    it('omits validate param when not specified', async () => {
      mockFetch({ id: validUuid }, 201);
      await client.create({ name: 'test' });

      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).not.toContain('validate');
    });

    it('sends only the fields in the request body (no extra SDK fields)', async () => {
      mockFetch({ uuid: validUuid, name: 'test' }, 201);
      await client.create({
        name: 'test-target',
        target_type: 'APPLICATION',
        connection_type: 'CUSTOM',
        api_endpoint_type: 'PUBLIC',
        response_mode: 'REST',
        connection_params: {
          api_endpoint: 'https://api.example.com/v1/chat',
          request_headers: { 'Content-Type': 'application/json' },
          request_json: { model: 'gpt-4' },
          response_json: { content: '{RESPONSE}' },
          response_key: 'content',
        },
      });

      const [, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      const body = JSON.parse(init.body);
      expect(body).not.toHaveProperty('auth_type');
      expect(body).not.toHaveProperty('auth_config');
      expect(body.name).toBe('test-target');
      expect(body.target_type).toBe('APPLICATION');
      expect(body.connection_params.api_endpoint).toBe('https://api.example.com/v1/chat');
    });
  });

  // -----------------------------------------------------------------------
  // list
  // -----------------------------------------------------------------------
  describe('list', () => {
    it('GETs /v1/target', async () => {
      mockFetch({ targets: [], total: 0 });
      const result = await client.list();

      expect(result.targets).toEqual([]);
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('/v1/target');
    });

    it('passes filter params', async () => {
      mockFetch({ targets: [], total: 0 });
      await client.list({ target_type: 'API', status: 'ACTIVE' });

      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('target_type=API');
      expect(url).toContain('status=ACTIVE');
    });

    it('passes pagination params', async () => {
      mockFetch({ targets: [], total: 0 });
      await client.list({ skip: 5, limit: 10 });

      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('skip=5');
      expect(url).toContain('limit=10');
    });

    it('does not send sort params (not in spec)', async () => {
      mockFetch({ targets: [], total: 0 });
      await client.list({ skip: 0 });

      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).not.toContain('sort_by');
      expect(url).not.toContain('sort_direction');
    });
  });

  // -----------------------------------------------------------------------
  // get
  // -----------------------------------------------------------------------
  describe('get', () => {
    it('GETs /v1/target/:uuid', async () => {
      const target = { id: validUuid, name: 'test-target' };
      mockFetch(target);
      const result = await client.get(validUuid);

      expect(result.id).toBe(validUuid);
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain(`/v1/target/${validUuid}`);
    });

    it('rejects invalid UUID', async () => {
      await expect(client.get('bad')).rejects.toThrow(AISecSDKException);
    });
  });

  // -----------------------------------------------------------------------
  // update
  // -----------------------------------------------------------------------
  describe('update', () => {
    it('PUTs to /v1/target/:uuid', async () => {
      const target = { id: validUuid, name: 'updated' };
      mockFetch(target);
      const result = await client.update(validUuid, { name: 'updated' });

      expect(result.name).toBe('updated');
      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain(`/v1/target/${validUuid}`);
      expect(init.method).toBe('PUT');
    });

    it('rejects invalid UUID', async () => {
      await expect(client.update('bad', { name: 'x' })).rejects.toThrow(AISecSDKException);
    });

    it('passes validate query param when true', async () => {
      mockFetch({ id: validUuid });
      await client.update(validUuid, { name: 'test' }, { validate: true });

      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('validate=true');
    });

    it('passes validate query param when false', async () => {
      mockFetch({ id: validUuid });
      await client.update(validUuid, { name: 'test' }, { validate: false });

      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('validate=false');
    });

    it('sends only the fields in the request body (no extra SDK fields)', async () => {
      mockFetch({ uuid: validUuid, name: 'updated' });
      await client.update(validUuid, {
        name: 'updated',
        target_type: 'AGENT',
        response_mode: 'REST',
      });

      const [, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      const body = JSON.parse(init.body);
      expect(body).not.toHaveProperty('auth_type');
      expect(body).not.toHaveProperty('auth_config');
      expect(body.name).toBe('updated');
      expect(body.target_type).toBe('AGENT');
    });
  });

  // -----------------------------------------------------------------------
  // delete
  // -----------------------------------------------------------------------
  describe('delete', () => {
    it('DELETEs /v1/target/:uuid', async () => {
      mockFetch({ success: true });
      const result = await client.delete(validUuid);

      expect(result.success).toBe(true);
      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain(`/v1/target/${validUuid}`);
      expect(init.method).toBe('DELETE');
    });

    it('rejects invalid UUID', async () => {
      await expect(client.delete('bad')).rejects.toThrow(AISecSDKException);
    });
  });

  // -----------------------------------------------------------------------
  // probe
  // -----------------------------------------------------------------------
  describe('probe', () => {
    it('POSTs to /v1/target/probe', async () => {
      const target = { id: validUuid, status: 'PROBING' };
      mockFetch(target);
      const result = await client.probe({ target_id: validUuid });

      expect(result.status).toBe('PROBING');
      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('/v1/target/probe');
      expect(init.method).toBe('POST');
    });
  });

  // -----------------------------------------------------------------------
  // getProfile
  // -----------------------------------------------------------------------
  describe('getProfile', () => {
    it('GETs /v1/target/:uuid/profile', async () => {
      mockFetch({ target_id: validUuid, background: 'test' });
      const result = await client.getProfile(validUuid);

      expect(result.target_id).toBe(validUuid);
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain(`/v1/target/${validUuid}/profile`);
    });

    it('rejects invalid UUID', async () => {
      await expect(client.getProfile('bad')).rejects.toThrow(AISecSDKException);
    });
  });

  // -----------------------------------------------------------------------
  // updateProfile
  // -----------------------------------------------------------------------
  describe('updateProfile', () => {
    it('PUTs to /v1/target/:uuid/profile and returns TargetResponse', async () => {
      mockFetch({ uuid: validUuid, name: 'my-target', target_type: 'API' });
      const result = await client.updateProfile(validUuid, { background: 'updated' });

      expect(result.uuid).toBe(validUuid);
      expect(result.name).toBe('my-target');
      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain(`/v1/target/${validUuid}/profile`);
      expect(init.method).toBe('PUT');
    });

    it('rejects invalid UUID', async () => {
      await expect(client.updateProfile('bad', { background: 'x' })).rejects.toThrow(
        AISecSDKException,
      );
    });
  });

  // -----------------------------------------------------------------------
  // validateAuth
  // -----------------------------------------------------------------------
  describe('validateAuth', () => {
    it('POSTs to /v1/target/validate-auth', async () => {
      const body = { auth_type: 'HEADERS', auth_config: { auth_header: { key: 'val' } } };
      mockFetch({ validated: true, token_preview: 'Bearer eyJ...', expires_in: 3600 });
      const result = await client.validateAuth(body);

      expect(result.validated).toBe(true);
      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('/v1/target/validate-auth');
      expect(init.method).toBe('POST');
      expect(JSON.parse(init.body)).toEqual(body);
    });
  });

  // -----------------------------------------------------------------------
  // getTargetMetadata
  // -----------------------------------------------------------------------
  describe('getTargetMetadata', () => {
    it('GETs /v1/template/target-metadata', async () => {
      const metadata = { fields: ['name', 'type'] };
      mockFetch(metadata);
      const result = await client.getTargetMetadata();

      expect(result.fields).toEqual(['name', 'type']);
      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('/v1/template/target-metadata');
      expect(init.method).toBe('GET');
    });
  });

  // -----------------------------------------------------------------------
  // getTargetTemplates
  // -----------------------------------------------------------------------
  describe('getTargetTemplates', () => {
    it('GETs /v1/template/target-templates', async () => {
      const templates = {
        OPENAI: { model: 'gpt-4' },
        HUGGING_FACE: {},
        DATABRICKS: {},
        BEDROCK: {},
        REST: {},
        STREAMING: {},
        WEBSOCKET: {},
      };
      mockFetch(templates);
      const result = await client.getTargetTemplates();

      expect(result.OPENAI).toEqual({ model: 'gpt-4' });
      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('/v1/template/target-templates');
      expect(init.method).toBe('GET');
    });
  });
});
