import { ManagementClient, AISecSDKException } from '@cdot65/prisma-airs-sdk';

async function main() {
  const client = new ManagementClient();

  try {
    // --- CREATE ---
    console.log('Creating custom topic...');
    const created = await client.topics.create({
      topic_name: 'credit-card-numbers',
      active: true,
      description: 'Detects credit card numbers in prompts and responses',
      examples: [
        '4111-1111-1111-1111',
        '5500 0000 0000 0004',
        'My card number is 4242424242424242',
      ],
    });
    console.log('Created:', created.topic_id, created.topic_name);

    // --- LIST ---
    console.log('\nListing topics...');
    const list = await client.topics.list();
    for (const t of list.custom_topics) {
      console.log(`  - ${t.topic_name} (${t.topic_id})`);
    }

    // --- UPDATE ---
    if (created.topic_id) {
      console.log('\nUpdating topic...');
      const updated = await client.topics.update(created.topic_id, {
        topic_name: 'credit-card-numbers',
        description: 'Updated: detects credit card numbers and CVVs',
        examples: [
          '4111-1111-1111-1111',
          '5500 0000 0000 0004',
          'CVV: 123',
        ],
      });
      console.log('Updated:', updated.topic_name);

      // --- DELETE ---
      console.log('\nDeleting topic...');
      const deleted = await client.topics.delete(created.topic_id);
      console.log('Delete result:', deleted.message);

      // --- FORCE DELETE (when topic is referenced by a profile) ---
      // const forceDeleted = await client.topics.forceDelete(topicId);
      // console.log('Force delete:', forceDeleted.message);
    }
  } catch (error) {
    if (error instanceof AISecSDKException) {
      console.error('Error:', error.message);
      console.error('Type:', error.errorType);
    }
  }
}

main().catch(console.error);
