# MMIR Chat Portal Module Ownership

Updated: 2026-06-04

## Purpose

This file prevents frontend agents from stepping on each other.

The public chat shell is green. Do not start broad rewrites. Cleanup must be small, owned and proven.

Rule:

```text
One PR -> one owner group -> one visible user journey -> one smoke proof.
```

## Protected MVP Shell

These files own the first public chat experience and need the highest caution:

| Area | Files | Rule |
| --- | --- | --- |
| P0 shell | `p0-chat-shell.js`, `p0-chat-shell.css` | Only one frontend owner may edit at a time. Must run public shell and Launch Slice A checks. |
| Main chat runtime | `chat-runtime.js`, `chat-runtime.css`, `chat-runtime-deferred.css` | Do not add unproven visible features. Preserve first prompt -> answer. |
| First paint / guard | `public-launch-guard.js`, `quiet-first-paint-hotfix.js`, `first-impression.js`, `first-screen-activation-hydration.js` | Keep startup calm; no advanced panels on first paint. |
| Transcript / scroll | `chat-first-scroll.js`, `transcript-scroll-guard.js`, `chat-workspace.css` | Preserve scrollable answers and composer visibility. |

## Composer And Toolbar

| Area | Files | Rule |
| --- | --- | --- |
| Composer behavior | `composer-autofocus.js`, `composer-autosize.js`, `composer-keyboard-shortcuts.js`, `composer-refocus-after-send.js`, `composer-stop-handoff.js`, `composer-new-chat.js` | Keep input simple and responsive. |
| Plus/actions | `composer-quick-actions.js`, `composer-quick-actions.css` | Only show actions with working proof or clearly gated chat-native guidance. |
| Public composer CSS | `chat-workspace.css` | Owns `.mimir-public-chat` composer/chip overrides. `chat-runtime.css` owns only base unscoped runtime/composer primitives. |
| Asset versions | `asset-versions.json` | Owns launch-critical `?v=` values for `public/mmir.html`; update the manifest and keep `smoke-check-asset-version-manifest.js` green. |
| Model picker | `composer-model-picker.js`, `composer-model-picker.css`, `model-selection.js`, `model-catalog-ui.js` | Show proven routes first; do not present planned/offline routes as active. |
| Privacy/control | `privacy-controls.js`, `privacy-controls.css`, `route-display.js`, `active-node-strip.js`, `route-chips.js` | Keep route, privacy, cost and node truth consistent. |
| Voice | `voice-controls.js`, `voice-controls.css` | Mic must respond truthfully; no silent dead control. |

## Receipts, Routing And Compare

| Area | Files | Rule |
| --- | --- | --- |
| API client | `api-client.js` | No provider secrets. Keep public API calls safe and bounded. |
| Route receipts | `answer-context-receipts.js`, `route-display.js`, `route-chips.js`, `active-node-strip.js` | Shared display labels live in `route-display.js`; receipt naming still needs one cautious follow-up. |
| Compare / Best Answer | `model-comparison.js`, `model-comparison.css` | Only compare proven live routes. Label weak/stale local outputs clearly. |
| Runtime truth | `runtime-controls-webgpu-truth.js`, `runtime-controls-fix.js`, `runtime-fact-answer-guard.js`, `runtime-label-normalizer.js`, `runtime-mobile-anchors.js`, `runtime-legacy-installer-guard.js` | Fail closed; never mark Browser Model active before it answers. Legacy label normalization belongs in `runtime-label-normalizer.js`, and mobile/hash anchor behavior belongs in `runtime-mobile-anchors.js`, not the hotfix. |

Runtime hotfix retirement rule: `runtime-controls-fix.js` may temporarily patch legacy UI, but it must keep the P0-ready return first, keep MutationObserver scoped to `#mimir-chat-runtime`, keep polling capped, avoid full-document observers and delegate stable label/anchor behavior to owned modules. `scripts/smoke-check-runtime-controls-ownership.js` guards this while stable behavior moves into owned modules.

## Local Node And Onboarding

| Area | Files | Rule |
| --- | --- | --- |
| Local connector | `local-connector.js`, `node-dashboard.js`, `node-dashboard.css` | Keep local model names private until paired. Preserve one-command Mac path. |
| Onboarding | `onboarding.js`, `onboarding.css`, `repair-resume.css` | Prefer chat-native guidance; external install page is fallback. |
| Platform status | `platform-status.js`, `platform-status.css`, `provider-status.js` | Keep public-safe; no hidden provider/spend claims. |

## Advanced / Hidden Until Proven

These modules must stay hidden, advanced or secondary unless the linked user story is green:

| Area | Files |
| --- | --- |
| Workflows/tools | `workflow-builder.*`, `tool-runner.*`, `scheduled-tasks.*`, `use-case-templates.*` |
| Memory/knowledge/RAG-like surfaces | `memory.*`, `knowledge.*`, `knowledge-connectors.js`, `dataset-manager.js`, `prompt-registry.*` |
| Data/artifacts/code | `data-analysis.*`, `artifact-workspace.*`, `code-sandbox.*` |
| Admin/identity/governance | `admin-governance.*`, `identity-org.*`, `access-control.*`, `backend-profiles-critical.js` |
| Research/web/vision/sharing | `research-planner.*`, `web-search.*`, `vision-input.*`, `sharing-center.*` |
| Assistants/context/corrections | `assistant-builder.*`, `context-*`, `message-actions.js`, `role-presets.js` |
| Growth/PWA/migration/training | `beta-signup.js`, `demo-growth.js`, `free-value-loops.*`, `pwa.*`, `migration-portability.*`, `training-automation.js`, `workspaces.*`, `conversation-manager.*`, `activation-*` |

## Cleanup Sequence

1. Preserve current P0 shell as regression baseline.
2. Centralize route/model display labels in `route-display.js`.
3. Consolidate composer/chip CSS ownership.
4. Replace manual cache-busting with a central asset version source.
5. Move advanced modules behind clear lazy/advanced boundaries.
6. Delete or park dead code only after browser smoke remains green.

## Required Evidence

For any PR touching this folder:

- `npm run check`
- exact files changed
- user journey protected
- no new visible dead controls
- no provider keys or secrets
- screenshot/browser proof when layout changes

If `p0-chat-shell.*`, `chat-runtime.*`, `composer-*`, `active-node-strip.js`, `route-chips.js` or `local-connector.js` is touched, also run Launch Slice A from the control repo after deployment or against an equivalent preview.
