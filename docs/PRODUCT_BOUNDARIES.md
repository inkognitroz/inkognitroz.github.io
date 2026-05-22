# Product Boundaries

This repository is the public home of SaaS Fabric by Inkognitroz.

## SaaS Fabric

SaaS Fabric is the portfolio and app-factory layer. It owns:

- the public homepage
- `public/content.json`
- app, project, template, dashboard and monetization cards
- static GitHub Pages publishing
- non-technical content workflows

## MMIR

MMIR is a product track inside the broader SaaS Fabric portfolio.

MMIR may use pages, manifests and docs in this repository while the product is early, but it must not redefine the repository's top-level identity. MMIR-specific runtime, backend, local-node, provider, billing, secrets and orchestration work belongs in the dedicated MMIR repositories or protected services.

Current public entry point from SaaS Fabric:

- `public/mmir.html`

## Rule

SaaS Fabric owns the hub. MMIR owns trusted AI orchestration.

Do not replace the SaaS Fabric homepage with MMIR unless the repository and domain strategy is intentionally changed first.
