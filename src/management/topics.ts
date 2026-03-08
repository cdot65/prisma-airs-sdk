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

/** @internal */
export interface TopicsClientOptions {
  baseUrl: string;
  oauthClient: OAuthClient;
  tsgId: string;
  numRetries: number;
}

/** Client for AIRS custom topic CRUD operations. */
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

  /**
   * Create a new custom topic.
   * @param request - Topic definition with name, description, and examples.
   * @returns The created custom topic.
   */
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

  /**
   * List custom topics for the TSG.
   * @param opts - Pagination options.
   * @returns Paginated list of custom topics.
   */
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

  /**
   * Update an existing custom topic.
   * @param topicId - UUID of the topic to update.
   * @param request - Updated topic definition.
   * @returns The updated custom topic.
   */
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

  /**
   * Delete a custom topic. Fails if topic is referenced by a profile.
   * @param topicId - UUID of the topic to delete.
   * @returns Deletion confirmation message.
   */
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

  /**
   * Force-delete a custom topic, removing it from any referencing profiles.
   * @param topicId - UUID of the topic to force-delete.
   * @param updatedBy - Email of the user performing the deletion.
   * @returns Deletion confirmation message.
   */
  async forceDelete(topicId: string, updatedBy?: string): Promise<DeleteTopicResponse> {
    if (!isValidUuid(topicId)) {
      throw new AISecSDKException(
        `Invalid topic_id: ${topicId}`,
        ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      );
    }

    const params: Record<string, string> | undefined = updatedBy
      ? { updated_by: updatedBy }
      : undefined;

    const res = await managementHttpRequest<DeleteTopicResponse>({
      method: 'DELETE',
      baseUrl: this.baseUrl,
      path: `${MGMT_TOPIC_FORCE_PATH}/${topicId}`,
      params,
      oauthClient: this.oauthClient,
      numRetries: this.numRetries,
    });
    return res.data;
  }
}
