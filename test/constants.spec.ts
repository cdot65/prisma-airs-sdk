import { describe, expect, it } from 'vitest';
import packageJson from '../package.json';
import { SDK_VERSION, USER_AGENT } from '../src/constants.js';

describe('SDK package identity', () => {
  it('keeps the exported version and User-Agent aligned with package.json', () => {
    expect(SDK_VERSION).toBe(packageJson.version);
    expect(USER_AGENT).toBe(`PAN-AIRS/${packageJson.version}-typescript-sdk`);
  });
});
