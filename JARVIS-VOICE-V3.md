# Jarvis voice v3 — one MMIR conversation, ten improvements

## Scope and architecture

Jarvis remains an opt-in presentation layer over the existing P0 conversation,
request transport, writer-continuity, routing, history and spend gates. No model
router, credential, separate history, external speech service or camera is added.
`@jarvis` and `@chat` remain local view commands with no model request.

## Implemented acceptance map

| Improvement | Implementation and proof |
| --- | --- |
| 1. Interrupt | Owned speech is cancelled before draft, microphone or permission checks. Draft remains untouched. Browser I01. |
| 2. Lifecycle and identity | Read-only core event contract carries ephemeral conversation, request and assistant-message IDs. No DOM observation of answer text. Independent timers; reset/cancel fences late callbacks. Request preflight is single-flight and protects an edited draft. Unit identity suite, browser I03/I05 and full-shell context test. |
| 3. Self-test and voices | Bounded 2.5s voiceschanged wait, cancellation on revoke/switch, local Norwegian selection, no-recording diagnostic and user-clicked voice test. Browser I02/revocation/doctor tests. |
| 4. Earlier speech | Sentence queue consumes actual deltas from the existing request, with UTF-8 SSE decoding, abort, limits, errors and receipt preservation. JSON remains default for unknown capability. Unit stream tests and browser streaming/cancel tests. |
| 5. Live transcription | Separate live text area, interim never submitted, explicit review-first option, edited text sent once through the original composer. I04 and draft/late-result checks. |
| 6. Speech formatting | Paragraph pauses, code/table/link screen references, local Norwegian voice and speed preferences, full output or explicitly labelled first-paragraph excerpt. No extra summary-model call. I07, formatter and excerpt tests. |
| 7. Private speech | Machine policy separates local output from microphone processing. Private input requires available(nb-NO, processLocally=true) and a recognizer accepting processLocally=true. No automatic language-pack install and no remote fallback in private/local-only mode. Unsupported fails closed. Browser privacy matrix. |
| 8. Recovery | Specific network, microphone, permission, language and timeout help. Recognition text is preserved. Model requests never retried by the skin; existing core retry remains authoritative. I06 and error tests. |
| 9. True status | Current route is labelled selected, actual writer requires verified identity. Real core-to-final, first-delta and browser onstart-to-audio timing; only backend-reported tokens. Missing price remains unavailable. No invented proof. Status tests. |
| 10. Mobile | Independently scrollable compact settings, sticky stop/mic state, 44px controls, viewport-height handling, no forced touch keyboard, reduced motion. Optional remembered view stores no voice consent. Returning to chat cancels voice and removes the preference. Layout tests. |

## Streaming contract and limits

The selected, normalized hosted model must advertise BOTH
`capabilities.streaming === true` and
`capabilities.streaming_writer_continuity === true`. The skin must also be active,
local output consent enabled and early/full speech selected. Only then does the
same existing POST request set `stream:true` and expose deltas to the skin.
An absent flag keeps `stream:false` and complete-response playback. This is a
capability contract, NOT a claim that production currently advertises it.
Local node transport remains unchanged (JSON). No alternative endpoint/model is
selected for streaming. Gateway final metadata must include the same receipt and
continuity envelope as JSON. A stream error/revised answer stops playback and
surfaces the existing core error. No silent automatic resend is introduced.

SSE is bounded to 2 MB bytes / 250,000 text characters. Spoken output is bounded
to 32,000 characters with an explicit screen-reference notice; code and tables
are explicitly referenced on screen rather than silently omitted. The excerpt
choice is an excerpt, not a model summary: the complete answer and caveats remain
in the original transcript.

## Privacy and persistence

Browser local recognition and available() are experimental. The language pack
must actually be reported available on the device. Do not infer Norwegian local
support from browser brand or version. Private unsupported input never starts a
remote recognizer. Local TTS requires `localService === true` and nb/nn/no voice.
A read-only diagnostics probe does not start recording or install any model.

Only `voice, rate, inputMode, processing, readMode, early` and an explicitly opted-in
skin preference may be stored. No transcript, audio, history, microphone consent,
output consent or automatic-listening consent is stored by Jarvis. The existing
MMIR history implementation is unchanged. Presentation IDs are ephemeral scope
IDs, not a new persistent history system.

## Repeatable verification

- `npm run check:jarvis`: 30 pure contract/stream/format tests, 71 browser fixture
  checks and 21 actual full-P0-shell integration checks (counts at implementation).
- `npm run check`, `npm run check:responsive`, `npm run check:iphone-webkit`:
  existing regressions; normal quality workflow retains all prior steps.
- The UI/backend distinction is explicit: fixture tests simulate SpeechRecognition,
  speechSynthesis, backend responses and local-language availability. The full-shell
  test loads actual public HTML, actual P0 core and actual transport with intercepted
  HTTP responses. Screenshots are labelled integration fixtures.
- The restricted development environment can use `MMIR_IN_MEMORY_DOM=1` for the
  same HTML with in-memory asset routing and test-only ephemeral storage. CI uses
  ordinary browser navigation and installed project dependencies.

## Physical acceptance still required

On a real Mac and Android browser: verify microphone permission, installed
Norwegian voice, actual recognition accuracy, keyboard/viewport and audible stop
latency. Verify local Norwegian availability before using private input. Test
first text -> @jarvis -> spoken follow-up -> @chat with a live authorized MMIR
route. Automated fixtures cannot certify those hardware/provider results.

No claim of physical microphone or production streaming verification is made by
the code, diagnostics or automated tests.

## Test maintenance

Two existing static checks were already failing against the unchanged base:
the Best Answer function extractor stopped at a default-argument object, and the
offline-error test expected old pending/failure metadata. These tests now inspect
the actual function body/current structured failure contract; grounding, retry,
privacy and release gates are not removed. Asset-version checks are updated to
the new reviewed version. Compare dispatch checks include the stricter awaited,
cancel-safe preflight. The full npm regression suite is added to CI.
