import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AIGatewayClient } from '../../src/ai-gateway/client.js';
import { AISecSDKException } from '../../src/errors.js';

describe('AIGatewayClient', () => {
  const saved = { ...process.env };

  beforeEach(() => {
    delete process.env.PANW_AI_GW_CLIENT_ID;
    delete process.env.PANW_AI_GW_CLIENT_SECRET;
    delete process.env.PANW_AI_GW_TSG_ID;
    delete process.env.PANW_MGMT_CLIENT_ID;
    delete process.env.PANW_MGMT_CLIENT_SECRET;
    delete process.env.PANW_MGMT_TSG_ID;
  });

  afterEach(() => {
    process.env = { ...saved };
  });

  it('constructs every sub-client from explicit options', () => {
    const gw = new AIGatewayClient({ clientId: 'cid', clientSecret: 'sec', tsgId: '1852583913' });

    expect(gw.telemetry).toBeDefined();
    expect(gw.workspaces).toBeDefined();
    expect(gw.configs).toBeDefined();
    expect(gw.guardrails).toBeDefined();
    expect(gw.providers).toBeDefined();
    expect(gw.apiKeys).toBeDefined();
    expect(gw.integrations).toBeDefined();
    expect(gw.mcpIntegrations).toBeDefined();
    expect(gw.deployments).toBeDefined();
    expect(gw.plugins).toBeDefined();
    expect(gw.organisations).toBeDefined();
    expect(gw.auditLogs).toBeDefined();
  });

  it('falls back to PANW_MGMT_* when PANW_AI_GW_* is unset', () => {
    process.env.PANW_MGMT_CLIENT_ID = 'mgmt-id';
    process.env.PANW_MGMT_CLIENT_SECRET = 'mgmt-secret';
    process.env.PANW_MGMT_TSG_ID = '1852583913';

    expect(() => new AIGatewayClient()).not.toThrow();
  });

  it('throws MISSING_VARIABLE when no credentials resolve', () => {
    expect(() => new AIGatewayClient()).toThrow(AISecSDKException);
  });

  it('honours endpoint overrides', () => {
    const gw = new AIGatewayClient({
      clientId: 'cid',
      clientSecret: 'sec',
      tsgId: '1',
      dataEndpoint: 'https://api.sase.paloaltonetworks.com/ai_gw/v2',
      adminEndpoint: 'https://api.sase.paloaltonetworks.com/ai_gw/admin/v2',
    });
    expect(gw).toBeInstanceOf(AIGatewayClient);
  });
});
