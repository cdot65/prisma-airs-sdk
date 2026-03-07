// src/constants.ts — mirrors Python SDK constants/base.py

export const HEADER_API_KEY = 'x-pan-token';
export const HEADER_AUTH_TOKEN = 'Authorization';
export const PAYLOAD_HASH = 'x-payload-hash';
export const BEARER = 'Bearer ';

export const DEFAULT_ENDPOINT = 'https://service.api.aisecurity.paloaltonetworks.com';

// Environment variable names
export const AI_SEC_API_KEY = 'PANW_AI_SEC_API_KEY';
export const AI_SEC_API_TOKEN = 'PANW_AI_SEC_API_TOKEN';
export const AI_SEC_API_ENDPOINT = 'PANW_AI_SEC_API_ENDPOINT';

// Content length limits (bytes)
export const MAX_CONTENT_PROMPT_LENGTH = 2 * 1024 * 1024; // 2 MB
export const MAX_CONTENT_RESPONSE_LENGTH = 2 * 1024 * 1024; // 2 MB
export const MAX_CONTENT_CONTEXT_LENGTH = 100 * 1024 * 1024; // 100 MB

// Auth limits
export const MAX_API_KEY_LENGTH = 2048;
export const MAX_TOKEN_LENGTH = 2048;

// String length limits
export const MAX_TRANSACTION_ID_STR_LENGTH = 100;
export const MAX_SESSION_ID_STR_LENGTH = 100;
export const MAX_SCAN_ID_STR_LENGTH = 36;
export const MAX_REPORT_ID_STR_LENGTH = 40;
export const MAX_AI_PROFILE_NAME_LENGTH = 100;

// Batch / query limits
export const MAX_NUMBER_OF_SCAN_IDS = 5;
export const MAX_NUMBER_OF_REPORT_IDS = 5;
export const MAX_NUMBER_OF_BATCH_SCAN_OBJECTS = 5;

// HTTP / retry
export const MAX_CONNECTION_POOL_SIZE = 100;
export const MAX_NUMBER_OF_RETRIES = 5;
export const HTTP_FORCE_RETRY_STATUS_CODES = [500, 502, 503, 504];

// User-Agent (version injected at build time or read from package.json)
export const SDK_VERSION = '0.2.0';
export const USER_AGENT = `PAN-AIRS/${SDK_VERSION}-typescript-sdk`;

// Management API defaults
export const DEFAULT_MGMT_ENDPOINT = 'https://api.sase.paloaltonetworks.com/aisec';
export const DEFAULT_TOKEN_ENDPOINT = 'https://auth.apps.paloaltonetworks.com/oauth2/access_token';

// Management env vars
export const MGMT_CLIENT_ID = 'PANW_MGMT_CLIENT_ID';
export const MGMT_CLIENT_SECRET = 'PANW_MGMT_CLIENT_SECRET';
export const MGMT_TSG_ID = 'PANW_MGMT_TSG_ID';
export const MGMT_ENDPOINT = 'PANW_MGMT_ENDPOINT';
export const MGMT_TOKEN_ENDPOINT = 'PANW_MGMT_TOKEN_ENDPOINT';

// API paths — scan
export const SYNC_SCAN_PATH = '/v1/scan/sync/request';
export const ASYNC_SCAN_PATH = '/v1/scan/async/request';
export const SCAN_RESULTS_PATH = '/v1/scan/results';
export const SCAN_REPORTS_PATH = '/v1/scan/reports';

// API paths — management
export const MGMT_PROFILE_PATH = '/v1/mgmt/profile';
export const MGMT_PROFILES_TSG_PATH = '/v1/mgmt/profiles/tsg';
export const MGMT_TOPIC_PATH = '/v1/mgmt/topic';
export const MGMT_TOPICS_TSG_PATH = '/v1/mgmt/topics/tsg';
export const MGMT_TOPIC_FORCE_PATH = '/v1/mgmt/topic/force';
