/**
 * Red Team Management API — E2E Validation Script
 *
 * Validates typed schemas, validate param, uploadPromptsCsv, and CRUD operations
 * against a local mock server. No real credentials needed.
 *
 * Usage: npx tsx examples/red-team-mgmt-validation.ts
 */

import * as http from 'node:http';
import {
  // Typed schemas
  MultiTurnStatefulConfigSchema,
  MultiTurnStatelessConfigSchema,
  OpenAIConnectionParamsSchema,
  HuggingfaceConnectionParamsSchema,
  DatabricksConnectionParamsSchema,
  BedrockAccessConnectionParamsSchema,
  RestConnectionParamsSchema,
  StreamingConnectionParamsSchema,
  ConnectionParamsSchema,
  TargetBackgroundSchema,
  TargetAdditionalContextSchema,
  TargetMetadataSchema,
  PromptSetStatsSchema,
  CustomPromptSetVersionInfoSchema,
} from '../src/models/red-team.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string): void {
  if (condition) {
    passed++;
    console.log(`  ✅ ${label}`);
  } else {
    failed++;
    console.log(`  ❌ ${label}`);
  }
}

// ---------------------------------------------------------------------------
// Phase 1: Schema validation
// ---------------------------------------------------------------------------

console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log('║  Red Team Management API — Schema Validation               ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

console.log('Phase 1: Multi-turn configuration schemas');
console.log('─'.repeat(50));

const stateful = MultiTurnStatefulConfigSchema.parse({
  response_id_field: 'id',
  request_id_field: 'previous_response_id',
});
assert(stateful.type === 'stateful', 'Stateful config defaults type to "stateful"');
assert(stateful.response_id_field === 'id', 'Stateful response_id_field parsed');
assert(stateful.request_id_field === 'previous_response_id', 'Stateful request_id_field parsed');

const stateless = MultiTurnStatelessConfigSchema.parse({
  assistant_role: 'assistant',
});
assert(stateless.type === 'stateless', 'Stateless config defaults type to "stateless"');
assert(stateless.assistant_role === 'assistant', 'Stateless assistant_role parsed');

const statelessNull = MultiTurnStatelessConfigSchema.parse({
  assistant_role: null,
});
assert(statelessNull.assistant_role === null, 'Stateless accepts null assistant_role');

console.log('\nPhase 2: Provider connection parameter schemas');
console.log('─'.repeat(50));

const openai = OpenAIConnectionParamsSchema.parse({
  api_key: 'sk-test123',
  model_name: 'gpt-4.1-nano',
});
assert(openai.api_key === 'sk-test123', 'OpenAI api_key parsed');
assert(openai.model_name === 'gpt-4.1-nano', 'OpenAI model_name parsed');

const hf = HuggingfaceConnectionParamsSchema.parse({
  api_key: 'hf-test',
  model_name: 'llama-3',
});
assert(hf.api_key === 'hf-test', 'HuggingFace api_key parsed');

const databricks = DatabricksConnectionParamsSchema.parse({
  auth_type: 'OAUTH',
  workspace_url: 'https://db.example.com',
  model_name: 'my-model',
  client_id: 'cid',
  secret: 'sec',
});
assert(databricks.auth_type === 'OAUTH', 'Databricks auth_type parsed');
assert(databricks.workspace_url === 'https://db.example.com', 'Databricks workspace_url parsed');

const bedrock = BedrockAccessConnectionParamsSchema.parse({
  access_id: 'AKIAIOSFODNN7EXAMPLE',
  access_secret: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
  region: 'us-east-1',
  model_id: 'anthropic.claude-3-5-sonnet',
  session_token: null,
});
assert(bedrock.region === 'us-east-1', 'Bedrock region parsed');
assert(bedrock.session_token === null, 'Bedrock accepts null session_token');

console.log('\nPhase 3: REST & Streaming connection schemas');
console.log('─'.repeat(50));

const rest = RestConnectionParamsSchema.parse({
  api_endpoint: 'https://api.openai.com/v1/responses',
  request_headers: { 'Content-Type': 'application/json' },
  request_json: { model: 'gpt-4', input: [{ role: 'user', content: '{INPUT}' }] },
  response_key: 'output[0].content[0].text',
  target_connection_config: { api_key: 'sk-xxx', model_name: 'gpt-4' },
  multi_turn_config: { type: 'stateful', response_id_field: 'id', request_id_field: 'prev_id' },
});
assert(rest.api_endpoint === 'https://api.openai.com/v1/responses', 'REST api_endpoint parsed');
assert(rest.response_key === 'output[0].content[0].text', 'REST response_key parsed');

const streaming = StreamingConnectionParamsSchema.parse({
  api_endpoint: 'https://api.openai.com/v1/responses',
  response_stop_key: 'type',
  response_stop_value: 'response.completed',
});
assert(streaming.response_stop_key === 'type', 'Streaming response_stop_key parsed');
assert(
  streaming.response_stop_value === 'response.completed',
  'Streaming response_stop_value parsed',
);

const connRest = ConnectionParamsSchema.parse({
  api_endpoint: 'https://example.com/api',
  response_key: 'content',
});
assert(connRest.api_endpoint === 'https://example.com/api', 'ConnectionParams union: REST variant');

const connStream = ConnectionParamsSchema.parse({
  api_endpoint: 'https://example.com/api',
  response_stop_key: 'event',
  response_stop_value: 'done',
});
assert(
  (connStream as Record<string, unknown>).response_stop_key === 'event',
  'ConnectionParams union: Streaming variant',
);

console.log('\nPhase 4: Typed context schemas');
console.log('─'.repeat(50));

const bg = TargetBackgroundSchema.parse({
  industry: 'Healthcare',
  use_case: 'Patient Support Chatbot',
  competitors: ['MedBot', 'HealthAI'],
});
assert(bg.industry === 'Healthcare', 'TargetBackground.industry is string');
assert(Array.isArray(bg.competitors), 'TargetBackground.competitors is string[]');
assert(bg.competitors!.length === 2, 'TargetBackground.competitors has 2 items');

const ctx = TargetAdditionalContextSchema.parse({
  base_model: 'GPT-4',
  system_prompt: 'You are a medical assistant',
  languages_supported: ['en', 'es', 'fr'],
  banned_keywords: ['ignore previous instructions'],
  tools_accessible: ['search_medical_db', 'schedule_appointment'],
});
assert(ctx.base_model === 'GPT-4', 'AdditionalContext.base_model is string');
assert(ctx.languages_supported!.length === 3, 'AdditionalContext.languages_supported has 3 items');

const meta = TargetMetadataSchema.parse({
  multi_turn: true,
  rate_limit: 60,
  rate_limit_enabled: true,
  rate_limit_error_code: 429,
  rate_limit_error_json: { error: 'rate limited' },
  content_filter_enabled: true,
  content_filter_error_code: 400,
  content_filter_error_json: { error: 'filtered' },
  probe_message: 'Hello',
  request_timeout: 30,
});
assert(meta.rate_limit === 60, 'TargetMetadata.rate_limit is number');
assert(
  typeof meta.rate_limit_error_json === 'object',
  'TargetMetadata.rate_limit_error_json is object',
);

console.log('\nPhase 5: PromptSetStats & VersionInfo typed schemas');
console.log('─'.repeat(50));

const stats = PromptSetStatsSchema.parse({
  total_prompts: 100,
  active_prompts: 80,
  inactive_prompts: 15,
  failed_prompts: 3,
  validation_prompts: 2,
});
assert(stats.total_prompts === 100, 'PromptSetStats.total_prompts parsed');
assert(stats.failed_prompts === 3, 'PromptSetStats.failed_prompts parsed');

const versionInfo = CustomPromptSetVersionInfoSchema.parse({
  uuid: '550e8400-e29b-41d4-a716-446655440000',
  status: 'ready',
  is_latest: true,
  version: 'gen-12345',
  stats: { total_prompts: 50, active_prompts: 45, inactive_prompts: 5 },
  snapshot_created_at: '2026-03-08T10:00:00Z',
});
assert(versionInfo.stats?.total_prompts === 50, 'VersionInfo.stats is typed PromptSetStats');
assert(
  versionInfo.snapshot_created_at === '2026-03-08T10:00:00Z',
  'VersionInfo.snapshot_created_at is string',
);

// ---------------------------------------------------------------------------
// Phase 6: Mock server for client operations
// ---------------------------------------------------------------------------

console.log('\nPhase 6: Client operations (validate param, CSV upload)');
console.log('─'.repeat(50));

const validUuid = '550e8400-e29b-41d4-a716-446655440000';
const requests: { url: string; method: string; contentType?: string }[] = [];

const server = http.createServer((req, res) => {
  const url = req.url ?? '';
  const method = req.method ?? '';
  const contentType = req.headers['content-type'] ?? '';
  requests.push({ url, method, contentType });

  // Mock token endpoint
  if (url.includes('/oauth2/access_token')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ access_token: 'mock-token', expires_in: 3600 }));
    return;
  }

  // Mock target create/update with validate param
  if (url.includes('/v1/target') && !url.includes('upload')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        uuid: validUuid,
        tsg_id: '123',
        name: 'test-target',
        status: 'VALIDATED',
        active: true,
        validated: true,
        created_at: '2026-03-08T10:00:00Z',
        updated_at: '2026-03-08T10:00:00Z',
      }),
    );
    return;
  }

  // Mock CSV upload
  if (url.includes('/upload-custom-prompts-csv')) {
    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Uploaded 5 prompts', status: 201 }));
    return;
  }

  res.writeHead(404);
  res.end();
});

await new Promise<void>((resolve) => server.listen(0, resolve));
const port = (server.address() as { port: number }).port;

// Dynamic import of client classes
const { RedTeamClient } = await import('../src/red-team/client.js');

const client = new RedTeamClient({
  clientId: 'test-id',
  clientSecret: 'test-secret',
  tsgId: '123456',
  mgmtEndpoint: `http://localhost:${port}`,
  tokenEndpoint: `http://localhost:${port}/oauth2/access_token`,
});

// Test validate param on create
requests.length = 0;
await client.targets.create({ name: 'test-target' }, { validate: true });
assert(
  requests.some((r) => r.url.includes('validate=true')),
  'create() passes validate=true query param',
);

// Test validate param on update
requests.length = 0;
await client.targets.update(validUuid, { name: 'updated' }, { validate: false });
assert(
  requests.some((r) => r.url.includes('validate=false')),
  'update() passes validate=false query param',
);

// Test no validate param when omitted
requests.length = 0;
await client.targets.create({ name: 'no-validate' });
assert(
  !requests.some((r) => r.url.includes('validate')),
  'create() omits validate param when not specified',
);

// Test CSV upload
requests.length = 0;
const csvContent = 'prompt,goal\n"Inject system prompt","Extract secrets"';
const csvBlob = new Blob([csvContent], { type: 'text/csv' });
const uploadResult = await client.customAttacks.uploadPromptsCsv(validUuid, csvBlob);
assert(uploadResult.message === 'Uploaded 5 prompts', 'uploadPromptsCsv returns parsed response');
assert(
  requests.some((r) => r.url.includes('upload-custom-prompts-csv')),
  'uploadPromptsCsv hits correct endpoint',
);
assert(
  requests.some((r) => r.url.includes(`prompt_set_uuid=${validUuid}`)),
  'uploadPromptsCsv passes prompt_set_uuid query param',
);
assert(
  requests.some((r) => r.contentType?.includes('multipart/form-data')),
  'uploadPromptsCsv sends multipart/form-data',
);

server.close();

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log('\n' + '═'.repeat(60));
console.log(`  Total: ${passed + failed}  |  Passed: ${passed}  |  Failed: ${failed}`);
console.log('═'.repeat(60));

if (failed > 0) {
  process.exit(1);
}
