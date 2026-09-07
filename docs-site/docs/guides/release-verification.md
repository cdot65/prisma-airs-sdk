---
title: Published-package examples
---

# Published-package examples

## CLI 4.4.0 registry and container verification

CLI **4.4.0** is published, independently installed from npm and upgraded in the user prefix. It pins the already-published SDK **0.25.0** exactly; all seven payload files and 19 exports match the tested npm archive. Registry integrity agrees at **2026-09-07T12:28:22.542Z**: **123,664 bytes**, SHA-256 **`f53c31400945a4004d15c5a7368f97dae6101c8ccbb97d71f5821dbf86dcb7c1`**.

- Registry grouped filters: **103/103**, **2026-09-07T12:32:16.444Z**.
- Registry chart contracts: **54/54**, **2026-09-07T12:35:21.598Z**.
- Registry inference: **8/8**, **2026-09-07T12:29:23.185Z**.
- Registry empty-window JSON/YAML: **3/3**, **2026-09-07T12:29:09.610Z**.
- User-installed cross-service reads/benign scan: **12/12**, **2026-09-07T12:29:31.518Z**.
- Independent historical release-key retirement: **36/36**, **2026-09-07T12:30:44.576Z**.
- Native DLP: **11/11 registry** at **2026-09-07T12:26:53.881Z**, **11/11 user-installed** at **2026-09-07T12:29:11.324Z**.

All 1,268 CLI tests and 14 release-policy/diagnostic tests pass; the existing library-only coverage scope reports 95.97% lines/statements, 95.48% functions and 87.34% branches. Frozen and fresh registry production audits are clean. The [container workflow](https://github.com/cdot65/prisma-airs-cli/actions/runs/34121350201) passes 11/11 native checks on each actual architecture without runtime network or credentials, then verifies minor/latest aliases at **`sha256:6134107b600e76491a70bcbdc261337abe9d53673082c1cc1a058676c87e6b52`**. Temporary native corpora are cleaned up before success is recorded. Host checks use the disclosed process-only font configuration; container checks use packaged fonts.

Failed attempts remain in history: the first grouped candidate run passed 102/103, the first registry chart run 53/54, and the first public browser run 10/11 with a DNS-resolution failure. The complete subsequent suites pass without changing validation, SDK retries, models, credentials or infrastructure. The chart rerun is serialized after the grouped suite; the masked initial subprocess failure does not establish a root cause. Registry metadata visibility lagged successful publication; no duplicate publication was attempted.

The credential file remains unchanged and no runtime key is persisted. All 101 grouped-filter pairs and all 52 chart-filter pairs are reproduced on the CLI telemetry page. Direct Gateway coverage remains **138/242 (57.02%)**, all 22 analytics adaptations remain partial, and the full-project assessment remains **5/10**. Existing service/provider/entitlement failures, SDK documentation dependency advisories, public WAN and anonymous container-pull limits remain open. No realtime CLI command or successful provider realtime session is claimed.

Actual registry CLI chat output (response identifiers redacted):

```json
{
  "id": "<response-id>",
  "choices": [
    {
      "finish_reason": "stop",
      "index": 0,
      "message": {
        "content": "READY",
        "role": "assistant",
        "refusal": null,
        "annotations": []
      }
    }
  ],
  "created": 1788784154,
  "model": "gpt-5.6-terra",
  "system_fingerprint": null,
  "object": "chat.completion",
  "usage": {
    "completion_tokens": 4,
    "prompt_tokens": 10,
    "total_tokens": 14,
    "completion_tokens_details": {
      "reasoning_tokens": 0,
      "accepted_prediction_tokens": 0,
      "rejected_prediction_tokens": 0,
      "audio_tokens": 0
    },
    "prompt_tokens_details": {
      "cached_tokens": 0,
      "cache_write_tokens": 0,
      "audio_tokens": 0
    }
  },
  "service_tier": "default"
}
```

Actual empty-window projection:

Actual installed CLI JSON/YAML output projected to exit status, period aggregate values and a zero-bucket check. No tenant identifiers, count aggregates or credentials are published. This historical empty-window check does not test new CLI filter flags.

```json
{
  "version": "4.4.0",
  "sdkVersion": "0.25.0",
  "json": {
    "exitCode": 0,
    "total": null,
    "p50": null,
    "p90": null,
    "p99": null,
    "zeroValuedBuckets": true
  },
  "yaml": {
    "exitCode": 0,
    "total": null,
    "p50": null,
    "p90": null,
    "p99": null,
    "zeroValuedBuckets": true
  }
}
```

Actual native summary (temporary paths replaced):

```json
{
  "clean": 5,
  "dirty": 21,
  "out": "<temporary-corpus>",
  "manifestPath": "<temporary-corpus>/manifest.json",
  "seed": 431,
  "byFormat": {
    "pdf": {
      "clean": 1,
      "dirty": 5
    },
    "png": {
      "clean": 1,
      "dirty": 4
    },
    "jpeg": {
      "clean": 1,
      "dirty": 4
    },
    "svg": {
      "clean": 1,
      "dirty": 4
    },
    "docx": {
      "clean": 1,
      "dirty": 4
    }
  }
}
```

## SDK 0.25.0 registry verification

[SDK 0.25.0](https://github.com/cdot65/prisma-airs-sdk/releases/tag/v0.25.0) is published from `9dc8690c24fd11fb0abc51a1233e1ecb7968fe6b`, after passing CI, the full Node 18/20/22/24 test matrix and Docusaurus deployment. The [npm workflow](https://github.com/cdot65/prisma-airs-sdk/actions/runs/34118335579) passes. The release has **11,263 tests in 142 files**, with 99.71% lines/statements, 100% functions and 96.67% branches.

Fresh registry-installed verification passes:

- **102/102 grouped-filter checks**, **2026-09-07T11:52:02.500Z**.
- **53/53 existing chart contracts**, **2026-09-07T11:52:36.044Z**.
- **10/10 inference checks**, **2026-09-07T11:51:36.327Z**.
- **33/33 historical release keys absent**, independently checked at **2026-09-07T11:52:17.226Z**.
- Payload, source-map, ESM/CommonJS, strict tracked consumer types, native WebSocket and OAuth deadline/recovery checks at **2026-09-07T11:52:23.865Z**.
- Exact installed lockfile/archive/npm integrity agreement at **2026-09-07T11:58:25.132Z**.

The archive is **1,287,407 bytes**, SHA-256 **`bed2bd1779703beb88820b46b4866b7af68cb053a83d1dfd91cba4f1747a34a4`**. All nine payload files, 126 source-map sources and 1,304 runtime exports match the tested candidate. No credential settings changed. Analytics reuses historical owned traffic; only the separate inference suite creates and retires a temporary dev key. The prescribed chat and embedding models, TLS verification and documented process-only LAN DNS handling remain unchanged.

The [full captured grouped-filter output](./examples.mdx#verified-grouped-analytics-filters) contains all 101 positive/absent result pairs, including the five non-user column checks. User groups retain their distinct envelope and reject unsupported columns. Provider `traceId` is an observed SCM extension, not a declaration in the supplied provider schema. The serializer also uses validated copies, eliminating repeated reads of caller-owned getters.

CLI 4.4.0 pins this published SDK and has completed its separate registry, user-install and container verification, recorded above. The prior CLI 4.3.1 evidence below remains version-specific. Direct Gateway coverage remains **138/242 (57.02%)**, all 22 analytics adapters remain partial, and the full-project assessment remains **5/10**. Existing failed service/provider/entitlement workflows, SDK documentation dependency advisories and WAN limits remain open.

## SDK 0.24.0 and CLI 4.3.1 registry verification

Both releases are published, installed independently from npm and payload-verified. CLI 4.3.1 pins SDK 0.24.0 exactly. The local user-prefix CLI is upgraded and independently checked. SDK publication preceded the CLI dependency update; existing runtime settings and the read-only credential configuration are unchanged.

- Registry SDK inference: **10/10**, **2026-09-07T08:56:49.058Z**.
- Installed registry SDK query contracts: **53/53**, **2026-09-07T08:56:03.088Z**.
- Installed registry CLI query contracts: **54/54**, **2026-09-07T10:32:02.882Z**.
- Registry CLI inference: **8/8**, **2026-09-07T10:30:56.976Z**.
- Registry CLI empty-window JSON/YAML: **3/3**, **2026-09-07T10:31:01.470Z**.
- Installed user CLI cross-service reads and benign scan: **12/12**, **2026-09-07T10:32:01.368Z**.
- Independent all-history release-key retirement audit: **30/30**, **2026-09-07T10:32:02.499Z**.

The SDK and CLI add verified query filters to four SCM chart adapters, sharing the SDK schema for validation before workspace resolution. Inclusive bounds, zero, fractional cents, CSV-OR lists and combined filters are verified against positive and empty cohorts. Empty latency aggregates remain null. Offline checks retain the 10,931-test SDK release matrix on Node 18/20/22/24; its verification checkout has 10,934 tests. CLI checks pass 1,173 tests plus 14 release-policy/diagnostic checks, including 46 new output and runtime-version regressions in this patch. Packed ESM/CommonJS, strict consumer types, source maps, OAuth deadlines and native WebSocket checks pass. Direct gateway coverage is unchanged at **138/242 (57.02%)**, with **22 partial analytics operations**. All original provider/service failures remain disclosed; full-scope assessment remains **5/10**.

Actual CLI 4.3.1 registry-run chat output (response identifiers redacted):

```json
{
  "id": "<response-id>",
  "choices": [
    {
      "finish_reason": "stop",
      "index": 0,
      "message": {
        "content": "READY",
        "role": "assistant",
        "refusal": null,
        "annotations": []
      }
    }
  ],
  "created": 1788777046,
  "model": "gpt-5.6-terra",
  "system_fingerprint": null,
  "object": "chat.completion",
  "usage": {
    "completion_tokens": 4,
    "prompt_tokens": 10,
    "total_tokens": 14,
    "completion_tokens_details": {
      "reasoning_tokens": 0,
      "accepted_prediction_tokens": 0,
      "rejected_prediction_tokens": 0,
      "audio_tokens": 0
    },
    "prompt_tokens_details": {
      "cached_tokens": 0,
      "cache_write_tokens": 0,
      "audio_tokens": 0
    }
  },
  "service_tier": "default"
}
```

Actual empty-window CLI output, projected as disclosed by its capture:

Actual installed CLI JSON/YAML output projected to exit status, period aggregate values and a zero-bucket check. No tenant identifiers, count aggregates or credentials are published. This historical empty-window check does not test new CLI filter flags.

```json
{
  "version": "4.3.1",
  "sdkVersion": "0.24.0",
  "json": {
    "exitCode": 0,
    "total": null,
    "p50": null,
    "p90": null,
    "p99": null,
    "zeroValuedBuckets": true
  },
  "yaml": {
    "exitCode": 0,
    "total": null,
    "p50": null,
    "p90": null,
    "p99": null,
    "zeroValuedBuckets": true
  }
}
```

The analytics checks use existing owned traffic; they create no key, log or inference request. The separate release-inference checks use and retire short-lived dev keys with the prescribed models. TLS verification and the process-only LAN DNS accommodation are unchanged; public WAN and anonymous container access remain uncertified. Cost retains its rolling-day window and explicit cents/USD output; the other three charts support explicit timestamps. No realtime CLI command is added. See the [complete SDK query capture](./examples.mdx#verified-chart-query-contracts) and [complete CLI capture](https://cdot65.github.io/prisma-airs-cli/cli/aigateway/telemetry/#verified-chart-filter-output).

Three subsequent harness-preflight regressions bring the verification checkout to 10,934 tests in 137 files. A missing local executable now fails before temporary-key creation. The npm metadata-lag attempt remains in private history; only the independently installed passing captures above are published as verified.

Both the frozen CLI production tree and the fresh registry installation now report zero known advisories, after upgrading YAML, nanoid and optional sharp. This fixes the separately recorded 4.3.0 production audit; it does not clear the SDK documentation development-dependency advisories.

The installed CLI also passes **11/11 native DLP checks**, **2026-09-07T10:29:23.947Z**, using sharp **0.35.4** and libvips **8.18.6**. All five formats, 26 signatures, manifest counts, JSON stdout, output precedence and invalid-input preflight are verified. This host uses its existing process-only font configuration. Temporary fixtures are removed before success is recorded. Actual summary (only temporary paths replaced):

```json
{
  "clean": 5,
  "dirty": 21,
  "out": "<temporary-corpus>",
  "manifestPath": "<temporary-corpus>/manifest.json",
  "seed": 431,
  "byFormat": {
    "pdf": {
      "clean": 1,
      "dirty": 5
    },
    "png": {
      "clean": 1,
      "dirty": 4
    },
    "jpeg": {
      "clean": 1,
      "dirty": 4
    },
    "svg": {
      "clean": 1,
      "dirty": 4
    },
    "docx": {
      "clean": 1,
      "dirty": 4
    }
  }
}
```

The package and doctor now agree on the existing dependency engine intersection: Node 20.17+, 22.13+, or 24+ (exactly `^20.17.0 || ^22.13.0 || >=23.5.0`). The [container workflow](https://github.com/cdot65/prisma-airs-cli/actions/runs/34110815270) passes all four jobs: exact-version publication, both native runtime architectures, and serialized current-tag-guarded alias promotion. Each architecture passes the same 11 checks without runtime network access or credentials. Both minor and latest aliases are independently checked at digest **sha256:c113c58d457e0152b5f51c1cab850d771b7ddeac9ca88d8020b74442791cfadf**. Public anonymous pull access remains a separate limitation.

The earlier release checkpoints below retain their original output and timestamps.

## SDK 0.24.0 and CLI 4.3.0 registry verification

Both releases are published, installed independently from npm and payload-verified. CLI 4.3.0 pins SDK 0.24.0 exactly. The local user-prefix CLI is upgraded and independently checked. SDK publication preceded the CLI dependency update; existing runtime settings and the read-only credential configuration are unchanged.

- Registry SDK inference: **10/10**, **2026-09-07T08:56:49.058Z**.
- Installed registry SDK query contracts: **53/53**, **2026-09-07T08:56:03.088Z**.
- Installed registry CLI query contracts: **54/54**, **2026-09-07T09:20:57.909Z**.
- Registry CLI inference: **8/8**, **2026-09-07T09:19:53.288Z**.
- Registry CLI empty-window JSON/YAML: **3/3**, **2026-09-07T09:19:46.233Z**.
- Installed user CLI cross-service reads and benign scan: **12/12**, **2026-09-07T09:21:00.488Z**.
- Independent all-history release-key retirement audit: **28/28**, **2026-09-07T09:20:51.289Z**.

The SDK and CLI add verified query filters to four SCM chart adapters, sharing the SDK schema for validation before workspace resolution. Inclusive bounds, zero, fractional cents, CSV-OR lists and combined filters are verified against positive and empty cohorts. Empty latency aggregates remain null. Offline checks pass 10,931 SDK tests on Node 18/20/22/24 and 1,127 CLI tests, including 92 new flag/parser/public-command regressions against the actual dependency. Packed ESM/CommonJS, strict consumer types, source maps, OAuth deadlines and native WebSocket checks pass. Direct gateway coverage is unchanged at **138/242 (57.02%)**, with **22 partial analytics operations**. All original provider/service failures remain disclosed; full-scope assessment remains **5/10**.

Actual CLI 4.3.0 registry-run chat output (response identifiers redacted):

```json
{
  "id": "<response-id>",
  "choices": [
    {
      "finish_reason": "stop",
      "index": 0,
      "message": {
        "content": "READY",
        "role": "assistant",
        "refusal": null,
        "annotations": []
      }
    }
  ],
  "created": 1788772785,
  "model": "gpt-5.6-terra",
  "system_fingerprint": null,
  "object": "chat.completion",
  "usage": {
    "completion_tokens": 4,
    "prompt_tokens": 10,
    "total_tokens": 14,
    "completion_tokens_details": {
      "reasoning_tokens": 0,
      "accepted_prediction_tokens": 0,
      "rejected_prediction_tokens": 0,
      "audio_tokens": 0
    },
    "prompt_tokens_details": {
      "cached_tokens": 0,
      "cache_write_tokens": 0,
      "audio_tokens": 0
    }
  },
  "service_tier": "default"
}
```

Actual empty-window CLI output, projected as disclosed by its capture:

Actual installed CLI JSON/YAML output projected to exit status, period aggregate values and a zero-bucket check. No tenant identifiers, count aggregates or credentials are published. This historical empty-window check does not test new CLI filter flags.

```json
{
  "version": "4.3.0",
  "sdkVersion": "0.24.0",
  "json": {
    "exitCode": 0,
    "total": null,
    "p50": null,
    "p90": null,
    "p99": null,
    "zeroValuedBuckets": true
  },
  "yaml": {
    "exitCode": 0,
    "total": null,
    "p50": null,
    "p90": null,
    "p99": null,
    "zeroValuedBuckets": true
  }
}
```

The analytics checks use existing owned traffic; they create no key, log or inference request. The separate release-inference checks use and retire short-lived dev keys with the prescribed models. TLS verification and the process-only LAN DNS accommodation are unchanged; WAN/container runtime readiness is not certified. Cost retains its rolling-day window and explicit cents/USD output; the other three charts support explicit timestamps. No realtime CLI command is added. See the [complete SDK query capture](./examples.mdx#verified-chart-query-contracts) and [complete CLI capture](https://cdot65.github.io/prisma-airs-cli/cli/aigateway/telemetry/#verified-chart-filter-output).

Three subsequent harness-preflight regressions bring the verification checkout to 10,934 tests in 137 files. A missing local executable now fails before temporary-key creation. The npm metadata-lag attempt remains in private history; only the independently installed passing captures above are published as verified.

The SDK's production dependency audit is clean. The CLI's production lockfile still has five high and one moderate advisory across YAML, ID generation and optional image dependencies; fresh npm resolution leaves the optional sharp advisory and its package-level propagation. Those require a focused security follow-up and are not reclassified by functional E2E success.

The earlier release checkpoints below retain their original output and timestamps.

## SDK 0.23.0 and CLI 4.2.2 registry verification

Both releases are published, installed independently from npm and payload-verified. CLI 4.2.2 pins SDK 0.23.0 exactly. The local user-prefix CLI is upgraded and independently checked. SDK publication preceded the CLI dependency update; existing runtime settings and the read-only credential configuration are unchanged.

- Registry SDK inference: **10/10**, **2026-09-07T07:28:57.826Z**.
- Installed registry SDK analytics: **13/13**, **2026-09-07T07:28:54.307Z**.
- Registry CLI inference: **8/8**, **2026-09-07T07:39:58.210Z**.
- Registry CLI empty-window JSON/YAML: **3/3**, **2026-09-07T07:39:51.294Z**.
- Installed user CLI cross-service reads and benign scan: **12/12**, **2026-09-07T07:40:08.790Z**.
- Independent all-history release-key retirement audit: **24/24**, **2026-09-07T07:40:49.758Z**.

The SDK fixes valid empty latency responses and adds verified filters to four SCM chart adapters. Offline checks pass 10,668 SDK tests on Node 18/20/22/24 and 1,035 CLI tests, including two failing-first public-command regressions against the actual dependency. Packed ESM/CommonJS, strict consumer types, source maps, OAuth deadlines and native WebSocket checks pass. Direct gateway coverage is unchanged at **138/242 (57.02%)**, with **22 partial analytics operations**. All original provider/service failures remain disclosed; full-scope assessment remains **5/10**.

Actual CLI 4.2.2 registry-run chat output (response identifiers redacted):

```json
{
  "id": "<response-id>",
  "choices": [
    {
      "finish_reason": "stop",
      "index": 0,
      "message": {
        "content": "READY",
        "role": "assistant",
        "refusal": null,
        "annotations": []
      }
    }
  ],
  "created": 1788766790,
  "model": "gpt-5.6-terra",
  "system_fingerprint": null,
  "object": "chat.completion",
  "usage": {
    "completion_tokens": 4,
    "prompt_tokens": 10,
    "total_tokens": 14,
    "completion_tokens_details": {
      "reasoning_tokens": 0,
      "accepted_prediction_tokens": 0,
      "rejected_prediction_tokens": 0,
      "audio_tokens": 0
    },
    "prompt_tokens_details": {
      "cached_tokens": 0,
      "cache_write_tokens": 0,
      "audio_tokens": 0
    }
  },
  "service_tier": "default"
}
```

Actual empty-window CLI output, projected as disclosed by its capture:

Actual installed CLI JSON/YAML output projected to exit status, period aggregate values and a zero-bucket check. No tenant identifiers, count aggregates or credentials are published. This historical empty-window check does not test new CLI filter flags.

```json
{
  "version": "4.2.2",
  "sdkVersion": "0.23.0",
  "json": {
    "exitCode": 0,
    "total": null,
    "p50": null,
    "p90": null,
    "p99": null,
    "zeroValuedBuckets": true
  },
  "yaml": {
    "exitCode": 0,
    "total": null,
    "p50": null,
    "p90": null,
    "p99": null,
    "zeroValuedBuckets": true
  }
}
```

The analytics check uses existing owned traffic; it creates no key, log or inference request. The separate release-inference checks use and retire short-lived dev keys with the prescribed models. TLS verification and the process-only LAN DNS accommodation are unchanged; WAN/container runtime readiness is not certified. The CLI adds no chart filter flags or realtime command. See the [complete analytics capture](./examples.mdx#verified-request-chart-filters).

The earlier release checkpoints below retain their original output and timestamps.

## SDK 0.22.0 and CLI 4.2.1 registry verification

Both packages are published and installed from npm, with CLI 4.2.1 pinning SDK 0.22.0 exactly. Registry payloads match the reviewed release candidates: nine SDK files and seven CLI files, including all five CLI distribution files. ESM/CommonJS SDK consumers also pass strict types, source-map integrity, real OAuth deadline recovery and native loopback WebSocket exchanges. This is separate from live provider-session certification.

- SDK registry inference: **10/10**, finished **2026-09-07T06:30:31.639Z**.
- CLI registry inference: **8/8**, finished **2026-09-07T06:38:15.012Z**.
- Installed local CLI cross-service reads and benign runtime scan: **12/12**, finished **2026-09-07T06:38:12.859Z**.
- Independent read-only key audit: **22/22**, finished **2026-09-07T06:39:30.865Z**, covering all journaled SDK/CLI release-inference attempts, not just the newest keys. Credentials remained unchanged.

The local user-prefix `airs` installation reports 4.2.1 with SDK 0.22.0; its payload, version, library exports and inference help pass independent checks. Runtime endpoint/key settings were not written into the read-only config. The harness supplies and retires short-lived dev-workspace keys. The CLI still exposes chat, Responses and embeddings, not a realtime command.

Actual CLI 4.2.1 registry-run output, with response IDs redacted:

```json
{
  "id": "<response-id>",
  "choices": [
    {
      "finish_reason": "stop",
      "index": 0,
      "message": {
        "content": "READY",
        "role": "assistant",
        "refusal": null,
        "annotations": []
      }
    }
  ],
  "created": 1788763087,
  "model": "gpt-5.6-terra",
  "system_fingerprint": null,
  "object": "chat.completion",
  "usage": {
    "completion_tokens": 4,
    "prompt_tokens": 10,
    "total_tokens": 14,
    "completion_tokens_details": {
      "reasoning_tokens": 0,
      "accepted_prediction_tokens": 0,
      "rejected_prediction_tokens": 0,
      "audio_tokens": 0
    },
    "prompt_tokens_details": {
      "cached_tokens": 0,
      "cache_write_tokens": 0,
      "audio_tokens": 0
    }
  },
  "service_tier": "default"
}
```

The same passing inference suite covers JSON/JSONL chat and Responses, float/base64 embeddings, invalid-input exit 2 and key retirement. The prescribed models, TLS verification and disclosed process-only LAN DNS accommodation are unchanged; WAN reachability is not certified.

SDK 0.22.0 adds experimental realtime transport, raising direct gateway coverage to **138/242 (57.02%)**, with **29 experimental methods**. Its separate live run passes HTTP 101 but fails provider readiness with `invalid_model`; no alternate model, audio or generation was used. The [actual failed runnable example](./examples.mdx#latest-runtime-diagnostics-failures-remain-visible) and all earlier service failures remain visible. Successful release checks do not satisfy the original 99% full gateway target.

The historical results below retain their own versions and timestamps; they are not reruns of the new release.

## Original 0.21.0 / 4.2.0 checkpoint


The release-inference checks exercise the published SDK **0.21.0** and CLI **4.2.0**, installed from npm without a development link. The subsequent source-checkout usage-policy checks are identified separately below. The complete earlier [21-script walkthrough run](./examples.mdx) remains separately timestamped, with its three failures visible. Publication was explicitly authorized with incomplete AI Gateway coverage.

## Registry-install verification

- SDK inference: **10/10** checks, finished **2026-09-07T02:41:08.778Z**. Chat and Responses JSON/SSE, early stream closure, both embedding encodings, cancellation and invalid-request handling pass.
- CLI inference: **8/8** checks, finished **2026-09-07T02:52:01.411Z**. Chat/Responses JSON and JSONL, float/base64 embeddings, invalid-input exit 2 and key retirement pass.
- Independent inventory at **2026-09-07T02:53:54.412Z** confirms both owned temporary keys absent. The credential configuration remained unchanged.
- A fresh CLI source checkout passes **1,033 tests**, coverage gates, lint/format, typecheck and build using the exact registry SDK pin. SDK clean-checkout CI passes **10,483 tests** on each supported Node major.

## Actual CLI chat output

Captured from the registry-installed CLI, with response IDs redacted; this is not mock output. The request used the dev workspace, `@openai/gpt-5.6-terra`, the prompt `Reply with READY.`, and a completion-token limit of 128. Embedding checks used only `@openai/text-embedding-3-small`.

```json
{
  "id": "<response-id>",
  "choices": [
    {
      "finish_reason": "stop",
      "index": 0,
      "message": {
        "content": "READY",
        "role": "assistant",
        "refusal": null,
        "annotations": []
      }
    }
  ],
  "created": 1788749512,
  "model": "gpt-5.6-terra",
  "system_fingerprint": null,
  "object": "chat.completion",
  "usage": {
    "completion_tokens": 4,
    "prompt_tokens": 10,
    "total_tokens": 14,
    "completion_tokens_details": {
      "reasoning_tokens": 0,
      "accepted_prediction_tokens": 0,
      "rejected_prediction_tokens": 0,
      "audio_tokens": 0
    },
    "prompt_tokens_details": {
      "cached_tokens": 0,
      "cache_write_tokens": 0,
      "audio_tokens": 0
    }
  },
  "service_tier": "default"
}
```

See the [CLI command examples](https://cdot65.github.io/prisma-airs-cli/cli/aigateway/inference/) for the full command and configuration reference.

## Post-release usage-policy reset verification

The SDK's existing usage-policy reset operation was subsequently exercised twice with newly owned, isolated policies using the source checkout, whose runtime implementation is unchanged from 0.21.0. The latest full lifecycle passed **8/8** at **2026-09-07T03:39:07.317Z**; a separate read-only retirement audit passed **2/2** at **2026-09-07T03:39:59.498Z**. The earlier extension-suite skip remains historical evidence, not the current verification result for this workflow.

Each policy matched one unique synthetic metadata tag in the dev workspace, with a one-million-token limit. Exactly one request per run used `@openai/gpt-5.6-terra` and at most 128 completion tokens. Before resetting, the harness re-read and verified the policy ID, workspace, name, active state, token limit, exact condition and grouping, and the entity's exact tagged value key. Existing policies and counters were not reset.

Actual captured counter values from the latest run:

```json
{
  "counterBefore": 14,
  "counterAfter": 0
}
```

The live reset acknowledgement was `{}`. A frozen synthetic-value response fixture now covers that acknowledgement and the observed entity envelope in offline regression tests. Both owned policies were archived and both short-lived keys retired; independent audits verified each run's retirement. Credentials remained unchanged. The fixture guards additionally pass 20 positive/negative offline safety tests; those are not counted as live checks.

Re-run the bounded workflow with `npx tsx scripts/e2e-gateway-usage-reset.ts --writes`, then independently verify its latest owned fixtures with `npx tsx scripts/e2e-gateway-usage-reset-audit.ts`. These commands require the same documented test-process DNS accommodation in this workspace. They do not configure the installed CLI or alter production DNS.

SDK 0.21.0's published experimental annotation is unchanged. This new verification removes the missing-entity prerequisite; it does not add another implemented OpenAPI operation or imply that other policy/provider workflows passed.

## Post-release MCP discovery verification

The authenticated-source failure below is retained as historical evidence. Capability updates and runtime tool visibility were subsequently verified with an owned server using a public reference upstream; see the [successful lifecycle](#public-upstream-capability-lifecycle).

The owned-server discovery run finished at **2026-09-07T04:15:58.219Z** with **9 passing checks and 1 failing check**. This is not a passing MCP lifecycle: initialization returned **HTTP 401**, reporting a missing caller-authentication header required by the copied integration configuration. Tool listing and capability updates could not run. Earlier minimal clones returned HTTP 500; the deployed gateway handler's narrowly scoped diagnostic showed an upstream `unauthorized` response. Keeping the source integration's JWT, identity-forwarding and header-passthrough configuration made the authentication prerequisite explicit.

Actual bounded-run observations:

```json
{
  "initializeStatus": 401,
  "capabilitiesBefore": 0,
  "toolsInvoked": 0,
  "sessionIssued": false
}
```

The harness uses the separately verified MCP ingress over HTTPS, an owned server slug, and a one-hour dev-workspace service key narrowed to the already established `mcp.invoke` permission. It never invokes tools, follows redirects, forwards its key to another endpoint, or substitutes SCM credentials for the missing upstream authentication. The official MCP client is an exact-pinned test-only dependency, not part of the SDK's runtime dependencies. Discovery requests have cancellation, a 20-second deadline and an 8 MiB response limit.

A separate read-only audit passed **19/19** at **2026-09-07T04:16:47.605Z**: every journaled key, explicit server and integration from all seven attempts was absent, and the complete dev server inventory contained no implicit server associated with those owned integrations. The attempts include two harness corrections, an unavailable HTTPS source variant, and the retained authentication failures. Existing integrations, servers, IAM grants and credentials were not changed. No session ID was issued. The first 400 and subsequent ownership-assertion failure remain in the historical reports; neither was reclassified as a pass.

Reproduce with `npx tsx scripts/e2e-gateway-mcp-discovery.ts --writes` and audit all recorded attempts with `npx tsx scripts/e2e-gateway-mcp-discovery-audit.ts`. These source-checkout checks require the documented process-only DNS accommodation, including a separately verified `E2E_MCP_GATEWAY_IPV4_ADDRESS` for the exact MCP hostname. With the currently available credential source, expect the documented authentication failure for these authenticated upstreams. Their required caller identity is still needed to certify those integrations; changing existing authentication policies is not an SDK fix.

## Public-upstream capability lifecycle

The complete owned-server lifecycle passed **16/16** at **2026-09-07T05:03:17.184Z**, including runtime enforcement. It used Microsoft's [documented public, no-auth MCP endpoint](https://learn.microsoft.com/en-us/training/support/mcp) only for initialization and tool metadata. The gateway integration had no identity-forwarding, passthrough or credential headers configured. All requests from the test client stayed on its exact owned HTTPS gateway endpoint. Neither Microsoft tools nor any existing upstream's tools were invoked.

Actual observations:

```json
{
  "capabilitiesBefore": 0,
  "capabilitiesAfter": 3,
  "capabilityStates": [false, true],
  "runtimeToolCounts": [3, 2, 3],
  "runtimeCapabilityStates": [false, true],
  "toolsInvoked": 0
}
```

The SDK updated one owned capability, verified its SCM readback, confirmed that it disappeared from the runtime tool list, re-enabled it, and confirmed its return. Unrelated capabilities remained visible. The hidden state was observed after **30.751 seconds** and the restored state after **60.601 seconds**, at the configured polling intervals; these are observation times, not exact propagation latency. An earlier 20-second check failed and remains in history. The inspected gateway 2.20.0 code caches disabled-capability lookups for 300 seconds, so the final test permits a bounded 330-second observation window per transition. It neither flushes shared caches nor promises immediate enforcement. MCP initialization negotiated protocol `2025-11-25`; notifications returned 202, optional GET streaming returned 405, and no downstream session ID was issued.

The prior synthetic-upstream attempt is also retained: **15 pass / 1 fail** at **2026-09-07T04:50:42.788Z**. Four temporary Kubernetes resources hosted a stateless discovery-only server, but the gateway's existing SSRF policy blocked its private-cluster address. The upstream counters confirm zero initialization, tool-list or tool-execution attempts reached it. No SSRF exception, public route or production configuration change was made. All four resources were removed with UID-preconditioned deletion.

An independent read-only audit passed **17/17** at **2026-09-07T05:05:16.697Z** across the synthetic run and all three public-upstream attempts. All 16 journaled resources were absent; a complete dev-workspace inventory also confirmed no implicit server remained attached to an owned integration. Credentials were unchanged. The public upstream itself was not created or modified by the test.

Run `npx tsx scripts/e2e-gateway-mcp-public.ts --writes`, then `npx tsx scripts/e2e-gateway-mcp-fixture-audit.ts`. These are source-checkout verification tools. A local regression using the official MCP client found and fixed the test transport's empty-202 cancellation ordering; the production SDK transport was not affected. The source API comments now reflect both the verified MCP tool-capability lifecycle and usage-counter reset, while retaining experimental stability. At that checkpoint the published SDK was 0.21.0; prompt/resource capability variants and the authenticated upstreams are not certified by this result.

## Limits remain explicit

The registry checks used the documented test-process-only DNS accommodation and TLS-verified LAN ingress; they do not certify WAN reachability. No production DNS, gateway storage, model/provider selection or existing credentials were changed.

AIRS modeled operations remain 149/149. The 0.21.0 release checkpoint had **137/242 (56.61%)** direct AI Gateway coverage and **28 experimental methods**. The 0.22.0 realtime increment increases current source coverage to **138/242 (57.02%)** and **29 experimental methods**, without claiming a successful provider session. The three primary walkthrough failures, backend/authorization gaps and one unretired unbound DLP profile remain documented in [live validation](../developer/live-validation-results.md). These successful release checks are not a substitute for those missing workflows or a claim of 99% full AI Gateway coverage.
