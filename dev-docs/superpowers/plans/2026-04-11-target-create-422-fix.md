# Fix Target Create/Update 422 — OpenAPI Schema Alignment

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align `TargetCreateRequestSchema`, `TargetUpdateRequestSchema`, and `TargetProbeRequestSchema` with the AIRS Red Team management-plane OpenAPI spec so that `targets.create()` and `targets.update()` stop returning 422.

**Architecture:** Replace `z.unknown()` fields in request schemas with proper typed Zod schemas matching the API's `additionalProperties: false` constraint. Remove `auth_type`/`auth_config` from request schemas (not in API). Use `.strict()` on request schemas. Keep response schemas with `.passthrough()` for forward compat. Remove `WEBSOCKET` from `ResponseMode` enum (not in API's create/update path).

**Tech Stack:** TypeScript, Zod, Vitest

---

## File Map

| File                                   | Action | Responsibility                                                                                                   |
| -------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------- |
| `src/models/red-team-enums.ts`         | Modify | Remove `WEBSOCKET` from `ResponseMode`                                                                           |
| `src/models/red-team.ts`               | Modify | Retype `TargetCreateRequestSchema`, `TargetUpdateRequestSchema`, `TargetProbeRequestSchema`; extract shared base |
| `test/models/red-team.spec.ts`         | Modify | Update target request schema tests; remove auth_type/auth_config create tests; add strict-mode rejection tests   |
| `test/models/red-team-enums.spec.ts`   | Modify | Update `ResponseMode` enum test                                                                                  |
| `test/red-team/targets-client.spec.ts` | Modify | Add test verifying request body shape sent by `create()`                                                         |

---

### Task 1: Update `ResponseMode` enum

**Files:**

- Modify: `src/models/red-team-enums.ts:200-206`
- Modify: `test/models/red-team-enums.spec.ts`

- [ ] **Step 1: Write failing test — `ResponseMode` should not include WEBSOCKET**

In `test/models/red-team-enums.spec.ts`, find the `ResponseMode` test block and update to assert only REST and STREAMING:

```typescript
describe('ResponseMode', () => {
  it('has REST and STREAMING values', () => {
    expect(ResponseMode.REST).toBe('REST');
    expect(ResponseMode.STREAMING).toBe('STREAMING');
  });

  it('has exactly 2 members', () => {
    expect(Object.keys(ResponseMode)).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/models/red-team-enums.spec.ts -t "ResponseMode"`
Expected: FAIL — `Object.keys(ResponseMode)` has length 3 (includes WEBSOCKET)

- [ ] **Step 3: Remove WEBSOCKET from ResponseMode**

In `src/models/red-team-enums.ts:200-206`, change to:

```typescript
/** Target response mode. */
export const ResponseMode = {
  REST: 'REST',
  STREAMING: 'STREAMING',
} as const;
export type ResponseMode = (typeof ResponseMode)[keyof typeof ResponseMode];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/models/red-team-enums.spec.ts -t "ResponseMode"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/models/red-team-enums.ts test/models/red-team-enums.spec.ts
git commit -m "fix: remove WEBSOCKET from ResponseMode enum (not in mgmt-plane API)"
```

---

### Task 2: Retype `TargetCreateRequestSchema`

**Files:**

- Modify: `src/models/red-team.ts:1037-1056`

- [ ] **Step 1: Write failing tests for strict typing**

In `test/models/red-team.spec.ts`, replace the existing `TargetCreateRequestSchema` describe block and the `TargetCreateRequestSchema (auth fields)` describe block with:

```typescript
describe('TargetCreateRequestSchema', () => {
  it('parses minimal request (name only)', () => {
    const parsed = TargetCreateRequestSchema.parse({ name: 'my-target' });
    expect(parsed.name).toBe('my-target');
  });

  it('parses full request with typed fields', () => {
    const req = {
      name: 'my-target',
      description: 'A test target',
      target_type: 'APPLICATION',
      connection_type: 'CUSTOM',
      api_endpoint_type: 'PUBLIC',
      response_mode: 'REST',
      session_supported: true,
      target_metadata: { probe_message: 'hello' },
      target_background: { industry: 'finance' },
      additional_context: { base_model: 'gpt-4' },
      extra_info: { custom_key: 'custom_value' },
      connection_params: {
        api_endpoint: 'https://api.example.com/v1/chat',
        request_headers: { 'Content-Type': 'application/json' },
        request_json: { model: 'gpt-4' },
        response_json: { content: '{RESPONSE}' },
        response_key: 'content',
      },
      network_broker_channel_uuid: validUuid,
    };
    const parsed = TargetCreateRequestSchema.parse(req);
    expect(parsed.session_supported).toBe(true);
    expect(parsed.target_type).toBe('APPLICATION');
    expect(parsed.connection_type).toBe('CUSTOM');
  });

  it('rejects unknown fields (strict mode)', () => {
    expect(() => TargetCreateRequestSchema.parse({ name: 'x', auth_type: 'HEADERS' })).toThrow();
  });

  it('rejects unknown fields like auth_config', () => {
    expect(() => TargetCreateRequestSchema.parse({ name: 'x', auth_config: {} })).toThrow();
  });

  it('accepts null for nullable fields', () => {
    const parsed = TargetCreateRequestSchema.parse({
      name: 'test',
      description: null,
      target_type: null,
      connection_type: null,
      api_endpoint_type: null,
      response_mode: null,
      connection_params: null,
      target_background: null,
      additional_context: null,
      extra_info: null,
      network_broker_channel_uuid: null,
    });
    expect(parsed.description).toBeNull();
    expect(parsed.target_type).toBeNull();
  });

  it('rejects missing name', () => {
    expect(() => TargetCreateRequestSchema.parse({})).toThrow();
  });

  it('accepts streaming connection params with stop fields', () => {
    const parsed = TargetCreateRequestSchema.parse({
      name: 'streaming-target',
      connection_params: {
        api_endpoint: 'https://api.example.com/v1/stream',
        response_stop_key: 'done',
        response_stop_value: 'true',
      },
    });
    expect(parsed.connection_params).toBeDefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run test/models/red-team.spec.ts -t "TargetCreateRequestSchema"`
Expected: FAIL — strict rejection tests fail (current schema uses `.passthrough()`)

- [ ] **Step 3: Update `TargetCreateRequestSchema` in `src/models/red-team.ts`**

Replace lines 1037-1056 with:

```typescript
/** Shared base fields for target create, update, and probe requests. */
const TargetRequestBaseFields = {
  name: z.string(),
  description: z.string().nullable().optional(),
  target_type: z.string().nullable().optional(),
  connection_type: z.string().nullable().optional(),
  api_endpoint_type: z.string().nullable().optional(),
  response_mode: z.string().nullable().optional(),
  connection_params: z
    .union([RestConnectionParamsSchema, StreamingConnectionParamsSchema])
    .nullable()
    .optional(),
  session_supported: z.boolean().optional().default(false),
  target_metadata: TargetMetadataSchema.optional(),
  target_background: TargetBackgroundSchema.nullable().optional(),
  additional_context: TargetAdditionalContextSchema.nullable().optional(),
  extra_info: z.record(z.unknown()).nullable().optional(),
  network_broker_channel_uuid: z.string().nullable().optional(),
} as const;

export const TargetCreateRequestSchema = z.object(TargetRequestBaseFields).strict();
export type TargetCreateRequest = z.infer<typeof TargetCreateRequestSchema>;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run test/models/red-team.spec.ts -t "TargetCreateRequestSchema"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/models/red-team.ts test/models/red-team.spec.ts
git commit -m "fix: retype TargetCreateRequestSchema — remove auth fields, use strict mode"
```

---

### Task 3: Retype `TargetUpdateRequestSchema`

**Files:**

- Modify: `src/models/red-team.ts:1058-1077`
- Modify: `test/models/red-team.spec.ts`

- [ ] **Step 1: Write failing tests**

Add or update in `test/models/red-team.spec.ts`:

```typescript
describe('TargetUpdateRequestSchema', () => {
  it('parses minimal request (name only)', () => {
    const parsed = TargetUpdateRequestSchema.parse({ name: 'updated-target' });
    expect(parsed.name).toBe('updated-target');
  });

  it('parses full request with typed fields', () => {
    const req = {
      name: 'updated-target',
      description: 'Updated description',
      target_type: 'AGENT',
      connection_type: 'OPENAI',
      api_endpoint_type: 'PUBLIC',
      response_mode: 'REST',
      session_supported: false,
      target_metadata: { rate_limit_enabled: true },
      target_background: { industry: 'healthcare' },
      additional_context: { system_prompt: 'You are helpful.' },
      extra_info: { key: 'val' },
      connection_params: {
        api_endpoint: 'https://api.example.com/v1/chat',
      },
      network_broker_channel_uuid: null,
    };
    const parsed = TargetUpdateRequestSchema.parse(req);
    expect(parsed.target_type).toBe('AGENT');
  });

  it('rejects unknown fields (strict mode)', () => {
    expect(() => TargetUpdateRequestSchema.parse({ name: 'x', auth_type: 'HEADERS' })).toThrow();
  });

  it('rejects missing name', () => {
    expect(() => TargetUpdateRequestSchema.parse({})).toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run test/models/red-team.spec.ts -t "TargetUpdateRequestSchema"`
Expected: FAIL

- [ ] **Step 3: Update `TargetUpdateRequestSchema`**

Replace lines 1058-1077 with:

```typescript
export const TargetUpdateRequestSchema = z.object(TargetRequestBaseFields).strict();
export type TargetUpdateRequest = z.infer<typeof TargetUpdateRequestSchema>;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run test/models/red-team.spec.ts -t "TargetUpdateRequestSchema"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/models/red-team.ts test/models/red-team.spec.ts
git commit -m "fix: retype TargetUpdateRequestSchema — share base fields, strict mode"
```

---

### Task 4: Retype `TargetProbeRequestSchema`

**Files:**

- Modify: `src/models/red-team.ts:1148-1169`
- Modify: `test/models/red-team.spec.ts`

- [ ] **Step 1: Write failing tests**

Add in `test/models/red-team.spec.ts`:

```typescript
describe('TargetProbeRequestSchema', () => {
  it('parses minimal probe request', () => {
    const parsed = TargetProbeRequestSchema.parse({ name: 'probe-target' });
    expect(parsed.name).toBe('probe-target');
  });

  it('parses with uuid and probe_fields', () => {
    const parsed = TargetProbeRequestSchema.parse({
      name: 'probe-target',
      uuid: validUuid,
      probe_fields: ['industry', 'use_case', 'base_model'],
    });
    expect(parsed.uuid).toBe(validUuid);
    expect(parsed.probe_fields).toHaveLength(3);
  });

  it('rejects unknown fields (strict mode)', () => {
    expect(() => TargetProbeRequestSchema.parse({ name: 'x', auth_type: 'HEADERS' })).toThrow();
  });

  it('rejects missing name', () => {
    expect(() => TargetProbeRequestSchema.parse({})).toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run test/models/red-team.spec.ts -t "TargetProbeRequestSchema"`
Expected: FAIL

- [ ] **Step 3: Update `TargetProbeRequestSchema`**

Replace lines 1148-1169 with:

```typescript
export const TargetProbeRequestSchema = z
  .object({
    ...TargetRequestBaseFields,
    uuid: z.string().nullable().optional(),
    probe_fields: z.array(z.string()).nullable().optional(),
  })
  .strict();
export type TargetProbeRequest = z.infer<typeof TargetProbeRequestSchema>;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run test/models/red-team.spec.ts -t "TargetProbeRequestSchema"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/models/red-team.ts test/models/red-team.spec.ts
git commit -m "fix: retype TargetProbeRequestSchema — strict mode, no auth fields"
```

---

### Task 5: Update `TargetContextUpdateSchema` typing

**Files:**

- Modify: `src/models/red-team.ts:1079-1085`
- Modify: `test/models/red-team.spec.ts`

- [ ] **Step 1: Write test**

Add in `test/models/red-team.spec.ts`:

```typescript
describe('TargetContextUpdateSchema', () => {
  it('parses with typed background and context', () => {
    const parsed = TargetContextUpdateSchema.parse({
      target_background: { industry: 'finance', use_case: 'chatbot' },
      additional_context: { base_model: 'gpt-4', system_prompt: 'Be helpful.' },
    });
    expect(parsed.target_background).toBeDefined();
    expect(parsed.additional_context).toBeDefined();
  });

  it('accepts null values', () => {
    const parsed = TargetContextUpdateSchema.parse({
      target_background: null,
      additional_context: null,
    });
    expect(parsed.target_background).toBeNull();
  });

  it('parses empty object', () => {
    const parsed = TargetContextUpdateSchema.parse({});
    expect(parsed.target_background).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run test/models/red-team.spec.ts -t "TargetContextUpdateSchema"`
Expected: PASS (schema already accepts these shapes; this task adds explicit types)

- [ ] **Step 3: Update schema**

Replace lines 1079-1085 with:

```typescript
export const TargetContextUpdateSchema = z
  .object({
    target_background: TargetBackgroundSchema.nullable().optional(),
    additional_context: TargetAdditionalContextSchema.nullable().optional(),
  })
  .passthrough();
export type TargetContextUpdate = z.infer<typeof TargetContextUpdateSchema>;
```

- [ ] **Step 4: Run tests to confirm pass**

Run: `npx vitest run test/models/red-team.spec.ts -t "TargetContextUpdateSchema"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/models/red-team.ts test/models/red-team.spec.ts
git commit -m "fix: type TargetContextUpdateSchema with proper background/context schemas"
```

---

### Task 6: Verify client sends correct body shape

**Files:**

- Modify: `test/red-team/targets-client.spec.ts`

- [ ] **Step 1: Add test verifying create body has no extra fields**

Add to the `create` describe block in `test/red-team/targets-client.spec.ts`:

```typescript
it('sends only the fields in the request body (no extra SDK fields)', async () => {
  mockFetch({ uuid: validUuid, name: 'test' }, 201);
  await client.create({
    name: 'test-target',
    target_type: 'APPLICATION',
    connection_type: 'CUSTOM',
    api_endpoint_type: 'PUBLIC',
    response_mode: 'REST',
    connection_params: {
      api_endpoint: 'https://api.example.com/v1/chat',
      request_headers: { 'Content-Type': 'application/json' },
      request_json: { model: 'gpt-4' },
      response_json: { content: '{RESPONSE}' },
      response_key: 'content',
    },
  });

  const [, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
  const body = JSON.parse(init.body);
  expect(body).not.toHaveProperty('auth_type');
  expect(body).not.toHaveProperty('auth_config');
  expect(body.name).toBe('test-target');
  expect(body.target_type).toBe('APPLICATION');
  expect(body.connection_params.api_endpoint).toBe('https://api.example.com/v1/chat');
});
```

- [ ] **Step 2: Add test verifying update body has no extra fields**

Add to the `update` describe block:

```typescript
it('sends only the fields in the request body (no extra SDK fields)', async () => {
  mockFetch({ uuid: validUuid, name: 'updated' });
  await client.update(validUuid, {
    name: 'updated',
    target_type: 'AGENT',
    response_mode: 'REST',
  });

  const [, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
  const body = JSON.parse(init.body);
  expect(body).not.toHaveProperty('auth_type');
  expect(body).not.toHaveProperty('auth_config');
  expect(body.name).toBe('updated');
  expect(body.target_type).toBe('AGENT');
});
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run test/red-team/targets-client.spec.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add test/red-team/targets-client.spec.ts
git commit -m "test: verify target create/update body shape matches API expectations"
```

---

### Task 7: Full test suite + typecheck

**Files:** None (validation only)

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass. If any tests fail due to the removed `auth_type`/`auth_config` fields or the strict schemas, fix them.

Known tests to update:

- `test/models/red-team.spec.ts` line ~716-719: the "passes through unknown fields" test for `TargetCreateRequestSchema` should now expect rejection (already handled in Task 2's replacement tests)
- `test/models/red-team.spec.ts` lines ~1183-1198: the "auth fields" describe block should be removed entirely (already handled in Task 2)

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit`
Expected: No type errors. If any downstream code references `auth_type`/`auth_config` on `TargetCreateRequest` or `TargetUpdateRequest`, the compiler will catch it.

- [ ] **Step 3: Run lint + format**

Run: `npm run lint && npm run format:check`
Expected: PASS

- [ ] **Step 4: Commit any fixups**

```bash
git add -A
git commit -m "fix: resolve remaining test/type issues from target schema alignment"
```

---

## Unresolved Questions

- `TargetAuthValidationRequest` still uses `auth_type`/`auth_config` — correct per OpenAPI spec (`/v1/target/validate-auth` is a separate endpoint). No change needed.
- `WebSocketConnectionParamsSchema` still exists in `red-team.ts` for response parsing. Keep it? Response schemas use `.passthrough()` so it won't break anything, but it's now only useful for reading existing WebSocket targets. Leave as-is for now.
- `TargetConnectionType` enum still has `WEBSOCKET` — the API's `TargetConnectionType` does NOT include it. Consider removing in a follow-up. Left out of this plan to minimize blast radius since it's an enum used in responses too.
