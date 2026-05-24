# MMIR Architecture: Today And Target

MMIR is the orchestration layer for trusted AI. The architecture must keep user experience simple while preserving clear boundaries between frontend, control plane, local nodes, hosted nodes, policy, secrets and observability.

## Current P0 Architecture

```mermaid
flowchart TD
  U["User on mmir.ai"] --> FE["MMIR web chat shell"]
  FE --> FG["Free active route fallback"]
  FE --> API["api.mmir.ai control-plane bootstrap"]
  API --> NODES["GET /nodes"]
  API --> MODELS["GET /models"]
  API --> ROUTE["POST /routing/decision"]
  API --> CHAT["POST /chat/completions"]
  NODES --> GUIDE["browser-guide free node"]
  MODELS --> GUIDE
  ROUTE --> GUIDE
  CHAT --> GUIDE
  FE --> LOCAL["MMIR Local Node on 127.0.0.1 when paired"]
  LOCAL --> OLLAMA["Ollama/local models"]

  classDef live fill:#ecfdf5,stroke:#10a37f,color:#064e3b;
  classDef planned fill:#f8fafc,stroke:#94a3b8,color:#334155;
  class API,NODES,MODELS,ROUTE,CHAT,GUIDE,FE live;
  class LOCAL,OLLAMA planned;
```

Current rule: the public product must never dead-end. If no paired local/hosted node is available, MMIR still exposes the free `browser-guide` route with `no_paid_routes_started: true`.

## Target Scalable Architecture

```mermaid
flowchart LR
  subgraph Client["Client Layer"]
    WEB["Web/PWA chat shell"]
    UX["Node/model picker, compare, discussions, workflows"]
  end

  subgraph Edge["Edge/API Layer"]
    CF["Cloudflare edge routes"]
    API["MMIR API control plane"]
    AUTH["Auth/org/session policy"]
    RATE["Rate limits and abuse controls"]
    OBS["Privacy-safe observability"]
  end

  subgraph Control["Orchestration Layer"]
    REG["Node registry and heartbeat"]
    ROUTER["Routing engine"]
    SCHED["Scheduler/candidates"]
    ORCH["Multi-model compare/discussion/workflows"]
    POLICY["Trust, cost and data policy"]
    VAULT["Secret references, not raw browser keys"]
  end

  subgraph Nodes["Runtime Nodes"]
    FREE["Free bootstrap node"]
    LOCAL["Local node: Mac/PC/Linux"]
    EDGE["Edge node: Pi/Jetson/device"]
    HOSTED["User hosted LLM/VM/GPU"]
    MANAGED["Approved managed providers"]
    AGENTS["Specialized agent services"]
  end

  WEB --> UX --> CF --> API
  API --> AUTH
  API --> RATE
  API --> OBS
  API --> REG
  API --> ROUTER
  API --> ORCH
  ROUTER --> POLICY
  ROUTER --> SCHED
  POLICY --> VAULT
  SCHED --> REG
  REG --> FREE
  REG --> LOCAL
  REG --> EDGE
  REG --> HOSTED
  REG --> MANAGED
  REG --> AGENTS
  ORCH --> ROUTER

  classDef boundary fill:#eef2ff,stroke:#6366f1,color:#111827;
  classDef runtime fill:#ecfdf5,stroke:#10a37f,color:#064e3b;
  classDef policy fill:#fff7ed,stroke:#f97316,color:#7c2d12;
  class Client,Edge,Control boundary;
  class FREE,LOCAL,EDGE,HOSTED,MANAGED,AGENTS runtime;
  class AUTH,RATE,POLICY,VAULT,OBS policy;
```

## Zero-Trust Boundary

```mermaid
sequenceDiagram
  participant Web as mmir.ai frontend
  participant API as api.mmir.ai control plane
  participant Node as MMIR-compatible node
  participant Runtime as Local/hosted model runtime

  Web->>API: GET /nodes
  API-->>Web: Public-safe active nodes only
  Web->>API: POST /routing/decision
  API-->>Web: Free/approved route with trust and cost metadata
  Web->>API: POST /chat/completions
  API->>Node: Forward only after auth, policy and cost gates
  Node->>Runtime: Private runtime call
  Runtime-->>Node: Model response
  Node-->>API: Normalized chat completion
  API-->>Web: Response with node_id/model/provider

  Note over Web,Runtime: Frontend never owns provider secrets or raw model runtime authority.
```

## Agent Work Lanes

```mermaid
flowchart TD
  PM["Product doctrine and user journey"] --> FE["Frontend chat shell"]
  PM --> API["API contracts"]
  API --> BE["Backend control plane"]
  API --> NODE["Local/hosted node contracts"]
  SEC["Security review"] --> API
  SEC --> NODE
  QA["Smoke tests and visual QA"] --> FE
  QA --> BE
  REV["Code review and architecture review"] --> FE
  REV --> BE
  REV --> NODE
```

Agent rules:

- Keep P0 changes small and tied to a GitHub issue.
- Do not remove existing functionality unless there is a tracked security/stability reason.
- Start with contracts and tests before broad UI expansion.
- Backend owns auth, policy, routing, rate limits, cost gates and secret references.
- Frontend owns interaction quality, visibility and user journey, not runtime authority.

## Near-Term P0 Sequence

1. Keep first-click chat live through `browser-guide`.
2. Show active nodes and attachable models in the chat shell.
3. Complete local-node active heartbeat/model inventory shape.
4. Implement zero-trust node registration storage.
5. Add hosted LLM setup plan with server-side secret references.
6. Add compare/best-answer/discussion orchestration after the single-route journey is stable.
