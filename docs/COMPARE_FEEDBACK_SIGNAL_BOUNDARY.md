# Compare feedback signal boundary

Compare Live Models now separates two feedback outcomes: Useful synthesis and Needs review.

Contract:

- Both feedback outcomes are metadata-only.
- Saved feedback includes signal type, evidence ID, route summary, coverage summary, best-answer signal, result count, synthesis metadata, and privacy text.
- After one outcome is captured, both feedback controls are disabled until a new comparison and synthesis run.
- Each control keeps distinct visible text and status text so the owner can triage useful synthesis separately from review-needed synthesis.

Follow-up note:

Stale PR #556 should be replaced from current main if extra evidence-ID presentation is still needed after this branch lands.