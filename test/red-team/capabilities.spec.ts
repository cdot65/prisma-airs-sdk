import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { RedTeamTargetsClient } from '../../src/red-team/targets-client.js';
import { RedTeamAdaptersClient } from '../../src/red-team/adapters-client.js';
import { RedTeamClient } from '../../src/red-team/client.js';
import { ErrorType } from '../../src/errors.js';
import {
  GoalCategoryListResponseSchema,
  AdapterConfigResponseSchema,
} from '../../src/models/red-team-capabilities.js';

const uuid = '550e8400-e29b-41d4-a716-446655440000';
const opts = {
  baseUrl: 'https://example.test/mgmt',
  numRetries: 0,
  auth: { prepare: vi.fn(async (r) => r) },
};
const targets = new RedTeamTargetsClient(opts);
const adapters = new RedTeamAdaptersClient(opts);
const mock = (body: unknown, status = 200) =>
  vi
    .mocked(fetch)
    .mockResolvedValueOnce(
      new Response(body === undefined ? null : JSON.stringify(body), { status }),
    );
beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
  opts.auth.prepare.mockClear();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('Red Team capability additions', () => {
  it('falls back to management metadata only for the deployed 422 route collision', async () => {
    const client = new RedTeamClient({
      clientId: 'id',
      clientSecret: 'secret',
      tsgId: '123',
      dataEndpoint: 'https://example.test/data',
      mgmtEndpoint: 'https://example.test/mgmt',
      numRetries: 0,
    });
    mock({ access_token: 'token', expires_in: 3600 });
    mock({ detail: 'Invalid job UUID' }, 422);
    mock({ capabilities: ['file'] });
    await expect(client.getScanMetadata()).resolves.toEqual({ capabilities: ['file'] });
    expect(String(vi.mocked(fetch).mock.calls[2][0])).toContain(
      'https://example.test/mgmt/v1/template/target-metadata',
    );
    mock({ detail: 'Service unavailable' }, 500);
    await expect(client.getScanMetadata()).rejects.toMatchObject({ statusCode: 500 });
    expect(fetch).toHaveBeenCalledTimes(4);
  });
  it('reads adapter authoring defaults', async () => {
    const config = {
      default_script_b64: 'cHJpbnQoMSk=',
      default_test_prompt: 'Hello',
      added: true,
    };
    mock(config);
    await expect(adapters.getConfig()).resolves.toEqual(config);
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe('https://example.test/mgmt/v1/adapters/config');
    expect(AdapterConfigResponseSchema.safeParse({}).success).toBe(false);
  });
  it('starts profiling using POST with no body', async () => {
    mock({ message: 'Profiling started' });
    await targets.startProfiling(uuid);
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe(`https://example.test/mgmt/v1/target/${uuid}/profile`);
    expect(init?.method).toBe('POST');
    expect(init?.body).toBeUndefined();
  });
  it('validates Copilot requests before auth', async () => {
    await expect(targets.getCopilotAuthUrl({ client_id: 'id' } as never)).rejects.toMatchObject({
      errorType: ErrorType.USER_REQUEST_PAYLOAD_ERROR,
    });
    await expect(targets.exchangeCopilotToken({} as never)).rejects.toMatchObject({
      errorType: ErrorType.USER_REQUEST_PAYLOAD_ERROR,
    });
    expect(opts.auth.prepare).not.toHaveBeenCalled();
  });
  it('round trips the Copilot request, state, and token reference without debug disclosure', async () => {
    vi.stubEnv('PANW_AI_SEC_DEBUG', '1');
    const logs = vi.spyOn(console, 'error').mockImplementation(() => {});
    const creds = {
      client_id: 'client',
      client_secret: 'sensitive-value-456',
      tenant_id: 'tenant',
    };
    const result = {
      auth_url: 'https://login.example.test',
      token_json_uuid: uuid,
      state: 'sensitive-state-123',
    };
    mock(result);
    await expect(targets.getCopilotAuthUrl(creds)).resolves.toEqual(result);
    mock({ token_json_uuid: uuid });
    await targets.exchangeCopilotToken({
      ...creds,
      token_json_uuid: uuid,
      auth_response: { code: 'sensitive-code-789', state: result.state },
    });
    expect(vi.mocked(fetch).mock.calls[1][0]).toBe(
      'https://example.test/mgmt/v1/target/ms-copilot-studio/token',
    );
    const output = logs.mock.calls.flat().join('\n');
    for (const secret of [creds.client_secret, result.state, 'sensitive-code-789'])
      expect(output).not.toContain(secret);
    expect(output).toContain('[BODY OMITTED]');
  });
  it('deletes only the addressed Copilot token reference', async () => {
    mock(undefined, 204);
    await expect(targets.deleteCopilotToken(uuid)).resolves.toBeUndefined();
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe(
      `https://example.test/mgmt/v1/target/ms-copilot-studio/token/${uuid}`,
    );
    expect(vi.mocked(fetch).mock.calls[0][1]?.method).toBe('DELETE');
    await expect(targets.deleteCopilotToken('bad')).rejects.toThrow();
    await expect(targets.startProfiling('bad')).rejects.toThrow();
  });
  it('routes metadata and encoded goal categories to the data plane', async () => {
    const client = new RedTeamClient({
      clientId: 'id',
      clientSecret: 'secret',
      tsgId: '123',
      dataEndpoint: 'https://example.test/data',
      numRetries: 0,
    });
    mock({ access_token: 'token', expires_in: 3600 });
    mock({ capabilities: ['file'] });
    await expect(client.getScanMetadata()).resolves.toEqual({ capabilities: ['file'] });
    expect(vi.mocked(fetch).mock.calls[1][0]).toBe(
      'https://example.test/data/v1/scan/scan-metadata',
    );
    const categories = {
      target_type: 'custom/type',
      categories: [{ category: 'CUSTOM', display_name: 'Custom', description: 'Custom goals' }],
    };
    mock(categories);
    await expect(client.getGoalCategories('custom/type')).resolves.toEqual(categories);
    expect(vi.mocked(fetch).mock.calls[2][0]).toBe(
      'https://example.test/data/v1/goal-categories/custom%2Ftype',
    );
    expect(
      GoalCategoryListResponseSchema.safeParse({ target_type: 'x', categories: [{}] }).success,
    ).toBe(false);
  });
});
