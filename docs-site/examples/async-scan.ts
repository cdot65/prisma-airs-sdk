import { reportExampleError } from './example-support.js';
import { setTimeout as delay } from 'node:timers/promises';
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
    let rows = await scanner.queryByScanIds([receipt.scan_id], { numRetries: 2 });
    for (
      let attempt = 0;
      attempt < 20 && ![1, 2].every((id) => rows.some((row) => row.req_id === id && row.result));
      attempt++
    ) {
      await delay(1500);
      rows = await scanner.queryByScanIds([receipt.scan_id], { numRetries: 2 });
    }
    if (![1, 2].every((id) => rows.some((row) => row.req_id === id && row.result))) {
      throw new Error('Async example exceeded its polling budget');
    }
    const byCorrelationId = new Map(rows.map((row) => [`${row.scan_id}:${row.req_id}`, row]));

    for (const [correlationId, row] of byCorrelationId) {
      console.log(correlationId, row.status, row.result?.action);
    }
  } catch (error) {
    process.exitCode = 1;
    if (error instanceof AISecSDKException) {
      console.error('Error:', error.message, {
        failureKind: error.failureKind,
        statusCode: error.statusCode,
        retryAfterMs: error.retryAfterMs,
      });
    } else throw error;
  }
}

main().catch(reportExampleError);
