import type { AuthAdapter } from '../http/types.js';

/** @internal */
export interface DlpNamespaceOptions {
  baseUrl: string;
  auth: AuthAdapter;
  numRetries: number;
}

/**
 * Grouping for the DLP (Data Loss Prevention) management subclients exposed under
 * `ManagementClient.dlp`. The DLP service lives on a separate base URL from the rest of
 * the management API but reuses the same OAuth2 credentials and token endpoint.
 *
 * Subclients (DataFilteringProfiles, DataPatterns, Dictionaries, DataProfiles) attach in
 * follow-up PRs; the namespace itself is the foundation surface that those PRs build on.
 */
export class DlpNamespace {
  public readonly baseUrl: string;
  /** @internal */
  public readonly auth: AuthAdapter;
  /** @internal */
  public readonly numRetries: number;

  constructor(opts: DlpNamespaceOptions) {
    this.baseUrl = opts.baseUrl;
    this.auth = opts.auth;
    this.numRetries = opts.numRetries;
  }
}
