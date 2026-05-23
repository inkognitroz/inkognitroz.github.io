# MMIR GUI Parity Matrix

Updated: 2026-05-23

MMIR tracks ChatGPT-like, Open WebUI-like and MMIR-specific GUI capabilities with truthful statuses only: `live`, `beta`, `planned`, `blocked` and `premium planned`.

Source of truth for the public UI is `public/gui-parity-matrix.json`.

Current priority after the matrix is:

1. D127 conversation management: rename, archive, pin, search, fork, export and safe share.
2. D128 rich file attachments and previews.
3. D129 knowledge collections.
4. D130 explicit web search connector with sources and consent.
5. D131 permissioned tool/function runtime.
6. D132 code interpreter sandbox policy and preflight.
7. D133 canvas/artifact workspace.
8. D134 image generation/editing boundary.

D129 is now beta in the public UI: local knowledge can be grouped into named collections and disabled/enabled per workspace before chat or model comparison uses it.
D130 is now beta across frontend/backend: search is explicit, consent-gated, free/manual by default, and can use protected SearXNG/BYOK providers without public frontend keys.
D131 is now beta across frontend/backend: approved tools can be listed, consented, executed and traced through the protected backend before model-native tool calling is enabled.
D132 is now beta as a planning layer: code interpreter requests can be checked against sandbox policy and resource gates, while execution remains disabled until a disposable local sandbox worker exists.
D133 is now beta in the public UI: artifacts are local-first workspace objects for documents, code, plans and workflow drafts with preview, export and chat handoff.
D134 is now beta as a boundary layer: image routes can be planned with local/free and protected-provider labels, but generation/editing remains blocked until a trusted media backend exists.

Zero-trust rule: any feature that needs secrets, paid providers, arbitrary code execution, external browsing or shared infrastructure remains blocked/planned until the protected backend, policy gates and user consent are in place.
