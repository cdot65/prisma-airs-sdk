import type { AuthAdapter } from '../../http/types.js';
import { DataFilteringProfilesClient } from './data-filtering-profiles.js';
import { DataPatternsClient } from './data-patterns.js';
import { DataProfilesClient } from './data-profiles.js';
import { DictionariesClient } from './dictionaries.js';

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
 * @example
 * ```ts
 * import { ManagementClient } from '@cdot65/prisma-airs-sdk';
 * const mgmt = new ManagementClient();
 *
 * // The four DLP subclients are reached through mgmt.dlp:
 * const patterns = await mgmt.dlp.dataPatterns.list();
 * const profiles = await mgmt.dlp.dataProfiles.list();
 * const dicts = await mgmt.dlp.dictionaries.list();
 * const filters = await mgmt.dlp.dataFilteringProfiles.list();
 * // each call resolves to a Spring Page<> envelope: { content: [...], totalElements, ... }
 * ```
 */
export class DlpNamespace {
  public readonly baseUrl: string;
  /** @internal */
  public readonly auth: AuthAdapter;
  /** @internal */
  public readonly numRetries: number;

  public readonly dataFilteringProfiles: DataFilteringProfilesClient;
  public readonly dataPatterns: DataPatternsClient;
  public readonly dataProfiles: DataProfilesClient;
  public readonly dictionaries: DictionariesClient;

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
    this.dataProfiles = new DataProfilesClient({
      baseUrl: opts.baseUrl,
      auth: opts.auth,
      numRetries: opts.numRetries,
    });
    this.dictionaries = new DictionariesClient({
      baseUrl: opts.baseUrl,
      auth: opts.auth,
      numRetries: opts.numRetries,
    });
  }
}
