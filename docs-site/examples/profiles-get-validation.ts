/**
 * Profiles get()/getByName() E2E Validation Script
 *
 * Spins up mock OAuth + API servers and exercises:
 *
 *   Phase 1 — get() returns correct profile by UUID
 *   Phase 2 — get() throws for unknown UUID
 *   Phase 3 — getByName() returns highest revision
 *   Phase 4 — getByName() throws for unknown name
 *
 * Run:  npm run example:profiles-get
 *
 * No credentials required — uses local mock servers.
 */

import http from 'node:http';
import { ManagementClient, AISecSDKException } from '../src/index.js';

// ── Test Data ────────────────────────────────────────────────────────────────

const PROFILES = [
  {
    profile_id: '550e8400-e29b-41d4-a716-446655440000',
    profile_name: 'alpha-profile',
    revision: 1,
    active: true,
  },
  {
    profile_id: '660e8400-e29b-41d4-a716-446655440001',
    profile_name: 'beta-profile',
    revision: 2,
    active: true,
  },
  {
    profile_id: '770e8400-e29b-41d4-a716-446655440002',
    profile_name: 'beta-profile',
    revision: 5,
    active: true,
  },
  {
    profile_id: '880e8400-e29b-41d4-a716-446655440003',
    profile_name: 'beta-profile',
    revision: 3,
    active: false,
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

const startTime = Date.now();

function ts(): string {
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  return `[T+${elapsed.padStart(5)}s]`;
}

function log(phase: string, msg: string): void {
  console.log(`${ts()} ${phase.padEnd(12)} ${msg}`);
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

// ── Mock Servers ─────────────────────────────────────────────────────────────

function createMockTokenServer(): http.Server {
  return http.createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        access_token: 'mock-token',
        token_type: 'Bearer',
        expires_in: 3600,
      }),
    );
  });
}

function createMockApiServer(): http.Server {
  return http.createServer((req, res) => {
    log('  API', `${req.method} ${req.url}`);

    if (req.url?.includes('/v1/mgmt/profiles/tsg/')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ai_profiles: PROFILES }));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'not found' }));
  });
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Profiles get()/getByName() E2E Validation');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const tokenServer = createMockTokenServer();
  const apiServer = createMockApiServer();

  await new Promise<void>((resolve) => tokenServer.listen(0, resolve));
  await new Promise<void>((resolve) => apiServer.listen(0, resolve));

  const tokenPort = (tokenServer.address() as { port: number }).port;
  const apiPort = (apiServer.address() as { port: number }).port;

  log('SETUP', `Mock token server on port ${tokenPort}`);
  log('SETUP', `Mock API server on port ${apiPort}`);

  const client = new ManagementClient({
    clientId: 'test-client',
    clientSecret: 'test-secret',
    tsgId: '123',
    apiEndpoint: `http://127.0.0.1:${apiPort}`,
    tokenEndpoint: `http://127.0.0.1:${tokenPort}/oauth2/token`,
    numRetries: 0,
  });

  try {
    // ── Phase 1: get() by UUID ─────────────────────────────────────────
    console.log('\n── Phase 1: get() returns profile by UUID ───────────────\n');

    const profile = await client.profiles.get('660e8400-e29b-41d4-a716-446655440001');

    assert(
      profile.profile_id === '660e8400-e29b-41d4-a716-446655440001',
      'Correct profile_id returned',
    );
    assert(profile.profile_name === 'beta-profile', 'Correct profile_name returned');
    assert(profile.revision === 2, `Correct revision returned (got ${profile.revision})`);

    // ── Phase 2: get() not found ───────────────────────────────────────
    console.log('\n── Phase 2: get() throws for unknown UUID ────────────── \n');

    try {
      await client.profiles.get('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
      fail('Should have thrown AISecSDKException');
    } catch (err) {
      assert(err instanceof AISecSDKException, 'Threw AISecSDKException');
      assert(
        (err as AISecSDKException).message.includes('Profile not found'),
        `Message contains "Profile not found" (got: ${(err as Error).message})`,
      );
    }

    // ── Phase 3: getByName() highest revision ──────────────────────────
    console.log('\n── Phase 3: getByName() returns highest revision ───────\n');

    const byName = await client.profiles.getByName('beta-profile');

    assert(byName.profile_name === 'beta-profile', 'Correct profile_name');
    assert(byName.revision === 5, `Highest revision returned (got ${byName.revision})`);
    assert(
      byName.profile_id === '770e8400-e29b-41d4-a716-446655440002',
      'Correct profile_id for highest revision',
    );

    // ── Phase 4: getByName() not found ─────────────────────────────────
    console.log('\n── Phase 4: getByName() throws for unknown name ───────\n');

    try {
      await client.profiles.getByName('nonexistent-profile');
      fail('Should have thrown AISecSDKException');
    } catch (err) {
      assert(err instanceof AISecSDKException, 'Threw AISecSDKException');
      assert(
        (err as AISecSDKException).message.includes('Profile not found'),
        `Message contains "Profile not found" (got: ${(err as Error).message})`,
      );
    }

    // ── Summary ────────────────────────────────────────────────────────
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  Validation Complete');
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
