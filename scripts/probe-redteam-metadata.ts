/** @internal Read-only probe of documented and established metadata routes; no bodies persisted. */
import { loadLiveCredentials } from './live-credentials.js';
import { OAuthClient } from '../src/management/oauth-client.js';
import {
  DEFAULT_RED_TEAM_DATA_ENDPOINT,
  DEFAULT_RED_TEAM_MGMT_ENDPOINT,
} from '../src/constants.js';
const source = loadLiveCredentials();
try {
  const oauth = new OAuthClient({
    clientId: process.env.PANW_MGMT_CLIENT_ID!,
    clientSecret: process.env.PANW_MGMT_CLIENT_SECRET!,
    tsgId: process.env.PANW_MGMT_TSG_ID!,
  });
  const token = await oauth.getToken();
  for (const [plane, base, path] of [
    ['data', DEFAULT_RED_TEAM_DATA_ENDPOINT, '/v1/scan/scan-metadata'],
    ['data', DEFAULT_RED_TEAM_DATA_ENDPOINT, '/v1/template/scan-metadata'],
    ['management', DEFAULT_RED_TEAM_MGMT_ENDPOINT, '/v1/template/scan-metadata'],
    ['management', DEFAULT_RED_TEAM_MGMT_ENDPOINT, '/v1/template/target-metadata'],
  ]) {
    const res = await fetch(base + path, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(30_000),
    });
    const rawBody: unknown = await res.json().catch(() => ({}));
    const body =
      rawBody && typeof rawBody === 'object' && !Array.isArray(rawBody)
        ? (rawBody as Record<string, unknown>)
        : {};
    console.log(
      JSON.stringify({
        plane,
        path,
        status: res.status,
        keys: Object.keys(body),
        validation: Array.isArray(body.detail)
          ? body.detail.map((d: { loc?: unknown; type?: string; msg?: string }) => ({
              loc: d.loc,
              type: d.type,
              message: d.msg,
            }))
          : undefined,
      }),
    );
  }
} finally {
  source.verifyUnchanged();
}
