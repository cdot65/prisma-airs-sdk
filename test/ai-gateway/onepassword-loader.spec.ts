import { describe, expect, it } from 'vitest';
import { parseOnePasswordItemFields } from '../../scripts/onepassword-fields.js';

describe('1Password field loader', () => {
  it('extracts requested revealed fields from one item response', () => {
    const item = JSON.stringify({
      fields: [
        { id: 'username', label: 'username', value: 'tenant' },
        { id: 'secret', label: 'PANW_MGMT_CLIENT_SECRET', value: 'secret-value' },
        { id: 'client', label: 'PANW_MGMT_CLIENT_ID', value: 'client-value' },
      ],
    });
    expect(
      parseOnePasswordItemFields(item, ['PANW_MGMT_CLIENT_ID', 'PANW_MGMT_CLIENT_SECRET']),
    ).toEqual({
      PANW_MGMT_CLIENT_ID: 'client-value',
      PANW_MGMT_CLIENT_SECRET: 'secret-value',
    });
  });

  it('fails without including other item values when a field is absent', () => {
    expect(() => parseOnePasswordItemFields('{"fields":[]}', ['MISSING'])).toThrow(
      '1Password field MISSING is empty or missing',
    );
  });
});
