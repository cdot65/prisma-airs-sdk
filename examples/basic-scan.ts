import { init, Scanner, Content, AISecSDKException } from '@cdot65/prisma-airs-sdk';

async function main() {
  // Reads PANW_AI_SEC_API_KEY and PANW_AI_SEC_API_ENDPOINT from env
  init();

  const profileName = process.env.PANW_AI_SEC_PROFILE_NAME;
  if (!profileName) {
    console.error('Set PANW_AI_SEC_PROFILE_NAME in .env');
    process.exit(1);
  }

  const scanner = new Scanner();

  try {
    const content = new Content({
      prompt: 'What is the capital of France?',
      response: 'The capital of France is Paris.',
    });

    const result = await scanner.syncScan({ profile_name: profileName }, content, {
      metadata: {
        app_name: 'my-app',
        app_user: 'user123',
        ai_model: 'gpt-4',
      },
    });

    console.log('Category:', result.category);
    console.log('Action:', result.action);
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
