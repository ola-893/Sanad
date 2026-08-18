# 🧪 Sanad Protocol - Tester Quickstart & Login Guide

Welcome to Sanad! This guide walks you through setting up the environment, launching the PostgreSQL database and Redis queues, seeding test accounts, and logging in across all user roles.

---

## ⚡ 1. Fast Setup (3 Steps)

### Step 1: Clone & Configure Environments
Copy the sample environment variables:

```bash
# 1. Backend environment
cp backend/.env.example backend/.env

# 2. Frontend environment
cp frontend/.env.example frontend/.env.local
```

---

### Step 2: Start Database & Services via Docker
Launch PostgreSQL (port `5432` / `15432`) and Redis (port `6379`):

```bash
# From repository root:
docker compose up -d postgres redis
```

---

### Step 3: Run Database Migrations & Seed Test Users
Initialize the database schemas, roles, and pre-configured accounts:

```bash
cd backend
npm run seed
```

> **Result**: Creates the `main` schema, tables, and 5 pre-configured demo users with password `Password123!`.

---

## 🚀 2. Running Backend & Frontend

Open two terminal windows:

### Terminal 1: Backend API (Port 5000)
```bash
cd backend
npm run dev
```
* Backend API: `http://localhost:5000`
* Swagger / OpenAPI Docs: `http://localhost:5000/api-docs`
* Creditcoin Indexer: Listens for CC3 on-chain events on WebSocket & REST.

### Terminal 2: Frontend dApp (Port 3000)
```bash
cd frontend
pnpm dev
```
* Web App: `http://localhost:3000`

---

## 🔑 3. Test Credentials & Login Matrix

All test accounts share the same default password: **`Password123!`**

| User Role | Email / Username | Password | Target Dashboard / Pages to Test |
| :--- | :--- | :--- | :--- |
| **Super Admin / Regulator** | `admin@sanad.finance` | `Password123!` | [http://localhost:3000/admin/compliance](http://localhost:3000/admin/compliance)<br>[http://localhost:3000/admin/dashboard](http://localhost:3000/admin/dashboard) |
| **Company Admin (Ar-Rahnu HQ)** | `manager@sanad.finance` | `Password123!` | [http://localhost:3000/admin/dashboard](http://localhost:3000/admin/dashboard)<br>[http://localhost:3000/admin/kyc](http://localhost:3000/admin/kyc) |
| **Pawnshop Operator** | `pawnshop@sanad.finance` | `Password123!` | [http://localhost:3000/pawnshop/dashboard](http://localhost:3000/pawnshop/dashboard)<br>[http://localhost:3000/pawnshop/nfts/new](http://localhost:3000/pawnshop/nfts/new) |
| **Gold Pledgor / Borrower** | `borrower@sanad.finance` | `Password123!` | [http://localhost:3000/dashboard](http://localhost:3000/dashboard)<br>[http://localhost:3000/payment](http://localhost:3000/payment) |
| **Liquidity Investor (LP)** | `investor@sanad.finance` | `Password123!` | [http://localhost:3000/investor/dashboard](http://localhost:3000/investor/dashboard)<br>[http://localhost:3000/investor/browse](http://localhost:3000/investor/browse) |

---

## 🌐 4. MetaMask / Web3 Wallet Configuration

To test on-chain actions (Minting, Freezing, Repayment, Dutch Auction Liquidation), add the **Creditcoin 3 (CC3) Testnet** to your EVM wallet:

* **Network Name**: `Creditcoin 3 Testnet`
* **New RPC URL**: `https://rpc.cc3-testnet.creditcoin.network`
* **Chain ID**: `102031` (Hex: `0x18e8f`)
* **Currency Symbol**: `CTC`
* **Block Explorer URL**: `https://creditcoin-testnet.blockscout.com`

---

## 🔍 5. Key Testing Flows to Validate

1. **Regulator & Compliance Oversight** (`/admin/compliance`):
   - Check real-time audit ledger stream.
   - Test targeted **Token Freeze / Address Freeze** with compliance case numbers.
   - Test **Administrative Seizure / Wipe** dialog.
2. **Pawnshop Gold Origination** (`/pawnshop/nfts/new`):
   - Submit gold specs (weight, 22K/916 karat purity) to get AI valuation and mint SAG NFT collateral receipt.
3. **Borrower Repayment Gateway** (`/payment`):
   - Settle cross-chain repayments via Sepolia gateway with Attestcoin proof generation.
4. **Investor Liquidity Pool** (`/investor/dashboard`):
   - Test liquidity staking and monitor portfolio yield.
