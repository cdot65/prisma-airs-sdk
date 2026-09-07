/** Runtime example; configure endpoint/key in the environment, never in source. */
import { AIGatewayInferenceClient } from '@cdot65/prisma-airs-sdk';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { reportExampleError } from './example-support.js';

export async function inferenceExample() {
  const inference = new AIGatewayInferenceClient();
  const completion = await inference.createChatCompletion({
    model: '@openai/gpt-5.6-terra',
    messages: [{ role: 'user', content: 'Reply with READY.' }],
    max_completion_tokens: 128,
  });
  const embeddings = await inference.createEmbedding({
    model: '@openai/text-embedding-3-small',
    input: 'SDK readiness check',
    dimensions: 32,
    encoding_format: 'float',
  });
  // Listing is read-only; this example does not start a training job or switch models.
  const jobs = await inference.listPaginatedFineTuningJobs(
    { limit: 1 },
    { headers: { 'x-portkey-provider': '@openai' } },
  );
  return { completion, embeddings, jobs };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  inferenceExample()
    .then(({ completion, embeddings, jobs }) => {
      console.log(
        JSON.stringify(
          {
            model: completion.model,
            content: completion.choices[0]?.message.content,
            usage: completion.usage,
            embeddingCount: embeddings.data.length,
            dimensions: Array.isArray(embeddings.data[0]?.embedding)
              ? embeddings.data[0].embedding.length
              : undefined,
            fineTuningJobCount: jobs.data.length,
            fineTuningHasMore: jobs.has_more,
          },
          null,
          2,
        ),
      );
    })
    .catch(reportExampleError);
}
