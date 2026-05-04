import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RedTeamInstancesClient } from '../../src/red-team/instances-client.js';
import type { AuthAdapter } from '../../src/http/types.js';

function passthroughAuth(): AuthAdapter {
  return { prepare: async (req) => req };
}

function mockFetch(data: unknown, status = 200) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(data)),
  });
}

describe('RedTeamInstancesClient', () => {
  const originalFetch = globalThis.fetch;
  let client: RedTeamInstancesClient;

  beforeEach(() => {
    client = new RedTeamInstancesClient({
      baseUrl: 'https://mgmt.example.com',
      auth: passthroughAuth(),
      numRetries: 0,
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  // -----------------------------------------------------------------------
  // createInstance
  // -----------------------------------------------------------------------
  describe('createInstance', () => {
    it('POSTs to /v1/instances', async () => {
      const body = { tsg_id: 'tsg', tenant_id: 't', app_id: 'a', region: 'r' };
      mockFetch({ tsg_id: 'tsg', is_success: true });
      const result = await client.createInstance(body);

      expect(result.tsg_id).toBe('tsg');
      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('/v1/instances');
      expect(init.method).toBe('POST');
      expect(JSON.parse(init.body)).toEqual(body);
    });
  });

  // -----------------------------------------------------------------------
  // getInstance
  // -----------------------------------------------------------------------
  describe('getInstance', () => {
    it('GETs /v1/instances/{tenantId}', async () => {
      mockFetch({ tsg_id: 'tsg', tenant_id: 't-1', app_id: 'a', region: 'r' });
      const result = await client.getInstance('t-1');

      expect(result.tenant_id).toBe('t-1');
      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('/v1/instances/t-1');
      expect(init.method).toBe('GET');
    });
  });

  // -----------------------------------------------------------------------
  // updateInstance
  // -----------------------------------------------------------------------
  describe('updateInstance', () => {
    it('PUTs to /v1/instances/{tenantId}', async () => {
      const body = { tsg_id: 'tsg', tenant_id: 't-1', app_id: 'a', region: 'r' };
      mockFetch({ tsg_id: 'tsg', is_success: true });
      const result = await client.updateInstance('t-1', body);

      expect(result.is_success).toBe(true);
      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('/v1/instances/t-1');
      expect(init.method).toBe('PUT');
    });
  });

  // -----------------------------------------------------------------------
  // deleteInstance
  // -----------------------------------------------------------------------
  describe('deleteInstance', () => {
    it('DELETEs /v1/instances/{tenantId}', async () => {
      mockFetch({ tsg_id: 'tsg', is_success: true });
      const result = await client.deleteInstance('t-1');

      expect(result.tsg_id).toBe('tsg');
      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('/v1/instances/t-1');
      expect(init.method).toBe('DELETE');
    });
  });

  // -----------------------------------------------------------------------
  // createDevices
  // -----------------------------------------------------------------------
  describe('createDevices', () => {
    it('POSTs to /v1/instances/{tenantId}/devices', async () => {
      const body = {
        instance: { app_id: 'a', region: 'r', tenant_id: 't', tsg_id: 'g' },
        devices: [{ serial_number: 'SN-1' }],
      };
      mockFetch({ devices: [{ status: 'SUCCESS', serial_number: 'SN-1' }] });
      const result = await client.createDevices('t-1', body);

      expect(result.devices).toHaveLength(1);
      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('/v1/instances/t-1/devices');
      expect(init.method).toBe('POST');
    });
  });

  // -----------------------------------------------------------------------
  // updateDevices
  // -----------------------------------------------------------------------
  describe('updateDevices', () => {
    it('PATCHes /v1/instances/{tenantId}/devices', async () => {
      const body = {
        instance: { app_id: 'a', region: 'r', tenant_id: 't', tsg_id: 'g' },
        devices: [{ serial_number: 'SN-1' }],
      };
      mockFetch({ devices: [{ status: 'SUCCESS' }] });
      const result = await client.updateDevices('t-1', body);

      expect(result.devices).toHaveLength(1);
      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('/v1/instances/t-1/devices');
      expect(init.method).toBe('PATCH');
    });
  });

  // -----------------------------------------------------------------------
  // deleteDevices
  // -----------------------------------------------------------------------
  describe('deleteDevices', () => {
    it('DELETEs /v1/instances/{tenantId}/devices with serial_numbers param', async () => {
      mockFetch({ devices: [{ status: 'SUCCESS' }] });
      const result = await client.deleteDevices('t-1', 'SN-1,SN-2');

      expect(result.devices).toHaveLength(1);
      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('/v1/instances/t-1/devices');
      expect(url).toContain('serial_numbers=SN-1');
      expect(init.method).toBe('DELETE');
    });
  });

  // -----------------------------------------------------------------------
  // getRegistryCredentials
  // -----------------------------------------------------------------------
  describe('getRegistryCredentials', () => {
    it('POSTs to /v1/registry-credentials', async () => {
      mockFetch({ token: 'eyJ...', expiry: '2025-12-31T23:59:59Z' });
      const result = await client.getRegistryCredentials();

      expect(result.token).toBe('eyJ...');
      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('/v1/registry-credentials');
      expect(init.method).toBe('POST');
    });
  });
});
