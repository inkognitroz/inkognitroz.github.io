# MMIR Free Activation Canary D253

## Purpose

D253 proves the two launch-critical journeys as one coherent free-first path:

1. A new user opens MMIR, types in chat and gets a useful answer immediately.
2. A user who wants local AI can install a Mac/local node, return to MMIR, see the node/model become active and use it in chat.

The public site must stay truthful: browser helper answers are useful guidance, not a remote LLM claim. Real model proof starts only after a free/local-looking route exposes models and accepts a tiny `/chat/completions` probe.

## Status

| Journey | Status | Evidence |
| --- | --- | --- |
| Instant free chat | Ready | Browser helper/WebGPU/backend sends now write a local first-chat receipt with `raw_prompt_stored:false` and `raw_response_stored:false`. |
| Mac local node install | Beta with device watch | Mac package, checksum, Ollama/starter-model/bootstrap and return-to-proof path exist; final real-device QA is still required before calling it complete. |
| Windows/Linux/Raspberry Pi node install | Beta | Existing installers and node dashboard route support remain guarded by installer release QA and local-node checks. |
| Paid/SaaS/API-key providers | Blocked by design | Provider keys and paid routes remain behind protected backend policy, not GitHub Pages. |

## What Changed

- Fixed the Mac installer connector-server checksum so the published `mmir-local-connector-mac.command` matches the current static connector server.
- Made browser helper and browser WebGPU chat responses create the same first-chat receipt shape as backend responses.
- Added explicit Mac download and command path actions beside Windows/Linux in the chat model helper.
- Added a public-safe canary report for the Progress Dashboard: `public/chat-first-free-activation-canary-report.json`.

## Remaining P0 Work

D254 should tighten the first impression around the chat surface itself: Open WebUI-style chat focus, cleaner active model/node strip, and Mac app-bundle/DMG packaging QA where possible without spend. The current Mac path is usable as a command package, but the desired drag-to-Applications experience should be built and tested separately.
