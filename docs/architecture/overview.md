# Architecture overview

Sanad is a gold-backed financing protocol with cross-chain credit verification. Borrowers pledge physical gold through licensed pawnshops, receive SAG collateral NFTs on Creditcoin, and unlock credit from on-chain investors. The system proves Ethereum lending history on Creditcoin using the Attestcoin protocol.

## Components

| Component | Purpose |
| --- | --- |
| **Frontend** (`frontend/`) | Next.js borrower, investor, pawnshop, and admin portals |
| **Backend API** (`backend/src/`) | Express REST API, loan lifecycle, credit proofs, scheduler |
| **Database** (`backend/postgres/`) | PostgreSQL loan records, accounts, investments, KYC, images |
| **Contracts** (`backend/src/contracts/sepolia/`) | Solidity payment (Sepolia), collateral & credit (Creditcoin CC3) |
| **Agent** (`agent/`) | Python gold-risk evaluator (optional, integrates via REST) |
| **Credit bureau** (`backend/src/core/credit-bureau/`) | Discovery, Attestcoin relayer, on-chain verification |

## Trust boundaries

- **Physical custody:** Pawnshops hold real gold; the protocol does not replace physical appraisal or security.
- **Off-chain KYC:** Application admins approve accounts; contract roles remain separate.
- **Cross-chain credit:** Ethereum transaction history is proven on Creditcoin for credit decisions, not fund bridging.
- **Testnet only:** Current deployment uses test-ETH (Sepolia) and CC3 testnet.

## Loan workflow

1. **KYC registration:** Borrower submits identity documents; admin reviews and approves.
2. **Gold submission:** Borrower delivers physical gold to pawnshop; pawnshop records weight, purity, appraised value.
3. **SAG minting:** Backend mints a Sanad Asset Gateway (SAG) NFT on Creditcoin representing the collateral.
4. **Credit discovery:** Optional DeFi history scan on Ethereum mainnet; batch proof submitted to Creditcoin via Attestcoin.
5. **Loan creation:** Borrower requests loan amount and duration; admin or pawnshop approves terms.
6. **Investment:** Investors browse active loans, fund via Sepolia test-ETH payment gateway.
7. **Repayment:** Borrower makes installment payments tracked on-chain and in database.
8. **Settlement:** Upon full repayment, borrower reclaims gold; on default, pawnshop liquidates and investors recover proportionally.

## Authentication and roles

- **Application auth:** JWT tokens issued after wallet signature verification; role stored in database (`User.role`).
- **Contract roles:** Separate on-chain permissions (pawnshop operator, oracle owner, SAG minter) enforced by Solidity modifiers.
- **Admin dashboard:** Application-level account approval, loan review, KYC verification. Does not grant contract ownership.

## Network configuration

- **Ethereum Sepolia:** Test-ETH payment gateway contracts (`PaymentGateway`, `LoanPaymentProcessor`).
- **Creditcoin CC3 Testnet:** SAG collateral NFTs (`SanadAssetGateway`), credit oracle (`SanadCreditOracle`), CC3 native proofs.
- **Database:** PostgreSQL for off-chain loan state, investment records, user accounts.
- **IPFS:** Gold images and appraisal metadata uploaded via Pinata.

Contract addresses: [deployed-addresses.ts](../../backend/src/config/deployed-addresses.ts).

## Key services

- **Scheduler** (`backend/src/bullmq/`): BullMQ job queues for loan state transitions, payment processing, interest accrual.
- **Credit bureau** ([credit-bureau docs](backend-credit-bureau.md)): Discovery, Attestcoin proof relay, on-chain verification.
- **Payment processing:** Monitors Sepolia gateway events, reconciles on-chain payments with database loan records.
- **SAG lifecycle:** Mints collateral NFTs, tracks custody transfers, burns on redemption or liquidation.

## Data sources

- **Loan state:** PostgreSQL `loans` table is the application source of truth; on-chain events verify payments.
- **Credit profiles:** Read directly from `SanadCreditOracle` contract on CC3; cached queries improve frontend performance.
- **Gold metadata:** IPFS URIs referenced by SAG token metadata; images served via Pinata gateway or local uploads.
- **DeFi history:** Discovery scans Ethereum mainnet via RPC; no local transaction archive.

See the [credit bureau architecture](backend-credit-bureau.md) for proof flow details and [white paper](../white-paper.md) for protocol equations and Shariah analysis.

## Legacy artifacts

The `architecture/` folder contains snapshot exports (`api-documentation.json`, `database-schema.sql`) from earlier iterations. These are reference artifacts, not authoritative contracts or migration inputs. Use the live sources:

- **API contracts:** [feature routes](../../backend/src/features/) and [controller implementations](../../backend/src/core/).
- **Database schema:** [db.schema.ts](../../backend/src/db/db.schema.ts) and [production baseline](../../backend/postgres/bootstrap.sql).

For deployment operations, see the [production runbook](../deployment/production.md).
