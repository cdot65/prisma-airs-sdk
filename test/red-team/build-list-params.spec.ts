import { describe, it, expect } from 'vitest';
import { buildRedTeamListParams } from '../../src/red-team/list-params.js';

describe('buildRedTeamListParams', () => {
  it('returns empty object when no options', () => {
    expect(buildRedTeamListParams()).toEqual({});
    expect(buildRedTeamListParams(undefined)).toEqual({});
  });

  it('converts skip to string', () => {
    expect(buildRedTeamListParams({ skip: 0 })).toEqual({ skip: '0' });
    expect(buildRedTeamListParams({ skip: 10 })).toEqual({ skip: '10' });
  });

  it('converts limit to string', () => {
    expect(buildRedTeamListParams({ limit: 50 })).toEqual({ limit: '50' });
  });

  it('passes search as-is', () => {
    expect(buildRedTeamListParams({ search: 'test' })).toEqual({ search: 'test' });
  });

  it('includes all options together', () => {
    expect(buildRedTeamListParams({ skip: 5, limit: 10, search: 'q' })).toEqual({
      skip: '5',
      limit: '10',
      search: 'q',
    });
  });

  it('ignores undefined values', () => {
    expect(buildRedTeamListParams({ skip: undefined, limit: 10 })).toEqual({ limit: '10' });
  });
});
