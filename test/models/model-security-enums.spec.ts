import { describe, it, expect } from 'vitest';
import {
  ErrorCodes,
  EvalOutcome,
  FileScanResult,
  FileType,
  ModelScanStatus,
  RuleEvaluationResult,
  RuleState,
  ScanOrigin,
  SortByDateField,
  SortByFileField,
  SortDirection,
  SourceType,
  ThreatCategory,
  ModelSecurityGroupState,
  RuleType,
  RuleEditableFieldType,
  RuleFieldValueKey,
} from '../../src/models/model-security-enums.js';

describe('ErrorCodes', () => {
  it('has expected values', () => {
    expect(ErrorCodes.UNKNOWN_ERROR).toBe('UNKNOWN_ERROR');
    expect(ErrorCodes.SCAN_ERROR).toBe('SCAN_ERROR');
    expect(ErrorCodes.WORKER_ERROR).toBe('WORKER_ERROR');
    expect(ErrorCodes.POLICY_EVAL_ERROR).toBe('POLICY_EVAL_ERROR');
  });

  it('has exactly 16 values', () => {
    expect(Object.keys(ErrorCodes)).toHaveLength(16);
  });

  it('values are assignable to ErrorCodes type', () => {
    const e: ErrorCodes = ErrorCodes.ACCESS_DENIED;
    expect(e).toBe('ACCESS_DENIED');
  });
});

describe('EvalOutcome', () => {
  it('has expected values', () => {
    expect(EvalOutcome.PENDING).toBe('PENDING');
    expect(EvalOutcome.ALLOWED).toBe('ALLOWED');
    expect(EvalOutcome.BLOCKED).toBe('BLOCKED');
    expect(EvalOutcome.ERROR).toBe('ERROR');
  });

  it('has exactly 4 values', () => {
    expect(Object.keys(EvalOutcome)).toHaveLength(4);
  });
});

describe('FileScanResult', () => {
  it('has expected values', () => {
    expect(FileScanResult.SKIPPED).toBe('SKIPPED');
    expect(FileScanResult.SUCCESS).toBe('SUCCESS');
    expect(FileScanResult.ERROR).toBe('ERROR');
    expect(FileScanResult.FAILED).toBe('FAILED');
  });

  it('has exactly 4 values', () => {
    expect(Object.keys(FileScanResult)).toHaveLength(4);
  });
});

describe('FileType', () => {
  it('has expected values', () => {
    expect(FileType.DIRECTORY).toBe('DIRECTORY');
    expect(FileType.FILE).toBe('FILE');
  });

  it('has exactly 2 values', () => {
    expect(Object.keys(FileType)).toHaveLength(2);
  });
});

describe('ModelScanStatus', () => {
  it('has expected values', () => {
    expect(ModelScanStatus.SCANNED).toBe('SCANNED');
    expect(ModelScanStatus.SKIPPED).toBe('SKIPPED');
    expect(ModelScanStatus.ERROR).toBe('ERROR');
  });

  it('has exactly 3 values', () => {
    expect(Object.keys(ModelScanStatus)).toHaveLength(3);
  });
});

describe('RuleEvaluationResult', () => {
  it('has expected values', () => {
    expect(RuleEvaluationResult.PASSED).toBe('PASSED');
    expect(RuleEvaluationResult.FAILED).toBe('FAILED');
    expect(RuleEvaluationResult.ERROR).toBe('ERROR');
  });

  it('has exactly 3 values', () => {
    expect(Object.keys(RuleEvaluationResult)).toHaveLength(3);
  });
});

describe('RuleState', () => {
  it('has expected values', () => {
    expect(RuleState.DISABLED).toBe('DISABLED');
    expect(RuleState.ALLOWING).toBe('ALLOWING');
    expect(RuleState.BLOCKING).toBe('BLOCKING');
  });

  it('has exactly 3 values', () => {
    expect(Object.keys(RuleState)).toHaveLength(3);
  });
});

describe('ScanOrigin', () => {
  it('has expected values', () => {
    expect(ScanOrigin.MODEL_SECURITY_SDK).toBe('MODEL_SECURITY_SDK');
    expect(ScanOrigin.HUGGING_FACE).toBe('HUGGING_FACE');
  });

  it('has exactly 2 values', () => {
    expect(Object.keys(ScanOrigin)).toHaveLength(2);
  });
});

describe('SortByDateField', () => {
  it('has expected values', () => {
    expect(SortByDateField.CREATED_AT).toBe('created_at');
    expect(SortByDateField.UPDATED_AT).toBe('updated_at');
  });

  it('has exactly 2 values', () => {
    expect(Object.keys(SortByDateField)).toHaveLength(2);
  });
});

describe('SortByFileField', () => {
  it('has expected values', () => {
    expect(SortByFileField.PATH).toBe('path');
    expect(SortByFileField.TYPE).toBe('type');
  });

  it('has exactly 2 values', () => {
    expect(Object.keys(SortByFileField)).toHaveLength(2);
  });
});

describe('SortDirection', () => {
  it('has expected values', () => {
    expect(SortDirection.ASC).toBe('asc');
    expect(SortDirection.DESC).toBe('desc');
  });

  it('has exactly 2 values', () => {
    expect(Object.keys(SortDirection)).toHaveLength(2);
  });
});

describe('SourceType', () => {
  it('has expected values', () => {
    expect(SourceType.LOCAL).toBe('LOCAL');
    expect(SourceType.HUGGING_FACE).toBe('HUGGING_FACE');
    expect(SourceType.S3).toBe('S3');
    expect(SourceType.GCS).toBe('GCS');
    expect(SourceType.AZURE).toBe('AZURE');
    expect(SourceType.ARTIFACTORY).toBe('ARTIFACTORY');
    expect(SourceType.GITLAB).toBe('GITLAB');
    expect(SourceType.ALL).toBe('ALL');
  });

  it('has exactly 8 values', () => {
    expect(Object.keys(SourceType)).toHaveLength(8);
  });
});

describe('ThreatCategory', () => {
  it('has expected values', () => {
    expect(ThreatCategory.PAIT_ARV_100).toBe('PAIT-ARV-100');
    expect(ThreatCategory.PAIT_PKL_100).toBe('PAIT-PKL-100');
    expect(ThreatCategory.UNAPPROVED_FORMATS).toBe('UNAPPROVED_FORMATS');
  });

  it('has exactly 30 values', () => {
    expect(Object.keys(ThreatCategory)).toHaveLength(30);
  });
});

describe('ModelSecurityGroupState', () => {
  it('has expected values', () => {
    expect(ModelSecurityGroupState.PENDING).toBe('PENDING');
    expect(ModelSecurityGroupState.ACTIVE).toBe('ACTIVE');
  });

  it('has exactly 2 values', () => {
    expect(Object.keys(ModelSecurityGroupState)).toHaveLength(2);
  });
});

describe('RuleType', () => {
  it('has expected values', () => {
    expect(RuleType.METADATA).toBe('METADATA');
    expect(RuleType.ARTIFACT).toBe('ARTIFACT');
  });

  it('has exactly 2 values', () => {
    expect(Object.keys(RuleType)).toHaveLength(2);
  });
});

describe('RuleEditableFieldType', () => {
  it('has expected values', () => {
    expect(RuleEditableFieldType.SELECT).toBe('SELECT');
    expect(RuleEditableFieldType.LIST).toBe('LIST');
  });

  it('has exactly 2 values', () => {
    expect(Object.keys(RuleEditableFieldType)).toHaveLength(2);
  });
});

describe('RuleFieldValueKey', () => {
  it('has expected values', () => {
    expect(RuleFieldValueKey.APPROVED_FORMATS).toBe('approved_formats');
    expect(RuleFieldValueKey.APPROVED_LOCATIONS).toBe('approved_locations');
    expect(RuleFieldValueKey.APPROVED_LICENSES).toBe('approved_licenses');
    expect(RuleFieldValueKey.DENY_ORGS).toBe('deny_orgs');
    expect(RuleFieldValueKey.DENIED_ORG_MODELS).toBe('denied_org_models');
    expect(RuleFieldValueKey.APPROVED_ORG_MODELS).toBe('approved_org_models');
  });

  it('has exactly 6 values', () => {
    expect(Object.keys(RuleFieldValueKey)).toHaveLength(6);
  });
});
