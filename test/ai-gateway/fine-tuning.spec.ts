import { describe, expect, it, vi } from 'vitest';
import { AIGatewayInferenceClient } from '../../src/ai-gateway/inference-client.js';
import {
  GatewayInferenceInputCreateFineTuningJobRequestSchema,
  GatewayInferenceFineTuningJobSchema,
} from '../../src/models/ai-gateway-inference.js';
import { ErrorType } from '../../src/errors.js';

const connection = { endpoint: 'https://gateway.test/v1', apiKey: 'offline-runtime-key' };
const body = {
  model: '@provider/trainable-model',
  training_file: 'file-owned',
  suffix: 'offline-contract',
  method: {
    type: 'supervised' as const,
    supervised: {
      hyperparameters: { n_epochs: 1, learning_rate_multiplier: 0.1, batch_size: 1 },
    },
  },
};
const job = {
  id: 'ftjob-owned',
  created_at: 1,
  error: null,
  finished_at: null,
  fine_tuned_model: null,
  hyperparameters: { n_epochs: 'auto' },
  model: 'trainable-model',
  object: 'fine_tuning.job',
  organization_id: 'org-offline',
  result_files: [],
  status: 'validating_files',
  trained_tokens: null,
  training_file: 'file-owned',
  validation_file: null,
  seed: 1,
};

describe('gateway fine-tuning contracts (offline; no training is started)', () => {
  it.each([
    body,
    {
      ...body,
      job_name: 'owned',
      role_arn: 'arn:example:role',
      output_file: 's3://example/output',
    },
    {
      ...body,
      portkey_options: { 'x-portkey-virtual-key': 'offline-provider-alias' },
      provider_options: {},
    },
  ])('preserves the declared provider request variant', (value) => {
    expect(GatewayInferenceInputCreateFineTuningJobRequestSchema.parse(value)).toEqual(value);
  });

  it.each([
    { ...body, typo: true },
    { ...body, method: { type: 'unknown' } },
    { ...body, method: { type: 'supervised', supervised: { hyperparameters: { n_epochs: 1 } } } },
    { ...body, training_file: null },
    { ...body, suffix: undefined },
  ])('rejects malformed requests before fetch', async (value) => {
    const fetch = vi.fn();
    const client = new AIGatewayInferenceClient({ ...connection, fetch });
    await expect(client.createFineTuningJob(value as never)).rejects.toMatchObject({
      errorType: ErrorType.USER_REQUEST_PAYLOAD_ERROR,
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('preserves additive response fields without accepting malformed known fields', () => {
    const value = { ...job, provider_extension: { value: true } };
    expect(GatewayInferenceFineTuningJobSchema.parse(value)).toEqual(value);
    expect(GatewayInferenceFineTuningJobSchema.safeParse({ ...job, seed: 'invalid' }).success).toBe(
      false,
    );
  });

  it('routes create explicitly, omits SCM authentication and never retries it by default', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response('temporary upstream error', { status: 503 }));
    const client = new AIGatewayInferenceClient({ ...connection, fetch });
    await expect(
      client.createFineTuningJob(body, { headers: { 'x-portkey-provider': '@provider' } }),
    ).rejects.toMatchObject({ statusCode: 503 });
    expect(fetch).toHaveBeenCalledOnce();
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('https://gateway.test/v1/fine_tuning/jobs');
    expect(JSON.parse(init.body)).toEqual(body);
    const headers = new Headers(init.headers);
    expect(headers.get('x-portkey-api-key')).toBe(connection.apiKey);
    expect(headers.get('x-portkey-provider')).toBe('@provider');
    expect(headers.has('authorization')).toBe(false);
    expect(headers.has('x-tsg-id')).toBe(false);
    expect(init.redirect).toBe('error');
  });

  it('accepts an empty job page with default query options', async () => {
    const page = { object: 'list', data: [], has_more: false };
    const fetch = vi.fn().mockImplementation(async () => new Response(JSON.stringify(page)));
    const client = new AIGatewayInferenceClient({ ...connection, fetch });
    expect(await client.listPaginatedFineTuningJobs()).toEqual(page);
    expect(fetch.mock.calls[0][0]).toBe('https://gateway.test/v1/fine_tuning/jobs');
    expect(await client.listPaginatedFineTuningJobs({ after: 'cursor +/?', limit: 1 })).toEqual(
      page,
    );
    const url = new URL(fetch.mock.calls[1][0]);
    expect(url.searchParams.get('after')).toBe('cursor +/?');
    expect(url.searchParams.get('limit')).toBe('1');
  });

  it('encodes a cancel identifier as one path segment without an empty JSON body', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(job)));
    const client = new AIGatewayInferenceClient({ ...connection, fetch });
    expect(await client.cancelFineTuningJob('job/a?b#c')).toEqual(job);
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('https://gateway.test/v1/fine_tuning/jobs/job%2Fa%3Fb%23c/cancel');
    expect(init.method).toBe('POST');
    expect(init.body).toBeUndefined();
  });

  it.each([
    'listPaginatedFineTuningJobs',
    'listFineTuningEvents',
    'listFineTuningJobCheckpoints',
  ] as const)(
    'rejects a non-integer page size in %s without contacting the provider',
    async (method) => {
      const fetch = vi.fn();
      const client = new AIGatewayInferenceClient({ ...connection, fetch });
      const result =
        method === 'listPaginatedFineTuningJobs'
          ? client[method]({ limit: 1.5 })
          : client[method]('ftjob-owned', { limit: 1.5 });
      await expect(result).rejects.toMatchObject({
        errorType: ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      });
      expect(fetch).not.toHaveBeenCalled();
    },
  );

  it('propagates a caller cancellation before a job mutation', async () => {
    const fetch = vi.fn();
    const client = new AIGatewayInferenceClient({ ...connection, fetch });
    const controller = new AbortController();
    const reason = new Error('caller cancelled');
    controller.abort(reason);
    await expect(
      client.cancelFineTuningJob('ftjob-owned', { signal: controller.signal }),
    ).rejects.toBe(reason);
    expect(fetch).not.toHaveBeenCalled();
  });
});
