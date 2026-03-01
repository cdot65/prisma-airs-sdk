import { init, Scanner, Content, AISecSDKException } from '@cdot65/prisma-airs-sdk';

async function main() {
  // Initialize the SDK (mirrors Python's aisecurity.init())
  init({
    apiKey: 'your-airs-api-key-here',
    // Or use apiToken for Bearer auth:
    // apiToken: 'your-bearer-token',
    // apiEndpoint: 'https://custom-endpoint.example.com',
  });

  const scanner = new Scanner();

  try {
    // Synchronous scan
    const content = new Content({
      prompt: 'What is the capital of France?',
      response: 'The capital of France is Paris.',
    });

    const result = await scanner.syncScan({ profile_name: 'your-airs-profile-name' }, content, {
      metadata: {
        app_name: 'my-app',
        app_user: 'user123',
        ai_model: 'gpt-4',
      },
    });

    console.log('Category:', result.category); // "benign" or "malicious"
    console.log('Action:', result.action); // "allow" or "block"
    console.log('Scan ID:', result.scan_id);
    console.log('Report ID:', result.report_id);
  } catch (error) {
    if (error instanceof AISecSDKException) {
      console.error('AIRS SDK Error:', error.message);
      console.error('Error type:', error.errorType);
    } else {
      console.error('Unexpected error:', error);
    }
  }
}

main().catch(console.error);
