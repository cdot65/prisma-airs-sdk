# API Reference

Complete public API surface of `@cdot65/prisma-airs-sdk`.

## Scan API

### `init(opts?: InitOptions): void`

Initialize the global scan API configuration. Must be called before using `Scanner`.

```ts
interface InitOptions {
  apiKey?: string;       // or env PANW_AI_SEC_API_KEY
  apiToken?: string;     // or env PANW_AI_SEC_API_TOKEN
  apiEndpoint?: string;  // or env PANW_AI_SEC_API_ENDPOINT
  numRetries?: number;   // 0-5, default 5
}
```

### `Scanner`

```ts
class Scanner {
  syncScan(aiProfile: AiProfile, content: Content, opts?: SyncScanOptions): Promise<ScanResponse>
  asyncScan(scanObjects: AsyncScanObject[]): Promise<AsyncScanResponse>
  queryByScanIds(scanIds: string[]): Promise<ScanIdResult[]>
  queryByReportIds(reportIds: string[]): Promise<ThreatScanReport[]>
}
```

### `Content`

```ts
interface ContentOptions {
  prompt?: string;       // max 2 MB
  response?: string;     // max 2 MB
  context?: string;      // max 100 MB
  codePrompt?: string;   // max 2 MB
  codeResponse?: string; // max 2 MB
  toolEvent?: ToolEvent;
}

class Content {
  constructor(opts: ContentOptions)  // at least one field required
  prompt: string | undefined
  response: string | undefined
  context: string | undefined
  codePrompt: string | undefined
  codeResponse: string | undefined
  toolEvent: ToolEvent | undefined
  length: number                     // total byte length
  toJSON(): ScanRequestContentsInner
  static fromJSON(json: ScanRequestContentsInner): Content
  static fromJSONFile(filePath: string): Content
}
```

### `SyncScanOptions`

```ts
interface SyncScanOptions {
  trId?: string;        // max 100 chars
  sessionId?: string;   // max 100 chars
  metadata?: Metadata;
}
```

### `AiProfile`

```ts
// At least one required
interface AiProfile {
  profile_id?: string;   // UUID
  profile_name?: string; // max 100 chars
}
```

---

## Management API

### `ManagementClient`

```ts
interface ManagementClientOptions {
  clientId?: string;       // or env PANW_MGMT_CLIENT_ID (required)
  clientSecret?: string;   // or env PANW_MGMT_CLIENT_SECRET (required)
  tsgId?: string;          // or env PANW_MGMT_TSG_ID (required)
  apiEndpoint?: string;    // or env PANW_MGMT_ENDPOINT
  tokenEndpoint?: string;  // or env PANW_MGMT_TOKEN_ENDPOINT
  numRetries?: number;     // 0-5, default 5
}

class ManagementClient {
  constructor(opts?: ManagementClientOptions)
  readonly profiles: ProfilesClient
  readonly topics: TopicsClient
}
```

### `ProfilesClient`

```ts
interface PaginationOptions {
  offset?: number;  // default 0
  limit?: number;   // default 100
}

class ProfilesClient {
  create(request: CreateSecurityProfileRequest): Promise<SecurityProfile>
  list(opts?: PaginationOptions): Promise<SecurityProfileListResponse>
  update(profileId: string, request: CreateSecurityProfileRequest): Promise<SecurityProfile>
  delete(profileId: string): Promise<DeleteProfileResponse>
}
```

### `TopicsClient`

```ts
class TopicsClient {
  create(request: CreateCustomTopicRequest): Promise<CustomTopic>
  list(opts?: PaginationOptions): Promise<CustomTopicListResponse>
  update(topicId: string, request: CreateCustomTopicRequest): Promise<CustomTopic>
  delete(topicId: string): Promise<DeleteTopicResponse>
  forceDelete(topicId: string): Promise<DeleteTopicResponse>
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
  policy?: Policy;           // passthrough — accepts any shape
  created_by?: string;
  updated_by?: string;
  last_modified_ts?: string;
  [key: string]: unknown;    // forward-compat via .passthrough()
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
interface DeleteProfileResponse { message: string }
interface DeleteTopicResponse { message: string }

// 409 conflict shapes (when resource is referenced)
interface DeleteProfileConflict { message: string; payload: { policy_id: string; policy_name: string; priority: number }[] }
interface DeleteTopicConflict { message: string; payload: { profile_id: string; profile_name: string; revision: number }[] }
```

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

| Constant | Value |
|----------|-------|
| `DEFAULT_ENDPOINT` | `https://service.api.aisecurity.paloaltonetworks.com` |
| `DEFAULT_MGMT_ENDPOINT` | `https://api.sase.paloaltonetworks.com/aisec` |
| `DEFAULT_TOKEN_ENDPOINT` | `https://auth.apps.paloaltonetworks.com/oauth2/access_token` |
| `MAX_CONTENT_PROMPT_LENGTH` | 2 MB |
| `MAX_CONTENT_RESPONSE_LENGTH` | 2 MB |
| `MAX_CONTENT_CONTEXT_LENGTH` | 100 MB |
| `MAX_NUMBER_OF_RETRIES` | 5 |
| `MAX_NUMBER_OF_BATCH_SCAN_OBJECTS` | 5 |
| `MAX_NUMBER_OF_SCAN_IDS` | 5 |
| `MAX_NUMBER_OF_REPORT_IDS` | 5 |
| `HTTP_FORCE_RETRY_STATUS_CODES` | [500, 502, 503, 504] |
