/**
 * OAuth Token Lifecycle Validation Script
 *
 * Spins up a local mock OAuth token server that issues short-lived tokens
 * (5s TTL) plus a mock management API, then exercises the full token lifecycle
 * with real timing. No live credentials are needed.
 *
 *   Phase 1  — Pre-fetch state
 *   Phase 2  — Initial token fetch
 *   Phase 3  — Token caching (no re-fetch within TTL)
 *   Phase 4  — Buffer window → proactive refresh
 *   Phase 5  — Full expiry → refresh
 *   Phase 6  — 401 auto-retry through ManagementClient (free retry, fresh token)
 *   Phase 7  — 403 auto-retry through ManagementClient
 *   Phase 8  — clearToken() → forced re-fetch
 *   Phase 9  — isTokenExpiringSoon() custom buffer override
 *   Phase 10 — onTokenRefresh callback audit
 *
 * Run (from the repository root):  npx tsx docs-site/examples/oauth-lifecycle-validation.ts
 *
 * The script completes in ~9 seconds with 5s tokens and a 3s buffer.
 */

import http from 'node:http';
import { ManagementClient, OAuthClient, type TokenInfo } from '@cdot65/prisma-airs-sdk';

// ── Helpers ──────────────────────────────────────────────────────────────────

const TOKEN_TTL_SECONDS = 5; // short-lived tokens for the timing phases (standalone client)
const TOKEN_BUFFER_MS = 3_000; // 3s pre-expiry buffer (standalone client)
// ManagementClient uses the SDK default 30s buffer, so its tokens must outlive it — the mock
// issues SCM-like 900s tokens to that client (a buffer larger than the TTL would refetch every call).
const MANAGED_TOKEN_TTL_SECONDS = 900;

const STANDALONE_CLIENT_ID = 'test-client'; // used by the standalone OAuthClient (phases 1–5, 8–10)
const MANAGED_CLIENT_ID = 'mgmt-client'; // used by ManagementClient's internal OAuthClient (phases 6–7)

let tokenCounter = 0;
const fetchesByClient = new Map<string, number>();
const startTime = Date.now();

function ts(): string {
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  return `[T+${elapsed.padStart(5)}s]`;
}

function log(phase: string, msg: string): void {
  console.log(`${ts()} ${phase.padEnd(12)} ${msg}`);
}

function logInfo(info: TokenInfo, label: string): void {
  log('  INFO', `${label}:`);
  log('  INFO', `  hasToken       = ${info.hasToken}`);
  log('  INFO', `  isValid        = ${info.isValid}`);
  log('  INFO', `  isExpired      = ${info.isExpired}`);
  log('  INFO', `  isExpiringSoon = ${info.isExpiringSoon}`);
  log('  INFO', `  expiresInMs    = ${info.expiresInMs}`);
  log(
    '  INFO',
    `  expiresAt      = ${info.expiresAt ? new Date(info.expiresAt).toISOString() : 'N/A'}`,
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pass(desc: string): void {
  log('  PASS', `✓ ${desc}`);
}

function fail(desc: string, detail?: string): void {
  log('  FAIL', `✗ ${desc}${detail ? ': ' + detail : ''}`);
  process.exitCode = 1;
}

function assert(condition: boolean, desc: string, detail?: string): void {
  if (condition) pass(desc);
  else fail(desc, detail);
}

// ── Mock OAuth Server ────────────────────────────────────────────────────────

/** Decode the client_id from the HTTP Basic credentials the SDK sends to the token endpoint. */
function clientIdFromBasicAuth(header: string | undefined): string {
  if (!header?.startsWith('Basic ')) return 'unknown';
  const decoded = Buffer.from(header.slice('Basic '.length), 'base64').toString('utf8');
  return decoded.split(':')[0] ?? 'unknown';
}

function createMockTokenServer(): http.Server {
  return http.createServer((req, res) => {
    tokenCounter++;
    const clientId = clientIdFromBasicAuth(req.headers.authorization);
    fetchesByClient.set(clientId, (fetchesByClient.get(clientId) ?? 0) + 1);
    const tokenId = `mock-token-${tokenCounter}`;
    const ttl = clientId === MANAGED_CLIENT_ID ? MANAGED_TOKEN_TTL_SECONDS : TOKEN_TTL_SECONDS;
    log('  SERVER', `Issued token #${tokenCounter}: ${tokenId} to ${clientId} (TTL=${ttl}s)`);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        access_token: tokenId,
        token_type: 'Bearer',
        expires_in: ttl,
      }),
    );
  });
}

// ── Mock Management API Server ───────────────────────────────────────────────

interface MockApiServer extends http.Server {
  /** Make the next request fail with the given status (simulates a revoked/expired token). */
  rejectNext(status: number): void;
}

function createMockApiServer(): MockApiServer {
  let rejectNext: number | null = null;

  const server = http.createServer((req, res) => {
    const auth = req.headers['authorization'] ?? '';
    log('  API', `${req.method} ${req.url?.split('?')[0]}  auth=${auth}`);

    if (rejectNext) {
      const status = rejectNext;
      rejectNext = null;
      log('  API', `Responding ${status} to simulate expired token`);
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: `simulated ${status}` }));
      return;
    }

    // A valid (empty) SecurityProfileListResponse so ManagementClient.profiles.list() parses.
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ai_profiles: [], next_offset: 0 }));
  }) as MockApiServer;

  server.rejectNext = (status: number) => {
    rejectNext = status;
  };

  return server;
}

// ── Main Validation ──────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  OAuth Token Lifecycle Validation');
  console.log(`  Token TTL: ${TOKEN_TTL_SECONDS}s  |  Buffer: ${TOKEN_BUFFER_MS / 1000}s`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Start mock servers
  const tokenServer = createMockTokenServer();
  const apiServer = createMockApiServer();

  await new Promise<void>((resolve) => tokenServer.listen(0, resolve));
  await new Promise<void>((resolve) => apiServer.listen(0, resolve));

  const tokenPort = (tokenServer.address() as { port: number }).port;
  const apiPort = (apiServer.address() as { port: number }).port;
  const tokenEndpoint = `http://127.0.0.1:${tokenPort}/oauth2/token`;

  log('SETUP', `Mock token server on port ${tokenPort}`);
  log('SETUP', `Mock API server on port ${apiPort}`);

  const refreshLog: TokenInfo[] = [];

  const oauth = new OAuthClient({
    clientId: STANDALONE_CLIENT_ID,
    clientSecret: 'test-secret',
    tsgId: '1234567890',
    tokenEndpoint,
    tokenBufferMs: TOKEN_BUFFER_MS,
    onTokenRefresh: (info) => {
      refreshLog.push(info);
      log('  CALLBACK', `onTokenRefresh fired — expiresInMs=${info.expiresInMs}`);
    },
  });

  try {
    // ── Phase 1: Pre-fetch state ─────────────────────────────────────────
    console.log('\n── Phase 1: Pre-fetch state ──────────────────────────────\n');

    const preInfo = oauth.getTokenInfo();
    logInfo(preInfo, 'Before any token fetch');

    assert(preInfo.hasToken === false, 'No token before first fetch');
    assert(oauth.isTokenExpired() === true, 'isTokenExpired() true before fetch');
    assert(oauth.isTokenExpiringSoon() === true, 'isTokenExpiringSoon() true before fetch');
    assert(preInfo.expiresInMs === 0, 'expiresInMs is 0 before fetch');

    // ── Phase 2: Initial token fetch ─────────────────────────────────────
    console.log('\n── Phase 2: Initial token fetch ─────────────────────────\n');

    const token1 = await oauth.getToken();
    log('PHASE 2', `Got token: ${token1}`);

    const postInfo = oauth.getTokenInfo();
    logInfo(postInfo, 'After first fetch');

    assert(token1 === 'mock-token-1', 'First token is mock-token-1');
    assert(postInfo.hasToken === true, 'hasToken is true');
    assert(postInfo.isValid === true, 'isValid is true');
    assert(postInfo.isExpired === false, 'isExpired is false');
    assert(postInfo.isExpiringSoon === false, 'isExpiringSoon is false');
    assert(postInfo.expiresInMs > 0, `expiresInMs > 0 (got ${postInfo.expiresInMs})`);
    assert(tokenCounter === 1, 'Only 1 server request so far');

    // ── Phase 3: Token caching (no re-fetch) ─────────────────────────────
    console.log('\n── Phase 3: Token caching (no re-fetch within TTL) ──────\n');

    const token2 = await oauth.getToken();
    const token3 = await oauth.getToken();
    log('PHASE 3', `Subsequent getToken() returned: ${token2}, ${token3}`);

    assert(token2 === 'mock-token-1', 'Cached token returned (call 2)');
    assert(token3 === 'mock-token-1', 'Cached token returned (call 3)');
    assert(tokenCounter === 1, 'Still only 1 server request (token cached)');

    // ── Phase 4: Wait for token to enter buffer window ───────────────────
    const waitForBuffer = TOKEN_TTL_SECONDS * 1000 - TOKEN_BUFFER_MS + 200;
    console.log(
      `\n── Phase 4: Wait ${(waitForBuffer / 1000).toFixed(1)}s for buffer window ─────────\n`,
    );

    log('PHASE 4', `Sleeping ${(waitForBuffer / 1000).toFixed(1)}s to reach buffer window...`);
    await sleep(waitForBuffer);

    const bufferInfo = oauth.getTokenInfo();
    logInfo(bufferInfo, 'After entering buffer window');

    assert(oauth.isTokenExpiringSoon() === true, 'isTokenExpiringSoon() true in buffer window');
    assert(bufferInfo.isExpiringSoon === true, 'TokenInfo.isExpiringSoon is true');
    assert(bufferInfo.isValid === false, 'isValid is false (within buffer)');

    // getToken() should now trigger a refresh
    const token4 = await oauth.getToken();
    log('PHASE 4', `getToken() after buffer window: ${token4}`);

    assert(token4 === 'mock-token-2', 'Auto-refreshed to mock-token-2');
    assert(tokenCounter === 2, 'Second server request for refresh');

    const refreshedInfo = oauth.getTokenInfo();
    logInfo(refreshedInfo, 'After automatic refresh');

    assert(refreshedInfo.isValid === true, 'Refreshed token is valid');
    assert(refreshedInfo.isExpired === false, 'Refreshed token not expired');

    // ── Phase 5: Wait for full expiry ────────────────────────────────────
    console.log(
      `\n── Phase 5: Wait ${TOKEN_TTL_SECONDS + 1}s for full expiry ──────────────────\n`,
    );

    log('PHASE 5', `Sleeping ${TOKEN_TTL_SECONDS + 1}s for full token expiry...`);
    await sleep((TOKEN_TTL_SECONDS + 1) * 1000);

    const expiredInfo = oauth.getTokenInfo();
    logInfo(expiredInfo, 'After full expiry');

    assert(oauth.isTokenExpired() === true, 'isTokenExpired() true after expiry');
    assert(expiredInfo.isExpired === true, 'TokenInfo.isExpired is true');
    assert(expiredInfo.expiresInMs === 0, 'expiresInMs is 0 after expiry');

    const token5 = await oauth.getToken();
    log('PHASE 5', `getToken() after expiry: ${token5}`);

    assert(token5 === 'mock-token-3', 'Auto-refreshed to mock-token-3 after expiry');
    assert(tokenCounter === 3, 'Third server request');

    // ── Phase 6: 401 auto-retry through ManagementClient ─────────────────
    console.log('\n── Phase 6: 401 auto-retry with token refresh ───────────\n');

    // ManagementClient owns its own OAuthClient; point both its API and token
    // endpoints at the mocks. numRetries: 0 proves the 401/403 refresh-and-retry
    // is a *free* retry that does not consume the retry budget.
    const mgmt = new ManagementClient({
      clientId: MANAGED_CLIENT_ID,
      clientSecret: 'mgmt-secret',
      tsgId: '1234567890',
      apiEndpoint: `http://127.0.0.1:${apiPort}`,
      tokenEndpoint,
      numRetries: 0,
    });

    const before401 = tokenCounter;
    apiServer.rejectNext(401);

    const page401 = await mgmt.profiles.list();
    log('PHASE 6', `profiles.list() resolved after a 401: ${page401.ai_profiles.length} profiles`);
    assert(Array.isArray(page401.ai_profiles), '401 auto-retry succeeded with fresh token');
    assert(
      tokenCounter - before401 === 2,
      `Initial fetch + one refresh after 401 (fetches ${before401} → ${tokenCounter})`,
    );

    // ── Phase 7: 403 auto-retry through ManagementClient ─────────────────
    console.log('\n── Phase 7: 403 auto-retry with token refresh ───────────\n');

    const before403 = tokenCounter;
    apiServer.rejectNext(403);

    const page403 = await mgmt.profiles.list();
    log('PHASE 7', `profiles.list() resolved after a 403: ${page403.ai_profiles.length} profiles`);
    assert(Array.isArray(page403.ai_profiles), '403 auto-retry succeeded with fresh token');
    assert(
      tokenCounter - before403 === 1,
      `Cached token reused, then exactly one refresh after 403 (fetches ${before403} → ${tokenCounter})`,
    );

    // ── Phase 8: clearToken() forced re-fetch ────────────────────────────
    console.log('\n── Phase 8: clearToken() → forced re-fetch ──────────────\n');

    const preClearCount = tokenCounter;
    oauth.clearToken();

    const clearedInfo = oauth.getTokenInfo();
    logInfo(clearedInfo, 'After clearToken()');

    assert(clearedInfo.hasToken === false, 'No token after clearToken()');
    assert(oauth.isTokenExpired() === true, 'isTokenExpired() true after clear');

    const token6 = await oauth.getToken();
    log('PHASE 8', `getToken() after clearToken(): ${token6}`);

    assert(tokenCounter > preClearCount, 'New server request after clearToken()');
    assert(oauth.getTokenInfo().isValid === true, 'Fresh token is valid');

    // ── Phase 9: isTokenExpiringSoon custom buffer ───────────────────────
    console.log('\n── Phase 9: Custom buffer override ──────────────────────\n');

    const currentInfo = oauth.getTokenInfo();
    const customBufferLarge = currentInfo.expiresInMs + 1000; // larger than remaining TTL

    assert(
      oauth.isTokenExpiringSoon(customBufferLarge) === true,
      `isTokenExpiringSoon(${customBufferLarge}ms) true with large custom buffer`,
    );
    assert(
      oauth.isTokenExpiringSoon(100) === false,
      'isTokenExpiringSoon(100ms) false with tiny buffer',
    );

    // ── Phase 10: onTokenRefresh callback audit ──────────────────────────
    console.log('\n── Phase 10: onTokenRefresh callback audit ──────────────\n');

    const standaloneFetches = fetchesByClient.get(STANDALONE_CLIENT_ID) ?? 0;
    const managedFetches = fetchesByClient.get(MANAGED_CLIENT_ID) ?? 0;
    log('PHASE 10', `Total onTokenRefresh callbacks (standalone client): ${refreshLog.length}`);
    log('PHASE 10', `Token fetches — standalone: ${standaloneFetches}, managed: ${managedFetches}`);

    assert(
      refreshLog.length === standaloneFetches,
      `Callback count (${refreshLog.length}) matches standalone fetch count (${standaloneFetches})`,
    );

    for (let i = 0; i < refreshLog.length; i++) {
      assert(refreshLog[i].hasToken === true, `Callback #${i + 1}: hasToken=true`);
      assert(
        refreshLog[i].expiresInMs > 0,
        `Callback #${i + 1}: expiresInMs=${refreshLog[i].expiresInMs}`,
      );
    }

    // ── Summary ──────────────────────────────────────────────────────────
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  Validation Complete');
    console.log(
      `  Total token fetches: ${tokenCounter} (standalone ${standaloneFetches}, managed ${managedFetches})`,
    );
    console.log(`  Total callbacks: ${refreshLog.length}`);
    console.log(`  Duration: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
    console.log(`  Result: ${process.exitCode ? 'FAILED' : 'ALL PASSED'}`);
    console.log('═══════════════════════════════════════════════════════════════');
  } finally {
    tokenServer.close();
    apiServer.close();
  }
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
