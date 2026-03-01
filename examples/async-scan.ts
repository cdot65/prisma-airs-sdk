import { init, Scanner, AISecSDKException } from '@cdot65/prisma-airs-sdk';

async function main() {
  init({ apiKey: 'your-airs-api-key-here' });

  const scanner = new Scanner();

  try {
    // Batch async scan (up to 5 objects)
    const result = await scanner.asyncScan([
      {
        req_id: 1,
        scan_req: {
          ai_profile: { profile_name: 'your-profile' },
          contents: [
            {
              prompt: 'Tell me about machine learning.',
              response: 'Machine learning is a branch of AI...',
            },
          ],
        },
      },
      {
        req_id: 2,
        scan_req: {
          ai_profile: { profile_name: 'your-profile' },
          contents: [
            {
              prompt: 'What are neural networks?',
              response: 'Neural networks are computing systems...',
            },
          ],
        },
      },
    ]);

    console.log('Received:', result.received);
    console.log('Scan ID:', result.scan_id);
  } catch (error) {
    if (error instanceof AISecSDKException) {
      console.error('Error:', error.message);
    }
  }
}

main().catch(console.error);
