import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Content, init } from '../../src/index.js';
import { globalConfiguration } from '../../src/configuration.js';
import { OAuthClient } from '../../src/management/oauth-client.js';
import { resolveValidator, requestSchemaName } from '../../scripts/openapi/validators.js';
import type { CallSite } from '../../scripts/openapi/inventory.js';
import scan from './fixtures/scan.json';
import management from './fixtures/management.json';
import modelData from './fixtures/model-data.json';
import modelManagement from './fixtures/model-management.json';
import redteamData from './fixtures/redteam-data.json';
import redteamManagement from './fixtures/redteam-management.json';
import networkBroker from './fixtures/network-broker.json';
import gateway from './fixtures/gateway.json';
import gatewayRuntime from './fixtures/gateway-runtime.json';

interface Fixture {
  method: string;
  path: string;
  call: CallSite;
  query: Record<string, unknown>;
  queryWire: Record<string, string[]>;
  body?: unknown;
  responseBody: unknown;
  responseStatus: number;
  responseIsText: boolean;
  runtimeClient?: boolean;
  publicPricingClient?: boolean;
  publicEndpoint?: string;
  publicSecurity?: unknown[];
}
const uuid = '550e8400-e29b-41d4-a716-446655440000';
const camel = (key: string) => key.replace(/_([a-z])/g, (_, char: string) => char.toUpperCase());
const sources = import.meta.glob('../../src/**/*.ts');
let originalConfiguration: object;
beforeEach(() => {
  originalConfiguration = { ...globalConfiguration };
  init({
    apiKey: 'offline-contract-key',
    apiToken: '',
    apiEndpoint: 'https://contract.test',
    numRetries: 0,
  });
  vi.spyOn(OAuthClient.prototype, 'getToken').mockResolvedValue('offline-contract-token');
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Object.assign(globalConfiguration, originalConfiguration);
});

for (const domain of [
  scan,
  management,
  modelData,
  modelManagement,
  redteamData,
  redteamManagement,
  networkBroker,
  gateway,
  gatewayRuntime,
]) {
  describe(`OpenAPI transport: ${domain.source}`, () => {
    it.each(domain.cases as Fixture[])('$method $path → $call.member', async (fixture) => {
      const { call } = fixture;
      const module = (await sources[
        `../../${fixture.runtimeClient ? 'src/ai-gateway/inference-client.ts' : call.source}`
      ]()) as Record<
        string,
        new (options: unknown) => Record<string, (...args: unknown[]) => Promise<unknown>>
      >;
      const Client = module[fixture.runtimeClient ? 'AIGatewayInferenceClient' : call.className!];
      const client = new Client(
        fixture.publicPricingClient
          ? {
              endpoint: fixture.publicEndpoint,
              numRetries: 0,
            }
          : {
              baseUrl: 'https://contract.test',
              endpoint: 'https://contract.test',
              apiKey: 'offline-runtime-key',
              dataEndpoint: 'https://contract.test',
              mgmtEndpoint: 'https://contract.test',
              clientId: 'contract-client',
              clientSecret: 'contract-secret',
              tsgId: '123456',
              auth: { prepare: async (value: unknown) => value },
              numRetries: 0,
            },
      );
      const query = { ...fixture.query };
      // Gateway query options use the documented snake_case keys and reject typos.
      // AIRS legacy clients also expose camelCase aliases and scan body options.
      const options: Record<string, unknown> =
        call.plane === 'gateway' ? { ...query } : { ...query, body: fixture.body };
      if (call.plane !== 'gateway')
        for (const [name, value] of Object.entries(query)) options[camel(name)] = value;
      const pathNames = [...call.path.matchAll(/\{([^}]+)\}/g)].map((m) =>
        m[1].replace(/^encodeURIComponent\((.+)\)$/, '$1'),
      );
      const args = (call.parameters ?? []).map((param) => {
        if (pathNames.includes(param.name)) return uuid;
        if (param.name === 'file')
          return new Blob(['prompt,goal\nhello,reply\n'], { type: 'text/csv' });
        if (param.name === 'body' || /AsyncScanObject/.test(param.type)) return fixture.body;
        if (['opts', 'params', 'options'].includes(param.name)) return options;
        if (param.name === 'format' && query.file_format) return query.file_format;
        const entry = Object.entries(query).find(
          ([name]) => name === param.name || camel(name) === param.name,
        );
        if (entry)
          return param.type === 'string[]' && !Array.isArray(entry[1]) ? [entry[1]] : entry[1];
        if (param.type === 'string') return uuid;
        if (param.type === 'string[]') return [uuid];
        return fixture.body ?? options;
      });
      if (call.member === 'getAccessToken') Object.assign(options, fixture.body);
      if (call.member === 'syncScan') {
        const body = fixture.body as { ai_profile: unknown; contents: Record<string, unknown>[] };
        const content = body.contents[0];
        args[0] = body.ai_profile;
        args[1] = new Content({
          ...content,
          codePrompt: content.code_prompt as string,
          codeResponse: content.code_response as string,
          toolEvent: content.tool_event as never,
        });
        Object.assign(options, body);
      }
      const fetch = vi.fn().mockImplementation(() =>
        Promise.resolve(
          new Response(
            fixture.responseStatus === 204
              ? null
              : fixture.responseIsText
                ? String(fixture.responseBody)
                : JSON.stringify(fixture.responseBody),
            {
              status: fixture.responseStatus,
              headers: {
                'Content-Type': fixture.responseIsText ? 'text/csv' : 'application/json',
              },
            },
          ),
        ),
      );
      vi.stubGlobal('fetch', fetch);
      await client[call.member](...args);
      expect(fetch).toHaveBeenCalledTimes(1);
      const [rawUrl, request] = fetch.mock.calls[0];
      const url = new URL(rawUrl);
      expect(url.pathname).toBe(fixture.path.replace(/\{[^}]+\}/g, uuid));
      expect(request.method).toBe(fixture.method);
      if (call.member === 'uploadPromptsCsv') {
        expect(request.body).toBeInstanceOf(FormData);
        const form = request.body as FormData;
        const file = form.get('file') as File;
        expect(file.name).toBe('prompts.csv');
        expect(await file.text()).toBe('prompt,goal\nhello,reply\n');
        expect([...form.keys()]).toEqual(['file']);
      }
      if (fixture.publicPricingClient) {
        expect(fixture.publicEndpoint).toBe('https://api.portkey.ai');
        expect(url.origin).toBe(fixture.publicEndpoint);
        expect(fixture.publicSecurity).toEqual([]);
        expect(request.redirect).toBe('error');
        for (const header of ['authorization', 'x-tsg-id', 'x-portkey-api-key'])
          expect(new Headers(request.headers).has(header)).toBe(false);
      }
      expect(Object.keys(fixture.queryWire).sort()).toEqual(Object.keys(query).sort());
      for (const [name, values] of Object.entries(fixture.queryWire))
        expect(url.searchParams.getAll(name), `OpenAPI serialization of ${name}`).toEqual(values);
      if (fixture.body && call.member !== 'syncScan' && call.member !== 'getAccessToken') {
        const validator = resolveValidator(requestSchemaName(call));
        expect(JSON.parse(request.body)).toEqual(
          validator ? validator.parse(fixture.body) : fixture.body,
        );
      }
    });
  });
}
