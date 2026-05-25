# MMIR Chat + Node Execution Backlog

This is the short execution backlog for the current launch-critical slice. The full ordered product backlog remains `docs/MMIR_SEQUENTIAL_DELIVERY_BACKLOG.md`; this file keeps the next agents focused on the work that makes MMIR feel useful immediately.

## Priority 0 - Must Work Before Broader Platform Polish

1. **First chat works without setup** - **beta / keep hardening**
   - Keep MMIR Guide selected automatically.
   - Let the user type and send immediately.
   - Show only free/public-safe active routes that the composer can actually use.
   - Prove this on desktop and mobile with smoke tests and browser QA.
   - Current evidence: `fee8e4d` makes active routes critical chat UI and `f91d599` keeps the cache workflow from regressing it.

2. **Free model choices are visible and actionable** - **beta / keep hardening**
   - Keep browser helpers, browser WebGPU models and installable Ollama models visible in the chat surface.
   - Selecting a ready route must send the current prompt.
   - Selecting an installable local model must preserve the model choice and open the local install/proof path.
   - Current evidence: active route chips sit directly under the composer; WebGPU/local-node handoff is guarded by smoke checks.

3. **Local node install feels like a normal app** - **beta / artifact QA next**
   - Mac: publish a free-first DMG contract with an app bundle, Applications shortcut and unsigned/notarized-later language.
   - Windows/Linux/Raspberry Pi: keep one-file launchers and local proof path.
   - Do not claim a public DMG exists until the real artifact is published.
   - Current evidence: `mmir-local-node` builds the app-bundle DMG contract; public site documents prepared-but-unpublished DMG honestly.

4. **Install return becomes chat proof automatically** - **beta / real-device proof next**
   - Installer return must reopen MMIR with local proof enabled.
   - Frontend must detect local node health, pairing, models and `/chat/completions`.
   - If anything fails, show one repair action, not a wall of settings.

5. **Open WebUI/ChatGPT-level chat polish** - **in progress**
   - Composer stays primary.
   - Runtime messages are compact, readable and actionable.
   - Model/node controls are close to the input without making setup mandatory.
   - Advanced unfinished platform sections stay lower and truthful.
   - Next concrete work: reduce runtime proof noise before first message, keep model picker compact, then test the first prompt on desktop and mobile.

## Priority 1 - Finish After P0 Is Green

6. **Cross-device node pairing**
   - Raspberry Pi/Linux/VM node can create a short-lived code.
   - Other devices can pair through a trusted tunnel/control-plane URL only with that code.

7. **Provider/API key onboarding**
   - OpenAI-compatible and SaaS provider keys stay out of the public frontend.
   - UI can explain protected backend routing and show disabled/pending routes honestly.

8. **Better live model proof**
   - WebGPU route reports model-load progress clearly.
   - Local node model pull/proof status is visible and retryable.

9. **Revenue-ready premium gates**
   - Free remains useful.
   - Premium features are visible as future/protected capabilities: managed nodes, team governance, marketplace, evals and premium routing.

## Priority 2 - Platform Expansion

10. Workflow builder, agents, marketplace, enterprise controls and compute mesh.
11. Training/fine-tuning pipelines after policy, dataset rights, evals and cost controls are complete.
12. Desktop/mobile native apps after the web + local-node path is stable.

## Current Next Action

Continue `D254` in this order:

1. Real-device or runner QA for the Mac app-bundle DMG artifact. No paid signing/notarization until explicitly approved.
2. Browser QA for the first prompt after the active route strip became critical. If the in-app browser automation is unavailable, use local smoke gates and mark browser tooling as blocked.
3. Deeper Open WebUI-style polish: fewer panels before first message, compact model picker, transcript-first layout after first answer.
4. Local-node proof tightening: install return -> health -> models -> tiny `/chat/completions` probe -> first answer, with one repair action per failure.
5. Only after P0 is green: resume P1 cross-device pairing and protected provider/API-key onboarding.
