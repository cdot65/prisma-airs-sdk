import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ModelSecurityCustomRulesClient,
  modelSecurityParams,
} from '../../src/model-security/custom-rules-client.js';
import { ModelSecurityGroupsClient } from '../../src/model-security/security-groups-client.js';
import { ModelSecurityRulesClient } from '../../src/model-security/security-rules-client.js';
import { CustomRuleCreateRequestSchema } from '../../src/models/model-security-custom-rules.js';
import { ErrorType } from '../../src/errors.js';

const uuid = '550e8400-e29b-41d4-a716-446655440000';
const groupUuid = '650e8400-e29b-41d4-a716-446655440000';
const rule = {
  uuid,
  tsg_id: '123',
  name: 'review',
  description: '',
  compatible_sources: ['HUGGING_FACE'],
  violation_message: 'Review required',
  remediation_message: null,
  is_archived: false,
  created_by: null,
  updated_by: null,
};
const body = {
  name: 'review',
  compatible_sources: ['HUGGING_FACE' as const],
  condition: { type: 'label' as const, key: 'reviewed', operator: 'not_exists' as const },
  violation_message: 'Review required',
};
const auth = { prepare: vi.fn(async (req) => req) };
const opts = { baseUrl: 'https://example.test/mgmt', auth, numRetries: 0 };
const client = new ModelSecurityCustomRulesClient(opts);
const mock = (data: unknown, status = 200) =>
  vi
    .mocked(fetch)
    .mockResolvedValueOnce(
      new Response(data === undefined ? null : JSON.stringify(data), { status }),
    );
const last = () => {
  const [url, init] = vi.mocked(fetch).mock.calls.at(-1)!;
  return { url: new URL(String(url)), init };
};

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
  auth.prepare.mockClear();
});
afterEach(() => vi.unstubAllGlobals());

describe('custom rules', () => {
  it('routes a validated create through the management plane', async () => {
    mock(rule, 201);
    await expect(client.create(body)).resolves.toEqual(rule);
    expect(last().url.pathname).toBe('/mgmt/v1/custom-rules');
    expect(last().init?.method).toBe('POST');
    expect(JSON.parse(last().init?.body as string)).toEqual(body);
  });
  it('rejects an invalid recursive condition before authentication', async () => {
    await expect(
      client.create({ ...body, condition: { operator: 'and', conditions: [body.condition] } }),
    ).rejects.toMatchObject({ errorType: ErrorType.USER_REQUEST_PAYLOAD_ERROR });
    expect(auth.prepare).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
  it('accepts nested condition groups and rejects unknown request fields', () => {
    expect(
      CustomRuleCreateRequestSchema.safeParse({
        ...body,
        condition: {
          operator: 'and',
          conditions: [
            body.condition,
            {
              operator: 'or',
              conditions: [
                body.condition,
                { type: 'rule_result', operator: 'equals', rule_uuid: uuid, value: 'FAILED' },
              ],
            },
          ],
        },
      }).success,
    ).toBe(true);
    expect(CustomRuleCreateRequestSchema.safeParse({ ...body, arbitrary: true }).success).toBe(
      false,
    );
  });
  it('serializes array, boolean, search and generation filters without injecting defaults', async () => {
    mock({ pagination: {}, custom_rules: [] });
    await client.list({
      source_types: ['S3', 'GCS'],
      is_archived: false,
      generation: 123,
      search_query: 'a + b',
    });
    expect(last().url.searchParams.getAll('source_types')).toEqual(['S3', 'GCS']);
    expect(last().url.searchParams.get('is_archived')).toBe('false');
    expect(last().url.searchParams.get('search_query')).toBe('a + b');
    expect(last().url.searchParams.get('generation')).toBe('123');
    expect(last().url.searchParams.has('limit')).toBe(false);
  });
  it('reads a historical nullable snapshot and preserves new response fields', async () => {
    const historical = {
      ...rule,
      condition: null,
      rule_action: null,
      created_at: null,
      updated_at: null,
      enabled_security_group_count: null,
      future: 'kept',
    };
    mock({ pagination: {}, custom_rules: [historical] });
    const page = await client.list();
    expect(page.custom_rules[0]).toEqual(historical);
  });
  it('gets and partially updates a rule', async () => {
    mock(rule);
    await client.get(uuid);
    expect(last().url.pathname).toBe(`/mgmt/v1/custom-rules/${uuid}`);
    mock(rule);
    await client.update(uuid, { description: null });
    expect(last().init?.method).toBe('PUT');
    expect(last().init?.body).toBe('{"description":null}');
  });
  it.each(['archive', 'unarchive'] as const)('%s handles a bodyless 204', async (method) => {
    mock(undefined, 204);
    await expect(client[method](uuid)).resolves.toBeUndefined();
    expect(last().url.pathname).toBe(`/mgmt/v1/custom-rules/${uuid}/${method}`);
  });
  it('lists groups, preserves partial assignment failures on 207 and removes an assignment', async () => {
    mock({ pagination: {}, security_groups: [] });
    await client.listSecurityGroups(uuid, { skip: 1, limit: 2 });
    expect(last().url.searchParams.get('skip')).toBe('1');
    const partial = {
      results: [
        {
          security_group_uuid: groupUuid,
          status: 'failed',
          error: 'Not found',
          rule_instance_uuid: null,
        },
      ],
    };
    mock(partial, 207);
    await expect(
      client.assignSecurityGroups(uuid, {
        assignments: [{ security_group_uuid: groupUuid, state: 'ALLOWING' }],
      }),
    ).resolves.toEqual(partial);
    mock(undefined, 204);
    await client.removeAssignment(uuid, groupUuid);
    expect(last().init?.method).toBe('DELETE');
    expect(last().url.pathname).toContain(`${uuid}/security-groups/${groupUuid}`);
  });
  it('enforces assignment bounds before sending', async () => {
    for (const assignments of [
      [],
      Array.from({ length: 51 }, () => ({
        security_group_uuid: groupUuid,
        state: 'ALLOWING' as const,
      })),
    ]) {
      await expect(client.assignSecurityGroups(uuid, { assignments })).rejects.toMatchObject({
        errorType: ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      });
    }
    expect(fetch).not.toHaveBeenCalled();
  });
  it('walks offset pages and stops at the collection cap without an extra request', async () => {
    mock({ pagination: { total_items: 2 }, custom_rules: [rule] });
    mock({ pagination: { total_items: 2 }, custom_rules: [rule] });
    expect(await client.listAll({ limit: 1, max: 2 })).toHaveLength(2);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(last().url.searchParams.get('skip')).toBe('1');
    expect(last().url.searchParams.has('max')).toBe(false);
  });
  it('walks opaque cursor pages and stops at null', async () => {
    mock({
      versions: [{ generation: 2, timestamp: '2026-09-06T00:00:00Z' }],
      pagination: { next_token: 'a+b/=' },
    });
    mock({
      versions: [{ generation: 1, timestamp: '2026-09-05T00:00:00Z' }],
      pagination: { next_token: null },
    });
    expect(await client.listAllVersions({ limit: 1 })).toHaveLength(2);
    expect(last().url.searchParams.get('next_token')).toBe('a+b/=');
  });
  it('rejects repeated snapshot cursors', async () => {
    mock({ versions: [], pagination: { next_token: 'repeat' } });
    await expect(client.listAllVersions({ next_token: 'repeat' })).rejects.toThrow(
      'repeated cursor',
    );
  });
  it('routes snapshot history for security rules and group rule instances', async () => {
    mock({ versions: [], pagination: {} });
    await new ModelSecurityRulesClient(opts).listVersions({ next_token: 'cursor' });
    expect(last().url.pathname).toBe('/mgmt/v1/security-rules/versions');
    mock({ versions: [], pagination: {} });
    await new ModelSecurityGroupsClient(opts).listRuleInstanceVersions(groupUuid);
    expect(last().url.pathname).toBe(
      `/mgmt/v1/security-groups/${groupUuid}/rule-instances/versions`,
    );
  });
  it.each(['get', 'archive', 'unarchive', 'listSecurityGroups'] as const)(
    'rejects bad UUID for %s',
    async (method) => {
      await expect(client[method]('bad')).rejects.toMatchObject({
        errorType: ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      });
      expect(fetch).not.toHaveBeenCalled();
    },
  );
  it.each([
    { limit: 0 },
    { limit: 101 },
    { skip: -1 },
    { generation: NaN },
    { generation: Number.MAX_SAFE_INTEGER + 1 },
  ])('rejects invalid query %j', (opts) => {
    expect(() => modelSecurityParams(opts)).toThrow('Invalid');
  });
});
