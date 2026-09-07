---
title: Published-package examples
---

# Published-package examples

These checks exercise the published SDK **0.21.0** and CLI **4.2.0**, installed from npm without a development link. The complete earlier [21-script walkthrough run](./examples.mdx) remains separately timestamped, with its three failures visible. Publication was explicitly authorized with incomplete AI Gateway coverage.

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

## Limits remain explicit

The registry checks used the documented test-process-only DNS accommodation and TLS-verified LAN ingress; they do not certify WAN reachability. No production DNS, gateway storage, model/provider selection or existing credentials were changed.

AIRS modeled operations remain 149/149. AI Gateway direct upstream coverage remains **137/242 (56.61%)**, with **28 experimental methods**. The three primary walkthrough failures, backend/authorization gaps and one unretired unbound DLP profile remain documented in [live validation](../developer/live-validation-results.md). These successful release checks are not a substitute for those missing workflows or a claim of 99% full AI Gateway coverage.
