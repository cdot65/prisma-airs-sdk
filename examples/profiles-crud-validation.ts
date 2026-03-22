/**
 * Security Profiles Full CRUD Validation Script
 *
 * Spins up mock OAuth + API servers and exercises every CRUD operation:
 *
 *   Phase 1 — CREATE: create a new security profile
 *   Phase 2 — READ (List): list all profiles with pagination
 *   Phase 3 — READ (Get by UUID): retrieve a single profile
 *   Phase 4 — READ (Get by Name): retrieve by name (highest revision)
 *   Phase 5 — UPDATE: modify an existing profile
 *   Phase 6 — DELETE: remove a profile
 *   Phase 7 — DELETE (Force): force-delete a profile referenced by policies
 *
 * Run:  npm run example:profiles-crud
 *
 * No credentials required — uses local mock servers.
 */

import http from 'node:http';
import { ManagementClient, AISecSDKException } from '../src/index.js';

// ── Test Data ────────────────────────────────────────────────────────────────

const STORED_PROFILES = [
  {
    profile_id: '550e8400-e29b-41d4-a716-446655440000',
    profile_name: 'production-guardrails',
    csp_id: 'csp-001',
    tsg_id: 'tsg-001',
    revision: 1,
    active: true,
    policy: {
      'ai-security-profiles': [
        {
          'model-type': 'default',
          'model-configuration': {
            'mask-data-in-storage': false,
            latency: {
              'inline-timeout-action': 'block',
              'max-inline-latency': 5,
            },
            'data-protection': {
              'data-leak-detection': {
                member: [{ text: 'SSN Detection', id: 'dlp-1', version: '1' }],
                action: 'block',
                'mask-data-inline': true,
              },
              'database-security': [{ name: 'db-sec-rule', action: 'alert' }],
            },
            'app-protection': {
              'alert-url-category': { member: ['news'] },
              'block-url-category': { member: ['malware'] },
              'url-detected-action': 'block',
              'malicious-code-protection': { name: 'code-guard', action: 'block' },
            },
            'model-protection': [
              {
                name: 'topic-guardrail',
                action: 'block',
                options: [],
                'topic-list': [
                  {
                    action: 'block',
                    topic: [{ topic_name: 'PII', topic_id: 'tid-1', revision: 3 }],
                  },
                ],
              },
            ],
            'agent-protection': [{ name: 'malicious-agent', action: 'alert' }],
          },
        },
      ],
      'dlp-data-profiles': [
        {
          name: 'credit-card-detector',
          uuid: 'dlp-uuid-1',
          description: 'Detects credit card numbers in prompts and responses',
          rule1: { action: 'block' },
          'log-severity': 'high',
        },
      ],
    },
    created_by: 'admin@example.com',
    updated_by: 'admin@example.com',
    last_modified_ts: '2025-06-01T12:00:00Z',
  },
  {
    profile_id: '660e8400-e29b-41d4-a716-446655440001',
    profile_name: 'staging-profile',
    csp_id: 'csp-001',
    tsg_id: 'tsg-001',
    revision: 2,
    active: true,
    policy: {
      'ai-security-profiles': [
        {
          'model-type': 'default',
          'model-configuration': {
            'mask-data-in-storage': true,
            latency: { 'inline-timeout-action': 'allow', 'max-inline-latency': 10 },
          },
        },
      ],
    },
    created_by: 'dev@example.com',
    updated_by: 'dev@example.com',
    last_modified_ts: '2025-07-15T08:30:00Z',
  },
  {
    profile_id: '770e8400-e29b-41d4-a716-446655440002',
    profile_name: 'staging-profile',
    csp_id: 'csp-001',
    tsg_id: 'tsg-001',
    revision: 5,
    active: true,
    created_by: 'dev@example.com',
    updated_by: 'dev@example.com',
    last_modified_ts: '2025-08-01T10:00:00Z',
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

const startTime = Date.now();
let passed = 0;
let failed = 0;

function ts(): string {
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  return `[T+${elapsed.padStart(5)}s]`;
}

function log(phase: string, msg: string): void {
  console.log(`${ts()} ${phase.padEnd(12)} ${msg}`);
}

function pass(desc: string): void {
  log('  PASS', `✓ ${desc}`);
  passed++;
}

function fail(desc: string, detail?: string): void {
  log('  FAIL', `✗ ${desc}${detail ? ': ' + detail : ''}`);
  failed++;
  process.exitCode = 1;
}

function assert(condition: boolean, desc: string, detail?: string): void {
  if (condition) pass(desc);
  else fail(desc, detail);
}

function banner(title: string): void {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`  ${title}`);
  console.log(`${'─'.repeat(60)}\n`);
}

// ── Mock Servers ─────────────────────────────────────────────────────────────

function createMockTokenServer(): http.Server {
  return http.createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        access_token: 'mock-token-abc123',
        token_type: 'Bearer',
        expires_in: 3600,
      }),
    );
  });
}

function createMockApiServer(): http.Server {
  return http.createServer((req, res) => {
    const url = req.url ?? '';
    const method = req.method ?? 'GET';
    log('  API', `${method} ${url}`);

    // ── LIST profiles ──────────────────────────────────────────────
    if (method === 'GET' && url.includes('/v1/mgmt/profiles/tsg/')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ai_profiles: STORED_PROFILES }));
      return;
    }

    // ── CREATE profile ─────────────────────────────────────────────
    if (method === 'POST' && url.includes('/v1/mgmt/profile')) {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', () => {
        const parsed = JSON.parse(body);
        const created = {
          profile_id: '990e8400-e29b-41d4-a716-446655440099',
          ...parsed,
          csp_id: 'csp-001',
          tsg_id: 'tsg-001',
          revision: 1,
          active: true,
          created_by: 'admin@example.com',
          updated_by: 'admin@example.com',
          last_modified_ts: new Date().toISOString(),
        };
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(created));
      });
      return;
    }

    // ── UPDATE profile ─────────────────────────────────────────────
    if (method === 'PUT' && url.includes('/v1/mgmt/profile/uuid/')) {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', () => {
        const parsed = JSON.parse(body);
        const profileId = url.split('/uuid/')[1];
        const updated = {
          profile_id: profileId,
          ...parsed,
          csp_id: 'csp-001',
          tsg_id: 'tsg-001',
          revision: 2,
          updated_by: 'admin@example.com',
          last_modified_ts: new Date().toISOString(),
        };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(updated));
      });
      return;
    }

    // ── FORCE DELETE profile ───────────────────────────────────────
    if (method === 'DELETE' && url.includes('/force')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Profile force-deleted successfully' }));
      return;
    }

    // ── DELETE profile ─────────────────────────────────────────────
    if (method === 'DELETE' && url.includes('/v1/mgmt/profile/')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Profile deleted successfully' }));
      return;
    }

    // ── Fallback ───────────────────────────────────────────────────
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'not found' }));
  });
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('═'.repeat(60));
  console.log('  Security Profiles — Full CRUD Validation');
  console.log('═'.repeat(60));

  const tokenServer = createMockTokenServer();
  const apiServer = createMockApiServer();

  await new Promise<void>((resolve) => tokenServer.listen(0, resolve));
  await new Promise<void>((resolve) => apiServer.listen(0, resolve));

  const tokenPort = (tokenServer.address() as { port: number }).port;
  const apiPort = (apiServer.address() as { port: number }).port;

  log('SETUP', `Mock token server on port ${tokenPort}`);
  log('SETUP', `Mock API server on port ${apiPort}`);

  const client = new ManagementClient({
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    tsgId: '1234567890',
    apiEndpoint: `http://127.0.0.1:${apiPort}`,
    tokenEndpoint: `http://127.0.0.1:${tokenPort}/oauth2/token`,
    numRetries: 0,
  });

  try {
    // ════════════════════════════════════════════════════════════════
    // Phase 1: CREATE
    // ════════════════════════════════════════════════════════════════
    banner('Phase 1: CREATE — profiles.create()');

    const newProfile = await client.profiles.create({
      profile_name: 'new-security-profile',
      policy: {
        'ai-security-profiles': [
          {
            'model-type': 'default',
            'model-configuration': {
              'mask-data-in-storage': true,
              latency: {
                'inline-timeout-action': 'allow',
                'max-inline-latency': 10,
              },
              'model-protection': [
                {
                  name: 'basic-guardrail',
                  action: 'alert',
                  options: [],
                },
              ],
            },
          },
        ],
      },
    });

    console.log('\n  Response:');
    console.log(JSON.stringify(newProfile, null, 2));

    assert(!!newProfile.profile_id, 'Server assigned a profile_id');
    assert(newProfile.profile_name === 'new-security-profile', 'profile_name matches request');
    assert(newProfile.revision === 1, `revision is 1 (got ${newProfile.revision})`);
    assert(newProfile.active === true, 'active is true');
    assert(!!newProfile.csp_id, `csp_id present (got "${newProfile.csp_id}")`);
    assert(!!newProfile.tsg_id, `tsg_id present (got "${newProfile.tsg_id}")`);
    assert(!!newProfile.created_by, `created_by populated (got "${newProfile.created_by}")`);
    assert(
      !!newProfile.policy?.['ai-security-profiles'],
      'Policy ai-security-profiles preserved in response',
    );

    // ════════════════════════════════════════════════════════════════
    // Phase 2: READ (List)
    // ════════════════════════════════════════════════════════════════
    banner('Phase 2: READ — profiles.list()');

    const listResult = await client.profiles.list({ offset: 0, limit: 50 });

    console.log('\n  Response summary:');
    console.log(`    Total profiles: ${listResult.ai_profiles.length}`);
    for (const p of listResult.ai_profiles) {
      console.log(`    - ${p.profile_name} (id=${p.profile_id}, rev=${p.revision})`);
    }

    assert(Array.isArray(listResult.ai_profiles), 'ai_profiles is an array');
    assert(
      listResult.ai_profiles.length === 3,
      `Got 3 profiles (got ${listResult.ai_profiles.length})`,
    );
    assert(
      listResult.ai_profiles[0].profile_name === 'production-guardrails',
      'First profile is production-guardrails',
    );

    // Verify full policy structure is returned
    const prodProfile = listResult.ai_profiles[0];
    const aiProfiles = prodProfile.policy?.['ai-security-profiles'];
    const modelConfig = aiProfiles?.[0]?.['model-configuration'];

    assert(!!modelConfig, 'model-configuration present on listed profile');
    assert(
      modelConfig?.['data-protection']?.['data-leak-detection']?.action === 'block',
      'Deeply nested data-protection.data-leak-detection.action = "block"',
    );
    assert(
      modelConfig?.['model-protection']?.[0]?.options !== undefined,
      'model-protection[0].options field present',
    );

    const dlpProfiles = prodProfile.policy?.['dlp-data-profiles'];
    assert(
      dlpProfiles?.[0]?.description === 'Detects credit card numbers in prompts and responses',
      'dlp-data-profiles[0].description present',
    );

    // ════════════════════════════════════════════════════════════════
    // Phase 3: READ (Get by UUID)
    // ════════════════════════════════════════════════════════════════
    banner('Phase 3: READ — profiles.get(profileId)');

    const byUuid = await client.profiles.get('660e8400-e29b-41d4-a716-446655440001');

    console.log('\n  Response:');
    console.log(JSON.stringify(byUuid, null, 2));

    assert(
      byUuid.profile_id === '660e8400-e29b-41d4-a716-446655440001',
      'Correct profile returned by UUID',
    );
    assert(byUuid.profile_name === 'staging-profile', 'profile_name is staging-profile');
    assert(byUuid.revision === 2, `revision is 2 (got ${byUuid.revision})`);

    // Not-found case
    try {
      await client.profiles.get('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
      fail('Should have thrown for unknown UUID');
    } catch (err) {
      assert(err instanceof AISecSDKException, 'Threw AISecSDKException for unknown UUID');
      assert(
        (err as AISecSDKException).message.includes('Profile not found'),
        'Error message contains "Profile not found"',
      );
    }

    // ════════════════════════════════════════════════════════════════
    // Phase 4: READ (Get by Name)
    // ════════════════════════════════════════════════════════════════
    banner('Phase 4: READ — profiles.getByName(name)');

    const byName = await client.profiles.getByName('staging-profile');

    console.log('\n  Response (highest revision of "staging-profile"):');
    console.log(JSON.stringify(byName, null, 2));

    assert(byName.profile_name === 'staging-profile', 'profile_name matches');
    assert(byName.revision === 5, `Highest revision returned (got ${byName.revision})`);
    assert(
      byName.profile_id === '770e8400-e29b-41d4-a716-446655440002',
      'Correct profile_id for rev 5',
    );

    // Not-found case
    try {
      await client.profiles.getByName('nonexistent');
      fail('Should have thrown for unknown name');
    } catch (err) {
      assert(err instanceof AISecSDKException, 'Threw AISecSDKException for unknown name');
    }

    // ════════════════════════════════════════════════════════════════
    // Phase 5: UPDATE
    // ════════════════════════════════════════════════════════════════
    banner('Phase 5: UPDATE — profiles.update(profileId, request)');

    const updated = await client.profiles.update('550e8400-e29b-41d4-a716-446655440000', {
      profile_name: 'production-guardrails-v2',
      policy: {
        'ai-security-profiles': [
          {
            'model-type': 'default',
            'model-configuration': {
              'mask-data-in-storage': true,
              latency: {
                'inline-timeout-action': 'block',
                'max-inline-latency': 3,
              },
            },
          },
        ],
      },
    });

    console.log('\n  Response:');
    console.log(JSON.stringify(updated, null, 2));

    assert(
      updated.profile_id === '550e8400-e29b-41d4-a716-446655440000',
      'profile_id preserved after update',
    );
    assert(updated.profile_name === 'production-guardrails-v2', 'profile_name updated to v2');
    assert(updated.revision === 2, `revision bumped to 2 (got ${updated.revision})`);

    // Invalid UUID case
    try {
      await client.profiles.update('not-a-uuid', { profile_name: 'bad' });
      fail('Should have thrown for invalid UUID');
    } catch (err) {
      assert(err instanceof AISecSDKException, 'Threw AISecSDKException for invalid UUID');
      assert(
        (err as AISecSDKException).message.includes('Invalid profile_id'),
        'Error mentions "Invalid profile_id"',
      );
    }

    // ════════════════════════════════════════════════════════════════
    // Phase 6: DELETE
    // ════════════════════════════════════════════════════════════════
    banner('Phase 6: DELETE — profiles.delete(profileId)');

    const deleteResult = await client.profiles.delete('660e8400-e29b-41d4-a716-446655440001');

    console.log('\n  Response:');
    console.log(JSON.stringify(deleteResult, null, 2));

    assert(!!deleteResult.message, `Delete returned message: "${deleteResult.message}"`);

    // Invalid UUID case
    try {
      await client.profiles.delete('bad-uuid');
      fail('Should have thrown for invalid UUID');
    } catch (err) {
      assert(
        err instanceof AISecSDKException,
        'Threw AISecSDKException for invalid UUID on delete',
      );
    }

    // ════════════════════════════════════════════════════════════════
    // Phase 7: FORCE DELETE
    // ════════════════════════════════════════════════════════════════
    banner('Phase 7: FORCE DELETE — profiles.forceDelete(profileId, updatedBy)');

    const forceResult = await client.profiles.forceDelete(
      '770e8400-e29b-41d4-a716-446655440002',
      'admin@example.com',
    );

    console.log('\n  Response:');
    console.log(JSON.stringify(forceResult, null, 2));

    assert(!!forceResult.message, `Force-delete returned message: "${forceResult.message}"`);

    // Invalid UUID case
    try {
      await client.profiles.forceDelete('bad-uuid', 'admin@example.com');
      fail('Should have thrown for invalid UUID on force-delete');
    } catch (err) {
      assert(
        err instanceof AISecSDKException,
        'Threw AISecSDKException for invalid UUID on force-delete',
      );
    }

    // ── Summary ──────────────────────────────────────────────────────
    console.log(`\n${'═'.repeat(60)}`);
    console.log('  Validation Complete');
    console.log(`  Duration: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
    console.log(`  Passed: ${passed}  |  Failed: ${failed}`);
    console.log(`  Result: ${failed === 0 ? 'ALL PASSED' : 'FAILED'}`);
    console.log('═'.repeat(60));
  } finally {
    tokenServer.close();
    apiServer.close();
  }
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
