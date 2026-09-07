import { CreateCustomTopicRequestSchema } from '../models/index.js';
import { MGMT_TOPIC_PATH, MGMT_TOPICS_TSG_PATH } from '../constants.js';
import { request } from '../http/request.js';
import type { AuthAdapter } from '../http/types.js';
import { assertUuid } from '../validators.js';
import { AISecSDKException, ErrorType } from '../errors.js';
import { collectAll, paginate, type CollectAllOptions } from '../listing.js';
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

/** Options for listing topics, including client-side latest-revision grouping. */
export interface TopicListOptions extends Omit<PaginationOptions, 'latest'> {
  /** Walk all pages and return the highest revision for each topic name. */
  latestOnly?: boolean;
}

/** Options for walking all custom-topic pages. */
export interface TopicListAllOptions
  extends Omit<TopicListOptions, 'offset' | 'latestOnly'>, CollectAllOptions {}

/** @internal */
export interface TopicsClientOptions {
  baseUrl: string;
  auth: AuthAdapter;
  tsgId: string;
  numRetries: number;
}

/** Client for AIRS custom topic CRUD operations. */
export class TopicsClient {
  /** List topics using the OpenAPI route scoped by the token. @example `const page = await mgmt.topics.listForToken({ limit: 20 });` */
  async listForToken(
    opts: Omit<PaginationOptions, 'latest'> = {},
  ): Promise<CustomTopicListResponse> {
    return request({
      method: 'GET',
      baseUrl: this.baseUrl,
      path: '/v1/mgmt/topics',
      params: { offset: String(opts.offset ?? 0), limit: String(opts.limit ?? 100) },
      responseSchema: CustomTopicListResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }
  /** Force-delete through the OpenAPI route, recording the acting user. @example `await mgmt.topics.forceDeleteWithAudit(topicUuid, 'admin@example.com');` */
  async forceDeleteWithAudit(topicId: string, updatedBy: string): Promise<DeleteTopicResponse> {
    assertUuid(topicId, 'topic_id');
    if (!updatedBy.trim())
      throw new AISecSDKException('updatedBy is required', ErrorType.USER_REQUEST_PAYLOAD_ERROR);
    return request({
      method: 'DELETE',
      baseUrl: this.baseUrl,
      path: `${MGMT_TOPIC_PATH}/${topicId}/force`,
      params: { updated_by: updatedBy },
      responseSchema: DeleteTopicResponseSchema,
      auth: this.auth,
      numRetries: this.numRetries,
    });
  }
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
      requestSchema: CreateCustomTopicRequestSchema,
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
  async list(opts?: TopicListOptions): Promise<CustomTopicListResponse> {
    if (opts?.latestOnly) {
      const all = await this.listAll({ limit: 200 });
      const latest = new Map<string, CustomTopic>();
      for (const topic of all) {
        const current = latest.get(topic.topic_name);
        if (!current || topic.revision > current.revision) latest.set(topic.topic_name, topic);
      }
      const custom_topics = [...latest.values()];
      const offset = opts.offset ?? 0;
      const limit = opts.limit ?? 100;
      const nextOffset = offset + limit;
      return {
        custom_topics: custom_topics.slice(offset, nextOffset),
        next_offset: nextOffset < custom_topics.length ? nextOffset : undefined,
      };
    }
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
   * List custom topics across every response page.
   * @example
   * ```ts
   * const topics = await mgmt.topics.listAll({ limit: 200 });
   * ```
   */
  async listAll(opts: TopicListAllOptions = {}): Promise<CustomTopic[]> {
    const limit = opts.limit ?? 100;
    return collectAll(
      paginate(async (offset: number) => {
        const page = await this.list({ offset, limit });
        return { items: page.custom_topics, next: page.next_offset || undefined };
      }, 0),
      { max: opts.max },
    );
  }

  /**
   * Get an exact custom-topic revision by UUID.
   * @example
   * ```ts
   * const topic = await mgmt.topics.get('550e8400-e29b-41d4-a716-446655440000');
   * ```
   */
  async get(topicId: string): Promise<CustomTopic> {
    const topic = (await this.listAll()).find((item) => item.topic_id === topicId);
    if (!topic)
      throw new AISecSDKException(
        `Topic not found: ${topicId}`,
        ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      );
    return topic;
  }

  /**
   * Get the highest revision of a custom topic by name.
   * @example
   * ```ts
   * const topic = await mgmt.topics.getByName('credit-cards');
   * ```
   */
  async getByName(topicName: string): Promise<CustomTopic> {
    const matches = (await this.listAll()).filter((item) => item.topic_name === topicName);
    if (matches.length === 0)
      throw new AISecSDKException(
        `Topic not found: ${topicName}`,
        ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      );
    return matches.reduce((best, topic) => (topic.revision > best.revision ? topic : best));
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
      requestSchema: CreateCustomTopicRequestSchema,
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
   * @param updatedBy - Acting user, required by the API. The optional TypeScript parameter is
   * retained for existing CLI wrappers; omitting it now fails locally. For a required parameter
   * in new code, use {@link TopicsClient.forceDeleteWithAudit}.
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
    return this.forceDeleteWithAudit(topicId, updatedBy ?? '');
  }
}
