# Sanad Protocol 

**Trustless Cross-Chain Credit Scoring & Real-World Asset (RWA) Microfinance on Creditcoin 3**

> **Sanad**: 
> 1. **Chain of Authentication**: Cryptographic provenance from physical gold vault appraisal to on-chain note settlement.
> 2. **Credit Note & Title Deed**: In Islamic commercial law (*Fiqh al-Mu'amalat*), a *Sanad* is a formal debt/collateral certificate (*Sanad Rahn*).
> 3. **Creditcoin L1 Core Alignment**: Transforming real-world microfinance and cross-chain DeFi activity into immutable, portable credit scoring on Creditcoin CC3.

---

## 🌟 Project Overview

**Sanad Protocol** is a decentralized, Shariah-compliant credit network that bridges physical gold-backed Ar-Rahnu microfinance with global Web3 capital on **Creditcoin 3 (CC3 EVM)**.

By harnessing Creditcoin's native **Universal Smart Contracts (Attestcoin BlockProver Precompile `0xFD2`)**, Sanad creates a trustless, zero-oracle credit scoring bureau. The protocol cryptographically proves historical EVM transactions across 10 major DeFi lending protocols (Aave v3, Morpho Blue, Compound v3, Spark, MakerDAO, Euler v2, Fluid, etc.) on both **Ethereum Sepolia** and **Ethereum Mainnet**, updating borrower credit tiers (Bronze, Silver, Gold) on CC3 to gate risk-managed, asset-backed liquidity pools.

---

## 💡 The Problem & Economic Opportunity

Across emerging markets, over **50,000 pawnshops and Ar-Rahnu cooperatives** hold billions in physical gold collateral:
- **Cash Cycle Bottlenecks**: Pawnshop operators turn over lending capital only 3–4 times per year due to slow commercial bank credit lines.
- **Credit Invisibility**: Micro-borrowers repay faithfully but generate zero portable credit score.
- **DeFi Overcollateralization & Oracle Vulnerabilities**: Web3 lending requires >150% overcollateralization because cross-chain credit history cannot be trustlessly verified without centralized, manipulable oracles.

**How Sanad Solves This on Creditcoin CC3**:
- **Zero-Trust Cross-Chain Credit Verification**: Cryptographically decodes EVM calldata and validates Merkle/continuity proofs via Creditcoin's native `0xFD2` BlockProver precompile.
- **5x Faster Capital Turnover**: Certified Ar-Rahnu branches tokenize appraised gold collateral into ERC-721 **SAG Tokens**, unlocking instant capital from global liquidity pools.
- **Shariah-Compliant Mudarabah Economics**: Zero-Riba financing model with transparent *Ujrah* custody fee distribution and Dutch auction liquidation surplus return.

---

## ⚡ Core Technical Architecture

```
                      ┌────────────────────────────────────────────────────────┐
                      │             SOURCE CHAINS (DeFi Activity)              │
                      │   • Ethereum Mainnet (ChainKey: 3)                     │
                      │   • Ethereum Sepolia (ChainKey: 1)                     │
                      │   [Aave v3, Morpho, Spark, Compound, Maker, Euler...]   │
                      └──────────────────────────┬─────────────────────────────┘
                                                 │ Historical Tx Hash
                                                 ▼
                      ┌────────────────────────────────────────────────────────┐
                      │         ATTESTCOIN PROOF BUILDER SERVICE (USC)         │
                      │   https://prover.cc3-testnet.creditcoin.network        │
                      │   • Merkle Inclusion Proof (Siblings & Index)          │
                      │   • Continuity Proof (Block Headers & Epoch Roots)     │
                      └──────────────────────────┬─────────────────────────────┘
                                                 │ Cryptographic Proof
                                                 ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                CREDITCOIN 3 (CC3) TESTNET (Chain ID: 102031)                            │
│                                                                                                         │
│  ┌──────────────────────────────────────────────────┐   ┌────────────────────────────────────────────┐  │
│  │      NATIVE BLOCKPROVER PRECOMPILE (0xFD2)       │   │        NATIVE CHAININFO PRECOMPILE (0xFD3) │  │
│  │   • Verifies Merkle & Continuity proofs on-chain │   │   • Validates source chain state & heights │  │
│  └──────────────────────────┬───────────────────────┘   └────────────────────────────────────────────┘  │
│                             │ verified = true                                                           │
│                             ▼                                                                           │
│  ┌───────────────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                       SANAD CREDIT ORACLE (SanadCreditOracle.sol)                                 │  │
│  │   • Multi-Chain chainKey Mapping: Sepolia (1) & Mainnet (3)                                       │  │
│  │   • Decodes EVM Calldata & Validates 10 Protocol Selectors                                        │  │
│  │   • Strict Stablecoin Decimals & ±20% Volume Bounds Checker                                       │  │
│  │   • Dynamically Computes Non-Custodial Score (300-850) & Tiers (Bronze, Silver, Gold)             │  │
│  └──────────────────────────┬────────────────────────────────────────────────────────────────────────┘  │
│                             │ Gates Borrow Limits & Terms                                               │
│                             ▼                                                                           │
│  ┌──────────────────────────────────────────────────┐   ┌────────────────────────────────────────────┐  │
│  │        SANAD LIQUIDITY POOL (Native tCTC)        │   │        SAG COLLATERAL NFT (SAGToken.sol)   │  │
│  │   • Direct Payable depositLiquidity()            │   │   • Physical Gold RWA Receipt              │  │
│  │   • Mudarabah Capital Accounting & Ujrah Yield   │   │   • Autonomous AI Appraisal Metadata       │  │
│  │   • Dutch Auction Liquidation & Surplus Return   │   │   • Compliance Freezing & Audit Provenance │  │
│  └──────────────────────────────────────────────────┘   └────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📜 Deployed Smart Contracts & Verified On-Chain State

### Creditcoin 3 (CC3) Testnet (Chain ID: `102031` / `0x18e8f`)

| Smart Contract | Address | Compiler & Status | Explorer Link |
| :--- | :--- | :--- | :--- |
| **`SanadCreditOracle.sol`** | `0x74357E5FED91D6dDdd39847304b8651634693A00` | Solidity 0.8.20 (`viaIR: true`) | [Blockscout](https://creditcoin-testnet.blockscout.com/address/0x74357E5FED91D6dDdd39847304b8651634693A00) |
| **`SanadLiquidityPool.sol`** | `0x0Ba0B4cecb4c5Ad16043744b504059E95b1fCE70` | Solidity 0.8.20 (`viaIR: true`) | [Blockscout](https://creditcoin-testnet.blockscout.com/address/0x0Ba0B4cecb4c5Ad16043744b504059E95b1fCE70) |
| **`SAGToken.sol`** | `0x68359bD39Bf7A683a96808cAD38147d1baFa07f1` | Solidity 0.8.20 (`viaIR: true`) | [Blockscout](https://creditcoin-testnet.blockscout.com/address/0x68359bD39Bf7A683a96808cAD38147d1baFa07f1) |

### Ethereum Sepolia Gateways (Chain ID: `11155111`)

| Gateway Contract | Address | Purpose | Explorer Link |
| :--- | :--- | :--- | :--- |
| **`RepaymentGateway.sol`** | `0x42F25F256762f17FAD2de8b2c6d650f87c8fe699` | Cross-chain borrower loan repayment gateway (strict msg.value validation) | [Etherscan](https://sepolia.etherscan.io/address/0x42F25F256762f17FAD2de8b2c6d650f87c8fe699) |
| **`InvestorVault.sol`** | `0x218565BeC68691178FC61B28FCaEb78592088FDF` | Cross-chain investor liquidity deposit gateway (strict msg.value validation) | [Etherscan](https://sepolia.etherscan.io/address/0x218565BeC68691178FC61B28FCaEb78592088FDF) |

### Native CC3 Precompiles

| Precompile Name | Address | Purpose |
| :--- | :--- | :--- |
| **`BlockProver`** | `0x0000000000000000000000000000000000000FD2` | Cryptographic Merkle & Continuity proof verification |
| **`ChainInfo`** | `0x0000000000000000000000000000000000000fD3` | Query source chain heights, finalized epochs, and metadata |

---

## 🔍 Live Verified Transactions on Creditcoin CC3

| Transaction Event | ChainKey & Context | Source / CC3 Settlement Tx Hash | Blockscout / Explorer Link |
| :--- | :--- | :--- | :--- |
| **Cross-Chain Investor Deposit** | `ChainKey = 1` (Sepolia InvestorVault -> CC3 `verifyAndRecordDeposit`) | CC3 Settlement: `0x36902dda63f508c27b644ee07c446694d3282bca019a15a816a35289ebd6e1d7`<br>Sepolia Tx: `0x71b95becef2c2311a046ab97571ec88acd7f2c078b411b5c87ff003c73d903d8` | [View CC3 Settlement](https://creditcoin-testnet.blockscout.com/tx/0x36902dda63f508c27b644ee07c446694d3282bca019a15a816a35289ebd6e1d7) |
| **Cross-Chain Loan Repayment** | `ChainKey = 1` (Sepolia RepaymentGateway -> CC3 `verifyAndSettleRepayment`) | CC3 Settlement: `0xaec11c9b303618f52f443c2213f3a932a1f9dbb95fc2c991713c16ca0659536c`<br>Sepolia Tx: `0xf3035df49e280f6583710bcc402c25c40eabf6d87115c5d35440f62162b51265` | [View CC3 Settlement](https://creditcoin-testnet.blockscout.com/tx/0xaec11c9b303618f52f443c2213f3a932a1f9dbb95fc2c991713c16ca0659536c) |
| **Native CTC Pool Deposit** | Native CC3 (5.0 tCTC payable `depositLiquidity`) | CC3 Tx: `0xe4aa4d7b8c64685c4a41946ebf3354712a2f0886ecbd41ea155dbe666fca5ac9` | [View Deposit](https://creditcoin-testnet.blockscout.com/tx/0xe4aa4d7b8c64685c4a41946ebf3354712a2f0886ecbd41ea155dbe666fca5ac9) |

---

> [!IMPORTANT]
> **Architecture Transparency — Two Distinct Trust Models**
>
> Sanad uses Creditcoin's Attestcoin BlockProver (`0xFD2`) for two different purposes with different trust properties:
>
> 1. **Credit Bureau (Trustless)**: The `SanadCreditOracle` proves historical DeFi repayment behavior (Aave, Compound, Maker, etc.) on Ethereum and records it on CC3. This is **fully trustless end-to-end** — the proof verifies the exact transaction, the oracle decodes it on-chain, and no intermediary can fabricate or alter the credit score. This is the flagship innovation.
>
> 2. **Cross-Chain Deposit & Repayment Settlement (Relayer-Funded)**: When an investor deposits ETH into `InvestorVault` on Sepolia, or a borrower repays via `RepaymentGateway`, the Attestcoin proof cryptographically verifies that the transaction happened — but Attestcoin proves facts, it does not move capital. The relayer wallet converts the proven ETH amount at a fixed demo rate (`DEMO_ETH_TO_CTC_RATE = 2500`) and attaches real CTC to the CC3 settlement transaction, so the pool's native balance stays solvent. This is a **custodial, relayer-funded rebalancing step**, not a trustless bridge. Production architecture would connect to decentralized oracle price feeds and an automated market-making layer.

---

## 🚀 Quick Start & Reproduction

### Prerequisites
- Node.js >= 20
- PostgreSQL & Redis (or Docker)

### 1. Installation
```bash
# Clone repository
git clone https://github.com/ola-893/Sanad.git
cd Sanad

# Start PostgreSQL & Redis
docker compose up -d postgres redis

# Backend setup
cd backend
npm install
npm run seed     # Seeds roles and test users (Password: Password123!)
npm run dev      # Runs on port 5001

# Frontend setup (in a second terminal)
cd ../frontend
npm install
npm run dev      # Runs on port 3000
```

### 2. Run On-Chain Dual Proof & Pool Verification Test
```bash
cd backend
npx tsx src/scripts/deploy-and-prove-both.ts
```

---

## 👥 User Roles & Workflow Navigation

| Role | Test Credentials | Key URLs & Functions |
| :--- | :--- | :--- |
| **Gold Borrower** | `borrower@sanad.finance` / `Password123!` | `/dashboard/borrower/credit`: Discover DeFi history, generate Attestcoin proofs, view credit score. |
| **Liquidity Investor** | `investor@sanad.finance` / `Password123!` | `/dashboard`: Deposit native tCTC into `SanadLiquidityPool`, track Mudarabah yield, browse SAG notes. |
| **Ar-Rahnu Pawnshop** | `pawnshop@sanad.finance` / `Password123!` | `/pawnshop/dashboard`: AI physical gold appraisal, mint ERC-721 SAG collateral receipts, fund micro-loans. |
| **Regulator / Admin** | `admin@sanad.finance` / `Password123!` | `/admin/compliance`: Real-time on-chain audit stream, Dutch auction oversight, and compliance case management. |

---

## ⚖️ Shariah Compliance Principles

1. **Riba-Free (Zero Usury)**: No compound interest or predatory penalties.
2. **Asset-Backed (Sanad Rahn)**: Every loan is 100% collateralized by physical gold vaulted in certified Ar-Rahnu institutions.
3. **Equitable Liquidation**: If a borrower defaults after grace periods, collateral is liquidated via a transparent on-chain Dutch auction. **100% of any surplus proceeds are returned to the borrower**, strictly adhering to AAOIFI standards.
