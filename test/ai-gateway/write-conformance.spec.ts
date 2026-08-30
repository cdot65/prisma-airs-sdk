import { describe, expect, it } from 'vitest';
import {
  parseWriteConformanceArgs,
  selectBoundIntegration,
} from '../../scripts/e2e-ai-gateway-writes.js';

describe('AI Gateway write conformance CLI', () => {
  it('requires both execution and mutation flags before live writes', () => {
    expect(parseWriteConformanceArgs(['--workspace', 'ws-development'])).toMatchObject({
      execute: false,
      allowMutation: false,
      workspaceRef: 'ws-development',
    });
    expect(() => parseWriteConformanceArgs(['--execute', '--workspace', 'ws-development'])).toThrow(
      /--allow-mutation/,
    );
    expect(() => parseWriteConformanceArgs(['--execute', '--allow-mutation'])).toThrow(
      /--workspace/,
    );
  });

  it('accepts an explicitly armed invocation', () => {
    expect(
      parseWriteConformanceArgs(['--execute', '--allow-mutation', '--workspace', 'ws-development']),
    ).toEqual({
      execute: true,
      allowMutation: true,
      workspaceRef: 'ws-development',
      integrationId: undefined,
      logLevel: 'normal',
    });
  });

  it('selects only an integration already bound to the target workspace', async () => {
    const getWorkspaces = async (id: string) => ({
      workspaces: id === 'bound' ? [{ id: 'workspace-id', enabled: true }] : [],
      global_workspace_access: { enabled: false },
    });

    await expect(
      selectBoundIntegration(['unbound', 'bound'], 'workspace-id', 'workspace-slug', getWorkspaces),
    ).resolves.toMatchObject({ integrationId: 'bound', binding: { enabled: true } });
    await expect(
      selectBoundIntegration(['unbound'], 'workspace-id', 'workspace-slug', getWorkspaces),
    ).rejects.toThrow(/already bound/);
  });
});
