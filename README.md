# Sanad Protocol

Gold-backed financing and cross-chain credit-history verification on Creditcoin CC3.

Sanad is a testnet prototype connecting borrower credit evidence, pawnshop gold custody, SAG collateral NFTs, and investor payment workflows. Ethereum Sepolia hosts test-ETH payment gateways; Creditcoin records collateral and verified transaction evidence. Proof verification does not bridge funds or eliminate pawnshop custody.

## Start here

- [Documentation index](docs/README.md) — the recommended reading path.
- [Local setup and testing](docs/guides/quickstart-guide.md) — install and run the application.
- [Architecture](docs/architecture/overview.md) — components, contracts, and trust boundaries.
- [Deployment runbook](docs/deployment/production.md) — Railway, Netlify, database, and uploads.
- [White paper](docs/white-paper.md) — detailed technical analysis and roadmap.

## Repository map

| Directory | Purpose |
| --- | --- |
| `frontend/` | Next.js application: borrower, investor, pawnshop, and admin portals |
| `backend/` | Express API, database models, proof services, Solidity contracts, and scripts |
| `agent/` | Python gold-risk evaluator |
| `docs/` | Maintained project documentation |
| `output/pdf/` | White-paper PDF and its build script |

The [contract registry](backend/src/config/deployed-addresses.ts) is the source for configured deployment addresses. Verify the selected network and on-chain permissions before sending transactions.

## Project status

This is a testnet implementation, not a production-audited financial system. Shariah alignment is a design objective requiring independent review. Physical appraisal and custody remain off-chain responsibilities. Application admin access is distinct from smart-contract ownership and roles.

Credit separation means cross-chain funding evidence must remain separate from withdrawable native CTC liquidity. See the architecture and white paper for implementation limits.

## License

Private — Sanad Protocol. All rights reserved.
