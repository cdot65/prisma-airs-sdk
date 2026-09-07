/** @internal Read-only authoring-route hypotheses on the explicit runtime endpoint. */
import assert from 'node:assert/strict';
import { AISecSDKException, ErrorType } from '../src/index.js';
import { runtimeSuite } from './e2e/gateway-runtime.js';
import { writePrivateReport } from './e2e/harness.js';

const observations: {
  path: string;
  providerHeader: boolean;
  status: number;
  successful: boolean;
  missingProviderOrConfig: boolean;
  invalidProviderUrl: boolean;
}[] = [];

await runtimeSuite(
  'gateway-runtime-authoring',
  async ({ harness, endpoint, apiKey, workspaceId }) => {
    assert.equal(endpoint, 'https://airs.cdot.io/v1');
    async function get(path: string, query: Record<string, string> = {}, provider = false) {
      const url = new URL(endpoint + path);
      for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
      const response = await fetch(url, {
        headers: {
          'x-portkey-api-key': apiKey,
          Accept: 'application/json',
          ...(provider ? { 'x-portkey-provider': '@openai' } : {}),
        },
        redirect: 'error',
        signal: AbortSignal.timeout(15_000),
      });
      const text = await response.text();
      let body: unknown = text;
      try {
        body = JSON.parse(text);
      } catch {
        /* Keep only structural evidence. */
      }
      harness.protect(body);
      if (['/collections', '/labels', '/prompts', '/prompts/partials'].includes(path)) {
        const object = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
        const error =
          object.error && typeof object.error === 'object'
            ? (object.error as Record<string, unknown>)
            : {};
        const observation = {
          path,
          providerHeader: provider,
          status: response.status,
          successful: response.ok,
          missingProviderOrConfig:
            object.message === 'Either x-portkey-config or x-portkey-provider header is required',
          invalidProviderUrl:
            typeof error.message === 'string' && error.message.startsWith('Invalid URL (GET /v1/'),
        };
        observations.push(observation);
        writePrivateReport('artifacts/e2e/gateway-authoring-boundary.json', {
          checkedAt: new Date().toISOString(),
          startedAt: harness.startedAt,
          disclosure:
            'GET-only authoring hypotheses with and without the prescribed @openai provider header. Allowlisted error predicates only; no raw error messages, resource IDs or credentials retained. HTTP failures remain failed workflow checks. Adding a provider header tests the provider-proxy boundary, not Portkey authoring support.',
          observations,
        });
      }
      if (!response.ok) {
        harness.captureResponseShape(`runtime-authoring.error.${path}`, body);
        throw new AISecSDKException(
          'Runtime authoring discovery did not return a successful contract',
          response.status >= 500 ? ErrorType.SERVER_SIDE_ERROR : ErrorType.CLIENT_SIDE_ERROR,
          { statusCode: response.status, failureKind: 'http' },
        );
      }
      return body;
    }
    const control = await harness.check('runtime-authoring.model-auth-control', async () => {
      const value = await get('/models/gpt-5.6-terra', {}, true);
      assert(value && typeof value === 'object' && 'id' in value);
      assert.equal(value.id, 'gpt-5.6-terra');
      return true;
    });
    assert(control, 'Runtime authentication control must pass before probing authoring routes');
    for (const path of ['/collections', '/labels', '/prompts', '/prompts/partials']) {
      // The pinned partial-list contract has no workspace filter. Collection-list requires one.
      const modes =
        path === '/prompts/partials'
          ? ['none']
          : path === '/collections'
            ? ['id', 'slug']
            : ['id', 'slug', 'none'];
      for (const mode of modes) {
        await harness.check(
          `runtime-authoring.${path.slice(1).replaceAll('/', '.')}.${mode}`,
          async () => {
            const query: Record<string, string> = {};
            if (mode !== 'none')
              query.workspace_id = mode === 'id' ? workspaceId : 'ws-develo-71f8d8';
            if (path !== '/prompts/partials') {
              query.current_page = '0';
              query.page_size = '1';
            }
            const value = await get(path, query);
            if (path === '/prompts/partials') assert(Array.isArray(value));
            else {
              assert(value && typeof value === 'object' && 'data' in value && 'total' in value);
              assert(Array.isArray(value.data));
              assert(Number.isInteger(value.total) && Number(value.total) >= 0);
            }
            return value;
          },
        );
      }
      await harness.check(
        `runtime-authoring.${path.slice(1).replaceAll('/', '.')}.provider-boundary`,
        async () => get(path, path === '/collections' ? { workspace_id: workspaceId } : {}, true),
      );
    }
  },
);
