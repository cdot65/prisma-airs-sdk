#!/usr/bin/env tsx
/**
 * @internal
 * AI Gateway — workspace CRUD from the command line.
 *
 * A thin CLI over `gw.workspaces.*`. Every call goes through the shipped SDK surface; this script
 * holds no endpoint knowledge of its own.
 *
 * Two things about workspaces that catch people out, both handled here:
 *
 * 1. **The default list hides rows twice over.** `list()` returns only *active* workspaces, and
 *    only those your service account holds a workspace-scope grant on. `list --all` widens both
 *    (admin plane, no status filter) by merging an active and an archived admin-plane read.
 * 2. **Delete archives, it does not destroy.** The workspace disappears from the default list but
 *    remains under `--status archived`. There is no hard delete.
 *
 * VERIFICATION STATUS (revalidated 2026-09-06):
 *   list / get      VERIFIED, including the status filter, admin-plane routing, and slug refs.
 *   create          The 2026-09-06 HTTP 400 AB01 was a missing prerequisite: --scope-name must name
 *                   an IAM scope that already exists (gw.iamScopes.create). Prefer
 *                   gw.workspaces.provision(), which creates the scope, the workspace, and the
 *                   scope→slug binding in SCM's own order (captured 2026-09-11).
 *   update/delete   Historical behavior is documented in the client; no new workspace was created
 *                   during this review, so its owned lifecycle could not be revalidated.
 *                   Use --dry-run first. Do not mutate an existing workspace to bypass this limit.
 *
 * Requires PANW_AI_GW_* in the environment, falling back to PANW_MGMT_*. Writes and `--plane admin`
 * need a tenant-root admin role; a workspace-scoped role alone yields 403.
 *
 * Usage:
 *   set -a && source .env && set +a
 *   npx tsx scripts/ai-gateway-workspaces.ts --help
 */
import { parseArgs } from 'node:util';

import { AIGatewayClient, AISecSDKException } from '../src/index.js';
import type {
  GatewayWorkspaceCreateRequest,
  GatewayWorkspaceUpdateRequest,
} from '../src/ai-gateway/workspaces-client.js';
import type { GatewayWorkspace } from '../src/models/ai-gateway.js';

let asJson = false;

function emit(label: string, value: unknown): void {
  if (asJson) {
    console.log(JSON.stringify(value, null, 2));
    return;
  }
  console.log(`\n${label}`);
  console.log(JSON.stringify(value, null, 2));
}

function table(rows: GatewayWorkspace[]): void {
  if (asJson) {
    console.log(JSON.stringify(rows, null, 2));
    return;
  }
  const w = (s: string, n: number): string => s.padEnd(n).slice(0, n);
  console.log(
    `\n${w('ID', 38)}${w('SLUG', 20)}${w('NAME', 24)}${w('STATUS', 10)}${w('DEFAULT', 9)}SCOPE_NAME`,
  );
  console.log('─'.repeat(130));
  for (const r of rows) {
    console.log(
      `${w(r.id, 38)}${w(r.slug, 20)}${w(r.name, 24)}${w(r.status, 10)}${w(r.is_default ? 'yes' : '', 9)}${r.scope_name}`,
    );
  }
  console.log(`\n${rows.length} workspace(s)`);
}

function die(msg: string): never {
  console.error(`error: ${msg}`);
  process.exit(1);
}

function parseJsonFlag(raw: string | undefined, flag: string): unknown {
  if (raw === undefined) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    die(`${flag} must be valid JSON`);
  }
}

/**
 * Fields shared by create and update. Only keys actually passed are emitted, so update stays a
 * true partial patch and create never sends stray nulls.
 *
 * `--metadata` is sugar for `defaults.metadata`, where the API really keeps it. Passing both
 * `--defaults` and `--metadata` merges them, with `--metadata` winning on that key.
 */
function writableFields(values: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of ['name', 'description', 'icon'] as const) {
    if (values[key] !== undefined) out[key] = values[key];
  }

  const defaults = parseJsonFlag(values.defaults as string | undefined, '--defaults');
  const metadata = parseJsonFlag(values.metadata as string | undefined, '--metadata');
  if (defaults !== undefined || metadata !== undefined) {
    out.defaults = {
      ...(typeof defaults === 'object' && defaults !== null ? defaults : {}),
      ...(metadata !== undefined ? { metadata } : {}),
    };
  }

  const usage = parseJsonFlag(values['usage-limits'] as string | undefined, '--usage-limits');
  if (usage !== undefined) out.usage_limits = usage;
  const rate = parseJsonFlag(values['rate-limits'] as string | undefined, '--rate-limits');
  if (rate !== undefined) out.rate_limits = rate;

  return out;
}

const USAGE = `
AI Gateway workspace CRUD. <ref> is a workspace UUID or slug.

  list    [--plane data|admin] [--status active|archived] [--all]
  get     <ref> [--plane data|admin]
  create  --name <n> --scope-name <s> [--description <d>] [--icon <i>] [--metadata <json>]
                                      [--users <a,b>] [--usage-limits <json>] [--rate-limits <json>]
  update  <ref>  at least one of      [--name <n>] [--description <d>] [--icon <i>]
                                      [--metadata <json>] [--defaults <json>]
                                      [--usage-limits <json>] [--rate-limits <json>]
  delete  <ref> --yes                 archives; recover the row with --status archived

Global: --json  --dry-run  --help

Defaults hide rows: plain \`list\` shows only ACTIVE workspaces you are SCOPED to.
\`list --all\` shows every workspace in the tenant, active and archived.

Limits are ARRAYS of policy objects:
  --usage-limits '[{"type":"cost","credit_limit":10000,"alert_threshold":8000,"periodic_reset":"weekly"}]'
  --rate-limits  '[{"type":"requests","unit":"rpm","value":100}]'
--metadata is sugar for defaults.metadata: --metadata '{"env":"production"}'
`;

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    allowPositionals: true,
    options: {
      plane: { type: 'string' },
      status: { type: 'string' },
      all: { type: 'boolean', default: false },
      name: { type: 'string' },
      'scope-name': { type: 'string' },
      description: { type: 'string' },
      icon: { type: 'string' },
      defaults: { type: 'string' },
      metadata: { type: 'string' },
      users: { type: 'string' },
      'usage-limits': { type: 'string' },
      'rate-limits': { type: 'string' },
      yes: { type: 'boolean', default: false },
      json: { type: 'boolean', default: false },
      'dry-run': { type: 'boolean', default: false },
      help: { type: 'boolean', default: false },
    },
  });

  asJson = values.json;
  const dryRun = values['dry-run'];
  const [command, ref] = positionals;

  if (values.help || !command) {
    console.log(USAGE);
    return;
  }

  const plane = values.plane;
  if (plane !== undefined && plane !== 'data' && plane !== 'admin') {
    die('--plane must be `data` or `admin`');
  }
  const status = values.status;
  if (status !== undefined && status !== 'active' && status !== 'archived') {
    die('--status must be `active` or `archived`');
  }

  const gw = new AIGatewayClient();

  switch (command) {
    case 'list': {
      if (values.all) {
        // No single call returns both states: the API filters to active unless asked otherwise.
        const [active, archived] = await Promise.all([
          gw.workspaces.list({ plane: 'admin' }),
          gw.workspaces.list({ plane: 'admin', status: 'archived' }),
        ]);
        table([...active.data, ...archived.data]);
        break;
      }
      const res = await gw.workspaces.list({ plane, status });
      table(res.data);
      break;
    }

    case 'get': {
      if (!ref) die('get needs a workspace ref');
      emit(`workspace ${ref}`, await gw.workspaces.get(ref, { plane }));
      break;
    }

    case 'create': {
      if (!values.name) die('create needs --name');
      if (!values['scope-name']) die('create needs --scope-name');
      const body = {
        name: values.name,
        scope_name: values['scope-name'],
        ...writableFields(values),
      } as GatewayWorkspaceCreateRequest;
      if (values.users !== undefined) {
        body.users = values.users
          .split(',')
          .map((u) => u.trim())
          .filter(Boolean);
      }
      if (dryRun) {
        emit('DRY RUN — would create', body);
        break;
      }
      emit('created (shape unverified — confirm with `get`)', await gw.workspaces.create(body));
      break;
    }

    case 'update': {
      if (!ref) die('update needs a workspace ref');
      const body = writableFields(values) as GatewayWorkspaceUpdateRequest;
      if (Object.keys(body).length === 0) {
        die(
          'update needs at least one of --name --description --icon --metadata --defaults ' +
            '--usage-limits --rate-limits',
        );
      }
      if (dryRun) {
        emit(`DRY RUN — would update ${ref}`, body);
        break;
      }
      emit(
        'updated (shape unverified — confirm with `get`)',
        await gw.workspaces.update(ref, body),
      );
      break;
    }

    case 'delete': {
      if (!ref) die('delete needs a workspace ref');
      if (!values.yes && !dryRun) die('delete is destructive — pass --yes (or --dry-run)');
      if (dryRun) {
        emit(`DRY RUN — would archive ${ref}`, { ref });
        break;
      }
      await gw.workspaces.delete(ref);
      emit('archived', { ref });
      if (!asJson) {
        console.log('this is a soft delete — the row is still there under --status archived');
      }
      break;
    }

    default:
      die(`unknown command \`${command}\`${USAGE}`);
  }
}

main().catch((err: unknown) => {
  if (err instanceof AISecSDKException) {
    console.error(
      `\n${err.errorType}${err.statusCode ? ` ${err.statusCode}` : ''}: ${err.message}`,
    );
    if (err.statusCode === 403) {
      console.error(
        'A 403 here is a grant problem, and which grant depends on the plane:\n' +
          '  errorCode AB03              -> missing workspace-scope grant (data plane, /ai_gw/v2)\n' +
          '  header x-opa-decision:false -> missing tenant-root admin grant (admin plane)\n' +
          'SCM Access Management edits the existing role row by default — use "Add Role" so you end\n' +
          'up with two role rows on one service account, not one row moved.',
      );
    }
    process.exit(1);
  }
  console.error('\nunexpected error:', err);
  process.exit(1);
});
