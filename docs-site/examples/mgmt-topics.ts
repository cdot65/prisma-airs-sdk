import assert from 'node:assert/strict';
import { ManagementClient } from '@cdot65/prisma-airs-sdk';
import { exampleName, recordExampleFixture, reportExampleError } from './example-support.js';

async function main() {
  const client = new ManagementClient({ numRetries: 0 });
  console.log('Topics returned:', (await client.topics.list({ limit: 5 })).custom_topics.length);
  if (!process.argv.includes('--writes')) {
    console.log('Read-only: pass --writes for an owned topic lifecycle.');
    return;
  }
  const actor = 'sdk-example@example.invalid';
  const body = {
    topic_name: exampleName,
    active: true,
    description: 'Benign questions about rainbow colors.',
    examples: ['What colors are in a rainbow?', 'Name the colors of a rainbow.'],
    created_by: actor,
    updated_by: actor,
  };
  try {
    const created = await client.topics.create(body);
    assert(created.topic_id);
    recordExampleFixture('management.topic', created.topic_id);
    console.log('Created owned topic');
    assert.equal((await client.topics.get(created.topic_id)).topic_name, exampleName);
    await client.topics.update(created.topic_id, {
      ...body,
      revision: created.revision,
      description: 'Updated benign questions about rainbow colors.',
    });
    console.log('Updated owned topic');
  } finally {
    const owned = (await client.topics.listAll()).filter(
      (topic) => topic.topic_name === exampleName && topic.active !== false,
    );
    const failures: unknown[] = [];
    for (const topic of owned) {
      if (!topic.topic_id) continue;
      recordExampleFixture('management.topic', topic.topic_id);
      try {
        await client.topics.forceDeleteWithAudit(topic.topic_id, actor);
      } catch (error) {
        failures.push(error);
      }
    }
    if (failures.length) throw new AggregateError(failures, 'Owned topic cleanup failed');
    console.log('Deleted owned topic revisions:', owned.length);
  }
}
main().catch(reportExampleError);
