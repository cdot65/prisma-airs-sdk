import { ManagementClient, AISecSDKException } from '@cdot65/prisma-airs-sdk';

async function main() {
  const client = new ManagementClient();

  try {
    // --- CREATE ---
    console.log('Creating profile...');
    const created = await client.profiles.create({
      profile_name: 'sdk-example-profile',
      active: true,
      policy: {
        'ai-security-profiles': [
          {
            'model-type': 'default',
            'model-configuration': {
              'app-protection': {
                'default-url-category': { member: null },
                'url-detected-action': '',
              },
              'data-protection': {
                'data-leak-detection': { action: '', member: null },
                'database-security': null,
              },
              latency: {
                'inline-timeout-action': 'block',
                'max-inline-latency': 5,
              },
              'mask-data-in-storage': false,
              'model-protection': [],
              'agent-protection': [],
            },
          },
        ],
        'dlp-data-profiles': [],
      },
    });
    console.log('Created:', created.profile_id, created.profile_name);

    // --- LIST ---
    console.log('\nListing profiles...');
    const list = await client.profiles.list();
    for (const p of list.ai_profiles) {
      console.log(`  - ${p.profile_name} (${p.profile_id})`);
    }

    // --- LIST with pagination ---
    console.log('\nListing with pagination...');
    const page = await client.profiles.list({ offset: 0, limit: 5 });
    console.log('Page size:', page.ai_profiles.length);
    if (page.next_offset) console.log('Next offset:', page.next_offset);

    // --- UPDATE ---
    if (created.profile_id) {
      console.log('\nUpdating profile...');
      const updated = await client.profiles.update(created.profile_id, {
        profile_name: 'sdk-example-profile-updated',
        active: true,
        policy: {
          'ai-security-profiles': [
            {
              'model-type': 'default',
              'model-configuration': {
                'app-protection': {
                  'default-url-category': { member: null },
                  'url-detected-action': '',
                },
                'data-protection': {
                  'data-leak-detection': { action: '', member: null },
                  'database-security': null,
                },
                latency: {
                  'inline-timeout-action': 'allow',
                  'max-inline-latency': 10,
                },
                'mask-data-in-storage': false,
                'model-protection': [],
                'agent-protection': [],
              },
            },
          ],
          'dlp-data-profiles': [],
        },
      });
      console.log('Updated:', updated.profile_name);

      // --- DELETE ---
      console.log('\nDeleting profile...');
      const deleted = await client.profiles.delete(created.profile_id);
      console.log('Delete result:', deleted.message);
    }
  } catch (error) {
    if (error instanceof AISecSDKException) {
      console.error('Error:', error.message);
      console.error('Type:', error.errorType);
    }
  }
}

main().catch(console.error);
