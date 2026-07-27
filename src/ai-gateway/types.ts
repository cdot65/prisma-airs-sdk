import type { AuthAdapter } from '../http/types.js';

/**
 * @internal
 * Construction options shared by every AI Gateway sub-client. Lives in its own module
 * rather than in any one resource client, because all twelve sub-clients consume it —
 * the same reason `AIGatewayWindowOptions` lives in `window.ts`.
 */
export interface AIGatewaySubClientOptions {
  baseUrl: string;
  auth: AuthAdapter;
  numRetries: number;
}

/**
 * Options for listing workspace-scoped resources. Shared by every sub-client whose `list`
 * (or list-alike) endpoint takes only a workspace UUID — guardrails, providers, api-keys,
 * and configs.
 */
export interface AIGatewayWorkspaceScopedListOptions {
  /** Workspace UUID. Required — omitting it returns `404 AB02`. */
  workspaceId: string;
}
