import type { AuthAdapter } from '../../http/types.js';
import { DataFilteringProfilesClient } from './data-filtering-profiles.js';
import { DataPatternsClient } from './data-patterns.js';

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
 */
export class DlpNamespace {
  public readonly baseUrl: string;
  /** @internal */
  public readonly auth: AuthAdapter;
  /** @internal */
  public readonly numRetries: number;

  public readonly dataFilteringProfiles: DataFilteringProfilesClient;
  public readonly dataPatterns: DataPatternsClient;

  constructor(opts: DlpNamespaceOptions) {
    this.baseUrl = opts.baseUrl;
    this.auth = opts.auth;
    this.numRetries = opts.numRetries;

    this.dataFilteringProfiles = new DataFilteringProfilesClient({
      baseUrl: opts.baseUrl,
      auth: opts.auth,
      numRetries: opts.numRetries,
    });
    this.dataPatterns = new DataPatternsClient({
      baseUrl: opts.baseUrl,
      auth: opts.auth,
      numRetries: opts.numRetries,
    });
  }
}
