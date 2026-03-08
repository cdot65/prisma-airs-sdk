import { describe, it, expect } from 'vitest';
import {
  Verdict,
  Action,
  Category,
  DetectionServiceName,
  ContentErrorType,
  ErrorStatus,
} from '../../src/models/enums.js';

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

describe('DetectionServiceName', () => {
  it('has all 9 detection services', () => {
    expect(DetectionServiceName.DLP).toBe('dlp');
    expect(DetectionServiceName.INJECTION).toBe('injection');
    expect(DetectionServiceName.URL_CATS).toBe('url_cats');
    expect(DetectionServiceName.TOXIC_CONTENT).toBe('toxic_content');
    expect(DetectionServiceName.MALICIOUS_CODE).toBe('malicious_code');
    expect(DetectionServiceName.AGENT).toBe('agent');
    expect(DetectionServiceName.TOPIC_VIOLATION).toBe('topic_violation');
    expect(DetectionServiceName.DB_SECURITY).toBe('db_security');
    expect(DetectionServiceName.UNGROUNDED).toBe('ungrounded');
  });

  it('has exactly 9 values', () => {
    expect(Object.keys(DetectionServiceName)).toHaveLength(9);
  });
});

describe('ContentErrorType', () => {
  it('has prompt and response', () => {
    expect(ContentErrorType.PROMPT).toBe('prompt');
    expect(ContentErrorType.RESPONSE).toBe('response');
  });

  it('has exactly 2 values', () => {
    expect(Object.keys(ContentErrorType)).toHaveLength(2);
  });
});

describe('ErrorStatus', () => {
  it('has error and timeout', () => {
    expect(ErrorStatus.ERROR).toBe('error');
    expect(ErrorStatus.TIMEOUT).toBe('timeout');
  });

  it('has exactly 2 values', () => {
    expect(Object.keys(ErrorStatus)).toHaveLength(2);
  });
});
