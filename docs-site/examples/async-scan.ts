import { init, Scanner, AISecSDKException } from '@cdot65/prisma-airs-sdk';

async function main() {
  init();

  const profileName = process.env.PANW_AI_SEC_PROFILE_NAME;
  if (!profileName) {
    console.error('Set PANW_AI_SEC_PROFILE_NAME in .env');
    process.exit(1);
  }

  const scanner = new Scanner();

  try {
    // Use zero SDK retries for an async POST. A network/5xx failure can be ambiguous: the server
    // may have accepted the batch even though the client did not receive the receipt.
    const receipt = await scanner.asyncScan(
      [
        {
          req_id: 1,
          scan_req: {
            ai_profile: { profile_name: profileName },
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
            ai_profile: { profile_name: profileName },
            contents: [
              {
                prompt: 'What are neural networks?',
                response: 'Neural networks are computing systems...',
              },
            ],
          },
        },
      ],
      { numRetries: 0 },
    );

    console.log('Received:', receipt.received);
    console.log('Batch scan ID:', receipt.scan_id);

    // Polling GETs are idempotent, so a bounded retry override is safe. A single batch scan ID can
    // return multiple rows, and their order is not guaranteed.
    const rows = await scanner.queryByScanIds([receipt.scan_id], { numRetries: 2 });
    const byCorrelationId = new Map(rows.map((row) => [`${row.scan_id}:${row.req_id}`, row]));

    for (const [correlationId, row] of byCorrelationId) {
      console.log(correlationId, row.status, row.result?.action);
    }
  } catch (error) {
    if (error instanceof AISecSDKException) {
      console.error('Error:', error.message, {
        failureKind: error.failureKind,
        statusCode: error.statusCode,
        retryAfterMs: error.retryAfterMs,
      });
    }
  }
}

main().catch(console.error);
