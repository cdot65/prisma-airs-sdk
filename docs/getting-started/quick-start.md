# Quick Start

## Scan API — Content Scanning

```ts
import { init, Scanner, Content } from '@cdot65/prisma-airs-sdk';

// Initialize with env vars or explicit options
init({ apiKey: 'your-api-key' });

const scanner = new Scanner();
const content = new Content({ prompt: 'Tell me how to hack a server' });

const result = await scanner.syncScan({ profile_name: 'my-profile' }, content);

console.log(result.category); // 'malicious'
console.log(result.action); // 'block'
```

## Management API — Security Profiles

```ts
import { ManagementClient } from '@cdot65/prisma-airs-sdk';

const client = new ManagementClient(); // reads PANW_MGMT_* env vars

// List profiles
const { ai_profiles } = await client.profiles.list();
for (const p of ai_profiles) {
  console.log(p.profile_name, p.profile_id);
}

// Create a custom topic
const topic = await client.topics.create({
  topic_name: 'credit-card-numbers',
  description: 'Detects credit card numbers',
  examples: ['4111-1111-1111-1111', '5500 0000 0000 0004'],
});
```

## Model Security API — Model Scanning

```ts
import { ModelSecurityClient } from '@cdot65/prisma-airs-sdk';

const client = new ModelSecurityClient(); // falls back to PANW_MGMT_* env vars

// List scans
const scans = await client.scans.list({ limit: 10 });
for (const scan of scans.scans) {
  console.log(scan.uuid, scan.eval_outcome);
}

// List security groups
const groups = await client.securityGroups.list();
for (const g of groups.security_groups) {
  console.log(g.name, g.state);
}
```

## Red Team API — AI Red Teaming

```ts
import { RedTeamClient } from '@cdot65/prisma-airs-sdk';

const client = new RedTeamClient(); // falls back to PANW_MGMT_* env vars

// List scans
const scans = await client.scans.list({ limit: 5 });
for (const job of scans.data ?? []) {
  console.log(job.name, job.status, job.job_type);
}

// List targets
const targets = await client.targets.list();
for (const t of targets.data ?? []) {
  console.log(t.name, t.target_type, t.status);
}

// Get attack categories
const categories = await client.scans.getCategories();
for (const cat of categories) {
  console.log(cat.display_name, cat.sub_categories.length, 'subcategories');
}
```

## Running Examples

```bash
cp .env.example .env   # fill in credentials

# Scan API
npm run example:scan
npm run example:async-scan
npm run example:query

# Management API
npm run example:mgmt-auth
npm run example:mgmt-profiles
npm run example:mgmt-topics

# Model Security API
npm run example:model-sec-scans

# Red Team API
npm run example:red-team-scans
npm run example:red-team-targets
```
