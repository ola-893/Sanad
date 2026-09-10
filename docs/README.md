# Sanad documentation

Start with the [Attestcoin integration and transaction evidence](../README.md#proof-of-integration), then follow the proof construction, on-chain verification, and resulting state changes in the architecture guide. Attestcoin is the central technical contribution documented here.

| Read | Purpose |
| --- | --- |
| [Quickstart](guides/quickstart-guide.md) | Local installation, configuration, and verification |
| [Architecture](architecture/overview.md) | Source map, loan workflow, authentication, and trust boundaries |
| [Credit bureau](architecture/backend-credit-bureau.md) | Discovery, batch proving, API, and frontend integration |
| [Production deployment](deployment/production.md) | Railway/Netlify runbook, database safety, and image troubleshooting |
| [Design direction](architecture/design-direction.md) | Visual design system and UI acceptance criteria |
| [Demo walkthrough](guides/demo-pitch-script.md) | Reproducible demonstration and claim boundaries |
| [White paper](white-paper.md) | Detailed protocol description, equations, references, and roadmap |

## Source of truth

- Contract addresses: [deployed-addresses.ts](../backend/src/config/deployed-addresses.ts).
- Database models: [db.schema.ts](../backend/src/db/db.schema.ts).
- Production database baseline: [bootstrap.sql](../backend/postgres/bootstrap.sql).
- API behavior: [backend feature routes](../backend/src/features/) and [credit-bureau routes](../backend/src/core/credit-bureau/credit-oracle.routes.ts).
- Dependencies and scripts: [backend package](../backend/package.json) and [frontend package](../frontend/package.json).

The old SQL/API snapshots in `architecture/` are legacy reference artifacts, not migration inputs or an authoritative API contract. Use the sources above for implementation work.

## Documentation policy

Keep maintained project Markdown here; the repository root README is the entry point. Do not duplicate documents under frontend or backend folders. Third-party dependency documentation stays with its dependency.

Every maintained guide should explain its role in Sanad's Attestcoin integration or link to the relevant proof workflow. Distinguish implemented code, observed transaction evidence, and future plans. Do not advertise legacy or unimplemented AI/Python appraisal as a product feature. Do not repeat the entire architecture in operational or design guides.

Keep durable instructions rather than one-off “deployment completed” reports. Record current deployment status in the hosting platform, and use Git history for superseded plans and incident reports. Never put private keys, access tokens, or production passwords in documentation.

The white-paper source lives here; its generated PDF remains in `output/pdf/`. Rebuild it with the existing Python builder in that directory using an environment with ReportLab and pypdf.
