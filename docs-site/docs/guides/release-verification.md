---
title: Published-package examples
---

# Published-package examples

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

## Limits remain explicit

The registry checks used the documented test-process-only DNS accommodation and TLS-verified LAN ingress; they do not certify WAN reachability. No production DNS, gateway storage, model/provider selection or existing credentials were changed.

AIRS modeled operations remain 149/149. AI Gateway direct upstream coverage remains **137/242 (56.61%)**, with **28 experimental methods**. The three primary walkthrough failures, backend/authorization gaps and one unretired unbound DLP profile remain documented in [live validation](../developer/live-validation-results.md). These successful release checks are not a substitute for those missing workflows or a claim of 99% full AI Gateway coverage.
