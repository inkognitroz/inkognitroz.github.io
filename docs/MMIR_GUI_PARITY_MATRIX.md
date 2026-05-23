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
9. D135 advanced voice polish.
10. D136 vision and screenshot boundary.
11. D137 admin governance overview.
12. D138 access control / RBAC.
13. D139 model/runtime settings panel.
14. D140 prompt library and quick actions polish.
15. D141 OpenAI-compatible API conformance.
16. D142 tool/plugin gallery.
17. D143 memory and notes governance.
18. D144 agentic research planning.
19. D145 custom assistant builder.
20. D146 safe data analysis and charting workspace.
21. D147 scheduled task/reminder UI.
22. D148 external app connectors.
23. D149 mobile/PWA installable shell.
24. D150 Chat/Open WebUI import-export.
25. D152 team sharing and public-safe links.
26. D153 authenticated protected sharing backend.
27. D154 protected share sync UI.
28. D155 account and organization identity foundation.
29. D156 session and invite foundation.
30. D157 organization-scoped share audiences.
31. D158 share access review and audit trail.
32. D159 share recipient onboarding handoff.
33. D160 one-click team share packet.

D129 is now beta in the public UI: local knowledge can be grouped into named collections and disabled/enabled per workspace before chat or model comparison uses it.
D130 is now beta across frontend/backend: search is explicit, consent-gated, free/manual by default, and can use protected SearXNG/BYOK providers without public frontend keys.
D131 is now beta across frontend/backend: approved tools can be listed, consented, executed and traced through the protected backend before model-native tool calling is enabled.
D132 is now beta as a planning layer: code interpreter requests can be checked against sandbox policy and resource gates, while execution remains disabled until a disposable local sandbox worker exists.
D133 is now beta in the public UI: artifacts are local-first workspace objects for documents, code, plans and workflow drafts with preview, export and chat handoff.
D134 is now beta as a boundary layer: image routes can be planned with local/free and protected-provider labels, but generation/editing remains blocked until a trusted media backend exists.
D135 is now beta in the public UI: browser-local push-to-talk, read-aloud, route/device checks and local voice settings are available without external provider secrets.
D136 is now beta in the public UI: images and pasted screenshots can be previewed locally, checked against model capability gates and handed to chat as metadata only until a trusted multimodal route exists.
D137 is now beta across backend/frontend: admin overview shows current owner, planned roles, provider/tool state, fail-closed policy and audit metadata without enabling multi-user writes.
D138 is now beta across backend/frontend: access policy and access decision routes expose a deny-by-default RBAC matrix, and the public UI can simulate model, tool, knowledge, node, workflow and admin decisions while making server-side enforcement explicit.
D139 is now beta across frontend/backend/local-node: users can tune bounded runtime settings and a workspace system prompt, the chat runtime sends those settings through `/chat/completions`, the managed backend validates them, and Local Node maps them to Ollama options.
D140 is now beta in the public UI: prompt reuse works free/local-first with backend prompt loading, starter patterns, tags, variables, search, insert, copy and version flows, plus privacy inventory/export coverage for local prompts.
D141 is now beta across backend/local-node: OpenAI-compatible clients get tested model metadata, chat completion, SSE terminal chunk, safe error and function tool-call shapes, while actual tool execution remains separated behind consent-gated `/tools` routes.
D142 is now beta across frontend/backend: approved tools and connectors expose permissions, trust labels, install state, public-secret boundaries and workspace-level enable/disable controls.
D143 is now beta across frontend/backend: memory has user-controlled scope, tags, expiration, review notes, import notes, protected backend search reasons and a visible "used in last message" review panel.
D144 is now beta across frontend/backend: research mode creates planning-only runs with selected sources, manual/free discovery links, ordered steps, citation rules and explicit approval gates before any autonomous browsing.
D145 is now beta across frontend/backend: custom assistants are private by default, reusable, exportable, local-first and can carry instructions, model preference, tool allowlist, knowledge scope, runtime settings and sharing policy without public frontend secrets.
D042 is now beta in the public UI: the first screen is calmer, core navigation is primary, the chat dock feels closer to modern chat products and free model routes load without an empty no-model state.
D146 is now beta in the public UI: CSV, TSV and JSON analysis runs browser-only with summaries, charts, local snapshots, export and chat handoff while arbitrary code execution remains blocked.
D147 is now beta in the public UI: browser-local reminders expose owner, due/repeat schedule, free/local cost policy, run log, pause/cancel/export and chat handoff while protected backend scheduling remains planned.
D148 is now beta across frontend/backend: external connectors have a public-safe catalog, free/manual paths, protected OAuth/sync planning, local revocation metadata and explicit no-public-secrets policy for GitHub, Drive/Docs, Gmail, Notion, Slack, Open WebUI, local folders and manual documents.
D149 is now beta in the public UI: MMIR has a free PWA manifest, service worker, offline fallback shell, install panel, mobile touch targets and local-node handoff without caching secrets or private data.
D150 is now beta in the public UI: MMIR can export a redacted portable workspace bundle, provide an Open WebUI-style chat preview and import ChatGPT/Open WebUI/MMIR-style JSON locally with bounded file size and no public frontend secrets.
D152 is now beta in the public UI: Safe Sharing creates redacted browser-local bundles, text copies, preview links and JSON exports for selected chats, artifacts, workflow drafts and knowledge collection manifests.
D153 is now beta in the managed backend: protected share objects are owner-scoped, redacted before storage, revocable, audit-safe and included in portable backend export/import/delete.
D154 is now beta in the public UI: Safe Sharing can save/load/revoke protected backend shares through the active backend profile.
D155 is now beta across frontend/backend: protected principal/org routes and a public Identity panel can create free-first organizations, manage members and preserve owner/admin guardrails without public frontend secrets.
D156 is now beta across frontend/backend: short-lived session tokens and invite create/accept/revoke flows exist, with one-time tokens/codes shown without public frontend storage.
D157 is now beta across frontend/backend: protected shares can be scoped to organization id and minimum role, with backend identity checks and Safe Sharing audience controls.
D158 is now beta across frontend/backend: share owners can inspect audience summaries, viewer decisions, next-safe actions and recent share-specific audit state from Safe Sharing.
D159 is now beta across frontend/backend: recipients can accept an invite/session handoff, open the intended share only when policy allows it, and see session tokens once without public storage.
D160 is next: owners need one-click team-share packets that prefill non-secret recipient fields while keeping one-time codes one-time.

Zero-trust rule: any feature that needs secrets, paid providers, arbitrary code execution, external browsing or shared infrastructure remains blocked/planned until the protected backend, policy gates and user consent are in place.
