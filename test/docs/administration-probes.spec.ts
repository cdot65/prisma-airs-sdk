import { describe, expect, it } from 'vitest';
import { administrationReadProbes } from '../../scripts/e2e/administration-probes.js';

const workspace = '11111111-1111-4111-8111-111111111111';

describe('bounded administration availability hypotheses', () => {
  it('limits discovery to twelve GET targets, with no email or user ID selection', () => {
    const probes = administrationReadProbes(workspace);
    expect(probes).toHaveLength(12);
    expect(new Set(probes.map((probe) => probe.name)).size).toBe(12);
    expect(probes.every((probe) => probe.method === 'GET')).toBe(true);
    expect(probes.every((probe) => !('body' in probe))).toBe(true);
    expect(probes.every((probe) => !('email' in probe.query))).toBe(true);
    expect(probes.every((probe) => probe.path.startsWith('/') && !probe.path.includes('//'))).toBe(
      true,
    );
  });

  it("supplies the virtual-key list contract's required snake-case pagination", () => {
    expect(
      administrationReadProbes(workspace).find((probe) => probe.name === 'virtual-keys'),
    ).toMatchObject({
      sourcePath: '/virtual-keys',
      path: '/virtual-keys',
      query: { current_page: '0', page_size: '1' },
    });
  });

  it('separates upstream and verified-neighbor workspace path hypotheses', () => {
    const members = administrationReadProbes(workspace).filter((probe) =>
      probe.name.startsWith('members.'),
    );
    expect(members.map((probe) => probe.path)).toEqual([
      `/workspaces/${workspace}/users`,
      `/admin/workspaces/${workspace}/users`,
    ]);
    for (const probe of members) {
      expect(probe.sourcePath).toBe('/admin/workspaces/{workspaceId}/users');
      expect(probe.query).toEqual({ current_page: '0', page_size: '1' });
      expect(probe.pathTemplate).not.toContain(workspace);
    }
  });

  it.each([
    'users.scm-prefix',
    'users.upstream-prefix',
    'invites.scm-prefix',
    'invites.upstream-prefix',
  ])('%s retains upstream camel-case pagination without unverified workspace filters', (name) => {
    expect(administrationReadProbes(workspace).find((probe) => probe.name === name)?.query).toEqual(
      {
        currentPage: '0',
        pageSize: '1',
      },
    );
  });

  it('scopes collections and SCIM to the designated workspace but does not invent a partial filter', () => {
    const probes = administrationReadProbes(workspace);
    expect(probes.find((probe) => probe.name === 'collections')?.query).toEqual({
      workspace_id: workspace,
      current_page: '0',
      page_size: '1',
    });
    expect(probes.find((probe) => probe.name === 'scim')?.query).toEqual({
      workspace_id: workspace,
    });
    expect(probes.find((probe) => probe.name === 'partials')?.query).toEqual({});
  });

  it.each(['', 'ws-other', '../users', 'https://example.invalid', workspace + '?email=private'])(
    'rejects non-UUID workspace input %j',
    (value) => {
      expect(() => administrationReadProbes(value)).toThrow();
    },
  );

  it('does not retain a caller mutation between independent plans', () => {
    administrationReadProbes(workspace)[0].query.page_size = '500';
    expect(administrationReadProbes(workspace)[0].query.page_size).toBe('1');
  });
});
