import { describe, expect, it } from 'vitest';
import {
  AI_GATEWAY_REDACTED,
  AI_GATEWAY_SECRET_FIELDS,
  redactAIGatewaySecrets,
} from '../../src/ai-gateway/secret-fields.js';

describe('AI Gateway secret metadata', () => {
  it('covers every currently secret-bearing operation', () => {
    expect(Object.keys(AI_GATEWAY_SECRET_FIELDS).sort()).toEqual([
      'apiKeys.createService',
      'apiKeys.createUser',
      'apiKeys.rotateService',
      'apiKeys.rotateUser',
      'deployments.create',
      'deployments.update',
      'integrations.create',
      'integrations.update',
      'mcpIntegrations.create',
      'mcpIntegrations.update',
      'organisations.getAuthSettings',
      'organisations.updateAuthSettings',
      'plugins.create',
      'providers.get',
    ]);
  });

  it('redacts exact and subtree request fields without mutating the input', () => {
    const input = {
      key: 'provider-secret',
      configurations: {
        vertex_region: 'us-central1',
        vertex_service_account_json: { private_key: 'private-key' },
      },
    };

    const output = redactAIGatewaySecrets('integrations.create', input);
    expect(output).toEqual({
      key: AI_GATEWAY_REDACTED,
      configurations: {
        vertex_region: 'us-central1',
        vertex_service_account_json: AI_GATEWAY_REDACTED,
      },
    });
    expect(input.key).toBe('provider-secret');
    expect(input.configurations.vertex_service_account_json.private_key).toBe('private-key');
  });

  it('redacts response-only one-time credentials in arrays and objects', () => {
    const output = redactAIGatewaySecrets(
      'deployments.create',
      {
        client_auth: 'client-auth-secret',
        credentials: { username: 'tenant', password: 'registry-secret' },
      },
      'response',
    );
    expect(output).toEqual({
      client_auth: AI_GATEWAY_REDACTED,
      credentials: { username: 'tenant', password: AI_GATEWAY_REDACTED },
    });
  });

  it('redacts wildcard credential values', () => {
    expect(
      redactAIGatewaySecrets('plugins.create', {
        credentials: { AIRS_API_KEY: 'secret', SECONDARY: 'other' },
      }),
    ).toEqual({
      credentials: { AIRS_API_KEY: AI_GATEWAY_REDACTED, SECONDARY: AI_GATEWAY_REDACTED },
    });
  });

  it('clones prototype-shaped JSON keys as data properties', () => {
    const input = JSON.parse(
      '{"credentials":{"__proto__":{"polluted":true},"constructor":"secret"}}',
    ) as Record<string, unknown>;
    const output = redactAIGatewaySecrets('plugins.create', input);

    expect(Object.prototype.hasOwnProperty.call(output.credentials, '__proto__')).toBe(true);
    expect(output.credentials).toEqual(
      JSON.parse(`{"__proto__":"${AI_GATEWAY_REDACTED}","constructor":"${AI_GATEWAY_REDACTED}"}`),
    );
    expect(({} as { polluted?: boolean }).polluted).toBeUndefined();
  });
});
