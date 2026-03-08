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
  readonly apiKeys: ApiKeysClient;
  readonly customerApps: CustomerAppsClient;
  readonly dlpProfiles: DlpProfilesClient;
  readonly deploymentProfiles: DeploymentProfilesClient;
  readonly scanLogs: ScanLogsClient;
  readonly oauth: OAuthManagementClient;
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
  forceDelete(profileId: string, updatedBy: string): Promise<DeleteProfileResponse>;
}
```

### `TopicsClient`

```ts
class TopicsClient {
  create(request: CreateCustomTopicRequest): Promise<CustomTopic>;
  list(opts?: PaginationOptions): Promise<CustomTopicListResponse>;
  update(topicId: string, request: CreateCustomTopicRequest): Promise<CustomTopic>;
  delete(topicId: string): Promise<DeleteTopicResponse>;
  forceDelete(topicId: string, updatedBy?: string): Promise<DeleteTopicResponse>;
}
```

### `ApiKeysClient`

```ts
class ApiKeysClient {
  create(request: ApiKeyCreateRequest): Promise<ApiKey>;
  list(opts?: PaginationOptions): Promise<ApiKeyListResponse>;
  delete(apiKeyName: string, updatedBy: string): Promise<ApiKeyDeleteResponse>;
  regenerate(apiKeyId: string, request: ApiKeyRegenerateRequest): Promise<ApiKey>;
}
```

### `CustomerAppsClient`

```ts
class CustomerAppsClient {
  get(appName: string): Promise<CustomerApp>;
  list(opts?: PaginationOptions): Promise<CustomerAppListResponse>;
  update(customerAppId: string, request: CustomerApp): Promise<CustomerApp>;
  delete(appName: string, updatedBy: string): Promise<CustomerApp>;
}
```

### `DlpProfilesClient`

```ts
class DlpProfilesClient {
  list(): Promise<DlpProfileListResponse>;
}
```

### `DeploymentProfilesClient`

```ts
interface DeploymentProfileListOptions {
  unactivated?: boolean; // include unactivated profiles
}

class DeploymentProfilesClient {
  list(opts?: DeploymentProfileListOptions): Promise<DeploymentProfilesResponse>;
}
```

### `ScanLogsClient`

```ts
interface ScanLogQueryOptions {
  time_interval: number; // time range value
  time_unit: string; // e.g. 'hour', 'day'
  pageNumber: number; // 1-based page number
  pageSize: number; // records per page
  filter: string; // 'all', 'benign', or 'threat'
  page_token?: string; // encrypted pagination token
}

class ScanLogsClient {
  query(opts: ScanLogQueryOptions): Promise<PaginatedScanResults>;
}
```

### `OAuthManagementClient`

```ts
interface GetTokenOptions {
  body: ClientIdAndCustomerApp;
  tokenTtlInterval?: number;
  tokenTtlUnit?: string;
}

class OAuthManagementClient {
  invalidateToken(token: string, body: ClientIdAndCustomerApp): Promise<string>;
  getAccessToken(opts: GetTokenOptions): Promise<Oauth2Token>;
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

#### API Key Types

```ts
interface ApiKey {
  api_key_id?: string;
  api_key_last8?: string;
  auth_code?: string;
  expiration?: string;
  revoked?: boolean;
  [key: string]: unknown;
}

interface ApiKeyCreateRequest {
  auth_code: string;
  cust_app: string;
  revoked: boolean;
  created_by: string;
  api_key_name: string;
  rotation_time_interval: number;
  rotation_time_unit: string;
  [key: string]: unknown;
}

interface ApiKeyRegenerateRequest {
  rotation_time_interval: number;
  rotation_time_unit: string;
  [key: string]: unknown;
}

interface ApiKeyListResponse {
  api_keys?: ApiKey[];
  next_offset?: number;
}

interface ApiKeyDeleteResponse {
  message?: string;
  [key: string]: unknown;
}
```

#### Customer App Types

```ts
interface CustomerApp {
  tsg_id?: string;
  app_name?: string;
  cloud_provider?: string;
  environment?: string;
  [key: string]: unknown;
}

interface CustomerAppWithKeys {
  customer_appId?: string;
  tsg_id?: string;
  app_name?: string;
  cloud_provider?: string;
  environment?: string;
  api_keys_dp_info?: ApiKeyDPInfo[];
  [key: string]: unknown;
}

interface CustomerAppListResponse {
  customer_apps?: CustomerAppWithKeys[];
  next_offset?: number;
}
```

#### DLP Profile Types

```ts
interface DlpDataProfile {
  name: string;
  uuid: string;
  rule1?: { action?: string; [key: string]: unknown };
  rule2?: { action?: string; [key: string]: unknown };
  'log-severity'?: string;
  [key: string]: unknown;
}

interface DlpProfileListResponse {
  dlp_profiles?: DlpDataProfile[];
}
```

#### Deployment Profile Types

```ts
interface DeploymentProfileEntry {
  dp_name?: string;
  auth_code?: string;
  [key: string]: unknown;
}

interface DeploymentProfilesResponse {
  deployment_profiles?: DeploymentProfileEntry[];
  [key: string]: unknown;
}
```

#### Scan Log Types

```ts
interface ScanResultEntry {
  csp_id?: string;
  tsg_id?: string;
  scan_id?: string;
  scan_sub_req_id?: number;
  api_key_name?: string;
  app_name?: string;
  tokens?: number;
  text_records?: number;
  verdict?: string;
  action?: string;
  // ... 30+ optional fields for detection verdicts, metadata
  [key: string]: unknown;
}

interface PaginatedScanResults {
  total_pages?: number;
  page_number?: number;
  page_size?: number;
  page_token?: string;
  scan_results?: ScanResultEntry[];
  [key: string]: unknown;
}
```

#### OAuth Types

```ts
interface ClientIdAndCustomerApp {
  client_id: string;
  customer_app: string;
}

interface Oauth2Token {
  access_token: string;
  expires_in?: string;
  token_type?: string;
  [key: string]: unknown;
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
interface ModelSecurityScanListOptions {
  skip?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: string;
  search_query?: string;
  eval_outcomes?: string[];
  source_types?: string[];
  security_group_uuid?: string;
  start_time?: string;
  end_time?: string;
  labels_query?: string;
}

interface ModelSecurityEvaluationListOptions {
  skip?: number;
  limit?: number;
  sort_field?: string;
  sort_order?: string;
  result?: string;
  rule_instance_uuid?: string;
}

interface ModelSecurityFileListOptions {
  skip?: number;
  limit?: number;
  sort_field?: string;
  sort_dir?: string;
  type?: string;
  result?: string;
  query_path?: string;
}

interface ModelSecurityLabelListOptions {
  skip?: number;
  limit?: number;
  search?: string;
}

interface ModelSecurityViolationListOptions {
  skip?: number;
  limit?: number;
}

class ModelSecurityScansClient {
  create(request: ScanCreateRequest): Promise<ScanBaseResponse>;
  list(opts?: ModelSecurityScanListOptions): Promise<ScanList>;
  get(uuid: string): Promise<ScanBaseResponse>;
  getEvaluations(
    scanUuid: string,
    opts?: ModelSecurityEvaluationListOptions,
  ): Promise<RuleEvaluationList>;
  getFiles(scanUuid: string, opts?: ModelSecurityFileListOptions): Promise<FileList>;
  addLabels(scanUuid: string, request: LabelsCreateRequest): Promise<LabelsResponse>;
  setLabels(scanUuid: string, request: LabelsCreateRequest): Promise<LabelsResponse>;
  deleteLabels(scanUuid: string, keys: string[]): Promise<void>;
  getViolations(scanUuid: string, opts?: ModelSecurityViolationListOptions): Promise<ViolationList>;
  getLabelKeys(opts?: ModelSecurityLabelListOptions): Promise<LabelKeyList>;
  getLabelValues(key: string, opts?: ModelSecurityLabelListOptions): Promise<LabelValueList>;
  getEvaluation(uuid: string): Promise<RuleEvaluationResponse>;
  getViolation(uuid: string): Promise<ViolationResponse>;
}
```

### `ModelSecurityGroupsClient`

Management plane security group operations.

```ts
class ModelSecurityGroupsClient {
  create(request: ModelSecurityGroupCreateRequest): Promise<ModelSecurityGroupResponse>;
  list(opts?: ModelSecurityGroupListOptions): Promise<ListModelSecurityGroupsResponse>;
  get(uuid: string): Promise<ModelSecurityGroupResponse>;
  update(
    uuid: string,
    request: ModelSecurityGroupUpdateRequest,
  ): Promise<ModelSecurityGroupResponse>;
  delete(uuid: string): Promise<void>;
  listRuleInstances(
    securityGroupUuid: string,
    opts?: ModelSecurityRuleInstanceListOptions,
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
  list(opts?: ModelSecurityRuleListOptions): Promise<ListModelSecurityRulesResponse>;
  get(uuid: string): Promise<ModelSecurityRuleResponse>;
}
```

### Model Security List Options

```ts
interface ModelSecurityGroupListOptions {
  skip?: number;
  limit?: number;
  sort_field?: string; // 'created_at' | 'updated_at'
  sort_dir?: string; // 'asc' | 'desc'
  source_types?: string[];
  search_query?: string; // 3-1000 chars
  enabled_rules?: string[]; // rule UUIDs with ALLOWING/BLOCKING state
}

interface ModelSecurityRuleListOptions {
  skip?: number;
  limit?: number;
  source_type?: string;
  search_query?: string; // 3-1000 chars
}

interface ModelSecurityRuleInstanceListOptions {
  skip?: number;
  limit?: number;
  security_rule_uuid?: string;
  state?: string; // 'DISABLED' | 'ALLOWING' | 'BLOCKING'
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
  attack_type?: string;
  threat?: boolean;
}

interface GoalListOptions extends RedTeamListOptions {
  goal_type?: string;
  status?: string;
  count?: boolean;
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
  downloadReport(jobId: string, format: string): Promise<unknown>;
  generatePartialReport(jobId: string): Promise<unknown>;
}
```

### `RedTeamCustomAttackReportsClient`

Data plane custom attack report operations.

```ts
interface PromptsBySetListOptions extends RedTeamListOptions {
  is_threat?: boolean;
}

interface CustomAttacksReportListOptions extends RedTeamListOptions {
  threat?: boolean;
  prompt_set_id?: string;
  property_value?: string;
}

class RedTeamCustomAttackReportsClient {
  getReport(jobId: string): Promise<CustomAttackReportResponse>;
  getPromptSets(jobId: string): Promise<PromptSetsReportResponse>;
  getPromptsBySet(
    jobId: string,
    promptSetId: string,
    opts?: PromptsBySetListOptions,
  ): Promise<PromptDetailResponse[]>;
  getPromptDetail(jobId: string, promptId: string): Promise<PromptDetailResponse>;
  listCustomAttacks(
    jobId: string,
    opts?: CustomAttacksReportListOptions,
  ): Promise<CustomAttacksListResponse>;
  getAttackOutputs(jobId: string, attackId: string): Promise<CustomAttackOutput[]>;
  getPropertyStats(jobId: string): Promise<PropertyStatistic[]>;
}
```

### `RedTeamTargetsClient`

Management plane target operations.

```ts
interface TargetListOptions extends RedTeamListOptions {
  target_type?: string;
  status?: string;
}

interface TargetOperationOptions {
  validate?: boolean; // validate connection before saving
}

class RedTeamTargetsClient {
  create(request: TargetCreateRequest, opts?: TargetOperationOptions): Promise<TargetResponse>;
  list(opts?: TargetListOptions): Promise<TargetList>;
  get(uuid: string): Promise<TargetResponse>;
  update(
    uuid: string,
    request: TargetUpdateRequest,
    opts?: TargetOperationOptions,
  ): Promise<TargetResponse>;
  delete(uuid: string): Promise<BaseResponse>;
  probe(request: TargetProbeRequest): Promise<TargetResponse>;
  getProfile(uuid: string): Promise<TargetProfileResponse>;
  updateProfile(uuid: string, request: TargetContextUpdate): Promise<TargetResponse>;
}
```

### `RedTeamCustomAttacksClient`

Management plane custom attack/prompt set operations.

```ts
interface PromptSetListOptions extends RedTeamListOptions {
  status?: string;
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
  uploadPromptsCsv(promptSetUuid: string, file: Blob): Promise<BaseResponse>;

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
import {
  Verdict,
  Action,
  Category,
  DetectionServiceName,
  ContentErrorType,
  ErrorStatus,
} from '@cdot65/prisma-airs-sdk';

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

// DetectionServiceName — detection service identifiers
DetectionServiceName.DLP; // 'dlp'
DetectionServiceName.INJECTION; // 'injection'
DetectionServiceName.URL_CATS; // 'url_cats'
DetectionServiceName.TOXIC_CONTENT; // 'toxic_content'
DetectionServiceName.MALICIOUS_CODE; // 'malicious_code'
DetectionServiceName.AGENT; // 'agent'
DetectionServiceName.TOPIC_VIOLATION; // 'topic_violation'
DetectionServiceName.DB_SECURITY; // 'db_security'
DetectionServiceName.UNGROUNDED; // 'ungrounded'

// ContentErrorType — content type in error reports
ContentErrorType.PROMPT; // 'prompt'
ContentErrorType.RESPONSE; // 'response'

// ErrorStatus — detection service error status
ErrorStatus.ERROR; // 'error'
ErrorStatus.TIMEOUT; // 'timeout'
```

Types are also exported: `Verdict`, `Action`, `Category`, `DetectionServiceName`, `ContentErrorType`, `ErrorStatus` (union of literal string values).

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

### `AIRS_ENDPOINTS`

Regional AIRS API service URLs for multi-region support:

```ts
import { AIRS_ENDPOINTS } from '@cdot65/prisma-airs-sdk';

AIRS_ENDPOINTS.US; // 'https://service.api.aisecurity.paloaltonetworks.com'
AIRS_ENDPOINTS.EU; // 'https://service-de.api.aisecurity.paloaltonetworks.com'
AIRS_ENDPOINTS.INDIA; // 'https://service-in.api.aisecurity.paloaltonetworks.com'
AIRS_ENDPOINTS.SINGAPORE; // 'https://service-sg.api.aisecurity.paloaltonetworks.com'
```

---

## Detection Report Types

Typed Zod schemas for all detection service reports returned in `ThreatScanReport.detection_results[].result_detail`.

### `DSResultMetadata`

```ts
interface DSResultMetadata {
  score?: number;
  confidence?: string;
  ecosystem?: string; // e.g. 'mcp'
  method?: string; // e.g. 'tools/call'
  server_name?: string;
  tool_invoked?: string;
  direction?: string; // 'input' | 'output'
}
```

### `DSDetailResult`

```ts
interface DSDetailResult {
  urlf_report?: UrlfEntry[];
  dlp_report?: DlpReport;
  dbs_report?: DbsEntry[];
  tc_report?: TcReport;
  mc_report?: McReport;
  agent_report?: AgentReport;
  topic_guardrails_report?: TgReport;
  cg_report?: CgReport;
}
```

### Report Types

| Type                  | Fields                                                                                                                                                                            |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TcReport`            | `confidence?`, `verdict?`                                                                                                                                                         |
| `DbsEntry`            | `sub_type?`, `verdict?`, `action?`                                                                                                                                                |
| `McReport`            | `all_code_blocks?`, `code_analysis_by_type?`, `verdict?`, `malware_script_report?`, `command_injection_report?`                                                                   |
| `McEntry`             | `file_type?`, `code_sha256?`                                                                                                                                                      |
| `MalwareReport`       | `verdict?`                                                                                                                                                                        |
| `CmdEntry`            | `code_block?`, `verdict?`                                                                                                                                                         |
| `AgentReport`         | `model_verdict?`, `agent_framework?`, `agent_patterns?`                                                                                                                           |
| `AgentEntry`          | `category_type?`, `verdict?`                                                                                                                                                      |
| `TgReport`            | `allowed_topic_list?`, `blocked_topic_list?`, `allowedTopics?`, `blockedTopics?`                                                                                                  |
| `CgReport`            | `status?`, `explanation?`, `category?`                                                                                                                                            |
| `UrlfEntry`           | `url?`, `risk_level?`, `action?`, `categories?`                                                                                                                                   |
| `DlpReport`           | `dlp_report_id?`, `dlp_profile_name?`, `dlp_profile_id?`, `dlp_profile_version?`, `data_pattern_rule1_verdict?`, `data_pattern_rule2_verdict?`, `data_pattern_detection_offsets?` |
| `DlpPatternDetection` | `data_pattern_id?`, `version?`, `name?`, `high_confidence_detections?`, `medium_confidence_detections?`, `low_confidence_detections?`                                             |
| `PatternDetection`    | `pattern?`, `locations?`                                                                                                                                                          |
| `ContentError`        | `content_type?`, `feature?`, `status?`                                                                                                                                            |

### `ScanResponse` (updated)

Now includes `timeout`, `error`, and `errors` fields:

```ts
interface ScanResponse {
  report_id: string;
  scan_id: string;
  category: string;
  action: string;
  timeout?: boolean;
  error?: boolean;
  errors?: ContentError[];
  // ... other fields unchanged
}
```
