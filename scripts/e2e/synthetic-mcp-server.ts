/** @internal Stateless, bounded, discovery-only upstream for gateway conformance tests. */
import { webcrypto } from 'node:crypto';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

export function syntheticMcpServer(allowedHost: string) {
  // The test-only MCP dependency uses global crypto.randomUUID even in stateless mode.
  // Node 18 exposes Web Crypto through node:crypto without installing that global.
  // Supply the native implementation only when absent; never replace an existing one.
  if (typeof globalThis.crypto === 'undefined')
    Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
  const counters = { initialize: 0, toolsList: 0, forbiddenToolCalls: 0 };
  const handle = async (request: IncomingMessage, response: ServerResponse) => {
    if (request.url === '/healthz' && request.method === 'GET') {
      response.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(counters));
      return;
    }
    if (request.url !== '/mcp') {
      response.writeHead(404).end();
      return;
    }
    if (new URL(`http://${request.headers.host}`).hostname !== allowedHost) {
      response.writeHead(403).end();
      return;
    }
    if (request.method !== 'POST') {
      response.writeHead(405, { Allow: 'POST' }).end();
      return;
    }
    let bytes = 0;
    const chunks: Buffer[] = [];
    for await (const chunk of request) {
      const buffer = Buffer.from(chunk);
      bytes += buffer.length;
      if (bytes > 65_536) {
        response.writeHead(413).end();
        return;
      }
      chunks.push(buffer);
    }
    const body: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    const messages = Array.isArray(body) ? body : [body];
    for (const message of messages) {
      if (!message || typeof message !== 'object' || !('method' in message)) continue;
      if (message.method === 'tools/call') {
        counters.forbiddenToolCalls++;
        response.writeHead(403).end();
        return;
      }
      if (message.method === 'initialize') counters.initialize++;
      if (message.method === 'tools/list') counters.toolsList++;
    }
    const mcp = new McpServer({ name: 'prisma-airs-sdk-synthetic-upstream', version: '1.0.0' });
    mcp.registerTool(
      'sdk_e2e_discovery_probe',
      {
        description: 'Synthetic metadata-only capability. Execution is forbidden by the fixture.',
        inputSchema: {},
        annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
      },
      async () => {
        throw new Error('Tool execution is forbidden');
      },
    );
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    response.once('close', () => {
      void mcp.close().catch(() => {});
    });
    await mcp.connect(transport);
    await transport.handleRequest(request, response, body);
  };
  const server = createServer((request, response) => {
    void handle(request, response).catch(() => {
      if (!response.headersSent) response.writeHead(400);
      response.end();
    });
  });
  server.maxConnections = 16;
  server.requestTimeout = 10_000;
  server.headersTimeout = 5000;
  server.keepAliveTimeout = 1000;
  return server;
}
