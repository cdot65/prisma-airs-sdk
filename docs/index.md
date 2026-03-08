---
title: Home
---

# Prisma AIRS SDK

[![CI](https://github.com/cdot65/prisma-airs-sdk/actions/workflows/ci.yml/badge.svg)](https://github.com/cdot65/prisma-airs-sdk/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@cdot65/prisma-airs-sdk)](https://www.npmjs.com/package/@cdot65/prisma-airs-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node 18+](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6.svg)](https://www.typescriptlang.org/)

**Prisma AIRS SDK** is a TypeScript SDK for Palo Alto Networks **AI Runtime Security (AIRS)**. It provides type-safe clients for all four AIRS service domains — real-time content scanning, security configuration management, model security analysis, and AI red teaming.

Zero external HTTP dependencies. Native `fetch` + `crypto`. ESM-first with dual CJS/ESM exports.

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

## Feature Highlights

!!! tip "Real-Time Content Scanning"
Synchronous and asynchronous scanning of AI prompts and responses. Detect prompt injection, toxic content, data leaks, and malicious URLs inline with your application.

!!! tip "Model Security"
Scan ML models for supply chain threats — malicious code execution, backdoors, unapproved file formats. Manage security groups and rules for automated model governance.

!!! tip "AI Red Teaming"
Run automated red team scans against AI targets. Static attack libraries, dynamic agent-based testing, custom prompt sets, and comprehensive reporting with remediation guidance.

!!! tip "Type-Safe Everything"
50 typed enum const objects, ~135 Zod schemas with `.passthrough()` for forward compatibility, and JSDoc on every exported symbol. Full IDE autocompletion out of the box.

---

## Quick Links

|                                                          |                                                                    |
| -------------------------------------------------------- | ------------------------------------------------------------------ |
| **[Getting Started](getting-started/installation.md)**   | Install the SDK, configure credentials, and run your first scan.   |
| **[Scan API](services/scan-api.md)**                     | Real-time content scanning for AI prompts and responses.           |
| **[Management API](services/management-api.md)**         | CRUD for security profiles and custom topics.                      |
| **[Model Security API](services/model-security-api.md)** | Model supply chain scanning and security group management.         |
| **[Red Team API](services/red-team-api.md)**             | Automated red team scanning, reports, targets, and custom attacks. |
| **[API Reference](reference/api-reference.md)**          | Complete method signatures, types, and enums.                      |
