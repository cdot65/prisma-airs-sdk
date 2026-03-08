---
title: Home
---

<div class="hero" markdown>

![Prisma AIRS SDK Logo](images/prisma-airs-sdk.svg){ .hero-logo }

# Prisma AIRS SDK

**TypeScript SDK for Palo Alto Networks Prisma AIRS**

[![CI](https://github.com/cdot65/prisma-airs-sdk/actions/workflows/ci.yml/badge.svg)](https://github.com/cdot65/prisma-airs-sdk/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@cdot65/prisma-airs-sdk)](https://www.npmjs.com/package/@cdot65/prisma-airs-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node 18+](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6.svg)](https://www.typescriptlang.org/)

</div>

---

Type-safe clients for all four AIRS service domains — real-time content scanning, security configuration management, model security analysis, and AI red teaming. Zero external HTTP dependencies. Native `fetch` + `crypto`. ESM-first with dual CJS/ESM exports.

<div class="grid cards" markdown>

- :material-shield-search:{ .lg .middle } **Real-Time Content Scanning**

  ***

  Synchronous and asynchronous scanning of AI prompts and responses. Detect prompt injection, toxic content, data leaks, and malicious URLs inline.

- :material-cog-outline:{ .lg .middle } **Security Management**

  ***

  Full CRUD for security profiles and custom topics. Programmatically manage your AIRS configuration at scale.

- :material-robot-outline:{ .lg .middle } **Model Security**

  ***

  Scan ML models for supply chain threats — malicious code execution, backdoors, unapproved file formats. Manage security groups and rules.

- :material-sword-cross:{ .lg .middle } **AI Red Teaming**

  ***

  Run automated red team scans against AI targets. Static attack libraries, dynamic agent-based testing, custom prompt sets, and comprehensive reporting.

- :material-language-typescript:{ .lg .middle } **Type-Safe Everything**

  ***

  50 typed enum const objects, ~135 Zod schemas with `.passthrough()` for forward compatibility, and JSDoc on every exported symbol.

- :material-lightning-bolt:{ .lg .middle } **Zero Dependencies**

  ***

  Native `fetch` + `crypto` only. No external HTTP libraries. Exponential backoff retry built in. ES2022 target, Node 18+.

</div>

---

## Four Independent APIs

```mermaid
flowchart LR
    SDK["@cdot65/prisma-airs-sdk"]
    SDK --> SCAN["Scan API"]
    SDK --> MGMT["Management API"]
    SDK --> MSEC["Model Security API"]
    SDK --> RTAM["Red Team API"]

    SCAN --> S1["syncScan / asyncScan"]
    MGMT --> M1["Profiles / Topics CRUD"]
    MSEC --> MS1["Model Scans / Security Groups"]
    RTAM --> RT1["Scans / Reports / Targets"]
```

---

## Get Started

<div class="grid cards" markdown>

- :material-download:{ .lg .middle } **Install**

  ***

  Install the SDK, configure credentials, and connect to AIRS.

  [:octicons-arrow-right-24: Installation](getting-started/installation.md)

- :material-rocket-launch:{ .lg .middle } **Quick Start**

  ***

  Scanning, management, and more in under 5 minutes.

  [:octicons-arrow-right-24: Quick Start](getting-started/quick-start.md)

- :material-cog:{ .lg .middle } **Configure**

  ***

  Environment variables, auth methods, and endpoint setup.

  [:octicons-arrow-right-24: Configuration](getting-started/configuration.md)

- :material-book-open-variant:{ .lg .middle } **API Reference**

  ***

  Complete method signatures, types, enums, and error handling.

  [:octicons-arrow-right-24: API Reference](reference/api-reference.md)

</div>
