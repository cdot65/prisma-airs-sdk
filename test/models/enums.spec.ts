import { describe, it, expect } from 'vitest';
import { Verdict, Action, Category } from '../../src/models/enums.js';

describe('Verdict', () => {
  it('has expected values', () => {
    expect(Verdict.BENIGN).toBe('benign');
    expect(Verdict.MALICIOUS).toBe('malicious');
    expect(Verdict.UNKNOWN).toBe('unknown');
  });

  it('has exactly 3 values', () => {
    expect(Object.keys(Verdict)).toHaveLength(3);
  });

  it('values are assignable to Verdict type', () => {
    const v: Verdict = Verdict.BENIGN;
    expect(v).toBe('benign');
  });
});

describe('Action', () => {
  it('has expected values', () => {
    expect(Action.ALLOW).toBe('allow');
    expect(Action.BLOCK).toBe('block');
    expect(Action.ALERT).toBe('alert');
  });

  it('has exactly 3 values', () => {
    expect(Object.keys(Action)).toHaveLength(3);
  });

  it('values are assignable to Action type', () => {
    const a: Action = Action.BLOCK;
    expect(a).toBe('block');
  });
});

describe('Category', () => {
  it('has expected values', () => {
    expect(Category.BENIGN).toBe('benign');
    expect(Category.MALICIOUS).toBe('malicious');
    expect(Category.UNKNOWN).toBe('unknown');
  });

  it('has exactly 3 values', () => {
    expect(Object.keys(Category)).toHaveLength(3);
  });

  it('values are assignable to Category type', () => {
    const c: Category = Category.MALICIOUS;
    expect(c).toBe('malicious');
  });
});
