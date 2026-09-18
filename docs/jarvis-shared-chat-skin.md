# Jarvis as a shared MMIR chat skin

## Status and scope

Implemented on `feat/jarvis-shared-chat-skin`, based on MMIR frontend commit
`8d49945790713ffef46a2b130f9892d1df9fcc9d`. Related architecture: issue #659.

This is a lightweight native Jarvis presentation for the existing P0 web chat,
not an embedded copy of the entire `adewaskar/jarvis` React/Three.js application.
It does not import that application's camera, hand tracking, local bridge or
Claude agent runtime. The separate `inkognitroz/jarvis` PR #1 remains independent.
No additional model provider, key, subscription or local Jarvis process is added.

Code in a feature branch is not a deployment. The evidence below is not a claim
that production MMIR, physical microphones or macOS speech voices were tested.

## User journey

1. Start a normal MMIR conversation.
2. Enter `@jarvis` or press the navigation's Jarvis button.
3. The existing transcript and composer remain the same DOM nodes. No model
   request is made for the view switch, and no second conversation is created.
4. Explicitly enable speech for this session and press **Snakk med MMIR**.
5. One final Norwegian transcript is sent through the original P0 form handler.
   P0 still owns routing, model selection, request gates, history and receipts.
6. New answer text is read using an available local Norwegian system voice.
7. `@chat`, **Tilbake til chat**, or the spoken command **Tilbake til chat**
   returns to normal chat without clearing its history. Recording and this
   skin's playback are stopped, and speech consent is reset.

`@jarvis Question` switches the view and submits only `Question`, once. When
chat is busy, the route is blocked, or the user edits the draft while assets
load, no extra turn is forced. The draft is preserved. Similar mentions such as
`@jarvis2` or an inline mention are ordinary text, not commands.

## Ownership and boundaries

- `p0-release-nav.js`: exact command interception before P0, navigation button,
  lazy module loading and error feedback.
- `p0-release-nav.css`: navigation control and status styling.
- `p0-jarvis-skin.js`: presentation and session-scoped speech lifecycle adapter.
- `p0-jarvis-skin.css`: scoped, responsive presentation and reduced-motion rules.
- `scripts/render-check-p0-jarvis-skin.mjs`: isolated browser contract tests.
- `.github/workflows/quality.yml`: runs the new test and retains its evidence
  alongside existing quality gates; permissions and runner selection unchanged.

The protected `p0-chat-shell.js`, API adapters, authentication, conversation
storage and model routing are unchanged. The new module contains no fetch,
WebSocket or storage implementation. It does not copy the chat history; it
observes existing message IDs and the original composer busy flag for playback.

While Jarvis is active it exclusively handles the existing microphone control,
preventing two speech controllers from running together. Outside Jarvis, the
original P0 microphone handler remains in charge. This is a DOM adapter, not yet
a stable versioned P0 extension API; contract changes require regression tests.

## Speech safety and failure handling

Speech is off on entry. Session consent warns that the browser's recognition
service may transmit audio to its own provider; this is not an offline-STT
claim. Browser speech is blocked unless P0 explicitly reports public mode.
Private, superprivate or unknown mode never silently falls back to cloud speech.
No camera or device permission is requested.

Recognition uses `nb-NO`. Interim results are never sent. Recognition is aborted
on Stop, Escape, view exit, hidden tab, consent revocation or privacy changes.
Late callbacks cannot submit after cancellation. Drafts edited during listening
are never overwritten. A separate opt-in enables listening again after speech
output; it is off by default and does not run in hidden tabs.

Playback selects only a `localService === true` Norwegian voice. A missing voice,
denied microphone, unsupported browser, insecure context or timeout is shown
explicitly, with text chat retained. Playback is bounded and does not read old
history or route receipts as a new answer. A skin switch does not cancel an
ongoing model request; pressing the microphone during that request uses the
existing Stop control and asks for another press once the request has ended.

## Evidence produced in this change

43 browser contract checks passed using installed Chromium and in-memory
DOM/asset/model/speech fixtures. Syntax checks passed. No external model call or
physical microphone was used. Responsive fixtures covered 1440x1000, 390x844 and
360x640, with no horizontal overflow and with the composer visible. Reduced
motion disables the reactor animations. Screenshots explicitly identify the
fixture as a test, not a live model.

Run the reproducible isolated test in a full checkout:

```sh
node scripts/render-check-p0-jarvis-skin.mjs
```

It uses the repository's Playwright dependency by default. Optional environment
variables select an already-installed distribution or browser:
`MMIR_PLAYWRIGHT_MODULE`, `MMIR_CHROMIUM_EXECUTABLE`, `MMIR_JARVIS_TEST_OUTPUT`.
No security policy, browser sandbox or network restriction needs to be disabled.

## Required before merging or saying it works on mmir.ai

- Synchronize the changed navigation asset versions in
  `public/apps/mimir-chat-portal/asset-versions.json`, `public/mmir.html`, and the
  existing literal assertions in `scripts/smoke-check-release-0.2-catalogs.js`.
  The source baseline pins both navigation assets to
  `20260804-release-0-2-beta-v1`; this patch deliberately does not claim that
  cache invalidation has been applied or verified.
- Run the complete repository `npm run check`, public-shell regression and
  Launch Slice A against the actual full-shell preview, not this DOM fixture.
- Confirm the registered Jarvis contract step and the existing CI gates succeed
  on the PR commit. Registration is not a claim that remote CI has passed.
- Verify that the actual P0 selectors and microphone states match the checked
  contract under Chromium, Safari/WebKit and Android Chrome. Voice support may
  differ; unsupported controls must continue to fail visibly.
- In the real MMIR conversation: ask a text question, switch to Jarvis, speak a
  context-dependent follow-up, hear the answer and switch back. Confirm one
  backend request, the same history, accurate route receipt and no unwanted
  recording or provider fallback.
- Test denied mic, missing local Norwegian voice, blocked route, cached upgrade,
  hidden tab, private-mode transition, Stop and microphone handover on the Mac.

The PR must remain a draft until these gates have evidence. Do not close #659
or merge the unrelated standalone Jarvis PR merely because fixture tests pass.
