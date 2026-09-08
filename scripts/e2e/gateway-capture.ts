/** @internal Parse user-supplied GET captures as data, never as executable shell commands. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

export function readGatewayCapture(path: string): { url: URL; response: unknown }[] {
  const text = readFileSync(path, 'utf8');
  return text
    .split(/(?=curl\s+--url)/)
    .filter((chunk) => chunk.startsWith('curl'))
    .map((chunk) => {
      const match = /--url\s+'([^']+)'/.exec(chunk);
      assert(match, 'Missing capture URL');
      const url = new URL(match[1]);
      assert(
        url.origin === 'https://api.apps.paloaltonetworks.com' &&
          /^\/ai_gw\/(?:admin\/)?v2\//.test(url.pathname),
        'Capture URL is outside the authorized SCM gateway',
      );
      const start = /^[ \t]*\{/m.exec(chunk)?.index;
      assert(start !== undefined, 'Missing JSON response');
      assert(!/--data|--request|(?:^|\s)-[Xd]\s/.test(chunk.slice(0, start)), 'Expected GET');
      let depth = 0;
      let quoted = false;
      let escaped = false;
      for (let end = start; end < chunk.length; end++) {
        const ch = chunk[end];
        if (quoted) {
          if (escaped) escaped = false;
          else if (ch === '\\') escaped = true;
          else if (ch === '"') quoted = false;
        } else if (ch === '"') quoted = true;
        else if (ch === '{' || ch === '[') depth++;
        else if ((ch === '}' || ch === ']') && --depth === 0) {
          return { url, response: JSON.parse(chunk.slice(start, end + 1)) as unknown };
        }
      }
      throw new Error('Incomplete JSON response');
    });
}
