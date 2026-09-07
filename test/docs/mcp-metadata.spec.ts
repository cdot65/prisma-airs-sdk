import { describe, expect, it } from 'vitest';
import {
  metadataIdentities,
  matchMetadataCapability,
  anonymousSessionTermination,
  metadataValidationIssues,
} from '../../scripts/e2e/mcp-metadata.js';

describe('non-executing MCP capability identity mapping', () => {
  it('retains validation locations without received values or arbitrary messages', () => {
    expect(
      metadataValidationIssues({
        issues: [
          {
            path: ['resources', 0, 'size'],
            code: 'invalid_type',
            expected: 'number',
            received: 'PRIVATE',
            message: 'PRIVATE',
          },
        ],
      }),
    ).toEqual([{ path: ['resources', 0, 'size'], code: 'invalid_type', expected: 'number' }]);
  });
  it('masks arbitrary path fields and limits the issue count', () => {
    const issues = Array.from({ length: 100 }, () => ({
      path: ['PRIVATE'],
      code: 'PRIVATE',
      expected: 'PRIVATE',
    }));
    const result = metadataValidationIssues({ issues });
    expect(result).toHaveLength(30);
    expect(result[0]).toEqual({ path: ['<field>'], code: 'other', expected: 'other' });
    expect(JSON.stringify(result)).not.toContain('PRIVATE');
  });
  it.each([null, {}, { issues: null }, { issues: [null, 'PRIVATE'] }])(
    'ignores non-validation error shapes',
    (error) => {
      expect(metadataValidationIssues(error)).toEqual([]);
    },
  );
  it.each([200, 202, 204])(
    'records HTTP %s as confirmed anonymous session termination',
    (status) => {
      expect(anonymousSessionTermination(status)).toBe('confirmed');
    },
  );
  it('records allowed HTTP 405 without claiming the upstream session was retired', () => {
    expect(anonymousSessionTermination(405)).toBe('server-controlled');
  });
  it.each([undefined, 199, 300, 401, 500])(
    'rejects unsupported termination status %s',
    (status) => {
      expect(() => anonymousSessionTermination(status)).toThrow('termination');
    },
  );
  it.each([
    ['prompt', { name: 'overview' }, 'overview'],
    [
      'resource',
      { name: 'overview', uri: 'ui://example/overview.html' },
      'ui://example/overview.html',
    ],
    ['resource_template', { name: 'overview', uriTemplate: 'example://{id}' }, 'example://{id}'],
  ] as const)('uses the protocol identity for %s', (kind, item, identity) => {
    expect(metadataIdentities(kind, [item])).toEqual([{ name: 'overview', identity }]);
  });
  it('refuses to treat one page as complete discovery', () => {
    expect(() => metadataIdentities('prompt', [{ name: 'first' }], 'next')).toThrow('complete');
  });
  it.each([
    ['prompt', { name: '' }],
    ['resource', { name: 'resource' }],
    ['resource_template', { name: 'template', uriTemplate: '' }],
  ] as const)('rejects absent protocol identity for %s', (kind, item) => {
    expect(() => metadataIdentities(kind, [item])).toThrow('identity');
  });
  it('rejects duplicate protocol identities', () => {
    expect(() => metadataIdentities('prompt', [{ name: 'same' }, { name: 'same' }])).toThrow(
      'Duplicate',
    );
  });
  it('allows an empty list after the only capability is disabled', () => {
    expect(metadataIdentities('resource', [])).toEqual([]);
  });
  const resources = [{ name: 'overview', identity: 'ui://example/overview.html' }];
  it('matches SCM URI and does not confuse a display name with runtime identity', () => {
    expect(
      matchMetadataCapability(
        'resource',
        {
          type: 'resource',
          enabled: true,
          name: 'scm-name',
          uri: resources[0].identity,
        },
        resources,
      ),
    ).toEqual(resources[0]);
  });
  it('accepts an unambiguous name when SCM omits the URI', () => {
    expect(
      matchMetadataCapability(
        'resource',
        {
          type: 'resource',
          enabled: true,
          name: 'overview',
        },
        resources,
      ),
    ).toEqual(resources[0]);
  });
  it('does not fall back to a matching name when an explicit URI contradicts it', () => {
    expect(
      matchMetadataCapability(
        'resource',
        {
          type: 'resource',
          enabled: true,
          name: 'overview',
          uri: 'ui://example/different',
        },
        resources,
      ),
    ).toBeUndefined();
  });
  it('refuses an ambiguous display-name match', () => {
    expect(
      matchMetadataCapability(
        'resource',
        {
          type: 'resource',
          enabled: true,
          name: 'overview',
        },
        [...resources, { name: 'overview', identity: 'ui://example/second.html' }],
      ),
    ).toBeUndefined();
  });
  it.each([
    { type: 'prompt', enabled: true, name: 'overview' },
    { type: 'resource', enabled: false, name: 'overview' },
    { type: 'resource', enabled: true, name: '' },
  ])('rejects an ineligible SCM capability', (capability) => {
    expect(matchMetadataCapability('resource', capability, resources)).toBeUndefined();
  });
});
