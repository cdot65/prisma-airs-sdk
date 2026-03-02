import {
  DEFAULT_MGMT_ENDPOINT,
  MGMT_CLIENT_ID,
  MGMT_CLIENT_SECRET,
  MGMT_TSG_ID,
  MGMT_ENDPOINT,
  MGMT_TOKEN_ENDPOINT,
  MAX_NUMBER_OF_RETRIES,
} from '../constants.js';
import { AISecSDKException, ErrorType } from '../errors.js';
import { OAuthClient } from './oauth-client.js';
import { ProfilesClient } from './profiles.js';
import { TopicsClient } from './topics.js';

export interface ManagementClientOptions {
  clientId?: string;
  clientSecret?: string;
  tsgId?: string;
  apiEndpoint?: string;
  tokenEndpoint?: string;
  numRetries?: number;
}

export class ManagementClient {
  public readonly profiles: ProfilesClient;
  public readonly topics: TopicsClient;

  constructor(opts: ManagementClientOptions = {}) {
    const clientId = opts.clientId ?? process.env[MGMT_CLIENT_ID];
    const clientSecret = opts.clientSecret ?? process.env[MGMT_CLIENT_SECRET];
    const tsgId = opts.tsgId ?? process.env[MGMT_TSG_ID];
    const apiEndpoint = opts.apiEndpoint ?? process.env[MGMT_ENDPOINT] ?? DEFAULT_MGMT_ENDPOINT;
    const tokenEndpoint = opts.tokenEndpoint ?? process.env[MGMT_TOKEN_ENDPOINT];
    const numRetries = Math.min(
      Math.max(opts.numRetries ?? MAX_NUMBER_OF_RETRIES, 0),
      MAX_NUMBER_OF_RETRIES,
    );

    if (!clientId) {
      throw new AISecSDKException(
        'clientId is required (option or PANW_MGMT_CLIENT_ID env var)',
        ErrorType.MISSING_VARIABLE,
      );
    }
    if (!clientSecret) {
      throw new AISecSDKException(
        'clientSecret is required (option or PANW_MGMT_CLIENT_SECRET env var)',
        ErrorType.MISSING_VARIABLE,
      );
    }
    if (!tsgId) {
      throw new AISecSDKException(
        'tsgId is required (option or PANW_MGMT_TSG_ID env var)',
        ErrorType.MISSING_VARIABLE,
      );
    }

    const oauthClient = new OAuthClient({
      clientId,
      clientSecret,
      tsgId,
      tokenEndpoint,
    });

    this.profiles = new ProfilesClient({
      baseUrl: apiEndpoint,
      oauthClient,
      tsgId,
      numRetries,
    });

    this.topics = new TopicsClient({
      baseUrl: apiEndpoint,
      oauthClient,
      tsgId,
      numRetries,
    });
  }
}
