/** @internal Finite GET-only hypotheses; path alternatives are not SDK contract claims. */
import { assertUuid } from '../../src/validators.js';

export interface AdministrationReadProbe {
  name: string;
  method: 'GET';
  sourcePath: string;
  pathTemplate: string;
  path: string;
  query: Record<string, string>;
}

export function administrationReadProbes(workspaceId: string): AdministrationReadProbe[] {
  assertUuid(workspaceId, 'workspaceId');
  const snake = () => ({ current_page: '0', page_size: '1' });
  const camel = () => ({ currentPage: '0', pageSize: '1' });
  const rows: [string, string, string, Record<string, string>][] = [
    ['collections', '/collections', '/collections', { ...snake(), workspace_id: workspaceId }],
    ['labels', '/labels', '/labels', { ...snake(), workspace_id: workspaceId }],
    ['prompts', '/prompts', '/prompts', { ...snake(), workspace_id: workspaceId }],
    ['partials', '/prompts/partials', '/prompts/partials', {}],
    ['virtual-keys', '/virtual-keys', '/virtual-keys', snake()],
    ['users.scm-prefix', '/admin/users', '/users', camel()],
    ['users.upstream-prefix', '/admin/users', '/admin/users', camel()],
    ['invites.scm-prefix', '/admin/users/invites', '/users/invites', camel()],
    ['invites.upstream-prefix', '/admin/users/invites', '/admin/users/invites', camel()],
    [
      'members.scm-prefix',
      '/admin/workspaces/{workspaceId}/users',
      '/workspaces/{workspaceId}/users',
      snake(),
    ],
    [
      'members.upstream-prefix',
      '/admin/workspaces/{workspaceId}/users',
      '/admin/workspaces/{workspaceId}/users',
      snake(),
    ],
    ['scim', '/scim/workspaces', '/scim/workspaces', { workspace_id: workspaceId }],
  ];
  return rows.map(([name, sourcePath, pathTemplate, query]) => ({
    name,
    method: 'GET',
    sourcePath,
    pathTemplate,
    path: pathTemplate.replace('{workspaceId}', workspaceId),
    query,
  }));
}
