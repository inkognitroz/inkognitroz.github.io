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

D129 is now beta in the public UI: local knowledge can be grouped into named collections and disabled/enabled per workspace before chat or model comparison uses it.
D130 is now beta across frontend/backend: search is explicit, consent-gated, free/manual by default, and can use protected SearXNG/BYOK providers without public frontend keys.
D131 is now beta across frontend/backend: approved tools can be listed, consented, executed and traced through the protected backend before model-native tool calling is enabled.

Zero-trust rule: any feature that needs secrets, paid providers, arbitrary code execution, external browsing or shared infrastructure remains blocked/planned until the protected backend, policy gates and user consent are in place.
