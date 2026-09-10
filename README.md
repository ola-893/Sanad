# Sanad Protocol

**Attestcoin-powered cross-chain credit verification for gold-backed financing on Creditcoin.**

Sanad connects borrowers, pawnshops, and investors by turning supported Ethereum transaction history into verifiable credit evidence on Creditcoin CC3. Its core integration is **Attestcoin readability**: Sanad contracts verify transaction proofs before recording credit events or updating financing evidence.

[Open the app](https://sanad-protocol.netlify.app) · [Backend health](https://sanad-production-6fa3.up.railway.app/api/v1/health) · [Technical documentation](docs/README.md)

## Why Attestcoin matters

An API can report that a borrower repaid a loan. Sanad goes further: it submits evidence of a supported source-chain transaction to Creditcoin's native verifier, then applies application-specific validation before updating credit state.

Attestcoin is part of the contract execution path, not just a frontend data source.

```text
Ethereum Mainnet / Sepolia transaction
                 |
     Discovery and proof construction
       Attestcoin SDK / RawProofBuilder
                 |
  Encoded transaction + Merkle inclusion proof
            + continuity proof
                 |
      Sanad contract on Creditcoin CC3
                 |
       BlockProver precompile (0xFD2)
                 |
  Sanad checks: chain, target, borrower, claims
                 |
      Credit profile / financing evidence
```

## Depth of integration

### 1. Proof construction and attestation context

The [backend proof service](backend/src/core/credit-bureau/attestcoin-oracle-relayer.service.ts) uses `@gluwa/usc-sdk`, remote proof-service integration, and a local `RawProofBuilder` path for historical DeFi batches. It retrieves source blocks and receipts and matches returned proofs to requested transaction hashes.

[ChainInfo (`0xFD3`)](backend/src/contracts/interfaces/IChainInfo.sol) supplies attestation-height and boundary queries. Merkle proofs establish transaction inclusion; continuity proofs connect the relevant history to an attestation boundary.

### 2. Verification inside the credit oracle

[SanadCreditOracle](backend/src/contracts/SanadCreditOracle.sol) exposes `submitSingleProof()` and `submitBatchProof()`. Both call [BlockProver's `verify()`](backend/src/contracts/interfaces/IBlockProver.sol) at `0xFD2` before accepting evidence.

Sanad then checks transaction claims, records accepted events, and recalculates a **0–1,000 credit score**. Discovery candidates are not treated as verified history. The implementation represents ten protocol categories; that does not imply complete support for every action each protocol exposes.

### 3. Batch proving during KYC

The `auto-prove-all` workflow groups compatible source-chain events into batches of up to **10**, with transaction/proof arrays and one shared continuity proof.

The configured oracle owner can submit without a separate borrower authorization signature. This avoids repeated signature prompts without bypassing cryptographic proof verification. Other relayer submissions require borrower authorization. Completion time depends on attestation readiness, RPC retrieval, proof construction, and CC3 inclusion.

### 4. Cross-chain financing evidence

[SanadLiquidityPool](backend/src/contracts/SanadLiquidityPool.sol) also calls BlockProver to verify supported Sepolia funding, repayment, and investor-return transactions. Payment-verification paths check gateway targets, selectors, successful receipts, and duplicate processing before recording evidence.

**Credit separation:** a proven Sepolia payment is not newly available native CTC. Attestcoin verifies facts; it does not bridge liquidity. Current gateway transfers still involve the pawnshop.

## Proof of integration

A publicly inspectable [successful proof submission](https://creditcoin-testnet.blockscout.com/tx/0x7e03e196ac0bce52fb389df75d7cf41f685b1662fa7fec451bfa13155a30b78d) demonstrates deployed execution:

| Evidence | Recorded result |
| --- | --- |
| CC3 block | `5,440,388` |
| Call selector | `0x584194a4`, matching `submitSingleProof()` |
| Oracle events | `EventProven` and `CreditScoreUpdated` |
| Credit score | **675 → 695** |
| Recorded source transaction | [View on Sepolia](https://sepolia.etherscan.io/tx/0xd8cf02d4dfc7ab53f92e3195b66ef97188c528b9b9b5f8c81ef0d01bc8629733) |

[Inspect the CC3 logs](https://creditcoin-testnet.blockscout.com/tx/0x7e03e196ac0bce52fb389df75d7cf41f685b1662fa7fec451bfa13155a30b78d?tab=logs) · [Additional successful single-proof submission](https://creditcoin-testnet.blockscout.com/tx/0xe64cd48304f16248d325eade6d1dd5a47b7ce330f035fea86bc4997a93084db4)

These records demonstrate single-proof execution and observable state changes, not an audit of every batch or loan path. See the [integration guide](docs/architecture/backend-credit-bureau.md) for code-level detail.

## Gold-backed financing workflow

Borrowers register and submit pledge requests. Pawnshops record physical appraisal and custody information, and authorized signers mint **Sanad Asset-backed Gold (SAG)** collateral NFTs on CC3.

On Sepolia, `InvestorVault` routes investor funding to the pawnshop, which disburses to the borrower. `RepaymentGateway` routes borrower repayments and supports separate investor settlement. Sanad associates these workflows with individual pledge requests and verified transaction evidence.

Physical gold appraisal and custody are pawnshop responsibilities—not an implemented AI/Python product feature.

## Deployments

Current configured networks: **CC3 Testnet (102031)** and **Ethereum Sepolia (11155111)**. Addresses are maintained in the [deployment registry](backend/src/config/deployed-addresses.ts).

| Network | Contract | Explorer |
| --- | --- | --- |
| CC3 | SanadCreditOracle | [0x9B926B432bbEFA5405eC9EBB0F7515496c2095a5](https://creditcoin-testnet.blockscout.com/address/0x9B926B432bbEFA5405eC9EBB0F7515496c2095a5) |
| CC3 | SanadLiquidityPool | [0x6370114EEda4AC8F43F6c7997cB6C75DF58F4316](https://creditcoin-testnet.blockscout.com/address/0x6370114EEda4AC8F43F6c7997cB6C75DF58F4316) |
| CC3 | SAGToken | [0x80b9Ae7D0BEfB042a3eb8fDd1af0DCF6E53bEdE9](https://creditcoin-testnet.blockscout.com/address/0x80b9Ae7D0BEfB042a3eb8fDd1af0DCF6E53bEdE9) |
| Sepolia | InvestorVault | [0x0e243c2F556eFaDA6352f567AA658b6052F04eD4](https://sepolia.etherscan.io/address/0x0e243c2F556eFaDA6352f567AA658b6052F04eD4) |
| Sepolia | RepaymentGateway | [0x662e21FfB91F35A1f16983e38a9cDAe90f537A80](https://sepolia.etherscan.io/address/0x662e21FfB91F35A1f16983e38a9cDAe90f537A80) |

[Frontend](https://sanad-protocol.netlify.app) · [Backend API](https://sanad-production-6fa3.up.railway.app) · [Database health](https://sanad-production-6fa3.up.railway.app/api/v1/health/db)

## Run and explore

- [Quickstart](docs/guides/quickstart-guide.md): local setup and verification.
- [Architecture](docs/architecture/overview.md): components and trust boundaries.
- [Deployment runbook](docs/deployment/production.md): Railway, Netlify, database, and uploads.
- [Demo walkthrough](docs/guides/demo-pitch-script.md): present the proof and resulting state.
- [White paper](docs/white-paper.md): technical analysis, equations, and roadmap.

The application uses Next.js/React/TypeScript, an Express backend, PostgreSQL, Redis-backed jobs, Solidity, and ethers.js. Proof services live in `backend/src/core/credit-bureau/`; contracts live in `backend/src/contracts/`; the credit interface lives in `frontend/core/credit-bureau/`.

## Boundaries and next steps

Sanad is a **testnet prototype**, not a production-audited lender or independently certified Shariah product. Proof inclusion does not establish complete borrower history, physical custody, or the correctness of every financial interpretation. Credit-oracle receipt checks, protocol-specific decoding, and monetary-unit accounting require further hardening.

Next priorities are stronger validation, escrow-based settlement, and clearer proof/recovery states. Future Attestcoin writability integration is planned only once a supported route is available and validated, with authenticated instructions, replay protection, and execution acknowledgements.

## License

Private — Sanad Protocol. All rights reserved.
