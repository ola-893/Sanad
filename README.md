# Sanad Protocol (سند)
**Real-World Assets (RWA) & Cross-Chain Microfinance on Creditcoin 3**

> **Sanad (سند)**: 
> 1. **Chain of Authentication**: Unbroken verification provenance from physical gold vault to on-chain note.
> 2. **Credit Note & Title Deed**: In Islamic commercial law (*Fiqh al-Mu'amalat*), a *Sanad* is a formal debt/collateral certificate (*Sanad Rahn*).
> 3. **Creditcoin L1 Core Alignment**: Recording real-world microfinance lending into immutable, verifiable, portable credit histories that travel across borders.

---

## 🌟 Project Overview

**Sanad Protocol** is a decentralized, Shariah-compliant credit network that transforms gold-backed Ar-Rahnu pawn financing into tokenized real-world asset notes (**SAG Tokens**) on **Creditcoin 3 (CC3 EVM)**. 

By integrating Creditcoin's **Universal Smart Contracts (Attestcoin Protocol)**, Sanad creates a trustless bridge between physical microfinance institutions in emerging markets and global liquidity pools on Ethereum Sepolia — enabling transparent valuation, instant liquidity injection, and auditable repayment settlement without centralized custodians.

---

## 💡 The Problem & Economic Justification

Across Southeast Asia and emerging markets, over **50,000 pawnshops and Ar-Rahnu cooperatives** hold billions in physical gold collateral. However:
- **Cash Cycle Bottlenecks**: Operators turn their lending capital only 3–4 times per year due to slow bank credit lines.
- **Credit Invisibility**: Unbanked micro-borrowers repay loans faithfully but generate zero portable credit score.
- **Cross-Chain Silos**: Global Web3 capital cannot easily fund local microfinance loans without risky custodial bridges.

**Sanad solves this on Creditcoin**:
- **5x Faster Capital Turnover**: Instant liquidity releases via automated pools on Creditcoin CC3.
- **30–40% Lower Cost of Capital**: Direct access to global Web3 liquidity.
- **Portable Credit Records**: Every loan and repayment creates an immutable, verifiable track record on Creditcoin L1.

---

## ⚡ Core Technical Architecture on Creditcoin

### 1. Smart Contracts on Creditcoin CC3 (`102031` / `0x18e8f`)
- **`SAGToken.sol`**: OpenZeppelin ERC-721 token representing verified physical gold collateral (weight, karat, valuation, LTV, IPFS certificate).
- **`SanadLiquidityPool.sol`**: Liquidity pool smart contract executing trustless cross-chain repayment verification using Creditcoin's native **BlockProver Precompile (`0xFD2`)**.

### 2. Universal Smart Contracts (Attestcoin SDK)
- **Source Chain (Ethereum Sepolia)**: `RepaymentGateway.sol` accepts debt repayments and emits `InvoiceRepaymentReceived`.
- **Proof Relay Engine**: Off-chain relayer queries the Creditcoin Attestcoin Prover (`https://prover.cc3-testnet.creditcoin.network`), fetches cryptographic Merkle inclusion proofs, and settles on `SanadLiquidityPool.sol` without bridge tokens.

### 3. Autonomous AI Appraisal & Observability
- **Gold Appraisal Agent (`agent/gold_evaluator.py`)**: Computes real-time fair market value, dynamic LTV haircuts (e.g. 916 gold), and Shariah compliance bounds.
- **Decentralized Audit Trail**: On-chain events (`GoldCollateralMinted`, `CrossChainRepaymentVerified`) are indexed and persisted to PostgreSQL with real-time WebSocket streams to operator dashboards.

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js >= 20
- Python >= 3.10
- PostgreSQL & Redis

### 1. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### 3. Run E2E Attestcoin Verification Harness
```bash
cd backend
npx tsx src/scripts/deploy-and-relay-e2e.ts
```

### 4. Run Failure Path Stress Tests
```bash
cd backend
npx tsx src/scripts/test-failure-paths.ts
```

---

## 📜 Contract & Network Reference

### Smart Contracts on Creditcoin 3 Testnet (`102031`)
| Contract | Deployed Address | Network | Explorer Link |
| :--- | :--- | :--- | :--- |
| **`SanadCreditOracle.sol`** | `0x69E427dA9D4Fe741a9341e65a5e3DB6C5ae18eb5` | CC3 Testnet | [Blockscout](https://creditcoin-testnet.blockscout.com/address/0x69E427dA9D4Fe741a9341e65a5e3DB6C5ae18eb5) |
| **`SAGToken.sol`** | `0xC005Db1A74d39073367925FC53D3B85b635A7DD5` | CC3 Testnet | [Blockscout](https://creditcoin-testnet.blockscout.com/address/0xC005Db1A74d39073367925FC53D3B85b635A7DD5) |
| **`SanadLiquidityPool.sol`** | `0xfa453F00056153F2b209BbAE156cd3ad45e5B686` | CC3 Testnet | [Blockscout](https://creditcoin-testnet.blockscout.com/address/0xfa453F00056153F2b209BbAE156cd3ad45e5B686) |

### Network & Prover Endpoints
| Component | Identifier | Endpoint |
| :--- | :--- | :--- |
| **Creditcoin 3 Testnet** | Chain ID `102031` | `https://rpc.cc3-testnet.creditcoin.network` |
| **Blockscout Explorer** | CC3 Testnet | `https://creditcoin-testnet.blockscout.com/` |
| **Attestcoin Prover** | ChainKey `3` (Mainnet) | `https://prover.cc3-testnet.creditcoin.network` |
| **Precompile: BlockProver** | `0x0000000000000000000000000000000000000FD2` | Native L1 Precompile |
| **Precompile: ChainInfo** | `0x0000000000000000000000000000000000000fD3` | Native L1 Precompile |

---

## 👥 User Roles & Portals

1. **Borrowers / Small Traders**: Pledge physical gold at local Ar-Rahnu branches and receive instant cash.
2. **Ar-Rahnu Operators / Pawnshops**: Tokenize appraised gold into SAG notes, access CC3 liquidity pools, and manage loans.
3. **Global Funders / Investors**: Supply liquidity to `SanadLiquidityPool` and earn transparent, Shariah-compliant asset-backed yield.
4. **Regulators & Compliance Officers**: Real-time auditable on-chain dashboard tracking collateral provenance and risk metrics.
