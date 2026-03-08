# API Reference

Complete public API surface of `@cdot65/prisma-airs-sdk`.

## Scan API

### `init(opts?: InitOptions): void`

Initialize the global scan API configuration. Must be called before using `Scanner`.

```ts
interface InitOptions {
  apiKey?: string; // or env PANW_AI_SEC_API_KEY
  apiToken?: string; // or env PANW_AI_SEC_API_TOKEN
  apiEndpoint?: string; // or env PANW_AI_SEC_API_ENDPOINT
  numRetries?: number; // 0-5, default 5
}
```

### `Scanner`

```ts
class Scanner {
  syncScan(aiProfile: AiProfile, content: Content, opts?: SyncScanOptions): Promise<ScanResponse>;
  asyncScan(scanObjects: AsyncScanObject[]): Promise<AsyncScanResponse>;
  queryByScanIds(scanIds: string[]): Promise<ScanIdResult[]>;
  queryByReportIds(reportIds: string[]): Promise<ThreatScanReport[]>;
}
```

### `Content`

```ts
interface ContentOptions {
  prompt?: string; // max 2 MB
  response?: string; // max 2 MB
  context?: string; // max 100 MB
  codePrompt?: string; // max 2 MB
  codeResponse?: string; // max 2 MB
  toolEvent?: ToolEvent;
}

class Content {
  constructor(opts: ContentOptions); // at least one field required
  prompt: string | undefined;
  response: string | undefined;
  context: string | undefined;
  codePrompt: string | undefined;
  codeResponse: string | undefined;
  toolEvent: ToolEvent | undefined;
  length: number; // total byte length
  toJSON(): ScanRequestContentsInner;
  static fromJSON(json: ScanRequestContentsInner): Content;
  static fromJSONFile(filePath: string): Content;
}
```

### `SyncScanOptions`

```ts
interface SyncScanOptions {
  trId?: string; // max 100 chars
  sessionId?: string; // max 100 chars
  metadata?: Metadata;
}
```

### `AiProfile`

```ts
// At least one required
interface AiProfile {
  profile_id?: string; // UUID
  profile_name?: string; // max 100 chars
}
```

---

## Management API

### `ManagementClient`

```ts
interface ManagementClientOptions {
  clientId?: string; // or env PANW_MGMT_CLIENT_ID (required)
  clientSecret?: string; // or env PANW_MGMT_CLIENT_SECRET (required)
  tsgId?: string; // or env PANW_MGMT_TSG_ID (required)
  apiEndpoint?: string; // or env PANW_MGMT_ENDPOINT
  tokenEndpoint?: string; // or env PANW_MGMT_TOKEN_ENDPOINT
  numRetries?: number; // 0-5, default 5
}

class ManagementClient {
  constructor(opts?: ManagementClientOptions);
  readonly profiles: ProfilesClient;
  readonly topics: TopicsClient;
}
```

### `OAuthClient`

```ts
interface TokenInfo {
  hasToken: boolean; // whether a token has been fetched
  isValid: boolean; // not expired and outside the buffer window
  isExpired: boolean; // past expiry time
  isExpiringSoon: boolean; // within the pre-expiry buffer
  expiresInMs: number; // ms until expiry (0 if expired/no token)
  expiresAt: number; // Unix timestamp in ms (0 if no token)
}

interface OAuthClientOptions {
  clientId: string;
  clientSecret: string;
  tsgId: string;
  tokenEndpoint?: string; // default: Palo Alto Networks auth endpoint
  tokenBufferMs?: number; // pre-expiry refresh buffer (default: 30000)
  onTokenRefresh?: (info: TokenInfo) => void; // callback on each refresh
}

class OAuthClient {
  constructor(opts: OAuthClientOptions);
  readonly tokenEndpoint: string;
  getToken(): Promise<string>; // auto-refreshes if expired/expiring
  clearToken(): void; // force re-fetch on next call
  isTokenExpired(): boolean; // true if no token or past expiry
  isTokenExpiringSoon(bufferMs?: number): boolean; // true if within buffer
  getTokenInfo(): TokenInfo; // snapshot without exposing token value
}
```

### `ProfilesClient`

```ts
interface PaginationOptions {
  offset?: number; // default 0
  limit?: number; // default 100
}

class ProfilesClient {
  create(request: CreateSecurityProfileRequest): Promise<SecurityProfile>;
  list(opts?: PaginationOptions): Promise<SecurityProfileListResponse>;
  update(profileId: string, request: CreateSecurityProfileRequest): Promise<SecurityProfile>;
  delete(profileId: string): Promise<DeleteProfileResponse>;
}
```

### `TopicsClient`

```ts
class TopicsClient {
  create(request: CreateCustomTopicRequest): Promise<CustomTopic>;
  list(opts?: PaginationOptions): Promise<CustomTopicListResponse>;
  update(topicId: string, request: CreateCustomTopicRequest): Promise<CustomTopic>;
  delete(topicId: string): Promise<DeleteTopicResponse>;
  forceDelete(topicId: string): Promise<DeleteTopicResponse>;
}
```

### Management Types

#### SecurityProfile

```ts
interface SecurityProfile {
  profile_id?: string;
  profile_name: string;
  revision?: number;
  active?: boolean;
  policy?: Policy; // passthrough — accepts any shape
  created_by?: string;
  updated_by?: string;
  last_modified_ts?: string;
  [key: string]: unknown; // forward-compat via .passthrough()
}
```

#### Real API policy shape (from live testing)

```ts
{
  policy: {
    'ai-security-profiles': [
      {
        'model-type': 'default',
        'model-configuration': {
          'app-protection': { 'default-url-category': { member: null }, 'url-detected-action': '' },
          'data-protection': { 'data-leak-detection': { action: '', member: null }, 'database-security': null },
          latency: { 'inline-timeout-action': 'block', 'max-inline-latency': 5 },
          'mask-data-in-storage': false,
          'model-protection': [],
          'agent-protection': [],
        },
      },
    ],
    'dlp-data-profiles': [],
  }
}
```

#### CustomTopic

```ts
interface CustomTopic {
  topic_id?: string;
  topic_name: string;
  revision?: number;
  active?: boolean;
  description?: string;
  examples?: string[];
  created_by?: string;
  updated_by?: string;
  last_modified_ts?: string;
  created_ts?: string;
  [key: string]: unknown;
}
```

#### List Responses

```ts
interface SecurityProfileListResponse {
  ai_profiles: SecurityProfile[];
  next_offset?: number;
}

interface CustomTopicListResponse {
  custom_topics: CustomTopic[];
  next_offset?: number;
}
```

#### Delete Responses

```ts
interface DeleteProfileResponse {
  message: string;
}
interface DeleteTopicResponse {
  message: string;
}

// 409 conflict shapes (when resource is referenced)
interface DeleteProfileConflict {
  message: string;
  payload: { policy_id: string; policy_name: string; priority: number }[];
}
interface DeleteTopicConflict {
  message: string;
  payload: { profile_id: string; profile_name: string; revision: number }[];
}
```

---

## Model Security API

### `ModelSecurityClient`

```ts
interface ModelSecurityClientOptions {
  clientId?: string; // or env PANW_MODEL_SEC_CLIENT_ID, then PANW_MGMT_CLIENT_ID
  clientSecret?: string; // or env PANW_MODEL_SEC_CLIENT_SECRET, then PANW_MGMT_CLIENT_SECRET
  tsgId?: string; // or env PANW_MODEL_SEC_TSG_ID, then PANW_MGMT_TSG_ID
  dataEndpoint?: string; // or env PANW_MODEL_SEC_DATA_ENDPOINT
  mgmtEndpoint?: string; // or env PANW_MODEL_SEC_MGMT_ENDPOINT
  tokenEndpoint?: string; // or env PANW_MODEL_SEC_TOKEN_ENDPOINT, then PANW_MGMT_TOKEN_ENDPOINT
  numRetries?: number; // 0-5, default 5
}

class ModelSecurityClient {
  constructor(opts?: ModelSecurityClientOptions);
  readonly scans: ModelSecurityScansClient;
  readonly securityGroups: ModelSecurityGroupsClient;
  readonly securityRules: ModelSecurityRulesClient;
  getPyPIAuth(): Promise<PyPIAuthResponse>;
}
```

### `ModelSecurityScansClient`

Data plane scan operations.

```ts
interface ModelSecurityListOptions {
  skip?: number;
  limit?: number;
  sort_by?: string;
  sort_direction?: string;
  search?: string;
}

interface ModelSecurityScanListOptions extends ModelSecurityListOptions {
  eval_outcome?: string;
  source_type?: string;
  scan_origin?: string;
}

interface ModelSecurityFileListOptions extends ModelSecurityListOptions {
  type?: string;
  result?: string;
}

class ModelSecurityScansClient {
  create(request: ScanCreateRequest): Promise<ScanBaseResponse>;
  list(opts?: ModelSecurityScanListOptions): Promise<ScanList>;
  get(uuid: string): Promise<ScanBaseResponse>;
  getEvaluations(scanUuid: string, opts?: ModelSecurityListOptions): Promise<RuleEvaluationList>;
  getFiles(scanUuid: string, opts?: ModelSecurityFileListOptions): Promise<FileList>;
  addLabels(scanUuid: string, request: LabelsCreateRequest): Promise<LabelsResponse>;
  setLabels(scanUuid: string, request: LabelsCreateRequest): Promise<LabelsResponse>;
  deleteLabels(scanUuid: string, keys: string[]): Promise<void>;
  getViolations(scanUuid: string, opts?: ModelSecurityListOptions): Promise<ViolationList>;
  getLabelKeys(opts?: ModelSecurityListOptions): Promise<LabelKeyList>;
  getLabelValues(key: string, opts?: ModelSecurityListOptions): Promise<LabelValueList>;
  getEvaluation(uuid: string): Promise<RuleEvaluationResponse>;
  getViolation(uuid: string): Promise<ViolationResponse>;
}
```

### `ModelSecurityGroupsClient`

Management plane security group operations.

```ts
class ModelSecurityGroupsClient {
  create(request: ModelSecurityGroupCreateRequest): Promise<ModelSecurityGroupResponse>;
  list(opts?: ModelSecurityListOptions): Promise<ListModelSecurityGroupsResponse>;
  get(uuid: string): Promise<ModelSecurityGroupResponse>;
  update(
    uuid: string,
    request: ModelSecurityGroupUpdateRequest,
  ): Promise<ModelSecurityGroupResponse>;
  delete(uuid: string): Promise<void>;
  listRuleInstances(
    securityGroupUuid: string,
    opts?: ModelSecurityListOptions,
  ): Promise<ListModelSecurityRuleInstancesResponse>;
  getRuleInstance(
    securityGroupUuid: string,
    ruleInstanceUuid: string,
  ): Promise<ModelSecurityRuleInstanceResponse>;
  updateRuleInstance(
    securityGroupUuid: string,
    ruleInstanceUuid: string,
    request: ModelSecurityRuleInstanceUpdateRequest,
  ): Promise<ModelSecurityRuleInstanceResponse>;
}
```

### `ModelSecurityRulesClient`

Management plane security rule operations (read-only).

```ts
class ModelSecurityRulesClient {
  list(opts?: ModelSecurityListOptions): Promise<ListModelSecurityRulesResponse>;
  get(uuid: string): Promise<ModelSecurityRuleResponse>;
}
```

---

## Red Team API

### `RedTeamClient`

```ts
interface RedTeamClientOptions {
  clientId?: string; // or env PANW_RED_TEAM_CLIENT_ID, then PANW_MGMT_CLIENT_ID
  clientSecret?: string; // or env PANW_RED_TEAM_CLIENT_SECRET, then PANW_MGMT_CLIENT_SECRET
  tsgId?: string; // or env PANW_RED_TEAM_TSG_ID, then PANW_MGMT_TSG_ID
  dataEndpoint?: string; // or env PANW_RED_TEAM_DATA_ENDPOINT
  mgmtEndpoint?: string; // or env PANW_RED_TEAM_MGMT_ENDPOINT
  tokenEndpoint?: string; // or env PANW_RED_TEAM_TOKEN_ENDPOINT, then PANW_MGMT_TOKEN_ENDPOINT
  numRetries?: number; // 0-5, default 5
}

class RedTeamClient {
  constructor(opts?: RedTeamClientOptions);
  readonly scans: RedTeamScansClient;
  readonly reports: RedTeamReportsClient;
  readonly customAttackReports: RedTeamCustomAttackReportsClient;
  readonly targets: RedTeamTargetsClient;
  readonly customAttacks: RedTeamCustomAttacksClient;

  // Data plane convenience methods
  getScanStatistics(params?: {
    date_range?: string;
    target_id?: string;
  }): Promise<ScanStatisticsResponse>;
  getScoreTrend(targetId: string): Promise<ScoreTrendResponse>;
  getQuota(): Promise<QuotaSummary>;
  getErrorLogs(jobId: string, opts?: RedTeamListOptions): Promise<ErrorLogListResponse>;
  updateSentiment(request: SentimentRequest): Promise<SentimentResponse>;
  getSentiment(jobId: string): Promise<SentimentResponse>;

  // Management plane convenience methods
  getDashboardOverview(): Promise<DashboardOverviewResponse>;
}
```

### `RedTeamScansClient`

Data plane scan/job operations.

```ts
interface RedTeamListOptions {
  skip?: number;
  limit?: number;
  sort_by?: string;
  sort_direction?: string;
  search?: string;
}

interface RedTeamScanListOptions extends RedTeamListOptions {
  status?: string;
  job_type?: string;
  target_id?: string;
}

class RedTeamScansClient {
  create(request: JobCreateRequest): Promise<JobResponse>;
  list(opts?: RedTeamScanListOptions): Promise<JobListResponse>;
  get(jobId: string): Promise<JobResponse>;
  abort(jobId: string): Promise<JobAbortResponse>;
  getCategories(): Promise<CategoryModel[]>;
}
```

### `RedTeamReportsClient`

Data plane report operations for static (attack library) and dynamic (agent) scans.

```ts
interface AttackListOptions extends RedTeamListOptions {
  status?: string;
  severity?: string;
  category?: string;
  sub_category?: string;
}

interface GoalListOptions extends RedTeamListOptions {
  goal_type?: string;
}

class RedTeamReportsClient {
  // Static (attack library) reports
  listAttacks(jobId: string, opts?: AttackListOptions): Promise<AttackListResponse>;
  getAttackDetail(jobId: string, attackId: string): Promise<AttackDetailResponse>;
  getMultiTurnAttackDetail(jobId: string, attackId: string): Promise<AttackMultiTurnDetailResponse>;
  getStaticReport(jobId: string): Promise<StaticJobReport>;
  getStaticRemediation(jobId: string): Promise<RemediationResponse>;
  getStaticRuntimePolicy(jobId: string): Promise<RuntimeSecurityProfileResponse>;

  // Dynamic (agent) reports
  getDynamicReport(jobId: string): Promise<DynamicJobReport>;
  getDynamicRemediation(jobId: string): Promise<RemediationResponse>;
  getDynamicRuntimePolicy(jobId: string): Promise<RuntimeSecurityProfileResponse>;
  listGoals(jobId: string, opts?: GoalListOptions): Promise<GoalListResponse>;
  listGoalStreams(
    jobId: string,
    goalId: string,
    opts?: RedTeamListOptions,
  ): Promise<StreamListResponse>;

  // Common
  getStreamDetail(streamId: string): Promise<StreamDetailResponse>;
  downloadReport(jobId: string, format?: string): Promise<unknown>;
  generatePartialReport(jobId: string): Promise<unknown>;
}
```

### `RedTeamCustomAttackReportsClient`

Data plane custom attack report operations.

```ts
class RedTeamCustomAttackReportsClient {
  getReport(jobId: string): Promise<CustomAttackReportResponse>;
  getPromptSets(jobId: string): Promise<PromptSetsReportResponse>;
  getPromptsBySet(jobId: string, promptSetId: string, opts?: RedTeamListOptions): Promise<unknown>;
  getPromptDetail(jobId: string, promptId: string): Promise<PromptDetailResponse>;
  listCustomAttacks(jobId: string, opts?: RedTeamListOptions): Promise<CustomAttacksListResponse>;
  getAttackOutputs(jobId: string, attackId: string): Promise<unknown>;
  getPropertyStats(jobId: string): Promise<PropertyStatistic[]>;
}
```

### `RedTeamTargetsClient`

Management plane target operations.

```ts
interface TargetListOptions extends RedTeamListOptions {
  target_type?: string;
  status?: string;
  active?: boolean;
}

class RedTeamTargetsClient {
  create(request: TargetCreateRequest): Promise<TargetResponse>;
  list(opts?: TargetListOptions): Promise<TargetList>;
  get(uuid: string): Promise<TargetResponse>;
  update(uuid: string, request: TargetUpdateRequest): Promise<TargetResponse>;
  delete(uuid: string): Promise<BaseResponse>;
  probe(request: TargetProbeRequest): Promise<TargetResponse>;
  getProfile(uuid: string): Promise<TargetProfileResponse>;
  updateProfile(uuid: string, request: TargetContextUpdate): Promise<TargetProfileResponse>;
}
```

### `RedTeamCustomAttacksClient`

Management plane custom attack/prompt set operations.

```ts
interface PromptSetListOptions extends RedTeamListOptions {
  active?: boolean;
  archive?: boolean;
}

interface PromptListOptions extends RedTeamListOptions {
  active?: boolean;
}

class RedTeamCustomAttacksClient {
  // Prompt Set operations
  createPromptSet(request: CustomPromptSetCreateRequest): Promise<CustomPromptSetResponse>;
  listPromptSets(opts?: PromptSetListOptions): Promise<CustomPromptSetList>;
  getPromptSet(uuid: string): Promise<CustomPromptSetResponse>;
  updatePromptSet(
    uuid: string,
    request: CustomPromptSetUpdateRequest,
  ): Promise<CustomPromptSetResponse>;
  archivePromptSet(
    uuid: string,
    request: CustomPromptSetArchiveRequest,
  ): Promise<CustomPromptSetResponse>;
  getPromptSetReference(uuid: string): Promise<CustomPromptSetReference>;
  getPromptSetVersionInfo(uuid: string): Promise<CustomPromptSetVersionInfo>;
  listActivePromptSets(): Promise<CustomPromptSetListActive>;
  downloadTemplate(uuid: string): Promise<unknown>;

  // Prompt operations
  createPrompt(request: CustomPromptCreateRequest): Promise<CustomPromptResponse>;
  listPrompts(promptSetUuid: string, opts?: PromptListOptions): Promise<CustomPromptList>;
  getPrompt(promptSetUuid: string, promptUuid: string): Promise<CustomPromptResponse>;
  updatePrompt(
    promptSetUuid: string,
    promptUuid: string,
    request: CustomPromptUpdateRequest,
  ): Promise<CustomPromptResponse>;
  deletePrompt(promptSetUuid: string, promptUuid: string): Promise<BaseResponse>;

  // Property operations
  getPropertyNames(): Promise<PropertyNamesListResponse>;
  createPropertyName(request: PropertyNameCreateRequest): Promise<BaseResponse>;
  getPropertyValues(propertyName: string): Promise<PropertyValuesResponse>;
  getPropertyValuesMultiple(propertyNames: string[]): Promise<PropertyValuesMultipleResponse>;
  createPropertyValue(request: PropertyValueCreateRequest): Promise<BaseResponse>;
}
```

---

## Enums

Typed const objects for AIRS API verdict, action, and category values.

```ts
import { Verdict, Action, Category } from '@cdot65/prisma-airs-sdk';

// Verdict — scan result classification
Verdict.BENIGN; // 'benign'
Verdict.MALICIOUS; // 'malicious'
Verdict.UNKNOWN; // 'unknown'

// Action — enforcement action taken
Action.ALLOW; // 'allow'
Action.BLOCK; // 'block'
Action.ALERT; // 'alert'

// Category — top-level scan category
Category.BENIGN; // 'benign'
Category.MALICIOUS; // 'malicious'
Category.UNKNOWN; // 'unknown'
```

Types are also exported: `Verdict`, `Action`, `Category` (union of literal string values).

---

## Model Security Enums

Typed const objects for Model Security API values. Each export is both a const object and a union type of its values.

```ts
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
} from '@cdot65/prisma-airs-sdk';
```

| Enum                      | Values                                                                                                                 |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `ErrorCodes`              | `UNKNOWN_ERROR`, `SCAN_ERROR`, `INVALID_RESPONSE`, `ACCESS_DENIED`, `MISSING_CREDENTIALS`, ...                         |
| `EvalOutcome`             | `PENDING`, `ALLOWED`, `BLOCKED`, `ERROR`                                                                               |
| `FileScanResult`          | `SKIPPED`, `SUCCESS`, `ERROR`, `FAILED`                                                                                |
| `FileType`                | `DIRECTORY`, `FILE`                                                                                                    |
| `ModelScanStatus`         | `SCANNED`, `SKIPPED`, `ERROR`                                                                                          |
| `RuleEvaluationResult`    | `PASSED`, `FAILED`, `ERROR`                                                                                            |
| `RuleState`               | `DISABLED`, `ALLOWING`, `BLOCKING`                                                                                     |
| `ScanOrigin`              | `MODEL_SECURITY_SDK`, `HUGGING_FACE`                                                                                   |
| `SortByDateField`         | `created_at`, `updated_at`                                                                                             |
| `SortByFileField`         | `path`, `type`                                                                                                         |
| `SortDirection`           | `asc`, `desc`                                                                                                          |
| `SourceType`              | `LOCAL`, `HUGGING_FACE`, `S3`, `GCS`, `AZURE`, `ARTIFACTORY`, `GITLAB`, `ALL`                                          |
| `ThreatCategory`          | `PAIT-ARV-100`, `PAIT-PKL-100`, `PAIT-PYTCH-100`, ... (28 threat codes)                                                |
| `ModelSecurityGroupState` | `PENDING`, `ACTIVE`                                                                                                    |
| `RuleType`                | `METADATA`, `ARTIFACT`                                                                                                 |
| `RuleEditableFieldType`   | `SELECT`, `LIST`                                                                                                       |
| `RuleFieldValueKey`       | `approved_formats`, `approved_locations`, `approved_licenses`, `deny_orgs`, `denied_org_models`, `approved_org_models` |

---

## Red Team Enums

Typed const objects for Red Team API values. Each export is both a const object and a union type of its values.

```ts
import {
  ApiEndpointType,
  AttackStatus,
  AttackType,
  AuthType,
  BrandSubCategory,
  ComplianceSubCategory,
  CountedQuotaEnum,
  DateRangeFilter,
  ErrorSource,
  RedTeamErrorType,
  FileFormat,
  GoalType,
  GoalTypeQueryParam,
  GuardrailAction,
  JobStatus,
  JobStatusFilter,
  JobType,
  PolicyType,
  ProfilingStatus,
  RedTeamCategory,
  ResponseMode,
  RiskRating,
  SafetySubCategory,
  SecuritySubCategory,
  SeverityFilter,
  StatusQueryParam,
  StreamType,
  TargetConnectionType,
  TargetStatus,
  TargetType,
} from '@cdot65/prisma-airs-sdk';
```

| Enum                    | Values                                                                                                                                                                                        |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ApiEndpointType`       | `PUBLIC`, `PRIVATE`, `NETWORK_BROKER`                                                                                                                                                         |
| `AttackStatus`          | `INIT`, `ATTACK`, `DETECTION`, `REPORT`, `COMPLETED`, `FAILED`                                                                                                                                |
| `AttackType`            | `NORMAL`, `CUSTOM`                                                                                                                                                                            |
| `AuthType`              | `OAUTH`, `ACCESS_TOKEN`                                                                                                                                                                       |
| `BrandSubCategory`      | `COMPETITOR_ENDORSEMENTS`, `BRAND_TARNISHING_SELF_CRITICISM`, `DISCRIMINATING_CLAIMS`, `POLITICAL_ENDORSEMENTS`                                                                               |
| `ComplianceSubCategory` | `OWASP`, `MITRE_ATLAS`, `NIST`, `DASF_V2`                                                                                                                                                     |
| `CountedQuotaEnum`      | `HELD`, `COUNTED`, `NOT_COUNTED`                                                                                                                                                              |
| `DateRangeFilter`       | `LAST_7_DAYS`, `LAST_15_DAYS`, `LAST_30_DAYS`, `ALL`                                                                                                                                          |
| `ErrorSource`           | `TARGET`, `JOB`, `SYSTEM`, `VALIDATION`, `TARGET_PROFILING`                                                                                                                                   |
| `RedTeamErrorType`      | `CONTENT_FILTER`, `RATE_LIMIT`, `AUTHENTICATION`, `NETWORK`, `VALIDATION`, `NETWORK_CHANNEL`, `UNKNOWN`                                                                                       |
| `FileFormat`            | `CSV`, `JSON`, `ALL`                                                                                                                                                                          |
| `GoalType`              | `BASE`, `TOOL_MISUSE`, `GOAL_MANIPULATION`                                                                                                                                                    |
| `GoalTypeQueryParam`    | `AGENT`, `HUMAN_AUGMENTED`                                                                                                                                                                    |
| `GuardrailAction`       | `ALLOW`, `BLOCK`                                                                                                                                                                              |
| `JobStatus`             | `INIT`, `QUEUED`, `RUNNING`, `COMPLETED`, `PARTIALLY_COMPLETE`, `FAILED`, `ABORTED`                                                                                                           |
| `JobStatusFilter`       | `QUEUED`, `RUNNING`, `COMPLETED`, `PARTIALLY_COMPLETE`, `FAILED`, `ABORTED`                                                                                                                   |
| `JobType`               | `STATIC`, `DYNAMIC`, `CUSTOM`                                                                                                                                                                 |
| `PolicyType`            | `PROMPT_INJECTION`, `TOXIC_CONTENT`, `CUSTOM_TOPIC_GUARDRAILS`, `MALICIOUS_CODE_DETECTION`, `MALICIOUS_URL_DETECTION`, `SENSITIVE_DATA_PROTECTION`                                            |
| `ProfilingStatus`       | `INIT`, `QUEUED`, `IN_PROGRESS`, `COMPLETED`, `FAILED`                                                                                                                                        |
| `RedTeamCategory`       | `SECURITY`, `SAFETY`, `COMPLIANCE`, `BRAND`                                                                                                                                                   |
| `ResponseMode`          | `REST`, `STREAMING`                                                                                                                                                                           |
| `RiskRating`            | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`                                                                                                                                                           |
| `SafetySubCategory`     | `BIAS`, `CBRN`, `CYBERCRIME`, `DRUGS`, `HATE_TOXIC_ABUSE`, `NON_VIOLENT_CRIMES`, `POLITICAL`, `SELF_HARM`, `SEXUAL`, `VIOLENT_CRIMES_WEAPONS`                                                 |
| `SecuritySubCategory`   | `ADVERSARIAL_SUFFIX`, `EVASION`, `INDIRECT_PROMPT_INJECTION`, `JAILBREAK`, `MULTI_TURN`, `PROMPT_INJECTION`, `REMOTE_CODE_EXECUTION`, `SYSTEM_PROMPT_LEAK`, `TOOL_LEAK`, `MALWARE_GENERATION` |
| `SeverityFilter`        | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`                                                                                                                                                           |
| `StatusQueryParam`      | `SUCCESSFUL`, `FAILED`                                                                                                                                                                        |
| `StreamType`            | `NORMAL`, `ADVERSARIAL`                                                                                                                                                                       |
| `TargetConnectionType`  | `DATABRICKS`, `BEDROCK`, `OPENAI`, `HUGGING_FACE`, `CUSTOM`, `REST`, `STREAMING`                                                                                                              |
| `TargetStatus`          | `DRAFT`, `VALIDATING`, `VALIDATED`, `ACTIVE`, `INACTIVE`, `FAILED`, `PENDING_AUTH`                                                                                                            |
| `TargetType`            | `APPLICATION`, `AGENT`, `MODEL`                                                                                                                                                               |

---

## Error Types

```ts
class AISecSDKException extends Error {
  readonly errorType?: ErrorType;
}

enum ErrorType {
  SERVER_SIDE_ERROR = 'AISEC_SERVER_SIDE_ERROR',
  CLIENT_SIDE_ERROR = 'AISEC_CLIENT_SIDE_ERROR',
  USER_REQUEST_PAYLOAD_ERROR = 'AISEC_USER_REQUEST_PAYLOAD_ERROR',
  MISSING_VARIABLE = 'AISEC_MISSING_VARIABLE',
  AISEC_SDK_ERROR = 'AISEC_SDK_ERROR',
  OAUTH_ERROR = 'AISEC_OAUTH_ERROR',
}
```

---

## Constants

| Constant                           | Value                                                        |
| ---------------------------------- | ------------------------------------------------------------ |
| `DEFAULT_ENDPOINT`                 | `https://service.api.aisecurity.paloaltonetworks.com`        |
| `DEFAULT_MGMT_ENDPOINT`            | `https://api.sase.paloaltonetworks.com/aisec`                |
| `DEFAULT_TOKEN_ENDPOINT`           | `https://auth.apps.paloaltonetworks.com/oauth2/access_token` |
| `MAX_CONTENT_PROMPT_LENGTH`        | 2 MB                                                         |
| `MAX_CONTENT_RESPONSE_LENGTH`      | 2 MB                                                         |
| `MAX_CONTENT_CONTEXT_LENGTH`       | 100 MB                                                       |
| `MAX_NUMBER_OF_RETRIES`            | 5                                                            |
| `MAX_NUMBER_OF_BATCH_SCAN_OBJECTS` | 5                                                            |
| `MAX_NUMBER_OF_SCAN_IDS`           | 5                                                            |
| `MAX_NUMBER_OF_REPORT_IDS`         | 5                                                            |
| `HTTP_FORCE_RETRY_STATUS_CODES`    | [500, 502, 503, 504]                                         |
