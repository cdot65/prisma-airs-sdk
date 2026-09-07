/** Discovery only: HTTP upgrade is not provider readiness; never sends generation events. */
import { AIGatewayInferenceClient } from '@cdot65/prisma-airs-sdk';
import WebSocket from 'ws';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { reportExampleError } from './example-support.js';

export async function realtimeExample() {
  const client = new AIGatewayInferenceClient();
  const connection = await client.connectRealtime({ model: '@openai/gpt-5.6-terra' }, {
    timeoutMs: 15_000,
    maxBufferedEvents: 16,
    headers: { 'x-portkey-provider': '@openai' },
    webSocketFactory: (url, options) => new WebSocket(url, options),
  });
  try {
    let count = 0;
    for await (const event of connection) {
      if (event.type === 'session.created') return { upgraded: true, sessionCreated: true, clientEventsSent: 0 };
      if (event.type === 'error') throw new Error('Gateway provider rejected the realtime session; no generation was sent.');
      if (++count >= 16) break;
    }
    throw new Error('Gateway did not establish a provider session; no generation was sent.');
  } finally {
    await connection.cancel();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  realtimeExample().then((result) => console.log(JSON.stringify(result, null, 2))).catch(reportExampleError);
