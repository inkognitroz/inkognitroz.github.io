# MMIR Front Page Promise Backlog

This backlog enumerates the functionality promised or implied by the current MMIR.ai first page and its rendered JSON catalogs.

Use the stable IDs when changing scope, for example: `remove F054` or `move F081 to later`.

## P0 - Must Work Before Public Product Claims

| ID | Priority | Promise on first page | Required implementation | Acceptance criteria |
|---|---:|---|---|---|
| F001 | P0 | One chat UI | Build an actual in-page chat service instead of only a prompt box and external link | User can send a prompt and see the assistant reply on `mmir.ai` |
| F002 | P0 | Every AI model you trust | Add an active model selector backed by live `/models` data | Model dropdown is populated from the selected backend/local node |
| F003 | P0 | Connect to local AI models | Implement a local connector profile flow | User can add local connector URL and verify it |
| F004 | P0 | Connect to cloud AI models | Support trusted backend URLs through a controlled API contract | User can add a backend API without exposing provider secrets |
| F005 | P0 | Secure interface | Define frontend/backend boundary and enforce no frontend secrets | Public frontend stores only safe metadata |
| F006 | P0 | Start chatting | Replace disabled/open-only CTA with real send flow | Primary CTA sends prompt when a backend is ready |
| F007 | P0 | Backend selected state | Turn active backend badge into real connection state | Badge shows disconnected, checking, online, degraded, offline |
| F008 | P0 | Backend profiles | Make profile creation/edit/delete robust | Profiles validate URL, provider type, health and model metadata |
| F009 | P0 | Set active backend | Make active backend drive all chat/model calls | Active backend is the only target used by chat |
| F010 | P0 | Health status | Implement `/health` probe from frontend | UI can verify backend/local node availability |
| F011 | P0 | Provider status | Implement live provider status through protected API or local node | Static status is clearly separated from live status |
| F012 | P0 | Local connector guide | Convert guide steps into a working onboarding flow | Install, detect, connect, chat statuses update in UI |
| F013 | P0 | Install local connector | Provide installer/script links and verified install docs | User can install local node on supported OS |
| F014 | P0 | Detect local models | Local node must expose model discovery | UI lists locally installed models |
| F015 | P0 | Chat safely | Chat must go through controlled connector/API | Raw Ollama runtime is not exposed publicly |
| F016 | P0 | No secrets in frontend | Add automated checks and docs for frontend secrets | CI fails on obvious secret patterns |
| F017 | P0 | No public raw Ollama port | Local node docs and defaults enforce private runtime | Default host is `127.0.0.1`, not public LAN |
| F018 | P0 | Controlled endpoints | Standardize `/health`, `/status`, `/models`, `/chat/completions` | Frontend, backend and local node agree on payloads |
| F019 | P0 | Disconnect/delete local profiles | Add clear disconnect/delete UX | User can remove a local profile and active state safely |
| F020 | P0 | Actual model exists | Validate selected model before sending chat | Send is disabled or warns when no model is available |
| F021 | P0 | Error clarity | Add user-readable errors for offline node, CORS, invalid URL, no models | User sees next action instead of silent failure |
| F022 | P0 | Page stability | Keep Pages domain and deploy reliable | `public/CNAME`, deploy workflow and smoke checklist remain current |

## P1 - Core Chat UX Expected From The First Screen

| ID | Priority | Promise on first page | Required implementation | Acceptance criteria |
|---|---:|---|---|---|
| F023 | P1 | Chat UI | Add user/assistant message bubbles | Chat transcript is visible and readable |
| F024 | P1 | Message MMIR composer | Support Enter to send, Shift+Enter newline | Chat input behaves like modern chat UI |
| F025 | P1 | Streaming response | Add SSE or streaming reader | Response appears progressively |
| F026 | P1 | Stop generation | Add stop/abort control | User can cancel a running reply |
| F027 | P1 | Retry response | Add retry for last user message | User can regenerate failed/weak answer |
| F028 | P1 | Clear conversation | Add clear chat action | User can reset session |
| F029 | P1 | Copy answer | Add copy button for assistant messages | Response can be copied cleanly |
| F030 | P1 | Markdown support | Render markdown safely | Code blocks, lists and links render without XSS |
| F031 | P1 | Code block handling | Add copy button to code blocks | Code output is usable |
| F032 | P1 | Local conversation history | Persist current session locally | Refresh keeps current chat unless user clears it |
| F033 | P1 | Conversation metadata | Track model, provider, latency and timestamp | Each response shows useful technical metadata quietly |
| F034 | P1 | Mobile chat | Make chat usable on mobile | No overflow, buttons fit, composer stays usable |
| F035 | P1 | Accessibility | Add focus states, labels, aria-live and keyboard flow | Basic keyboard-only chat works |
| F036 | P1 | Loading states | Add checking, sending, streaming and failed states | UI never looks frozen |

## P1 - Connect Model Promise

| ID | Priority | Promise on first page | Required implementation | Acceptance criteria |
|---|---:|---|---|---|
| F037 | P1 | Add a local or cloud model | Create connection wizard with local, compatible backend and managed route choices | User can choose connection path |
| F038 | P1 | Select model you want to use | Add model selector from live backend data | Selected model is sent in chat payload |
| F039 | P1 | Keep provider secrets server-side | Remove any UX that suggests pasting real API keys into frontend | Only key reference labels are allowed publicly |
| F040 | P1 | Start chatting from one UI | Unify local/backend chat into same composer | No separate app is required for first chat |
| F041 | P1 | Compatible backend URL | Validate and test a trusted backend URL | Test connection button verifies `/health` and `/models` |
| F042 | P1 | Managed provider route | Design API path for paid/provider-backed models | Frontend only calls protected MMIR API |
| F043 | P1 | Backend capacity profile | Make capacity intent meaningful or hide until supported | Capacity selection affects routing or is marked planned |
| F044 | P1 | Health selector | Replace manual health dropdown with live status once possible | Health is measured, not hand-entered |

## P1 - Local AI Connector Promise

| ID | Priority | Promise on first page | Required implementation | Acceptance criteria |
|---|---:|---|---|---|
| F045 | P1 | Lightweight local connector | Harden and package `mmir-local-node` | Installable local node exists |
| F046 | P1 | Discover local AI models | Implement Ollama model discovery and normalized model objects | UI can list local models from `/models` |
| F047 | P1 | Run AI privately on own hardware | Ensure local mode does not route prompts to cloud | Local mode request path stays browser -> local node -> local runtime |
| F048 | P1 | Avoid cloud lock-in | Support self-managed local and compatible backend paths | User can use MMIR without a paid provider |
| F049 | P1 | Keep sensitive data local | Document and enforce local-only flow | UI labels clearly explain local privacy boundaries |
| F050 | P1 | Explicit local user action | Add pairing or trust prompt | Site cannot silently control local node |
| F051 | P1 | Pairing token | Add local pairing token to local node | Browser must prove local consent |
| F052 | P1 | Local node hardware info | Surface CPU/RAM/model recommendation safely | User sees compatible model suggestions |
| F053 | P1 | Local node update path | Add version endpoint and update guidance | UI can warn on old connector version |

## P1 - Model Library Promise

| ID | Priority | Promise on first page | Required implementation | Acceptance criteria |
|---|---:|---|---|---|
| F054 | P1 | Available models light up | Distinguish live available models from catalog suggestions | Available models are visually marked live |
| F055 | P1 | Premium/provider-backed models disabled until backend support | Disable unsupported models with clear reason | User cannot select unsupported paid/provider models |
| F056 | P1 | Custom/user supplied model | Allow custom model id when backend supports it | Custom model can be selected and sent |
| F057 | P1 | Llama family | Add catalog entry and backend compatibility metadata | Llama appears as candidate with license warning |
| F058 | P1 | Gemma family | Add catalog entry and backend compatibility metadata | Gemma appears as candidate with license warning |
| F059 | P1 | Mistral family | Add catalog entry and backend compatibility metadata | Mistral appears as candidate with license warning |
| F060 | P1 | Qwen family | Add catalog entry and backend compatibility metadata | Qwen appears as candidate with license warning |
| F061 | P1 | DeepSeek family | Add catalog entry and backend compatibility metadata | DeepSeek appears as candidate with license warning |
| F062 | P1 | Phi family | Add catalog entry and backend compatibility metadata | Phi appears as candidate with license warning |
| F063 | P1 | Code specialist models | Add coding model category | Code models are filtered/tagged as coding |
| F064 | P1 | Embedding models | Add non-chat model handling | Embedding models cannot be selected as chat models unless supported |
| F065 | P1 | Vision/multimodal models | Add future multimodal flag | Multimodal models are disabled until UI/backend supports files/images |
| F066 | P1 | Paid frontier API models | Add managed provider model category | Paid providers require protected backend/vault |
| F067 | P1 | Capacity hints | Make low/standard/gpu/provider profiles visible and meaningful | User understands hardware/cost implications |
| F068 | P1 | License warnings | Add license/commercial-use warning UI | User sees `check required` before production use |

## P1 - Multi-Model Chat Promise

| ID | Priority | Promise on first page | Required implementation | Acceptance criteria |
|---|---:|---|---|---|
| F069 | P1 | Connect multiple models | Allow multiple active model selections | UI can select more than one model for comparison |
| F070 | P1 | Switch between models | Add fast model switching | User can switch model without recreating backend profile |
| F071 | P1 | Compare answers instantly | Implement parallel prompt fan-out | Same prompt returns multiple responses side by side |
| F072 | P1 | Choose strongest result | Add accept/favorite/select answer action | User can mark selected answer |
| F073 | P1 | Combine specialized models | Add synthesis step | Selected answers can feed a synthesis model |
| F074 | P1 | Roles | Apply role presets to selected models | Architect/security/coder/etc alter system instructions |
| F075 | P1 | Role comparison | Show which role/model produced each answer | Responses are labeled by role and model |
| F076 | P1 | Prompt safety with roles | Keep role instructions client-safe and non-secret | Role presets contain no secrets and are visible |

## P1 - Role Presets Promise

| ID | Priority | Promise on first page | Required implementation | Acceptance criteria |
|---|---:|---|---|---|
| F077 | P1 | Architect role | Add selectable architect role preset | Preset can be applied to a model/chat |
| F078 | P1 | Security reviewer role | Add selectable security reviewer role preset | Preset can be applied to a model/chat |
| F079 | P1 | Coder role | Add selectable coder role preset | Preset can be applied to a model/chat |
| F080 | P1 | Critic role | Add selectable critic role preset | Preset can be applied to a model/chat |
| F081 | P1 | Researcher role | Add selectable researcher role preset | Preset can be applied to a model/chat |
| F082 | P1 | Synthesizer role | Add selectable synthesizer role preset | Preset can combine prior model outputs |
| F083 | P1 | Role best-for metadata | Show role use cases in UI | User understands when to use each role |

## P2 - Workflow Orchestration Promise

| ID | Priority | Promise on first page | Required implementation | Acceptance criteria |
|---|---:|---|---|---|
| F084 | P2 | Intelligent workflow orchestration | Add workflow object model | Workflow can define steps, models and inputs |
| F085 | P2 | Create AI workflows visually | Build a simple visual/step editor | User can build a reusable workflow without code |
| F086 | P2 | Automate repetitive work | Add saved workflow execution | Workflow can be rerun with new input |
| F087 | P2 | Combine reasoning from multiple AI systems | Add multi-step routing and synthesis | Workflow can call several providers/models |
| F088 | P2 | Route tasks dynamically | Add routing policy layer | Router can choose model by capability/status/cost |
| F089 | P2 | Build reusable AI stacks | Save named workflows/templates | User can reuse a workflow later |

## P2 - Local + Cloud AI Integration Promise

| ID | Priority | Promise on first page | Required implementation | Acceptance criteria |
|---|---:|---|---|---|
| F090 | P2 | Use local privacy and cloud scale together | Add hybrid routing policy | User can choose local-only, cloud-allowed, or managed mode |
| F091 | P2 | Private VMs | Support self-managed backend registrations | Private VM backend can be added and health checked |
| F092 | P2 | Open WebUI compatibility | Support OpenAI-compatible/Open WebUI endpoints through backend adapter | MMIR can list models/chat via compatible route |
| F093 | P2 | Ollama compatibility | Support Ollama through local node, not raw public port | Local Ollama works via controlled connector |
| F094 | P2 | SaaS APIs | Add managed provider adapters | SaaS keys remain server-side |
| F095 | P2 | Future cloud runtimes | Design provider abstraction | New runtime can be added without frontend rewrite |
| F096 | P2 | Choose where workloads run | Add run-location selector/policy | User can control local vs managed routing |

## P2 - Trusted AI Routing Promise

| ID | Priority | Promise on first page | Required implementation | Acceptance criteria |
|---|---:|---|---|---|
| F097 | P2 | Route to the right intelligence automatically | Add provider router service | Router chooses provider/model by policy |
| F098 | P2 | Performance-based routing | Track latency and availability | Router can avoid slow/offline targets |
| F099 | P2 | Trust-level routing | Add trust level metadata per backend/model | Router respects local/private/managed constraints |
| F100 | P2 | User preference routing | Store routing preferences | User can prioritize privacy, speed or quality |
| F101 | P2 | Cost-aware routing | Add usage/cost metadata | Router can avoid expensive provider unless allowed |
| F102 | P2 | Reliability routing | Add fallback provider flow | If primary fails, fallback can be used safely |

## P2 - Knowledge And RAG Promise

| ID | Priority | Promise on first page | Required implementation | Acceptance criteria |
|---|---:|---|---|---|
| F103 | P2 | AI understands your own data | Add document ingestion plan | User can attach data source to chat |
| F104 | P2 | Upload PDFs | Add file upload and extraction backend | PDF content can be indexed or summarized |
| F105 | P2 | Upload notes/documents | Support txt/md/docx ingestion | Text docs can be queried |
| F106 | P2 | Connect repositories | Add GitHub/repo connector plan | Repo content can be indexed with permissions |
| F107 | P2 | Future data sources | Define connector interface | New data source can plug into RAG |
| F108 | P2 | Ask questions about own information | Implement retrieval in chat | Answers can include source-backed context |
| F109 | P2 | Domain-specific assistants | Save assistant profile + knowledge scope | User can create an assistant for a knowledge set |
| F110 | P2 | Embedding model support | Add embeddings provider adapter | RAG can run on local or managed embeddings |

## P2 - Persistent Memory Promise

| ID | Priority | Promise on first page | Required implementation | Acceptance criteria |
|---|---:|---|---|---|
| F111 | P2 | AI evolves with you over time | Add explicit memory model | Memory is opt-in and inspectable |
| F112 | P2 | Remember workflows | Persist workflow history | User can reuse previous workflow choices |
| F113 | P2 | Remember preferences | Persist user preferences | User can view/edit/delete preferences |
| F114 | P2 | Remember projects/context | Add project workspace model | Chat can be scoped to a project |
| F115 | P2 | Less repetitive prompting | Inject allowed memory into prompts | User sees when memory is used |
| F116 | P2 | Personalized behavior | Add safe preference injection | Personalization never hides what data is used |
| F117 | P2 | Continuity across sessions | Add account-backed storage later | Signed-in user can resume sessions |

## P2 - Fine-Tuning And Model Adaptation Promise

| ID | Priority | Promise on first page | Required implementation | Acceptance criteria |
|---|---:|---|---|---|
| F118 | P2 | Fine-tuning | Create fine-tuning feasibility plan | Supported providers/models are documented |
| F119 | P2 | LoRA adapters | Add adapter support spike | Feasible path identified before UI promise becomes live |
| F120 | P2 | Custom model specialization | Define dataset, job and deployment flow | User understands steps and constraints |
| F121 | P2 | Organization-specific AI behavior | Add team/org policy layer | Org settings can control model behavior |
| F122 | P2 | Improve niche workflows | Measure before/after quality | Adaptation has evaluation criteria |

## P2 - Edge Compute Mesh / Intelligence Well Promise

| ID | Priority | Promise on first page | Required implementation | Acceptance criteria |
|---|---:|---|---|---|
| F123 | P2 | Distributed intelligence platform | Define mesh architecture | Nodes, trust, routing and billing are documented |
| F124 | P2 | Trusted PCs | Add node identity and registration | PC node can be registered safely |
| F125 | P2 | Trusted VMs | Add VM node type | VM node can be registered safely |
| F126 | P2 | GPUs | Add GPU capability reporting | GPU capacity can be measured and displayed |
| F127 | P2 | Edge devices | Add edge node capability model | Edge device can report availability safely |
| F128 | P2 | Share trusted model capacity | Add provider terms, auth and metering | Capacity sharing is controlled and legal-reviewed |
| F129 | P2 | Scale workloads dynamically | Add job queue/relay design | Workload can be routed to available capacity |
| F130 | P2 | Access more intelligence through MMIR network | Add managed marketplace/network plan | User can opt into network capacity |

## P1 - Secure Architecture Promise

| ID | Priority | Promise on first page | Required implementation | Acceptance criteria |
|---|---:|---|---|---|
| F131 | P1 | Zero Trust | Document and enforce trust boundaries | Frontend, API, local node and providers are separated |
| F132 | P1 | Local-first principles | Default to local mode where possible | User can use MMIR without account/cloud for local chat |
| F133 | P1 | Secure API layers | Add auth, validation and rate limits to managed API | Protected endpoints reject invalid/unauthorized calls |
| F134 | P1 | Localhost isolation | Local node binds localhost by default | Local node is not reachable from LAN by default |
| F135 | P1 | Protected backend routing | Provider calls happen server-side | No paid provider keys in frontend |
| F136 | P1 | Secrets/runtime separation | Add secret handling docs and code checks | Secrets are stored outside static frontend |
| F137 | P1 | Reduced vendor exposure | Abstract provider API behind router | Provider can change without frontend rewrite |
| F138 | P1 | More control over infrastructure/data | Add mode indicators | User knows whether a request is local, self-managed or managed |

## P2 - One-Click AI Deployment Promise

| ID | Priority | Promise on first page | Required implementation | Acceptance criteria |
|---|---:|---|---|---|
| F139 | P2 | One-click AI deployment | Create installer/orchestrator plan | Supported deploy targets are defined |
| F140 | P2 | Setup to working AI in minutes | Build guided onboarding checklist | First successful chat can happen quickly |
| F141 | P2 | Minimal setup | Reduce required manual config | User does not need to edit code for MVP |
| F142 | P2 | Automated configuration | Add auto-detect for local runtime | Ollama/local runtime can be detected |
| F143 | P2 | Faster time-to-value | Add success screen after first chat | User sees value and next steps immediately |

## P1 - AI Control Plane Promise

| ID | Priority | Promise on first page | Required implementation | Acceptance criteria |
|---|---:|---|---|---|
| F144 | P1 | Central control plane | Define control-plane API and state model | Models, backends and chat state have one schema |
| F145 | P1 | Manage AI in one place | Consolidate backend/model/profile UI | User can manage connections from one place |
| F146 | P1 | Unified orchestration | Add provider abstraction | All backends expose same normalized capabilities |
| F147 | P1 | Centralized workflows | Persist workflows after P2 workflow feature starts | Workflows are managed centrally |
| F148 | P1 | Scalable AI operations | Add architecture path for teams/usage/observability | System can grow beyond single-user local mode |

## P2 - Managed Commercial Layer Promise

| ID | Priority | Promise on first page | Required implementation | Acceptance criteria |
|---|---:|---|---|---|
| F149 | P2 | Paid managed routing layer | Define paid managed API product | User understands what paid tier adds |
| F150 | P2 | Cloud model connectors | Add managed provider adapters | OpenAI/Anthropic/Gemini-like providers work server-side |
| F151 | P2 | Encrypted key vault | Add server-side vault | Provider keys are encrypted and never exposed to frontend |
| F152 | P2 | Team workspaces | Add workspace/account model | Teams can share managed connections safely |
| F153 | P2 | Usage analytics | Add usage events and dashboard | User can see usage/cost/latency |
| F154 | P2 | Support path | Add support/docs/contact flow | Paying users know where to get help |

## P1 - Public Copy Truthfulness

| ID | Priority | Promise on first page | Required implementation | Acceptance criteria |
|---|---:|---|---|---|
| F155 | P1 | Planned vs live clarity | Label every planned feature clearly | Users can distinguish live, beta and planned |
| F156 | P1 | Premium clarity | Hide or mark premium features until product supports them | Premium claims do not look live before backend exists |
| F157 | P1 | Security claims | Only claim security properties that code enforces | Copy matches implementation |
| F158 | P1 | Model claims | Only show models with license/status disclaimers | No unsupported model appears as ready |
| F159 | P1 | First-screen focus | Keep above-the-fold focused on local chat MVP | User sees first action, not future roadmap first |

## Suggested Execution Order

1. F001-F022: make the current page's core chat/connect promise true.
2. F023-F044: make the chat and connection UX feel complete.
3. F045-F053: harden and package local connector.
4. F054-F083: make model library, multi-model chat and role presets honest and usable.
5. F131-F138: enforce secure architecture in code and docs.
6. F084-F130 and F139-F154: build premium/future platform features only after MVP works.
7. F155-F159: continuously keep public copy truthful as features move from planned to live.
