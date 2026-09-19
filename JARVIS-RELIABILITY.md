# Jarvis reliability update — 2026-09-19

## Scope

Jarvis remains a presentation client of the existing MMIR conversation, not a
second agent, model router, credential store or conversation history. This patch
addresses the two reproduced failures from the b18da1d retest and strengthens the
practical verification path. It does **not** claim an optimal or hardware-certified
voice service merely because automated checks pass.

## Changes mapped to the ten priorities

1. **Speech text:** comparisons such as `3 < 5 og 8 > 6`, multiplication, numeric
   signs, identifiers, dates and negation survive formatting. Only recognized
   paired markup is stripped, with structural pauses retained. Superscripts and
   subscripts remain explicit. This string formatter is never used as an HTML
   sanitizer; existing rendering security is unchanged.
2. **Recording ownership:** each capture has its own identity, readiness and
   lifecycle. During recording and local-capability probes, old send/draft/restore
   actions are disabled **and** independently rejected by their handlers. One
   earlier unsent draft is kept separately in memory. A third capture cannot
   overwrite two pending drafts. Restore/swap/discard is explicit. New-chat clears
   both drafts; late callbacks from an earlier capture are ignored.
3. **Real-device acceptance:** the new *Test norsk diktat (uten modell)* button
   uses the current speech consent and privacy policy, then always stops in
   review. It does not auto-submit to MMIR. In public mode audio may use the
   browser's external speech service, as disclosed by the existing consent.
   The practice is NOT a fully offline guarantee or automated accuracy score.
4. **Permanent regressions:** the existing required unit/browser/full-shell CI
   entry points import the new test modules. There is no separate optional lane
   in which critical tests can be forgotten. Fixtures are labelled as simulations.
5. **Measured latency:** when native events actually occur, speech-end-to-final-
   text and speech-end-to-first-audio are shown alongside existing MMIR timing.
   Missing events remain unmeasured. Existing same-route sentence streaming is
   retained; no extra model call is used to manufacture an acknowledgement.
6. **Norwegian quality:** a deterministic meaning-preservation corpus and an
   on-device practice phrase cover MMIR, Jarvis, GitHub, numbers and negation.
   There is no silent name/number correction. Measured physical recognition
   accuracy still needs the real-device protocol below.
7. **Stop semantics:** *Stopp tale* silences the skin, without cancelling the
   core task. *Stopp oppgaven* invokes the existing MMIR cancellation function.
   The UI says cancellation was requested; it never asserts that the provider
   stopped compute or that billed resources were saved.
8. **Interruption/recovery:** offline events pause speech and retain pending
   text in the current tab. Online events neither retry requests nor restart a
   microphone. Remote voice submission waits for connectivity; explicitly local
   MMIR routes retain their core-controlled offline path. Unsent drafts trigger a
   best-effort before-unload warning; there is **no promise of recovery after a
   browser process is killed**, because transcripts are not persisted to storage.
9. **Private voice:** the existing per-device `processLocally` + Norwegian-pack
   verification is retained, including in the practice tool. Private/unknown
   policy never silently enables external recognition. The capability check does
   not install packages or grant permissions.
10. **Truthful status/diagnostics:** completed, truncated, rejected, failed and
    cancellation-requested states are distinguished, even after speech is stopped.
    *Kopier diagnostikk uten samtaletekst* copies only bounded status/timing data.
    It excludes prompts, answers, recordings, conversation/turn IDs, route URLs,
    model names and credentials. If clipboard access fails, the safe report is
    shown in a read-only field. It explicitly does not certify hardware or models.

## Automated verification

`npm run check:jarvis` remains the entry point. This revision adds 30 unit, 18
browser and 7 actual-shell checks to the prior 122 (177 checks total). HTTP/model
and browser speech are mocked in these tests. Actual HTML/CSS/core is used in
full-shell tests. The full required public CI suite remains mandatory before
merging. No new runtime dependencies or package-lock changes are introduced.

## Live transport smoke (optional, not voice proof)

`node scripts/check-jarvis-live.mjs` makes only public GET requests to the existing
MMIR status/models endpoints. Adding `--chat` makes exactly one short synthetic
request to the canonical MMIR gateway with `paid_routes_allowed=false`, no provider
credentials and no user history. The report contains response status/timing, not
upstream bodies. It deliberately does not claim verified writer identity.
A network failure in the test environment is not evidence that MMIR is down.

## Real-device acceptance protocol — Mac and Android separately

Record device/browser versions and select `@jarvis`. Never mark a case as passed
from a simulated browser run.

1. Use **Kontroller tale**, then grant local output consent and **Test stemmen**.
   Listen to the actual output. Record the available Norwegian voice.
2. Grant microphone consent consistent with your chosen privacy mode. Use
   **Test norsk diktat (uten modell)**. Read the visible practice phrase, including
   “12,5 prosent, ikke 15”. Check names, numbers and negation in the returned text.
   Repeat in normal room noise and with the intended headset. No accuracy claim
   is valid until these recordings have been reviewed by a listener.
3. In regular text chat, ask MMIR to remember a synthetic fact in this conversation,
   e.g. “Vi planlegger en tur til Bergen.” Ask for the city by voice. Confirm actual
   gateway request, retained context, readable answer and audible reply.
4. Ask it to read `3 < 5 og 8 > 6`, negative temperatures and percentages. Confirm
   both the text delivered to speech and the **audible meaning**, because native
   voices can pronounce symbols differently.
5. Try 20 rounds per device with ordinary pauses, interruption, review mode, rapid
   recording changes and transitions between `@chat` and `@jarvis`.
6. Compare **Stopp tale** against **Stopp oppgaven**. Check the audible stop and
   outcome indicators; do not infer provider cancellation from browser abort.
7. Disable/restore the network, background/reopen the tab and open the mobile
   keyboard. No automatic resubmission or microphone restart is acceptable.
8. Save a content-free diagnostic report plus a separate human acceptance result.
   Record latency distributions only from real rounds. Mark unavailable features
   (e.g. a missing local Norwegian pack) as blocked, not as passed.

No physical microphone, audible latency, recognition accuracy or live streaming
improvement is certified by this source change alone.
