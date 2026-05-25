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
   * @example
   * ```ts
   * import { ManagementClient } from '@cdot65/prisma-airs-sdk';
   * const mgmt = new ManagementClient(); // reads PANW_MGMT_* env vars
   *
   * const topic = await mgmt.topics.create({
   *   topic_name: 'credit-card-numbers',
   *   active: true,
   *   description: 'Detects credit card numbers in prompts and responses',
   *   examples: ['4111-1111-1111-1111', '5500 0000 0000 0004'],
   * });
   * // topic =>
   * // { topic_id: '550e8400-...', topic_name: 'credit-card-numbers',
   * //   revision: 1, active: true, examples: ['4111-1111-1111-1111', ...] }
   * ```
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
   * @example
   * ```ts
   * import { ManagementClient } from '@cdot65/prisma-airs-sdk';
   * const mgmt = new ManagementClient(); // reads PANW_MGMT_* env vars
   *
   * const page = await mgmt.topics.list({ offset: 0, limit: 5 });
   * // page =>
   * // { custom_topics: [ { topic_id: '550e8400-...', topic_name: 'credit-cards',
   * //     revision: 1, active: true } ], next_offset: 20 }
   * ```
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
   * @example
   * ```ts
   * import { ManagementClient } from '@cdot65/prisma-airs-sdk';
   * const mgmt = new ManagementClient(); // reads PANW_MGMT_* env vars
   *
   * const updated = await mgmt.topics.update('550e8400-e29b-41d4-a716-446655440000', {
   *   topic_name: 'credit-card-numbers',
   *   description: 'Updated: detects credit card numbers and CVVs',
   *   examples: ['4111-1111-1111-1111', 'CVV: 123'],
   * });
   * // updated =>
   * // { topic_id: '550e8400-...', topic_name: 'credit-card-numbers', revision: 2, active: true }
   * ```
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
   * @example
   * ```ts
   * import { ManagementClient } from '@cdot65/prisma-airs-sdk';
   * const mgmt = new ManagementClient(); // reads PANW_MGMT_* env vars
   *
   * const result = await mgmt.topics.delete('550e8400-e29b-41d4-a716-446655440000');
   * // result => { message: 'deleted' }
   * ```
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
   * @example
   * ```ts
   * import { ManagementClient } from '@cdot65/prisma-airs-sdk';
   * const mgmt = new ManagementClient(); // reads PANW_MGMT_* env vars
   *
   * const result = await mgmt.topics.forceDelete(
   *   '550e8400-e29b-41d4-a716-446655440000',
   *   'admin@example.com',
   * );
   * // result => { message: 'force deleted' }
   * ```
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
