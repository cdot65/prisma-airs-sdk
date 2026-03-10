// src/constants.ts — mirrors Python SDK constants/base.py

export const HEADER_API_KEY = 'x-pan-token';
export const HEADER_AUTH_TOKEN = 'Authorization';
export const PAYLOAD_HASH = 'x-payload-hash';
export const BEARER = 'Bearer ';

export const DEFAULT_ENDPOINT = 'https://service.api.aisecurity.paloaltonetworks.com';

/** Regional AIRS API endpoints. */
export const AIRS_ENDPOINTS = {
  US: 'https://service.api.aisecurity.paloaltonetworks.com',
  EU: 'https://service-de.api.aisecurity.paloaltonetworks.com',
  INDIA: 'https://service-in.api.aisecurity.paloaltonetworks.com',
  SINGAPORE: 'https://service-sg.api.aisecurity.paloaltonetworks.com',
} as const;

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
export const SDK_VERSION = '0.6.5';
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
export const MGMT_API_KEY_PATH = '/v1/mgmt/apikey';
export const MGMT_API_KEYS_TSG_PATH = '/v1/mgmt/apikeys/tsg';
export const MGMT_DLP_PROFILES_PATH = '/v1/mgmt/dlpprofiles';
export const MGMT_DEPLOYMENT_PROFILES_PATH = '/v1/mgmt/deploymentprofiles';
export const MGMT_SCAN_LOGS_PATH = '/v1/mgmt/scanlogs';
export const MGMT_CUSTOMER_APP_PATH = '/v1/mgmt/customerapp';
export const MGMT_CUSTOMER_APPS_TSG_PATH = '/v1/mgmt/customerapp/tsg';
export const MGMT_OAUTH_INVALIDATE_PATH = '/v1/mgmt/oauth/invalidateToken';
export const MGMT_OAUTH_TOKEN_PATH = '/v1/mgmt/oauth/client_credential/accesstoken';

// Model Security API defaults
export const DEFAULT_MODEL_SEC_DATA_ENDPOINT = 'https://api.sase.paloaltonetworks.com/aims/data';
export const DEFAULT_MODEL_SEC_MGMT_ENDPOINT = 'https://api.sase.paloaltonetworks.com/aims/mgmt';

// Model Security env vars
export const MODEL_SEC_CLIENT_ID = 'PANW_MODEL_SEC_CLIENT_ID';
export const MODEL_SEC_CLIENT_SECRET = 'PANW_MODEL_SEC_CLIENT_SECRET';
export const MODEL_SEC_TSG_ID = 'PANW_MODEL_SEC_TSG_ID';
export const MODEL_SEC_DATA_ENDPOINT = 'PANW_MODEL_SEC_DATA_ENDPOINT';
export const MODEL_SEC_MGMT_ENDPOINT = 'PANW_MODEL_SEC_MGMT_ENDPOINT';
export const MODEL_SEC_TOKEN_ENDPOINT = 'PANW_MODEL_SEC_TOKEN_ENDPOINT';

// API paths — model security data plane
export const MODEL_SEC_SCANS_PATH = '/v1/scans';
export const MODEL_SEC_EVALUATIONS_PATH = '/v1/evaluations';
export const MODEL_SEC_VIOLATIONS_PATH = '/v1/violations';

// API paths — model security management
export const MODEL_SEC_SECURITY_GROUPS_PATH = '/v1/security-groups';
export const MODEL_SEC_SECURITY_RULES_PATH = '/v1/security-rules';
export const MODEL_SEC_PYPI_AUTH_PATH = '/v1/pypi/authenticate';

// Red Team API defaults
export const DEFAULT_RED_TEAM_DATA_ENDPOINT =
  'https://api.sase.paloaltonetworks.com/ai-red-teaming/data-plane';
export const DEFAULT_RED_TEAM_MGMT_ENDPOINT =
  'https://api.sase.paloaltonetworks.com/ai-red-teaming/mgmt-plane';

// Red Team env vars
export const RED_TEAM_CLIENT_ID = 'PANW_RED_TEAM_CLIENT_ID';
export const RED_TEAM_CLIENT_SECRET = 'PANW_RED_TEAM_CLIENT_SECRET';
export const RED_TEAM_TSG_ID = 'PANW_RED_TEAM_TSG_ID';
export const RED_TEAM_DATA_ENDPOINT = 'PANW_RED_TEAM_DATA_ENDPOINT';
export const RED_TEAM_MGMT_ENDPOINT = 'PANW_RED_TEAM_MGMT_ENDPOINT';
export const RED_TEAM_TOKEN_ENDPOINT = 'PANW_RED_TEAM_TOKEN_ENDPOINT';

// API paths — red team data plane
export const RED_TEAM_SCAN_PATH = '/v1/scan';
export const RED_TEAM_CATEGORIES_PATH = '/v1/categories';
export const RED_TEAM_REPORT_STATIC_PATH = '/v1/report/static';
export const RED_TEAM_REPORT_DYNAMIC_PATH = '/v1/report/dynamic';
export const RED_TEAM_REPORT_PATH = '/v1/report';
export const RED_TEAM_CUSTOM_ATTACKS_REPORT_PATH = '/v1/custom-attacks';
export const RED_TEAM_DASHBOARD_PATH = '/v1/dashboard';
export const RED_TEAM_QUOTA_PATH = '/v1/metering/quota';
export const RED_TEAM_ERROR_LOG_PATH = '/v1/error-log/job';
export const RED_TEAM_SENTIMENT_PATH = '/v1/sentiment';

// API paths — red team management plane
export const RED_TEAM_TARGET_PATH = '/v1/target';
export const RED_TEAM_CUSTOM_ATTACK_PATH = '/v1/custom-attack';
export const RED_TEAM_MGMT_DASHBOARD_PATH = '/v1/dashboard/overview';
