# MMIR Product Strategy Backlog

This backlog captures sales and product strategy input as stable backlog lines.

Use the stable IDs when changing scope, for example: `remove S031`, `move S045 to phase 2`, or `start P1 only`.

## Product Feel Principles

MMIR must always feel simple, personal, calm and powerful, even when the infrastructure underneath becomes highly advanced.

| ID | Principle | Product implication | Acceptance criteria |
|---|---|---|---|
| UX001 | Simple | The first user path must be obvious and low-friction | A new user can reach first chat without understanding the full architecture |
| UX002 | Personal | The product should adapt to the user's models, hardware, projects and preferences | User can see their own node, models, chats and workspace context |
| UX003 | Calm | The UI should feel controlled, trustworthy and not noisy | Advanced infrastructure is hidden behind progressive disclosure |
| UX004 | Powerful | MMIR should expose deep orchestration when the user is ready | Expert users can access models, nodes, routing, workflows and governance |

## Sales Phase Order

| ID | Phase | Sales line | Backlog meaning | Acceptance criteria |
|---|---|---|---|---|
| P1-001 | Phase 1 - Core Product | Universal chat UI | Build one primary chat surface | User can chat in one UI with a selected backend/model |
| P1-002 | Phase 1 - Core Product | Connect models | Let users connect local, compatible backend and managed routes | At least local and compatible backend paths are represented |
| P1-003 | Phase 1 - Core Product | Local node | Make local node the first real product loop | User can install/connect/check local node |
| P1-004 | Phase 1 - Core Product | Multi-model switching | Switch active model/backend without leaving chat | User can change model from chat context |
| P1-005 | Phase 1 - Core Product | Persistent chats | Keep chat state across reload/session | User can resume recent chats |
| P2-001 | Phase 2 - Product Feeling | Beautiful UX | Polish layout, spacing, typography, states and interactions | UI feels premium, calm and usable on desktop/mobile |
| P2-002 | Phase 2 - Product Feeling | Memory | Add explicit, inspectable memory | User can view, edit and disable memory |
| P2-003 | Phase 2 - Product Feeling | Workspaces | Add project/team context containers | User can organize chats/models/knowledge by workspace |
| P2-004 | Phase 2 - Product Feeling | Onboarding | Guide users to first successful chat | First-run flow has clear success state |
| P2-005 | Phase 2 - Product Feeling | Mobile | Make core chat/connect usable on phone | Mobile layout has no broken overflow or hidden controls |
| P3-001 | Phase 3 - Real Infrastructure | Node orchestration | Manage local/remote nodes as a fleet | Nodes can register, report health and receive tasks |
| P3-002 | Phase 3 - Real Infrastructure | Workflows | Chain prompts, models, tools and actions | User can run a saved workflow |
| P3-003 | Phase 3 - Real Infrastructure | Automation | Automate recurring and event-driven AI tasks | Workflow can be scheduled or triggered |
| P3-004 | Phase 3 - Real Infrastructure | AI routing | Route tasks by trust, cost, latency and specialization | Router chooses target according to policy |
| P4-001 | Phase 4 - Platform | Marketplace | Share/monetize models, prompts, workflows and agents | Marketplace object model and permissions exist |
| P4-002 | Phase 4 - Platform | Enterprise | Add governance, compliance and admin controls | Org admins can manage users, policies and audit |
| P4-003 | Phase 4 - Platform | Agents | Add multi-agent execution model | Agents can collaborate inside controlled workflows |
| P4-004 | Phase 4 - Platform | Ecosystem | Open plugin/tool/connector model | Third parties can integrate safely |

## Product And Strategy Capability Lines

| ID | Phase | Capability | Backlog requirement | Acceptance criteria |
|---|---|---|---|---|
| S001 | Phase 1 | One-Click Local AI Installation | Install and configure MMIR Local Connector, Ollama and starter models automatically on Mac, Windows and Linux with guided onboarding and health checks | Supported OS install path reaches local node online + model ready |
| S002 | Phase 1 | Local Model Discovery | Automatically detect local models, runtimes and hardware capabilities and expose them securely inside MMIR | UI lists detected runtime, models and hardware hints |
| S003 | Phase 1 | Multi-Model Chat | Unified chat interface for local, cloud, SaaS and custom AI models | Same chat surface works across normalized providers |
| S004 | Phase 1 | Model Comparison | Send the same task to multiple models simultaneously and compare responses side-by-side | User sees labeled parallel answers |
| S005 | Phase 1 | AI Synthesis Engine | Combine answers from several models into one synthesized response | User can generate a synthesis from selected outputs |
| S006 | Phase 1 | Role-Based AI Teams | Assign specialized roles such as researcher, architect, critic, coder, analyst and strategist to different AI models | Role presets affect model instructions and labels |
| S007 | Phase 3 | Multi-Agent Workflows | Autonomous and semi-autonomous AI agents collaborating across workflows and tasks | Agents can execute bounded workflow steps with audit trail |
| S008 | Phase 3 | Workflow Builder | Visual orchestration system for chaining prompts, agents, APIs, tools and actions together | User can create and run a workflow graph/sequence |
| S009 | Phase 2 | Prompt Registry | Store, version and share prompts, workflows and agent configurations | Prompt/workflow versions can be saved and restored |
| S010 | Phase 2 | Persistent AI Memory | Cross-session memory for projects, workflows, preferences and long-term context | Memory is opt-in, inspectable and removable |
| S011 | Phase 2 | Knowledge Upload / RAG | Upload documents, repositories and structured data for retrieval-augmented generation | Chat can answer with retrieved context from uploaded data |
| S012 | Phase 2 | Vector Database Integration | Embeddings, semantic search and contextual retrieval across all uploaded knowledge | Vector store supports indexing and query retrieval |
| S013 | Phase 2 | GitHub Integration | Read repositories, documentation, issues, pull requests and code context directly inside MMIR | User can connect repo context with permissions |
| S014 | Phase 2 | Notion / Docs Integration | Connect external knowledge systems and synchronize organizational intelligence | External docs can be indexed/synced with user consent |
| S015 | Phase 1 | Secure Local AI Runtime | Run AI privately on local hardware without exposing raw model runtimes to the internet | Local runtime stays private behind connector |
| S016 | Phase 1 | Open WebUI Integration | Connect Open WebUI instances as managed or self-hosted AI backends | MMIR can verify/list/chat through Open WebUI-compatible route |
| S017 | Phase 1 | Ollama Integration | Native Ollama orchestration, management and routing | Ollama is reached via local node/controlled connector |
| S018 | Phase 1 | OpenAI-Compatible Provider Support | Connect APIs compatible with OpenAI standards through protected backend routing | `/chat/completions` route supports OpenAI-compatible providers server-side |
| S019 | Phase 1 | Custom Backend Connectors | Support arbitrary AI runtimes and APIs through MMIR-compatible backend adapters | Adapter contract supports health/status/models/chat |
| S020 | Phase 3 | AI Routing Engine | Automatically route tasks to the best available model based on performance, trust, latency, cost and specialization | Router policy selects target and records why |
| S021 | Phase 3 | Dynamic Compute Scaling | Scale workloads across local devices, VMs, GPUs and cloud runtimes automatically | Workload can move to available eligible capacity |
| S022 | Phase 3 | OCI Runtime Integration | Deploy and manage AI runtimes in Oracle Cloud Infrastructure | OCI runtime can be provisioned and health checked |
| S023 | Phase 3 | AWS Runtime Integration | Deploy and manage scalable AI infrastructure in AWS | AWS runtime template can be provisioned and health checked |
| S024 | Phase 3 | Edge Compute Mesh | Distributed network of trusted PCs, VMs, GPUs and edge devices contributing compute and AI capacity | Trusted nodes can register capabilities and availability |
| S025 | Phase 4 | Intelligence Well | Global shared orchestration and intelligence layer connecting distributed compute, models, workflows and agents | Shared intelligence layer has trust, routing and governance model |
| S026 | Phase 3 | Trusted Node Registration | Register, verify and manage trusted local and remote compute nodes securely | Node identity, ownership and trust status are recorded |
| S027 | Phase 3 | Node Health Monitoring | Live health checks, telemetry and availability tracking across all runtimes and nodes | Node dashboard shows health, latency and availability |
| S028 | Phase 3 | GPU Orchestration | Dynamic GPU scheduling, allocation and workload routing | GPU capability can be reported and selected by scheduler |
| S029 | Phase 3 | CPU / RAM Resource Management | Resource-aware scheduling and workload balancing | Scheduler considers CPU/RAM capacity before dispatch |
| S030 | Phase 4 | Fine-Tuning / LoRA Training | Train lightweight adapters and specialized AI behavior on custom datasets | LoRA/fine-tune job model and evaluation path exist |
| S031 | Phase 4 | Full Training Pipelines | Managed distributed model training workflows for advanced AI development | Training pipeline supports dataset, run, eval and artifact outputs |
| S032 | Phase 4 | Dataset Management | Upload, organize, validate and version datasets for training and evaluation | Datasets have metadata, versions and validation status |
| S033 | Phase 3 | Evaluation / Benchmark Framework | Compare models, workflows and training runs using benchmarks and custom evals | Evals can score models/workflows with stored results |
| S034 | Phase 2 | Model Registry | Central registry for models, adapters, providers and capabilities | Registry tracks model/provider capability metadata |
| S035 | Phase 4 | Marketplace / Sharing | Publish, share or monetize models, workflows, prompts and agents | Marketplace entries have ownership, permissions and pricing hooks |
| S036 | Phase 4 | Usage Credits / Compute Economy | Track contributed compute and future utility credits for shared infrastructure participation | Contribution and usage ledger exists before credits are public |
| S037 | Phase 2 | User Identity & Organizations | Accounts, teams, roles, permissions and organizational management | Users and orgs can be managed with roles |
| S038 | Phase 2 | Authentication & Authorization | Secure identity, tokens, API access and role-based permissions | Protected APIs require auth and enforce roles |
| S039 | Phase 1 | Zero Trust Security Layer | Strict separation between frontend, secrets, runtimes and infrastructure with policy enforcement and verification | Frontend never stores secrets; backend enforces policy |
| S040 | Phase 1 | API Gateway / Reverse Proxy | Protected ingress layer for all public AI communication and routing | Public AI traffic enters through controlled gateway/API |
| S041 | Phase 3 | Secure Tunnels | Outbound secure connector tunnels between local nodes and MMIR cloud services | Local node can connect outbound without exposing inbound port |
| S042 | Phase 2 | Encryption & Key Management | Protected communication, credential isolation and secret management | Secrets are encrypted and scoped by identity/workspace |
| S043 | Phase 2 | Audit Logging | Security logging, access logging and workflow traceability | Sensitive actions emit audit events without leaking prompts by default |
| S044 | Phase 2 | Observability & Metrics | System metrics, latency tracking, usage analytics and infrastructure observability | Metrics show health, latency, errors and usage |
| S045 | Phase 2 | Automation & CI/CD | Automated deployment, provisioning, validation and health workflows through GitHub Actions and IaC | CI/CD validates site, API and deploy health |
| S046 | Phase 3 | Terraform Infrastructure Automation | Provision and manage infrastructure automatically across cloud providers | Terraform modules support planned runtime targets |
| S047 | Phase 3 | Auto-Provisioned AI Backends | Deploy AI runtimes automatically from templates and orchestration policies | Backend template can create a working AI runtime |
| S048 | Phase 3 | Self-Healing Infrastructure | Automatic recovery, failover and restart handling for AI services | Failed runtime can restart/fail over under policy |
| S049 | Phase 2 | Mobile-Friendly MMIR UI | Responsive mobile-first orchestration experience | Chat/connect flow works well on mobile |
| S050 | Phase 2 | Desktop Application | Native MMIR desktop application for advanced local orchestration | Desktop shell can manage local connector and chat |
| S051 | Phase 2 | Voice Interface | Speech-to-text, text-to-speech and conversational voice orchestration | User can speak prompt and hear response where enabled |
| S052 | Phase 2 | Video / Screen AI Assistance | Screen-aware AI workflows and future multimodal assistants | Screen/image context can be attached to a workflow with consent |
| S053 | Phase 3 | Visual Workflow Canvas | Graph-based orchestration editor for AI systems and agents | User can build/edit workflow graph visually |
| S054 | Phase 4 | AI App Factory | Create and publish custom AI applications and internal tools on top of MMIR | User can package workflow/model/tool into an app |
| S055 | Phase 4 | Plugin / Tool Ecosystem | Third-party tools, APIs and connectors integrated into workflows | Plugin/tool interface is documented and permissioned |
| S056 | Phase 3 | Policy Engine | Security, compliance and workflow governance policies | Policies can allow/deny routing, tools and data usage |
| S057 | Phase 4 | Compliance Layer | GDPR, logging policies, regional controls and enterprise compliance tooling | Compliance controls are configurable per org/workspace |
| S058 | Phase 4 | Enterprise Administration | Organization-wide management, governance and deployment controls | Enterprise admin dashboard supports users, policies and audit |
| S059 | Phase 1 | AI Control Plane | Unified orchestration layer connecting models, workflows, infrastructure, knowledge and intelligence systems into one platform | MMIR has one coherent model/backend/workflow/control API |

## Execution Notes

1. Phase 1 is the product truth layer: chat, model connection, local node, provider contract and zero-trust separation must work before broad launch claims.
2. Phase 2 makes the product feel excellent: UX, memory, workspaces, onboarding, mobile, identity, observability and knowledge.
3. Phase 3 turns MMIR into real infrastructure: orchestration, routing, workflows, secure tunnels, cloud runtimes and automation.
4. Phase 4 turns MMIR into a platform: marketplace, enterprise, agents, ecosystem, training and compute economy.
5. Advanced platform features must stay visually calm and progressively disclosed so MMIR remains simple, personal, calm and powerful.
