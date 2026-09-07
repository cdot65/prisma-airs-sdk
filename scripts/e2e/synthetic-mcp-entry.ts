/** @internal Compiled into the disposable upstream; contains no credentials or external clients. */
import assert from 'node:assert/strict';
import { syntheticMcpServer } from './synthetic-mcp-server.js';
const hostname = process.env.MCP_FIXTURE_HOST;
assert(hostname && /^sdk-e2e-mcp-[0-9a-f]{8}\.airs-gw\.svc\.cluster\.local$/.test(hostname));
const server = syntheticMcpServer(hostname);
server.listen(8080, '0.0.0.0');
process.once('SIGTERM', () => server.close(() => process.exit(0)));
