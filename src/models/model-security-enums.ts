// src/models/model-security-enums.ts — typed enums for AIRS Model Security API values

/** Error codes returned by the Model Security scan service. */
export const ErrorCodes = {
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  SCAN_ERROR: 'SCAN_ERROR',
  INVALID_RESPONSE: 'INVALID_RESPONSE',
  ACCESS_DENIED: 'ACCESS_DENIED',
  MISSING_CREDENTIALS: 'MISSING_CREDENTIALS',
  NO_SUCH_KEY: 'NO_SUCH_KEY',
  NO_SUCH_BUCKET: 'NO_SUCH_BUCKET',
  INVALID_BUCKET_NAME: 'INVALID_BUCKET_NAME',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  INVALID_OBJECT_STATE: 'INVALID_OBJECT_STATE',
  UNKNOWN_REMOTE_SERVICE_ERROR: 'UNKNOWN_REMOTE_SERVICE_ERROR',
  UNSUPPORTED_REMOTE_STORAGE: 'UNSUPPORTED_REMOTE_STORAGE',
  MISSING_ARTIFACTS: 'MISSING_ARTIFACTS',
  WORKER_ERROR: 'WORKER_ERROR',
  POLICY_EVAL_ERROR: 'POLICY_EVAL_ERROR',
} as const;

/** Union type of all possible error code values. */
export type ErrorCodes = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/** Evaluation outcome for a model security scan. */
export const EvalOutcome = {
  PENDING: 'PENDING',
  ALLOWED: 'ALLOWED',
  BLOCKED: 'BLOCKED',
  ERROR: 'ERROR',
} as const;

/** Union type of all possible evaluation outcome values. */
export type EvalOutcome = (typeof EvalOutcome)[keyof typeof EvalOutcome];

/** Results of individual file scanning. */
export const FileScanResult = {
  SKIPPED: 'SKIPPED',
  SUCCESS: 'SUCCESS',
  ERROR: 'ERROR',
  FAILED: 'FAILED',
} as const;

/** Union type of all possible file scan result values. */
export type FileScanResult = (typeof FileScanResult)[keyof typeof FileScanResult];

/** File type in the scanned model tree. */
export const FileType = {
  DIRECTORY: 'DIRECTORY',
  FILE: 'FILE',
} as const;

/** Union type of all possible file type values. */
export type FileType = (typeof FileType)[keyof typeof FileType];

/** Status of a model file scan. */
export const ModelScanStatus = {
  SCANNED: 'SCANNED',
  SKIPPED: 'SKIPPED',
  ERROR: 'ERROR',
} as const;

/** Union type of all possible model scan status values. */
export type ModelScanStatus = (typeof ModelScanStatus)[keyof typeof ModelScanStatus];

/** Results of rule evaluation. */
export const RuleEvaluationResult = {
  PASSED: 'PASSED',
  FAILED: 'FAILED',
  ERROR: 'ERROR',
} as const;

/** Union type of all possible rule evaluation result values. */
export type RuleEvaluationResult = (typeof RuleEvaluationResult)[keyof typeof RuleEvaluationResult];

/** Rule evaluation states. */
export const RuleState = {
  DISABLED: 'DISABLED',
  ALLOWING: 'ALLOWING',
  BLOCKING: 'BLOCKING',
} as const;

/** Union type of all possible rule state values. */
export type RuleState = (typeof RuleState)[keyof typeof RuleState];

/** Origin of the model security scan. */
export const ScanOrigin = {
  MODEL_SECURITY_SDK: 'MODEL_SECURITY_SDK',
  HUGGING_FACE: 'HUGGING_FACE',
} as const;

/** Union type of all possible scan origin values. */
export type ScanOrigin = (typeof ScanOrigin)[keyof typeof ScanOrigin];

/** Fields available for date-based sorting. */
export const SortByDateField = {
  CREATED_AT: 'created_at',
  UPDATED_AT: 'updated_at',
} as const;

/** Union type of all possible sort-by-date field values. */
export type SortByDateField = (typeof SortByDateField)[keyof typeof SortByDateField];

/** Fields available for file-based sorting. */
export const SortByFileField = {
  PATH: 'path',
  TYPE: 'type',
} as const;

/** Union type of all possible sort-by-file field values. */
export type SortByFileField = (typeof SortByFileField)[keyof typeof SortByFileField];

/** Sort direction for list queries. */
export const SortDirection = {
  ASC: 'asc',
  DESC: 'desc',
} as const;

/** Union type of all possible sort direction values. */
export type SortDirection = (typeof SortDirection)[keyof typeof SortDirection];

/** Source type for model origin. */
export const SourceType = {
  LOCAL: 'LOCAL',
  HUGGING_FACE: 'HUGGING_FACE',
  S3: 'S3',
  GCS: 'GCS',
  AZURE: 'AZURE',
  ARTIFACTORY: 'ARTIFACTORY',
  GITLAB: 'GITLAB',
  ALL: 'ALL',
} as const;

/** Union type of all possible source type values. */
export type SourceType = (typeof SourceType)[keyof typeof SourceType];

/**
 * Threat category codes for model scan issues.
 * Should be in sync with modelscan-pai issue codes.
 */
export const ThreatCategory = {
  PAIT_ARV_100: 'PAIT-ARV-100',
  PAIT_GGUF_100: 'PAIT-GGUF-100',
  PAIT_GGUF_101: 'PAIT-GGUF-101',
  PAIT_KERAS_100: 'PAIT-KERAS-100',
  PAIT_KERAS_101: 'PAIT-KERAS-101',
  PAIT_KERAS_102: 'PAIT-KERAS-102',
  PAIT_JOBLIB_100: 'PAIT-JOBLIB-100',
  PAIT_JOBLIB_101: 'PAIT-JOBLIB-101',
  PAIT_PKL_100: 'PAIT-PKL-100',
  PAIT_PKL_101: 'PAIT-PKL-101',
  PAIT_PYTCH_100: 'PAIT-PYTCH-100',
  PAIT_PYTCH_101: 'PAIT-PYTCH-101',
  PAIT_EXDIR_100: 'PAIT-EXDIR-100',
  PAIT_EXDIR_101: 'PAIT-EXDIR-101',
  PAIT_ONNX_200: 'PAIT-ONNX-200',
  PAIT_TF_200: 'PAIT-TF-200',
  PAIT_LMAFL_300: 'PAIT-LMAFL-300',
  PAIT_LITERT_300: 'PAIT-LITERT-300',
  PAIT_LITERT_301: 'PAIT-LITERT-301',
  PAIT_LITERT_302: 'PAIT-LITERT-302',
  PAIT_KERAS_300: 'PAIT-KERAS-300',
  PAIT_KERAS_301: 'PAIT-KERAS-301',
  PAIT_TCHST_300: 'PAIT-TCHST-300',
  PAIT_TCHST_301: 'PAIT-TCHST-301',
  PAIT_TF_300: 'PAIT-TF-300',
  PAIT_TF_301: 'PAIT-TF-301',
  PAIT_TF_302: 'PAIT-TF-302',
  PAIT_TMT_300: 'PAIT-TMT-300',
  PAIT_TMT_301: 'PAIT-TMT-301',
  UNAPPROVED_FORMATS: 'UNAPPROVED_FORMATS',
} as const;

/** Union type of all possible threat category values. */
export type ThreatCategory = (typeof ThreatCategory)[keyof typeof ThreatCategory];

/** Security group states. */
export const ModelSecurityGroupState = {
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
} as const;

/** Union type of all possible model security group state values. */
export type ModelSecurityGroupState =
  (typeof ModelSecurityGroupState)[keyof typeof ModelSecurityGroupState];

/** Rule types for different scanning approaches. */
export const RuleType = {
  METADATA: 'METADATA',
  ARTIFACT: 'ARTIFACT',
} as const;

/** Union type of all possible rule type values. */
export type RuleType = (typeof RuleType)[keyof typeof RuleType];

/** Editable field types used by rule structure for UI rendering. */
export const RuleEditableFieldType = {
  SELECT: 'SELECT',
  LIST: 'LIST',
} as const;

/** Union type of all possible rule editable field type values. */
export type RuleEditableFieldType =
  (typeof RuleEditableFieldType)[keyof typeof RuleEditableFieldType];

/** Allowed keys for rule field values configuration. */
export const RuleFieldValueKey = {
  APPROVED_FORMATS: 'approved_formats',
  APPROVED_LOCATIONS: 'approved_locations',
  APPROVED_LICENSES: 'approved_licenses',
  DENY_ORGS: 'deny_orgs',
  DENIED_ORG_MODELS: 'denied_org_models',
  APPROVED_ORG_MODELS: 'approved_org_models',
} as const;

/** Union type of all possible rule field value key values. */
export type RuleFieldValueKey = (typeof RuleFieldValueKey)[keyof typeof RuleFieldValueKey];
