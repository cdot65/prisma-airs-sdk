import { MGMT_TOPIC_PATH, MGMT_TOPICS_TSG_PATH, MGMT_TOPIC_FORCE_PATH } from '../constants.js';
import { request } from '../http/request.js';
import type { AuthAdapter } from '../http/types.js';
import { assertUuid } from '../validators.js';
import {
  CustomTopicSchema,
  CustomTopicListResponseSchema,
  DeleteTopicResponseSchema,
  type CustomTopic,
  type CreateCustomTopicRequest,
  type CustomTopicListResponse,
  type DeleteTopicResponse,
} from '../models/mgmt-custom-topic.js';
import type { PaginationOptions } from './profiles.js';

/** @internal */
export interface TopicsClientOptions {
  baseUrl: string;
  auth: AuthAdapter;
  tsgId: string;
  numRetries: number;
}

/** Client for AIRS custom topic CRUD operations. */
export class TopicsClient {
  private readonly baseUrl: string;
  private readonly auth: AuthAdapter;
  private readonly tsgId: string;
  private readonly numRetries: number;

  constructor(opts: TopicsClientOptions) {
    this.baseUrl = opts.baseUrl;
    this.auth = opts.auth;
    this.tsgId = opts.tsgId;
    this.numRetries = opts.numRetries;
  }

  /**
   * Create a new custom topic.
   * @param body - Topic definition with name, description, and examples.
   * @returns The created custom topic.
   */
  async create(body: CreateCustomTopicRequest): Promise<CustomTopic> {
    return request({
      method: 'POST',
      baseUrl: this.baseUrl,
      path: MGMT_TOPIC_PATH,
      body,
      responseSchema: CustomTopicSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
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

    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: `${MGMT_TOPICS_TSG_PATH}/${this.tsgId}`,
      params,
      responseSchema: CustomTopicListResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Update an existing custom topic.
   * @param topicId - UUID of the topic to update.
   * @param body - Updated topic definition.
   * @returns The updated custom topic.
   */
  async update(topicId: string, body: CreateCustomTopicRequest): Promise<CustomTopic> {
    assertUuid(topicId, 'topic_id');
    return request({
      method: 'PUT',
      baseUrl: this.baseUrl,
      path: `${MGMT_TOPIC_PATH}/uuid/${topicId}`,
      body,
      responseSchema: CustomTopicSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Delete a custom topic. Fails if topic is referenced by a profile.
   * @param topicId - UUID of the topic to delete.
   * @returns Deletion confirmation message.
   */
  async delete(topicId: string): Promise<DeleteTopicResponse> {
    assertUuid(topicId, 'topic_id');
    return request({
      method: 'DELETE',
      baseUrl: this.baseUrl,
      path: `${MGMT_TOPIC_PATH}/${topicId}`,
      responseSchema: DeleteTopicResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }

  /**
   * Force-delete a custom topic, removing it from any referencing profiles.
   * @param topicId - UUID of the topic to force-delete.
   * @param updatedBy - Optional. Email of the user performing the deletion.
   * @returns Deletion confirmation message.
   */
  async forceDelete(topicId: string, updatedBy?: string): Promise<DeleteTopicResponse> {
    assertUuid(topicId, 'topic_id');
    const params: Record<string, string> | undefined = updatedBy
      ? { updated_by: updatedBy }
      : undefined;

    return request({
      method: 'DELETE',
      baseUrl: this.baseUrl,
      path: `${MGMT_TOPIC_FORCE_PATH}/${topicId}`,
      params,
      responseSchema: DeleteTopicResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }
}
