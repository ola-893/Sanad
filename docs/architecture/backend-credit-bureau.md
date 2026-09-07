# Sanad On-Chain Credit Bureau (Core)

The **Sanad On-Chain Credit Bureau** is the primary core component for vetting borrowers and establishing cryptographic trust on **Creditcoin 3 (CC3) Testnet** using the **Attestcoin Protocol**.

## Architecture

1. **Discovery & Indexer (`defi-discovery.service.ts`):**
   - Scans Ethereum Mainnet logs for historical lending transactions across Aave v3, Compound v3, Maple Finance, and Goldfinch.
   - Categorizes events into Positive Signals (Clean Repayments, Collateral Supply) and Negative Signals (Overcollateralized Liquidations, Undercollateralized Defaults).
   - Ranks and caps discovered transactions at 10 to conform with the Attestcoin batch proof limit.

2. **Attestcoin Proof Relayer (`attestcoin-oracle-relayer.service.ts`):**
   - Interfaces with `@gluwa/usc-sdk` `ProofBuilder`.
   - Requests Merkle inclusion proofs and continuity proofs for Ethereum Mainnet transactions (`chainKey: 3`).
   - Packages proof tuples and submits them to the `SanadCreditOracle` smart contract on Creditcoin CC3.

3. **On-Chain Credit Oracle (addressed by `DEPLOYED_ADDRESSES.cc3.creditOracle`):**
   - Cryptographically verifies external Ethereum transactions using CC3 native `BlockProver` precompile (`0x0000000000000000000000000000000000000FD2`) and queries `ChainInfo` precompile (`0x0000000000000000000000000000000000000fD3`).
   - Maintains on-chain credit profiles, trust scores (0-1000), and credit tiers (Gold, Silver, Bronze, HighRisk).
   - Provides replay protection (`provenTxHashes`) to prevent double-counting historical events.
   - Uses EIP-191 borrower authorization for direct relayer submissions. The KYC
     `auto-prove-all` path instead uses the configured oracle-owner signer and
     `submitBatchProof`, so it submits one shared proof batch without requesting
     a borrower MetaMask signature.

4. **REST API (`credit-oracle.controller.ts`, `credit-oracle.routes.ts`):**
   - `POST /api/v1/credit-oracle/discover`: Scans Ethereum DeFi history for any address.
   - `POST /api/v1/credit-oracle/prove-event`: Generates Attestcoin proof and writes credit record to CC3.
   - `POST /api/v1/credit-oracle/auto-prove-all`: Discovers unproven history and
     submits each source-chain group as an owner-authorized batch (up to 10 events).
   - `GET /api/v1/credit-oracle/profile/:address`: Reads on-chain credit profile from CC3.
   - `GET /api/v1/credit-oracle/info`: Returns precompile addresses and oracle metadata.
