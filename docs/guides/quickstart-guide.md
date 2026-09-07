# 🧪 Sanad Protocol - Tester Quickstart & Login Guide

Welcome to Sanad! This guide walks you through setting up the environment, launching the PostgreSQL database and Redis queues, seeding test accounts, and testing both borrower and investor flows on Creditcoin CC3.

---

## ⚡ 1. Fast Setup (3 Steps)

### Step 1: Configure Environments
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
npm install
npm run seed
```

> **Result**: Creates the `main` schema, tables, and 5 pre-configured demo users with password `Password123!`.

---

## 🚀 2. Running Backend & Frontend

Open two terminal windows:

### Terminal 1: Backend API (Port 5001)
```bash
cd backend
npm run dev
```
* **Backend API**: `http://localhost:5001`
* **Swagger / OpenAPI Docs**: `http://localhost:5001/api-docs`
* **Creditcoin Indexer**: Listens for CC3 on-chain events on WebSocket & REST.

### Terminal 2: Frontend dApp (Port 3000)
```bash
cd frontend
npm install
npm run dev
```
* **Web App**: `http://localhost:3000`

---

## 🔑 3. Test Credentials & Login Matrix

All test accounts share the same default password: **`Password123!`**

| User Role | Email / Username | Password | Target Dashboard / Pages to Test |
| :--- | :--- | :--- | :--- |
| **Gold Borrower** | `borrower@sanad.finance` | `Password123!` | [http://localhost:3000/dashboard/borrower/credit](http://localhost:3000/dashboard/borrower/credit)<br>[http://localhost:3000/payment](http://localhost:3000/payment) |
| **Liquidity Investor (LP)** | `investor@sanad.finance` | `Password123!` | [http://localhost:3000/dashboard](http://localhost:3000/dashboard)<br>[http://localhost:3000/dashboard/browse](http://localhost:3000/dashboard/browse) |
| **Pawnshop Operator** | `pawnshop@sanad.finance` | `Password123!` | [http://localhost:3000/pawnshop/dashboard](http://localhost:3000/pawnshop/dashboard)<br>[http://localhost:3000/pawnshop/nfts/new](http://localhost:3000/pawnshop/nfts/new) |
| **Company Admin (HQ)** | `manager@sanad.finance` | `Password123!` | [http://localhost:3000/admin/dashboard](http://localhost:3000/admin/dashboard)<br>[http://localhost:3000/admin/kyc](http://localhost:3000/admin/kyc) |
| **Super Admin / Regulator** | `admin@sanad.finance` | `Password123!` | [http://localhost:3000/admin/compliance](http://localhost:3000/admin/compliance)<br>[http://localhost:3000/admin/dashboard](http://localhost:3000/admin/dashboard) |

---

## 🌐 4. MetaMask / Web3 Wallet Configuration

To test on-chain actions (Credit scoring, Minting, Freezing, Repayment, Liquidity Supply), add **Creditcoin 3 (CC3) Testnet** to your EVM wallet:

* **Network Name**: `Creditcoin 3 Testnet`
* **New RPC URL**: `https://rpc.cc3-testnet.creditcoin.network`
* **Chain ID**: `102031` (Hex: `0x18e8f`)
* **Currency Symbol**: `tCTC`
* **Block Explorer URL**: `https://creditcoin-testnet.blockscout.com`

---

## 🔍 5. Key Testing Flows to Validate

1. **Borrower Credit Bureau & Attestcoin Proof** (`/dashboard/borrower/credit`):
   - Connect EVM wallet.
   - Scan DeFi history across Aave v3, Morpho, Spark, Compound, Maker, and Euler.
   - Generate Attestcoin cryptographic proof for active borrow / repayment and submit to `SanadCreditOracle` (`0x74357E5FED91D6dDdd39847304b8651634693A00`).
   - Observe on-chain score dynamically recalculate and upgrade tier (Bronze/Silver/Gold).

2. **Investor Liquidity Pool** (`/dashboard`):
   - Connect on Creditcoin CC3.
   - Use the **Sanad Liquidity Pool** manager to execute a payable deposit of native tCTC into `SanadLiquidityPool` (`0x0Ba0B4cecb4c5Ad16043744b504059E95b1fCE70`).
   - View updated LP stake, pool share, and browse asset-backed SAG notes (`/dashboard/browse`).

3. **Pawnshop Gold Origination** (`/pawnshop/nfts/new`):
   - Submit gold specs (weight, 22K/916 karat purity) to get AI valuation and mint SAG NFT collateral receipt.

4. **Regulator & Compliance Oversight** (`/admin/compliance`):
   - Check real-time audit ledger stream.
   - Test targeted **Token Freeze / Address Freeze** with compliance case numbers.
   - Test **Administrative Seizure / Wipe** dialog.
