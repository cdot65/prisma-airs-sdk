import { describe, expect, it, vi } from 'vitest';
import {
  AI_GATEWAY_PROBE_OPERATIONS,
  redactProbeValue,
  runAIGatewayProbe,
  type AIGatewayProbeTransport,
} from '../../scripts/ai-gateway-probe.js';

describe('AI Gateway conformance probe', () => {
  it('keeps candidate operations in a unique, reviewable ledger', () => {
    const ids = AI_GATEWAY_PROBE_OPERATIONS.map((operation) => operation.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(AI_GATEWAY_PROBE_OPERATIONS).toContainEqual(
      expect.objectContaining({
        id: 'configs.listVersions',
        method: 'GET',
        pathTemplate: '/configs/{configId}/versions',
        plane: 'data',
        status: 'verified',
      }),
    );
    expect(AI_GATEWAY_PROBE_OPERATIONS.every((operation) => operation.source.operationId)).toBe(
      true,
    );
  });

  it('redacts credentials and tenant identifiers recursively', () => {
    expect(
      redactProbeValue({
        authorization: 'Bearer live-token',
        'x-tsg-id': '1234567890',
        nested: {
          client_secret: 'live-secret',
          apiKey: 'live-api-key',
          private_key: 'private-key-material',
          vertexServiceAccountJson: { private_key_id: 'sensitive-key-id' },
          name: 'safe-name',
        },
      }),
    ).toEqual({
      authorization: '[REDACTED]',
      'x-tsg-id': '[REDACTED]',
      nested: {
        client_secret: '[REDACTED]',
        apiKey: '[REDACTED]',
        private_key: '[REDACTED]',
        vertexServiceAccountJson: { private_key_id: '[REDACTED]' },
        name: 'safe-name',
      },
    });
  });

  it('returns a dry-run record without touching the network', async () => {
    const send = vi.fn();

    const result = await runAIGatewayProbe(
      AI_GATEWAY_PROBE_OPERATIONS.find((operation) => operation.id === 'providers.get')!,
      {
        variables: { providerId: '11111111-1111-4111-8111-111111111111' },
        dryRun: true,
        transport: { send } as AIGatewayProbeTransport,
        now: () => new Date('2026-08-29T00:00:00.000Z'),
      },
    );

    expect(send).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      operationId: 'providers.get',
      method: 'GET',
      path: '/providers/11111111-1111-4111-8111-111111111111',
      plane: 'data',
      outcome: 'dry-run',
      verifiedAt: '2026-08-29T00:00:00.000Z',
    });
  });

  it('refuses mutation probes unless explicitly enabled', async () => {
    const operation = AI_GATEWAY_PROBE_OPERATIONS.find(
      (candidate) => candidate.id === 'guardrails.update',
    )!;

    await expect(
      runAIGatewayProbe(operation, {
        variables: { guardrailId: '11111111-1111-4111-8111-111111111111' },
        body: { name: 'probe' },
        transport: { send: vi.fn() },
      }),
    ).rejects.toThrow('Mutation probe guardrails.update requires allowMutation: true');
  });

  it('classifies responses and stores only redacted evidence', async () => {
    const send = vi.fn().mockResolvedValue({
      status: 200,
      headers: { 'content-type': 'application/json', 'x-request-id': 'request-1' },
      body: {
        id: 'provider-1',
        key: 'provider-secret',
        configuration: { credential: 'nested-secret' },
      },
    });
    const operation = AI_GATEWAY_PROBE_OPERATIONS.find(
      (candidate) => candidate.id === 'providers.get',
    )!;

    const result = await runAIGatewayProbe(operation, {
      variables: { providerId: '11111111-1111-4111-8111-111111111111' },
      transport: { send },
    });

    expect(result.outcome).toBe('verified');
    expect(result.evidence?.body).toEqual({
      id: 'provider-1',
      key: '[REDACTED]',
      configuration: { credential: '[REDACTED]' },
    });
  });

  it.each([
    [401, 'unauthenticated'],
    [403, 'unauthorized'],
    [404, 'route-divergent'],
    [500, 'server-error'],
  ] as const)('classifies HTTP %s as %s', async (status, outcome) => {
    const operation = AI_GATEWAY_PROBE_OPERATIONS.find(
      (candidate) => candidate.id === 'providers.get',
    )!;

    const result = await runAIGatewayProbe(operation, {
      variables: { providerId: '11111111-1111-4111-8111-111111111111' },
      transport: {
        send: vi.fn().mockResolvedValue({ status, headers: {}, body: { message: 'failure' } }),
      },
    });

    expect(result.outcome).toBe(outcome);
  });
});
