import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RedTeamAdaptersClient } from '../../src/red-team/adapters-client.js';
import type { AuthAdapter } from '../../src/http/types.js';
import { AISecSDKException } from '../../src/errors.js';
import {
  VALID_UUID,
  adapterMock,
  adapterListItemMock,
  adapterValidateResultMock,
  adapterConfigMock,
  paginatedListMock,
} from './_fixtures.js';

function passthroughAuth(): AuthAdapter {
  return { prepare: async (req) => req };
}

function mockFetch(data: unknown, status = 200) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(typeof data === 'string' ? data : JSON.stringify(data)),
  });
}

const createBody = {
  name: 'keycloak-agent',
  script_b64: 'cHJpbnQoImhpIik=',
  prompt: 'Hello',
};

describe('RedTeamAdaptersClient', () => {
  const originalFetch = globalThis.fetch;
  let client: RedTeamAdaptersClient;

  beforeEach(() => {
    client = new RedTeamAdaptersClient({
      baseUrl: 'https://mgmt.example.com',
      auth: passthroughAuth(),
      numRetries: 0,
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('create', () => {
    it('POSTs to /v1/adapters with validate=true by default (matches the server default)', async () => {
      mockFetch(adapterMock(), 201);
      const result = await client.create(createBody);

      expect(result.uuid).toBe(VALID_UUID);
      expect(result.status).toBe('ACTIVE');
      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toBe('https://mgmt.example.com/v1/adapters?validate=true');
      expect(init.method).toBe('POST');
      expect(JSON.parse(init.body as string)).toEqual(createBody);
    });

    it('serializes validate=false', async () => {
      mockFetch(adapterMock({ status: 'DRAFT' }), 201);
      await client.create(createBody, { validate: false });

      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toBe('https://mgmt.example.com/v1/adapters?validate=false');
    });

    // Spec: created_at/updated_at are nullable on CustomTargetAdapterSchema.
    it('parses a response with null timestamps', async () => {
      mockFetch(adapterMock({ created_at: null, updated_at: null }), 201);
      const result = await client.create(createBody);
      expect(result.created_at).toBeNull();
    });
  });

  describe('list', () => {
    // Spec: list rows are CustomTargetAdapterListItemSchema — a 7-field subset with no
    // script_b64 / tsg_id / variables. They must parse without those fields.
    it('GETs /v1/adapters and parses spec-shaped list items', async () => {
      mockFetch(paginatedListMock([adapterListItemMock()]));
      const result = await client.list({ limit: 20 });

      expect(result.data?.[0].name).toBe('keycloak-agent');
      expect(result.pagination.total_items).toBe(1);
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toBe('https://mgmt.example.com/v1/adapters?limit=20');
    });
  });

  describe('get', () => {
    it('GETs /v1/adapters/{uuid}', async () => {
      mockFetch(adapterMock());
      const result = await client.get(VALID_UUID);

      expect(result.script_b64).toBe('cHJpbnQoImhpIik=');
      expect(result.tsg_id).toBe('tsg-1');
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toBe(`https://mgmt.example.com/v1/adapters/${VALID_UUID}`);
    });

    it('surfaces is_redacted on secret variables', async () => {
      mockFetch(adapterMock());
      const result = await client.get(VALID_UUID);
      const secret = result.variables?.find((v) => v.type === 'SECRET');
      expect(secret?.value).toBeNull();
      expect(secret?.is_redacted).toBe(true);
    });

    // Live tenants mask secrets with the literal string '**********' rather than the `null`
    // the spec documents (verified 2026-08-01). Both forms must parse — callers key off
    // `is_redacted`, and either value round-trips through validate/update with adapter_uuid.
    it('parses the masked-placeholder form of a redacted secret', async () => {
      mockFetch(
        adapterMock({
          variables: [
            { key: 'client_secret', value: '**********', type: 'SECRET', is_redacted: true },
          ],
        }),
      );
      const result = await client.get(VALID_UUID);
      const secret = result.variables?.[0];
      expect(secret?.value).toBe('**********');
      expect(secret?.is_redacted).toBe(true);
    });

    it('rejects a non-UUID before issuing a request', async () => {
      globalThis.fetch = vi.fn();
      await expect(client.get('not-a-uuid')).rejects.toThrow(AISecSDKException);
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    // Spec: PUT is a full replacement — name, script_b64, prompt all required.
    it('PUTs the full replacement body to /v1/adapters/{uuid}', async () => {
      mockFetch(adapterMock());
      await client.update(VALID_UUID, createBody);

      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toBe(`https://mgmt.example.com/v1/adapters/${VALID_UUID}?validate=true`);
      expect(init.method).toBe('PUT');
    });

    it('rejects a non-UUID before issuing a request', async () => {
      globalThis.fetch = vi.fn();
      await expect(client.update('nope', createBody)).rejects.toThrow(AISecSDKException);
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('DELETEs and resolves undefined on a 204 empty body', async () => {
      mockFetch('', 204);
      const result = await client.delete(VALID_UUID);

      expect(result).toBeUndefined();
      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toBe(`https://mgmt.example.com/v1/adapters/${VALID_UUID}`);
      expect(init.method).toBe('DELETE');
    });

    it('rejects a non-UUID before issuing a request', async () => {
      globalThis.fetch = vi.fn();
      await expect(client.delete('nope')).rejects.toThrow(AISecSDKException);
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });
  });

  describe('validate', () => {
    // Spec: /v1/adapters/validate has its OWN request shape (no name; network broker channel
    // required; optional adapter_uuid for stored-secret resolution) and its own response
    // ({ validated, stdout, stderr, traceback }) — NOT the adapter record.
    it('POSTs the validate-specific body and parses the validate-specific response', async () => {
      mockFetch(adapterValidateResultMock());
      const result = await client.validate({
        script_b64: 'cHJpbnQoImhpIik=',
        network_broker_channel_uuid: VALID_UUID,
        prompt: 'Hello',
      });

      expect(result.validated).toBe(true);
      expect(result.stdout).toBe('ok');
      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toBe('https://mgmt.example.com/v1/adapters/validate');
      expect(init.method).toBe('POST');
      expect(JSON.parse(init.body as string)).not.toHaveProperty('name');
    });

    it('parses a failed validation with stderr and traceback', async () => {
      mockFetch(
        adapterValidateResultMock({
          validated: false,
          stdout: null,
          stderr: 'ModuleNotFoundError: requests',
          traceback: 'Traceback (most recent call last): ...',
        }),
      );
      const result = await client.validate({
        script_b64: 'cHJpbnQoImhpIik=',
        network_broker_channel_uuid: VALID_UUID,
        prompt: 'Hello',
      });

      expect(result.validated).toBe(false);
      expect(result.stderr).toContain('ModuleNotFoundError');
    });

    it('forwards adapter_uuid so stored secrets can be resolved', async () => {
      mockFetch(adapterValidateResultMock());
      await client.validate({
        script_b64: 'cHJpbnQoImhpIik=',
        network_broker_channel_uuid: VALID_UUID,
        prompt: 'Hello',
        adapter_uuid: VALID_UUID,
      });

      const [, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(JSON.parse(init.body as string).adapter_uuid).toBe(VALID_UUID);
    });
  });
});

// NOTE: appended by feat/adapter-config-and-target-fields
describe('getConfig', () => {
  let client2: RedTeamAdaptersClient;
  const originalFetch2 = globalThis.fetch;

  beforeEach(() => {
    client2 = new RedTeamAdaptersClient({
      baseUrl: 'https://mgmt.example.com',
      auth: { prepare: async (req: unknown) => req },
      numRetries: 0,
    });
  });
  afterEach(() => {
    globalThis.fetch = originalFetch2;
  });

  it('GETs /v1/adapters/config and returns default script + prompt', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify(adapterConfigMock())),
    });
    const result = await client2.getConfig();
    expect(result.default_script_b64).toBe('ZGVmIHByZV9wcm9jZXNz');
    expect(result.default_test_prompt).toBe('What is the capital of France?');
    const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://mgmt.example.com/v1/adapters/config');
    expect(init.method).toBe('GET');
  });
});
