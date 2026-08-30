# Sanad Protocol

**Trustless Cross-Chain Credit Scoring and Real-World Asset Microfinance on Creditcoin 3**

> **Sanad**:
> 1. **Chain of Authentication**: Cryptographic provenance from physical gold vault appraisal to on-chain note settlement.
> 2. **Credit Note and Title Deed**: In Islamic commercial law (*Fiqh al-Mu'amalat*), a *Sanad* is a formal debt/collateral certificate (*Sanad Rahn*).
> 3. **Creditcoin L1 Core Alignment**: Transforming real-world microfinance and cross-chain DeFi activity into immutable, portable credit scoring on Creditcoin CC3.

---

## Project Overview

Sanad Protocol is a decentralized, Shariah-compliant credit network that bridges physical gold-backed Ar-Rahnu microfinance with global Web3 capital on **Creditcoin 3 (CC3 EVM)**.

Using Creditcoin's native **Universal Smart Contracts (Attestcoin BlockProver Precompile `0xFD2`)**, Sanad creates a trustless, zero-oracle credit scoring bureau. The protocol cryptographically proves historical EVM transactions across major DeFi lending protocols (Aave v3, Morpho Blue, Compound v3, Spark, MakerDAO, Euler v2, Fluid) on both **Ethereum Sepolia** and **Ethereum Mainnet**, updating borrower credit tiers (Bronze, Silver, Gold) on CC3 to gate risk-managed, asset-backed liquidity pools.

---

## The Problem and Economic Opportunity

Across emerging markets, over **50,000 pawnshops and Ar-Rahnu cooperatives** hold billions in physical gold collateral:

- **Cash Cycle Bottlenecks**: Pawnshop operators turn over lending capital only 3-4 times per year due to slow commercial bank credit lines.
- **Credit Invisibility**: Micro-borrowers repay faithfully but generate zero portable credit score.
- **DeFi Overcollateralization and Oracle Vulnerabilities**: Web3 lending requires >150% overcollateralization because cross-chain credit history cannot be trustlessly verified without centralized, manipulable oracles.

**How Sanad Solves This on Creditcoin CC3**:

- **Zero-Trust Cross-Chain Credit Verification**: Cryptographically decodes EVM calldata and validates Merkle/continuity proofs via Creditcoin's native `0xFD2` BlockProver precompile.
- **5x Faster Capital Turnover**: Certified Ar-Rahnu branches tokenize appraised gold collateral into ERC-721 **SAG Tokens**, unlocking instant capital from global liquidity pools.
- **Shariah-Compliant Mudarabah Economics**: Zero-Riba financing model with transparent *Ujrah* custody fee distribution and Dutch auction liquidation surplus return.

---

## Core Technical Architecture

```
                      +----------------------------------------------------------+
                      |           SOURCE CHAINS (DeFi Activity)                 |
                      |   - Ethereum Mainnet (ChainKey: 3)                      |
                      |   - Ethereum Sepolia (ChainKey: 1)                      |
                      |   [Aave v3, Morpho, Spark, Compound, Maker, Euler...]   |
                      +----------------------------+---------------------------+
                                                   | Historical Tx Hash
                                                   v
                      +----------------------------------------------------------+
                      |       ATTESTCOIN PROOF BUILDER SERVICE (USC)            |
                      |   https://prover.cc3-testnet.creditcoin.network         |
                      |   - Merkle Inclusion Proof (Siblings & Index)           |
                      |   - Continuity Proof (Block Headers & Epoch Roots)      |
                      +----------------------------+---------------------------+
                                                   | Cryptographic Proof
                                                   v
+-------------------------------------------------------------------------------------------------------------------+
|                              CREDITCOIN 3 (CC3) TESTNET (Chain ID: 102031)                                       |
|                                                                                                                   |
|  +--------------------------------------------------+  +----------------------------------------------+    |
|  |    NATIVE BLOCKPROVER PRECOMPILE (0xFD2)        |  |     NATIVE CHAININFO PRECOMPILE (0xFD3)      |    |
|  | - Verifies Merkle & Continuity proofs on-chain  |  | - Validates source chain states & heights     |    |
|  +--------------------------+----------------------+  +----------------------------------------------+    |
|                             | verified = true                                                                |
|                             v                                                                                |
|  +---------------------------------------------------------------------------------------------------------+  |
|  |                    SANAD CREDIT ORACLE (SanadCreditOracle.sol)                                          |  |
|  | - Multi-Chain chainKey Mapping: Sepolia (1) & Mainnet (3)                                               |  |
|  | - Decodes EVM Calldata & Validates 10 Protocol Selectors                                                |  |
|  | - Strict Stablecoin Decimals and +/-20% Volume Bounds Checker                                           |  |
|  | - Dynamically Computes Non-Custodial Score (300-850) & Tiers (Bronze, Silver, Gold)                     |  |
|  +--------------------------+------------------------------------------------------------------------------+  |
|                             | Gates Borrow Limits & Terms                                                   |
|                             v                                                                                |
|  +--------------------------------------------------+  +----------------------------------------------+    |
|  |      SANAD LIQUIDITY POOL (Native tCTC)         |  |      SAG COLLATERAL NFT (SAGToken.sol)       |    |
|  | - Direct Payable depositLiquidity()              |  | - Physical Gold RWA Receipt                   |    |
|  | - Mudarabah Capital Accounting & Ujrah Yield     |  | - Autonomous AI Appraisal Metadata            |    |
|  | - Dutch Auction Liquidation & Surplus Return     |  | - Compliance Freezing & Audit Provenance      |    |
|  +--------------------------------------------------+  +----------------------------------------------+    |
+-------------------------------------------------------------------------------------------------------------------+
```

---

## Deployed Smart Contracts

### Creditcoin 3 (CC3) Testnet (Chain ID: `102031` / `0x18e8f`)

| Contract | Address | Compiler | Explorer |
| :--- | :--- | :--- | :--- |
| **SanadCreditOracle.sol** | `0x74357E5FED91D6dDdd39847304b8651634693A00` | Solidity 0.8.20 (viaIR) | [Blockscout](https://creditcoin-testnet.blockscout.com/address/0x74357E5FED91D6dDdd39847304b8651634693A00) |
| **SanadLiquidityPool.sol** | `0x0Ba0B4cecb4c5Ad16043744b504059E95b1fCE70` | Solidity 0.8.20 (viaIR) | [Blockscout](https://creditcoin-testnet.blockscout.com/address/0x0Ba0B4cecb4c5Ad16043744b504059E95b1fCE70) |
| **SAGToken.sol** | `0x68359bD39Bf7A683a96808cAD38147d1baFa07f1` | Solidity 0.8.20 (viaIR) | [Blockscout](https://creditcoin-testnet.blockscout.com/address/0x68359bD39Bf7A683a96808cAD38147d1baFa07f1) |

### Ethereum Sepolia Gateways (Chain ID: `11155111`)

| Contract | Address | Purpose | Explorer |
| :--- | :--- | :--- | :--- |
| **RepaymentGateway.sol** | `0x42F25F256762f17FAD2de8b2c6d650f87c8fe699` | Cross-chain borrower loan repayment gateway | [Etherscan](https://sepolia.etherscan.io/address/0x42F25F256762f17FAD2de8b2c6d650f87c8fe699) |
| **InvestorVault.sol** | `0x218565BeC68691178FC61B28FCaEb78592088FDF` | Cross-chain investor liquidity deposit gateway | [Etherscan](https://sepolia.etherscan.io/address/0x218565BeC68691178FC61B28FCaEb78592088FDF) |

### Native CC3 Precompiles

| Precompile | Address | Purpose |
| :--- | :--- | :--- |
| **BlockProver** | `0x0000000000000000000000000000000000000FD2` | Cryptographic Merkle and Continuity proof verification |
| **ChainInfo** | `0x0000000000000000000000000000000000000fD3` | Query source chain heights, finalized epochs, and metadata |

---

## Architecture Transparency: Two Distinct Trust Models

Sanad uses Creditcoin's Attestcoin BlockProver (`0xFD2`) for two different purposes with different trust properties:

1. **Credit Bureau (Trustless)**: The `SanadCreditOracle` proves historical DeFi repayment behavior (Aave, Compound, Maker, etc.) on Ethereum and records it on CC3. This is fully trustless end-to-end -- the proof verifies the exact transaction, the oracle decodes it on-chain, and no intermediary can fabricate or alter the credit score.

2. **Cross-Chain Deposit and Repayment Settlement (Relayer-Funded)**: When an investor deposits ETH into `InvestorVault` on Sepolia, or a borrower repays via `RepaymentGateway`, the Attestcoin proof cryptographically verifies that the transaction happened -- but Attestcoin proves facts, it does not move capital. The relayer wallet converts the proven ETH amount at a fixed demo rate and attaches real CTC to the CC3 settlement transaction, so the pool's native balance stays solvent. This is a custodial, relayer-funded rebalancing step, not a trustless bridge. Production architecture would connect to decentralized oracle price feeds and an automated market-making layer.

---

## Payment Flow: Peer-to-Peer Cross-Chain Funding

The protocol supports a three-party loan lifecycle routed through the pawnshop intermediary:

```
Investor -> fundLoan(tokenId, pawnshop, appraisedUSD) -> ETH to PAWNSHOP
Pawnshop -> disburseLoan(tokenId, borrower, amount)   -> ETH to BORROWER (70% LTV)
Borrower -> repay(tokenId, amount)                     -> ETH to PAWNSHOP
Pawnshop -> settleInvestor(tokenId, amount)            -> ETH to INVESTOR
```

- **InvestorVault** on Sepolia forwards ETH directly to the pawnshop (token owner) on `fundLoan()`.
- The pawnshop calls `disburseLoan()` to send 70% LTV to the borrower.
- `RepaymentGateway` routes borrower repayments back to the pawnshop.
- The pawnshop calls `settleInvestor()` to return capital to the investor.
- On CC3, `verifyAndFundLoanCrossChain()` cryptographically verifies the Sepolia funding transaction via Attestcoin proof and records accounting without disbursing native CTC (Cr3dX separation).

---

## Quick Start

### Prerequisites

- Node.js >= 20
- Docker (for PostgreSQL and Redis)
- MetaMask browser extension

### 1. Clone and Install

```bash
git clone https://github.com/ola-893/Sanad.git
cd Sanad

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
pnpm install
```

### 2. Start Services

```bash
# From project root
./start.sh
```

This will:
- Start PostgreSQL (port 15432) and Redis (port 6379) via Docker
- Seed the database (roles, schema, super admin account)
- Start the backend on port 5002
- Start the frontend on port 3000

### 3. Stop Services

```bash
./stop.sh
```

### Manual Start (without start.sh)

```bash
# Start infrastructure
docker compose up -d postgres redis

# Backend
cd backend
npm run seed    # First time only -- creates tables and roles
npm run dev     # Port 5002

# Frontend (new terminal)
cd frontend
pnpm dev        # Port 3000
```

---

## Project Structure

```
Sanad/
  backend/
    src/
      contracts/             # Solidity smart contracts
        SanadLiquidityPool.sol   # CC3 liquidity pool with Dutch auction liquidation
        SanadCreditOracle.sol    # CC3 credit scoring oracle (Attestcoin proof verification)
        SAGToken.sol             # ERC-721 gold collateral note
        sepolia/                 # Sepolia gateway contracts
          InvestorVault.sol      # Investor deposit and P2P loan funding gateway
          RepaymentGateway.sol   # Borrower repayment routing gateway
          test/                  # Foundry test suite
      features/
        auth/                # Wallet-based authentication (MetaMask sign-in)
        credit-bureau/       # DeFi credit discovery and Attestcoin proof generation
        creditcoin/          # On-chain contract interaction and settlement
        credit-oracle/       # Credit score computation and tier management
        investor/            # Investor dashboard and liquidity pool management
        pawnshop/            # Pawnshop profile, KYC, and SAG token minting
        sag/                 # SAG token lifecycle management
        gold-price/          # Real-time gold price feeds
        pledge-request/      # Borrower pledge request workflow
      scripts/               # Deployment, testing, and E2E verification scripts
      db/                    # Database connection and migrations
      middleware/            # JWT authentication, RBAC, CORS
    foundry.toml             # Foundry configuration for Solidity tests
  frontend/
    app/
      login/                 # MetaMask wallet-based login (role selection)
      register/              # Wallet registration with KYC
      dashboard/             # Borrower and investor dashboards
      pawnshop/              # Pawnshop management portal
      admin/                 # Regulator and compliance admin
    components/
      auth/                  # WalletConnectCard and AuthShell
      investor/              # Liquidity pool manager, SAG token browser
    hooks/
      use-wallet-auth.ts     # MetaMask connection, signing, and session management
      use-creditcoin-wallet.ts  # Creditcoin CC3 wallet integration
    lib/
      web3.ts                # MetaMask/provider utilities
      axios-v1.ts            # API client with JWT interceptor
  docker-compose.yml         # PostgreSQL, Redis, Ollama, Phoenix
  start.sh                   # Start all services
  stop.sh                    # Stop all services
```

---

## User Roles

| Role | Login Method | Dashboard |
| :--- | :--- | :--- |
| **Borrower** | MetaMask wallet connect | `/dashboard/borrower` -- Discover DeFi history, generate Attestcoin proofs, view credit score |
| **Investor** | MetaMask wallet connect | `/dashboard/investor` -- Browse SAG tokens, invest in pawnshop loans, track returns |
| **Pawnshop** | MetaMask wallet connect | `/pawnshop/dashboard` -- AI gold appraisal, mint SAG collateral notes, manage loans |
| **Admin / Regulator** | MetaMask or email fallback | `/admin` -- On-chain audit stream, Dutch auction oversight, compliance case management |

**Super Admin fallback**: `admin@sanad.finance` / `Password123!`

---

## Shariah Compliance Principles

1. **Riba-Free (Zero Usury)**: No compound interest or predatory penalties.
2. **Asset-Backed (Sanad Rahn)**: Every loan is 100% collateralized by physical gold vaulted in certified Ar-Rahnu institutions.
3. **Equitable Liquidation**: If a borrower defaults after grace periods, collateral is liquidated via a transparent on-chain Dutch auction. 100% of any surplus proceeds are returned to the borrower, strictly adhering to AAOIFI standards.

---

## Foundry Tests

The Sepolia gateway contracts include a comprehensive Foundry test suite:

```bash
cd backend/src/contracts/sepolia
forge test -vvv
```

Tests cover:
- P2P loan funding and disbursement
- Repayment routing (pawnshop vs. treasury)
- Fuzz testing with randomized inputs (16k runs)
- Invariant checks on pool solvency
- Revert paths and access control

---

## Key Scripts

| Script | Purpose |
| :--- | :--- |
| `deploy-testnet.ts` | Deploy all CC3 contracts to testnet |
| `deploy-sepolia-gateway.ts` | Deploy Sepolia gateway contracts |
| `test-p2p-loan-lifecycle-e2e.ts` | Full end-to-end P2P loan lifecycle test |
| `test-sepolia-deposit-e2e.ts` | Cross-chain deposit verification test |
| `test-sepolia-repay-e2e.ts` | Cross-chain repayment verification test |
| `rotate-key.ts` | Rotate exposed relayer private keys |
| `check-balances.ts` | Check wallet and pool balances |

---

## Tech Stack

**Backend**: Node.js, Express, TypeScript, PostgreSQL, Redis, BullMQ, ethers.js, Socket.io, Solidity (solc), Foundry

**Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS, Radix UI, Zustand, ethers.js, Socket.io-client

**Smart Contracts**: Solidity 0.8.20+, OpenZeppelin, Foundry (forge, forge-std)

**Infrastructure**: Docker, PostgreSQL 17, Redis 7, Ollama (AI), Phoenix (observability)

---

## License

Private -- Sanad Protocol. All rights reserved.
