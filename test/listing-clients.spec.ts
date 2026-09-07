import { afterEach, describe, expect, it, vi } from 'vitest';
import { DataFilteringProfilesClient } from '../src/management/dlp/data-filtering-profiles.js';
import { DataPatternsClient } from '../src/management/dlp/data-patterns.js';
import { DataProfilesClient } from '../src/management/dlp/data-profiles.js';
import { DictionariesClient } from '../src/management/dlp/dictionaries.js';
import { ModelSecurityModelsClient } from '../src/model-security/models-client.js';
import { ModelSecurityScansClient } from '../src/model-security/scans-client.js';
import { ModelSecurityGroupsClient } from '../src/model-security/security-groups-client.js';
import { ModelSecurityRulesClient } from '../src/model-security/security-rules-client.js';
import { RedTeamScansClient } from '../src/red-team/scans-client.js';
import { RedTeamAdaptersClient } from '../src/red-team/adapters-client.js';
import { RedTeamCustomAttacksClient } from '../src/red-team/custom-attacks-client.js';
import type { PreparedRequest } from '../src/http/types.js';

const options = {
  baseUrl: 'https://pagination.test',
  auth: { prepare: async (r: PreparedRequest) => r },
  numRetries: 0,
};
const uuid = '550e8400-e29b-41d4-a716-446655440000';
afterEach(() => vi.restoreAllMocks());

describe.each([
  DataFilteringProfilesClient,
  DataPatternsClient,
  DataProfilesClient,
  DictionariesClient,
])('%s Spring pagination integration', (Client) => {
  it.each(['last', 'totalPages', 'short-page'] as const)(
    'honors %s termination while retaining filters',
    async (dialect) => {
      const client = new Client(options);
      const page = vi.spyOn(client, 'list').mockImplementation(async (params) => ({
        content: params!.page === 0 ? [{ id: 'one' }, { id: 'two' }] : [{ id: 'three' }],
        ...(dialect === 'last'
          ? { last: params!.page === 1 }
          : dialect === 'totalPages'
            ? { totalPages: 2 }
            : {}),
      }));
      expect(await client.listAll({ size: 2, sort: ['name,asc'] })).toEqual([
        { id: 'one' },
        { id: 'two' },
        { id: 'three' },
      ]);
      expect(page.mock.calls).toEqual([
        [{ size: 2, sort: ['name,asc'], page: 0 }],
        [{ size: 2, sort: ['name,asc'], page: 1 }],
      ]);
    },
  );
  it('does not fetch the next page when the collection cap is reached', async () => {
    const client = new Client(options);
    const page = vi
      .spyOn(client, 'list')
      .mockResolvedValue({ content: [{ id: 'one' }], last: false });
    expect(await client.listAll({ size: 1, max: 1 })).toEqual([{ id: 'one' }]);
    expect(page).toHaveBeenCalledTimes(1);
  });
  it('handles the default size and an empty final page', async () => {
    const client = new Client(options);
    const page = vi.spyOn(client, 'list').mockResolvedValue({ content: [], last: true });
    expect(await client.listAll()).toEqual([]);
    expect(page).toHaveBeenCalledWith({ page: 0, size: 50 });
  });
});

// These tests isolate the dialect adapter, not response parsing (covered by transport contracts).
type ReflectiveClient = Record<string, (...args: unknown[]) => Promise<unknown>>;
const walkers = [
  [ModelSecurityModelsClient, 'listAllModels', 'listModels', 'models', []],
  [
    ModelSecurityModelsClient,
    'listAllModelVersions',
    'listModelVersions',
    'model_versions',
    [uuid],
  ],
  [ModelSecurityModelsClient, 'listAllModelVersionFiles', 'listModelVersionFiles', 'files', [uuid]],
  [ModelSecurityScansClient, 'listAll', 'list', 'scans', []],
  [ModelSecurityGroupsClient, 'listAll', 'list', 'security_groups', []],
  [ModelSecurityRulesClient, 'listAll', 'list', 'rules', []],
  [RedTeamScansClient, 'listAll', 'list', 'data', []],
  [RedTeamAdaptersClient, 'listAll', 'list', 'data', []],
  [RedTeamCustomAttacksClient, 'listAllPromptSets', 'listPromptSets', 'data', []],
  [RedTeamCustomAttacksClient, 'listAllPrompts', 'listPrompts', 'data', [uuid]],
] as const;
for (const [Client, all, single, field, prefix] of walkers)
  describe(`${Client.name}.${all}`, () => {
    it('walks every page, preserving filters and parent identifiers', async () => {
      const client = new Client(options) as unknown as ReflectiveClient;
      const page = vi.spyOn(client, single).mockImplementation(async (...args) => {
        const opts = args.at(-1) as { skip: number };
        return {
          [field]: opts.skip === 0 ? [{ uuid: 'one' }, { uuid: 'two' }] : [{ uuid: 'three' }],
          pagination: { total_items: 3 },
        };
      });
      expect(await client[all](...prefix, { limit: 2, search: 'filter' })).toEqual([
        { uuid: 'one' },
        { uuid: 'two' },
        { uuid: 'three' },
      ]);
      expect(page.mock.calls).toEqual([
        [...prefix, { limit: 2, search: 'filter', skip: 0 }],
        [...prefix, { limit: 2, search: 'filter', skip: 2 }],
      ]);
    });
    it('honors a one-page cap', async () => {
      const client = new Client(options) as unknown as ReflectiveClient;
      const page = vi
        .spyOn(client, single)
        .mockResolvedValue({ [field]: [{ uuid: 'one' }], pagination: { total_items: 100 } });
      expect(await client[all](...prefix, { limit: 1, max: 1 })).toEqual([{ uuid: 'one' }]);
      expect(page).toHaveBeenCalledTimes(1);
    });
    it('uses defaults and terminates on an empty collection', async () => {
      const client = new Client(options) as unknown as ReflectiveClient;
      const page = vi.spyOn(client, single).mockResolvedValue({ [field]: [], pagination: {} });
      expect(await client[all](...prefix)).toEqual([]);
      expect(page).toHaveBeenCalledWith(...prefix, { skip: 0, limit: 50 });
    });
  });
