import { describe, expect, it } from 'vitest';
import { GatewayInferenceBatchSchema } from '../../src/models/ai-gateway-inference.js';

const batch = {
  id: 'batch-offline',
  object: 'batch',
  endpoint: '/v1/chat/completions',
  input_file_id: 'file-offline',
  completion_window: '24h',
  status: 'validating',
  created_at: 1,
};

describe('live batch lifecycle response compatibility', () => {
  it.each(['output_file_id', 'in_progress_at', 'finalizing_at', 'completed_at'])(
    'accepts null or the declared type but rejects malformed %s',
    (field) => {
      for (const value of [null, field === 'output_file_id' ? 'file-output' : 2]) {
        const input = { ...batch, [field]: value };
        expect(GatewayInferenceBatchSchema.parse(input)).toEqual(input);
      }
      expect(GatewayInferenceBatchSchema.safeParse({ ...batch, [field]: {} }).success).toBe(false);
    },
  );
  it('preserves the observed validating shape and additive provider properties', () => {
    const input = {
      ...batch,
      model: null,
      errors: null,
      output_file_id: null,
      error_file_id: null,
      in_progress_at: null,
      finalizing_at: null,
      completed_at: null,
      failed_at: null,
      expired_at: null,
      cancelling_at: null,
      cancelled_at: null,
      request_counts: { total: 0, completed: 0, failed: 0 },
    };
    expect(GatewayInferenceBatchSchema.parse(input)).toEqual(input);
  });
  it('does not relax mandatory identity, status or count validation', () => {
    for (const patch of [
      { id: null },
      { status: null },
      { created_at: null },
      { request_counts: { total: '1', completed: 0, failed: 0 } },
    ])
      expect(GatewayInferenceBatchSchema.safeParse({ ...batch, ...patch }).success).toBe(false);
  });
});
