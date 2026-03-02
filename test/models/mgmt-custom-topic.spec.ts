import { describe, it, expect } from 'vitest';
import {
  CustomTopicSchema,
  CreateCustomTopicRequestSchema,
  CustomTopicListResponseSchema,
  DeleteTopicResponseSchema,
  DeleteTopicConflictSchema,
} from '../../src/models/mgmt-custom-topic.js';

const validTopic = {
  topic_id: '550e8400-e29b-41d4-a716-446655440000',
  topic_name: 'credit-cards',
  revision: 1,
  active: true,
  description: 'Detects credit card numbers',
  examples: ['4111-1111-1111-1111', '5500-0000-0000-0004'],
  created_by: 'admin@example.com',
  updated_by: 'admin@example.com',
  last_modified_ts: '2025-01-01T00:00:00Z',
  created_ts: '2025-01-01T00:00:00Z',
};

describe('CustomTopicSchema', () => {
  it('parses valid topic', () => {
    const result = CustomTopicSchema.parse(validTopic);
    expect(result.topic_id).toBe('550e8400-e29b-41d4-a716-446655440000');
    expect(result.topic_name).toBe('credit-cards');
    expect(result.examples).toHaveLength(2);
  });

  it('allows extra fields via passthrough', () => {
    const result = CustomTopicSchema.parse({ ...validTopic, new_field: 'test' });
    expect((result as Record<string, unknown>).new_field).toBe('test');
  });

  it('rejects missing topic_name', () => {
    const noName = { ...validTopic };
    delete (noName as Record<string, unknown>).topic_name;
    expect(() => CustomTopicSchema.parse(noName)).toThrow();
  });
});

describe('CreateCustomTopicRequestSchema', () => {
  it('parses without topic_id', () => {
    const noId = { ...validTopic };
    delete (noId as Record<string, unknown>).topic_id;
    const result = CreateCustomTopicRequestSchema.parse(noId);
    expect(result.topic_name).toBe('credit-cards');
    expect(result.topic_id).toBeUndefined();
  });

  it('parses with topic_id', () => {
    const result = CreateCustomTopicRequestSchema.parse(validTopic);
    expect(result.topic_id).toBe('550e8400-e29b-41d4-a716-446655440000');
  });
});

describe('CustomTopicListResponseSchema', () => {
  it('parses topic list', () => {
    const result = CustomTopicListResponseSchema.parse({
      custom_topics: [validTopic],
      next_offset: 5,
    });
    expect(result.custom_topics).toHaveLength(1);
    expect(result.next_offset).toBe(5);
  });

  it('parses without next_offset', () => {
    const result = CustomTopicListResponseSchema.parse({
      custom_topics: [],
    });
    expect(result.custom_topics).toHaveLength(0);
  });
});

describe('DeleteTopicResponseSchema', () => {
  it('parses success', () => {
    const result = DeleteTopicResponseSchema.parse({ message: 'deleted' });
    expect(result.message).toBe('deleted');
  });
});

describe('DeleteTopicConflictSchema', () => {
  it('parses conflict with payload', () => {
    const result = DeleteTopicConflictSchema.parse({
      message: 'in use',
      payload: [{ profile_id: 'p1', profile_name: 'prof', revision: 2 }],
    });
    expect(result.payload).toHaveLength(1);
    expect(result.payload[0].profile_id).toBe('p1');
  });
});
