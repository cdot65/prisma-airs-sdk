/** @internal Minimal one-request 1Password item field loader for opt-in E2E scripts. */
import { execFileSync } from 'node:child_process';

interface OnePasswordItem {
  fields?: Array<{ label?: unknown; value?: unknown }>;
}

export function parseOnePasswordItemFields(
  itemJson: string,
  labels: readonly string[],
): Record<string, string> {
  const item = JSON.parse(itemJson) as OnePasswordItem;
  const fields = new Map(
    (item.fields ?? [])
      .filter(
        (field): field is { label: string; value: string } =>
          typeof field.label === 'string' && typeof field.value === 'string',
      )
      .map((field) => [field.label, field.value]),
  );
  return Object.fromEntries(
    labels.map((label) => {
      const field = fields.get(label)?.trim();
      if (!field) throw new Error(`1Password field ${label} is empty or missing`);
      return [label, field];
    }),
  );
}

export function readOnePasswordItemFields(
  item: string,
  vault: string,
  labels: readonly string[],
): Record<string, string> {
  const itemJson = execFileSync(
    'op',
    ['item', 'get', item, '--vault', vault, '--format', 'json', '--reveal'],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] },
  );
  return parseOnePasswordItemFields(itemJson, labels);
}
