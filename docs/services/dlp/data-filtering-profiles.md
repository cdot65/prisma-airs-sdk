# DLP — Data Filtering Profiles

Manage Data Filtering Profiles on the DLP service (`/v2/api/data-filtering-profiles`).

Subclient lives at `client.dlp.dataFilteringProfiles`. Surface is read + full-replace only — the underlying API does not expose create or delete.

Spec source: [`specs/dlp/DataFilteringProfiles.yaml`](https://github.com/cdot65/prisma-airs-sdk/blob/main/specs/dlp/DataFilteringProfiles.yaml)

## Setup

Same OAuth2 credentials as the rest of the Management API — reuses `PANW_MGMT_CLIENT_ID`, `PANW_MGMT_CLIENT_SECRET`, `PANW_MGMT_TSG_ID`. The DLP base URL defaults to `https://api.dlp.paloaltonetworks.com`; override via the `dlpEndpoint` constructor option (no env var).

```ts
import { ManagementClient } from '@cdot65/prisma-airs-sdk';

const client = new ManagementClient();
```

## list

Paginated `Page<DataFilteringProfileResponse>`. Optional filters: `status` (`enabled`/`disabled`), `name` (partial match). Sort entries emit one `sort=` query param each.

```ts
const page = await client.dlp.dataFilteringProfiles.list({
  page: 0,
  size: 20,
  sort: ['name,asc'],
  status: 'enabled',
});
console.log(page.totalElements, page.content.length);
```

## get

```ts
const profile = await client.dlp.dataFilteringProfiles.get('dfp-123');
console.log(profile.name, profile.direction);
```

## replace

Full PUT — body must satisfy `DataFilteringProfileRequest`. `file_based` and `non_file_based` are required. Returns the updated resource.

```ts
const updated = await client.dlp.dataFilteringProfiles.replace('dfp-123', {
  file_based: true,
  non_file_based: true,
  description: 'Outbound HR block',
  direction: 'UPLOAD',
  log_severity: 'HIGH',
  data_profile_id: 1001,
});
```
