/**
 * OAuth Token Lifecycle Validation Script
 *
 * Spins up a local mock OAuth token server that issues short-lived tokens
 * (5s TTL), then exercises the full OAuthClient lifecycle with real timing:
 *
 *   Phase 1 — Initial token fetch
 *   Phase 2 — Token valid (cached, no re-fetch)
 *   Phase 3 — Token approaching expiry (within buffer)
 *   Phase 4 — Token expired → automatic refresh
 *   Phase 5 — 401 auto-retry with token refresh
 *   Phase 6 — 403 auto-retry with token refresh
 *   Phase 7 — onTokenRefresh callback validation
 *   Phase 8 — clearToken() → forced re-fetch
 *
 * Run:  npm run example:oauth-lifecycle
 *
 * The script completes in ~20 seconds with 5s tokens and 3s buffer.
 */

import http from 'node:http';
import { OAuthClient, type TokenInfo } from '../src/management/oauth-client.js';
import { managementHttpRequest } from '../src/management/management-http-client.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

const TOKEN_TTL_SECONDS = 5; // short-lived tokens for fast validation
const TOKEN_BUFFER_MS = 3_000; // 3s pre-expiry buffer

let tokenCounter = 0;
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

function createMockTokenServer(): http.Server {
  return http.createServer((req, res) => {
    tokenCounter++;
    const tokenId = `mock-token-${tokenCounter}`;
    log('  SERVER', `Issued token #${tokenCounter}: ${tokenId} (TTL=${TOKEN_TTL_SECONDS}s)`);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        access_token: tokenId,
        token_type: 'Bearer',
        expires_in: TOKEN_TTL_SECONDS,
      }),
    );
  });
}

// ── Mock Management API Server ───────────────────────────────────────────────

function createMockApiServer(): http.Server {
  let rejectNext: number | null = null;

  const server = http.createServer((req, res) => {
    const auth = req.headers['authorization'] ?? '';
    log('  API', `${req.method} ${req.url}  auth=${auth}`);

    if (rejectNext) {
      const status = rejectNext;
      rejectNext = null;
      log('  API', `Responding ${status} to simulate expired token`);
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: `simulated ${status}` }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', token_received: auth }));
  });

  (server as unknown as { rejectNext: (status: number) => void }).rejectNext = (status: number) => {
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

  log('SETUP', `Mock token server on port ${tokenPort}`);
  log('SETUP', `Mock API server on port ${apiPort}`);

  const refreshLog: TokenInfo[] = [];

  const oauth = new OAuthClient({
    clientId: 'test-client',
    clientSecret: 'test-secret',
    tsgId: '1234567890',
    tokenEndpoint: `http://127.0.0.1:${tokenPort}/oauth2/token`,
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

    // ── Phase 6: 401 auto-retry ──────────────────────────────────────────
    console.log('\n── Phase 6: 401 auto-retry with token refresh ───────────\n');

    const apiServerTyped = apiServer as unknown as { rejectNext: (s: number) => void };
    apiServerTyped.rejectNext(401);

    const result401 = await managementHttpRequest({
      method: 'GET',
      baseUrl: `http://127.0.0.1:${apiPort}`,
      path: '/v1/test-401',
      oauthClient: oauth,
      numRetries: 1,
    });

    log('PHASE 6', `401 retry result: status=${result401.status}`);
    assert(result401.status === 200, '401 auto-retry succeeded with fresh token');
    assert(tokenCounter >= 4, `Token refreshed after 401 (total fetches: ${tokenCounter})`);

    // ── Phase 7: 403 auto-retry ──────────────────────────────────────────
    console.log('\n── Phase 7: 403 auto-retry with token refresh ───────────\n');

    const preCount = tokenCounter;
    apiServerTyped.rejectNext(403);

    const result403 = await managementHttpRequest({
      method: 'GET',
      baseUrl: `http://127.0.0.1:${apiPort}`,
      path: '/v1/test-403',
      oauthClient: oauth,
      numRetries: 1,
    });

    log('PHASE 7', `403 retry result: status=${result403.status}`);
    assert(result403.status === 200, '403 auto-retry succeeded with fresh token');
    assert(tokenCounter > preCount, `Token refreshed after 403 (total fetches: ${tokenCounter})`);

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

    log('PHASE 10', `Total onTokenRefresh callbacks: ${refreshLog.length}`);
    log('PHASE 10', `Total token fetches: ${tokenCounter}`);

    assert(
      refreshLog.length === tokenCounter,
      `Callback count (${refreshLog.length}) matches fetch count (${tokenCounter})`,
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
    console.log(`  Total token fetches: ${tokenCounter}`);
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
