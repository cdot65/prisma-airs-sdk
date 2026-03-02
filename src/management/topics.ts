import { MGMT_TOPIC_PATH, MGMT_TOPICS_TSG_PATH, MGMT_TOPIC_FORCE_PATH } from '../constants.js';
import { AISecSDKException, ErrorType } from '../errors.js';
import { isValidUuid } from '../utils.js';
import { managementHttpRequest } from './management-http-client.js';
import type { OAuthClient } from './oauth-client.js';
import type {
  CustomTopic,
  CreateCustomTopicRequest,
  CustomTopicListResponse,
  DeleteTopicResponse,
} from '../models/mgmt-custom-topic.js';
import type { PaginationOptions } from './profiles.js';

export interface TopicsClientOptions {
  baseUrl: string;
  oauthClient: OAuthClient;
  tsgId: string;
  numRetries: number;
}

export class TopicsClient {
  private readonly baseUrl: string;
  private readonly oauthClient: OAuthClient;
  private readonly tsgId: string;
  private readonly numRetries: number;

  constructor(opts: TopicsClientOptions) {
    this.baseUrl = opts.baseUrl;
    this.oauthClient = opts.oauthClient;
    this.tsgId = opts.tsgId;
    this.numRetries = opts.numRetries;
  }

  async create(request: CreateCustomTopicRequest): Promise<CustomTopic> {
    const res = await managementHttpRequest<CustomTopic>({
      method: 'POST',
      baseUrl: this.baseUrl,
      path: MGMT_TOPIC_PATH,
      body: request,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  async list(opts?: PaginationOptions): Promise<CustomTopicListResponse> {
    const params: Record<string, string> = {
      offset: String(opts?.offset ?? 0),
      limit: String(opts?.limit ?? 100),
    };

    const res = await managementHttpRequest<CustomTopicListResponse>({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${MGMT_TOPICS_TSG_PATH}/${this.tsgId}`,
      params,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  async update(topicId: string, request: CreateCustomTopicRequest): Promise<CustomTopic> {
    if (!isValidUuid(topicId)) {
      throw new AISecSDKException(
        `Invalid topic_id: ${topicId}`,
        ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      );
    }

    const res = await managementHttpRequest<CustomTopic>({
      method: 'PUT',
      baseUrl: this.baseUrl,
      path: `${MGMT_TOPIC_PATH}/uuid/${topicId}`,
      body: request,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  async delete(topicId: string): Promise<DeleteTopicResponse> {
    if (!isValidUuid(topicId)) {
      throw new AISecSDKException(
        `Invalid topic_id: ${topicId}`,
        ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      );
    }

    const res = await managementHttpRequest<DeleteTopicResponse>({
      method: 'DELETE',
      baseUrl: this.baseUrl,
      path: `${MGMT_TOPIC_PATH}/${topicId}`,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }

  async forceDelete(topicId: string): Promise<DeleteTopicResponse> {
    if (!isValidUuid(topicId)) {
      throw new AISecSDKException(
        `Invalid topic_id: ${topicId}`,
        ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      );
    }

    const res = await managementHttpRequest<DeleteTopicResponse>({
      method: 'DELETE',
      baseUrl: this.baseUrl,
      path: `${MGMT_TOPIC_FORCE_PATH}/${topicId}`,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }
}
