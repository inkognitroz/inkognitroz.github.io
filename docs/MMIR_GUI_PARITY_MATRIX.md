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

Zero-trust rule: any feature that needs secrets, paid providers, arbitrary code execution, external browsing or shared infrastructure remains blocked/planned until the protected backend, policy gates and user consent are in place.
