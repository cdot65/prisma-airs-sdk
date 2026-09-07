import { describe, expect, it } from 'vitest';
import { GatewayInferenceVectorStoreFileBatchObjectSchema } from '../../src/models/ai-gateway-inference.js';

const batch = {
  id: 'vsfb-offline',
  created_at: 1,
  vector_store_id: 'vs-offline',
  status: 'in_progress',
  file_counts: { in_progress: 1, completed: 0, failed: 0, cancelled: 0, total: 1 },
};

describe('vector-file-batch live discriminator correction', () => {
  it.each(['vector_store.files_batch', 'vector_store.file_batch'])(
    'accepts the pinned or live object literal without rewriting it: %s',
    (object) => {
      const value = { ...batch, object, provider_extension: true };
      expect(GatewayInferenceVectorStoreFileBatchObjectSchema.parse(value)).toEqual(value);
    },
  );
  it('retains validation of unrelated objects and malformed known fields', () => {
    expect(
      GatewayInferenceVectorStoreFileBatchObjectSchema.safeParse({ ...batch, object: 'file' })
        .success,
    ).toBe(false);
    expect(
      GatewayInferenceVectorStoreFileBatchObjectSchema.safeParse({
        ...batch,
        object: 'vector_store.file_batch',
        file_counts: { total: '1' },
      }).success,
    ).toBe(false);
  });
});
