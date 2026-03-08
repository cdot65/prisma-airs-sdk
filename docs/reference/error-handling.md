# Error Handling

All SDK errors throw `AISecSDKException` with a typed `errorType` property.

## Error Types

| ErrorType                    | Value                              | When                                         |
| ---------------------------- | ---------------------------------- | -------------------------------------------- |
| `SERVER_SIDE_ERROR`          | `AISEC_SERVER_SIDE_ERROR`          | 5xx responses from the API                   |
| `CLIENT_SIDE_ERROR`          | `AISEC_CLIENT_SIDE_ERROR`          | 4xx responses / network failures             |
| `USER_REQUEST_PAYLOAD_ERROR` | `AISEC_USER_REQUEST_PAYLOAD_ERROR` | Invalid input (bad UUID, oversized content)  |
| `MISSING_VARIABLE`           | `AISEC_MISSING_VARIABLE`           | Missing required config (API key, client ID) |
| `AISEC_SDK_ERROR`            | `AISEC_SDK_ERROR`                  | Internal SDK errors                          |
| `OAUTH_ERROR`                | `AISEC_OAUTH_ERROR`                | OAuth2 token fetch failures                  |

## Usage

```ts
import { AISecSDKException, ErrorType } from '@cdot65/prisma-airs-sdk';

try {
  await scanner.syncScan(profile, content);
} catch (err) {
  if (err instanceof AISecSDKException) {
    switch (err.errorType) {
      case ErrorType.SERVER_SIDE_ERROR:
        console.error('Server error — retry later:', err.message);
        break;
      case ErrorType.CLIENT_SIDE_ERROR:
        console.error('Bad request:', err.message);
        break;
      case ErrorType.USER_REQUEST_PAYLOAD_ERROR:
        console.error('Invalid input:', err.message);
        break;
      case ErrorType.MISSING_VARIABLE:
        console.error('Missing config:', err.message);
        break;
      case ErrorType.OAUTH_ERROR:
        console.error('Auth failed:', err.message);
        break;
    }
  }
}
```

## Retry Behavior

The SDK automatically retries on transient errors:

- **Status codes**: 500, 502, 503, 504
- **Backoff**: Exponential (`2^attempt * 1000ms`)
- **Max retries**: Configurable 0-5, default 5
- **401 handling**: Management/Model Security/Red Team clients automatically refresh the OAuth token and retry once
