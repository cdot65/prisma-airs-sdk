import { describe, it, expect } from 'vitest';
import {
  MultiTurnStatefulConfigSchema,
  MultiTurnStatelessConfigSchema,
  OpenAIConnectionParamsSchema,
  HuggingfaceConnectionParamsSchema,
  DatabricksConnectionParamsSchema,
  BedrockAccessConnectionParamsSchema,
  RestConnectionParamsSchema,
  StreamingConnectionParamsSchema,
  ConnectionParamsSchema,
} from '../../src/models/red-team.js';

// ---------------------------------------------------------------------------
// MultiTurnStatefulConfig
// ---------------------------------------------------------------------------

describe('MultiTurnStatefulConfigSchema', () => {
  it('parses valid stateful config', () => {
    const input = {
      type: 'stateful',
      response_id_field: 'id',
      request_id_field: 'previous_response_id',
    };
    const result = MultiTurnStatefulConfigSchema.parse(input);
    expect(result.type).toBe('stateful');
    expect(result.response_id_field).toBe('id');
    expect(result.request_id_field).toBe('previous_response_id');
  });

  it('defaults type to stateful', () => {
    const input = {
      response_id_field: 'conversation_id',
      request_id_field: 'session_id',
    };
    const result = MultiTurnStatefulConfigSchema.parse(input);
    expect(result.type).toBe('stateful');
  });

  it('passes through unknown fields', () => {
    const input = {
      type: 'stateful',
      response_id_field: 'id',
      request_id_field: 'prev_id',
      future_field: true,
    };
    const result = MultiTurnStatefulConfigSchema.parse(input);
    expect((result as Record<string, unknown>).future_field).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// MultiTurnStatelessConfig
// ---------------------------------------------------------------------------

describe('MultiTurnStatelessConfigSchema', () => {
  it('parses valid stateless config', () => {
    const input = { type: 'stateless', assistant_role: 'assistant' };
    const result = MultiTurnStatelessConfigSchema.parse(input);
    expect(result.type).toBe('stateless');
    expect(result.assistant_role).toBe('assistant');
  });

  it('defaults type to stateless', () => {
    const result = MultiTurnStatelessConfigSchema.parse({});
    expect(result.type).toBe('stateless');
  });

  it('accepts null assistant_role', () => {
    const result = MultiTurnStatelessConfigSchema.parse({
      type: 'stateless',
      assistant_role: null,
    });
    expect(result.assistant_role).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Provider-specific connection params
// ---------------------------------------------------------------------------

describe('OpenAIConnectionParamsSchema', () => {
  it('parses valid OpenAI params', () => {
    const input = { api_key: 'sk-abc', model_name: 'gpt-4.1-nano' };
    const result = OpenAIConnectionParamsSchema.parse(input);
    expect(result.api_key).toBe('sk-abc');
    expect(result.model_name).toBe('gpt-4.1-nano');
  });

  it('passes through unknown fields', () => {
    const input = { api_key: 'sk-abc', model_name: 'gpt-4', extra: true };
    const result = OpenAIConnectionParamsSchema.parse(input);
    expect((result as Record<string, unknown>).extra).toBe(true);
  });
});

describe('HuggingfaceConnectionParamsSchema', () => {
  it('parses valid Huggingface params', () => {
    const input = { api_key: 'hf-abc', model_name: 'llama-3' };
    const result = HuggingfaceConnectionParamsSchema.parse(input);
    expect(result.api_key).toBe('hf-abc');
    expect(result.model_name).toBe('llama-3');
  });
});

describe('DatabricksConnectionParamsSchema', () => {
  it('parses valid Databricks params', () => {
    const input = {
      auth_type: 'OAUTH',
      workspace_url: 'https://db.example.com',
      model_name: 'my-model',
      client_id: 'cid',
      secret: 'sec',
    };
    const result = DatabricksConnectionParamsSchema.parse(input);
    expect(result.auth_type).toBe('OAUTH');
    expect(result.workspace_url).toBe('https://db.example.com');
  });

  it('accepts ACCESS_TOKEN auth type', () => {
    const input = {
      auth_type: 'ACCESS_TOKEN',
      workspace_url: 'https://db.example.com',
      model_name: 'model',
      access_token: 'tok',
    };
    const result = DatabricksConnectionParamsSchema.parse(input);
    expect(result.auth_type).toBe('ACCESS_TOKEN');
    expect(result.access_token).toBe('tok');
  });
});

describe('BedrockAccessConnectionParamsSchema', () => {
  it('parses valid Bedrock params', () => {
    const input = {
      access_id: 'AKIA...',
      access_secret: 'secret',
      region: 'us-east-1',
      model_id: 'anthropic.claude-3',
    };
    const result = BedrockAccessConnectionParamsSchema.parse(input);
    expect(result.access_id).toBe('AKIA...');
    expect(result.region).toBe('us-east-1');
  });

  it('accepts optional session_token', () => {
    const input = {
      access_id: 'AKIA...',
      access_secret: 'secret',
      region: 'us-east-1',
      model_id: 'model',
      session_token: 'sess-tok',
    };
    const result = BedrockAccessConnectionParamsSchema.parse(input);
    expect(result.session_token).toBe('sess-tok');
  });

  it('accepts null session_token', () => {
    const input = {
      access_id: 'AKIA...',
      access_secret: 'secret',
      region: 'us-east-1',
      model_id: 'model',
      session_token: null,
    };
    const result = BedrockAccessConnectionParamsSchema.parse(input);
    expect(result.session_token).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// RestConnectionParams
// ---------------------------------------------------------------------------

describe('RestConnectionParamsSchema', () => {
  it('parses minimal REST params', () => {
    const input = {};
    const result = RestConnectionParamsSchema.parse(input);
    expect(result).toBeDefined();
  });

  it('parses full REST params', () => {
    const input = {
      api_endpoint: 'https://api.openai.com/v1/responses',
      request_headers: { 'Content-Type': 'application/json' },
      request_json: { model: 'gpt-4' },
      response_json: { content: '{RESPONSE}' },
      response_key: 'content',
      curl: 'curl https://...',
      target_connection_config: { api_key: 'sk-abc', model_name: 'gpt-4' },
      multi_turn_config: {
        type: 'stateful',
        response_id_field: 'id',
        request_id_field: 'prev_id',
      },
    };
    const result = RestConnectionParamsSchema.parse(input);
    expect(result.api_endpoint).toBe('https://api.openai.com/v1/responses');
    expect(result.response_key).toBe('content');
  });

  it('accepts null fields', () => {
    const input = {
      api_endpoint: null,
      curl: null,
      target_connection_config: null,
      multi_turn_config: null,
    };
    const result = RestConnectionParamsSchema.parse(input);
    expect(result.api_endpoint).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// StreamingConnectionParams
// ---------------------------------------------------------------------------

describe('StreamingConnectionParamsSchema', () => {
  it('parses valid streaming params', () => {
    const input = {
      api_endpoint: 'https://api.openai.com/v1/responses',
      response_stop_key: 'type',
      response_stop_value: 'response.completed',
    };
    const result = StreamingConnectionParamsSchema.parse(input);
    expect(result.response_stop_key).toBe('type');
    expect(result.response_stop_value).toBe('response.completed');
  });

  it('requires response_stop_key and response_stop_value', () => {
    expect(() => StreamingConnectionParamsSchema.parse({})).toThrow();
  });
});

// ---------------------------------------------------------------------------
// ConnectionParams (union)
// ---------------------------------------------------------------------------

describe('ConnectionParamsSchema', () => {
  it('parses REST connection params', () => {
    const input = {
      api_endpoint: 'https://example.com/api',
      response_key: 'content',
    };
    const result = ConnectionParamsSchema.parse(input);
    expect(result.api_endpoint).toBe('https://example.com/api');
  });

  it('parses streaming connection params', () => {
    const input = {
      api_endpoint: 'https://example.com/api',
      response_stop_key: 'type',
      response_stop_value: 'done',
    };
    const result = ConnectionParamsSchema.parse(input);
    expect((result as Record<string, unknown>).response_stop_key).toBe('type');
  });
});
