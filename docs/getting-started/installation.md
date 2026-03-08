# Installation

## Requirements

- Node.js 18 or later
- npm, yarn, or pnpm

## Install

```bash
npm install @cdot65/prisma-airs-sdk
```

The package ships with dual CJS/ESM exports and TypeScript type declarations. No additional `@types/` packages needed.

## Module Format

The SDK is ESM-first (`"type": "module"`) with dual exports:

```ts
// ESM (recommended)
import { init, Scanner, Content } from '@cdot65/prisma-airs-sdk';

// CJS (also supported)
const { init, Scanner, Content } = require('@cdot65/prisma-airs-sdk');
```

## Dependencies

| Dependency | Purpose                                     |
| ---------- | ------------------------------------------- |
| `zod`      | Runtime schema validation for API responses |

That's it. The SDK uses native `fetch` and `crypto` — zero external HTTP dependencies.

## Verify Installation

```ts
import { SDK_VERSION } from '@cdot65/prisma-airs-sdk';
console.log(`AIRS SDK v${SDK_VERSION}`);
```
