# 🚀 Deployment Status - Sanad Protocol

## Verified recovery — 2026-09-08 (supersedes the report below)

- Postgres was running an accidentally uploaded Node backend, not the database image.
- Restored `ghcr.io/railwayapp-templates/postgres-ssl:18` on the existing Postgres service; the original volume was preserved. Deployment `aa52c72d-533e-47d8-a181-0d2fca3382b9` is successful.
- Backend database health, SAG listings, Redis queue stats, and socket handshake returned HTTP 200 after recovery.
- Production minting signer is `0xc7b11732DFba02C96DD7805E98db7E190Cbbc6E9`; its MINTER_ROLE on configured SAGToken `0x80b9Ae7D0BEfB042a3eb8fDd1af0DCF6E53bEdE9` was verified read-only. No mint transaction was sent.
- Image rewrite `/api/uploads/:path*` was added and pushed in `7ed6ba0`.
- Netlify builds passed, but two publish attempts failed due to local DNS/network errors reaching Netlify. The image-routing fix is NOT confirmed live. Retry `netlify deploy --prod` from `frontend/` after connectivity is stable.
- Revoke/rotate the Netlify CLI token: an unredacted CLI failure diagnostic printed it during the first failed publish.

---

## Status as of Latest Deployment

### ✅ Frontend (Netlify) - **LIVE**
- **URL:** https://sanad-protocol.netlify.app
- **Status:** 🟢 **Successfully Deployed**
- **Last Deploy:** Just completed
- **Build:** Successful (80 pages generated)
- **Environment Variables:** All configured correctly
  - `NEXT_PUBLIC_API_URL=https://sanad-production-6fa3.up.railway.app`
  - `NEXT_PUBLIC_WS_URL=https://sanad-production-6fa3.up.railway.app`
  - `NEXT_PUBLIC_ENV_URL=https://creditcoin-testnet.blockscout.com`

### ⚠️ Backend (Railway) - **ISSUE DETECTED**
- **URL:** https://sanad-production-6fa3.up.railway.app
- **Status:** 🔴 **PostgreSQL Database Crashed**
- **Issue:** The PostgreSQL service has crashed on Railway
- **Impact:** Backend cannot connect to database (ETIMEDOUT errors)

### 🔧 What Needs to be Done

**Critical Issue: Railway PostgreSQL Crashed**

The PostgreSQL database on Railway has crashed. This is why you're seeing:
- `ETIMEDOUT` errors in backend logs
- Status shows `Postgres: ● Crashed`
- Backend services timing out on database queries

**To Fix:**
1. **Via Railway Dashboard (Recommended):**
   - Go to: https://railway.app/project/6d6d4c8f-6af3-4872-8af7-c39f06066ce2
   - Find the Postgres service
   - Click "Restart" or "Redeploy"
   
2. **Via Railway CLI:**
   ```bash
   cd /Users/ola/Documents/hackathons/seoul/Sanad
   railway service # Select Postgres
   # Or directly:
   railway restart --service Postgres
   ```

### 📋 What Was Successfully Deployed

#### ✅ Railway Environment Variables (All Set)
- `NODE_ENV=production`
- `CREDITCOIN_PRIVATE_KEY` ✅
- `CREDITCOIN_ADMIN_PRIVATE_KEY` ✅
- `PRIVATE_KEY` ✅
- `CORS_ORIGIN=https://sanad-protocol.netlify.app` ✅
- `SAG_TOKEN_ADDRESS` ✅
- `SANAD_LIQUIDITY_POOL_ADDRESS` ✅
- `SANAD_CREDIT_ORACLE_ADDRESS` ✅
- `CREDITCOIN_CHAIN_ID` ✅
- `CREDITCOIN_CHAIN_ID_HEX` ✅
- `CREDITCOIN_PROOF_BUILDER_URL` ✅
- `PINATA_API_KEY` ✅
- `PINATA_SECRET_API_KEY` ✅
- `PINATA_JWT` ✅
- `GEMINI_API_KEY` ✅
- `ETHEREUM_RPC_URL` ✅
- `IPFS_GATEWAY_URL` ✅
- `JWT_SECRET` ✅
- `ENCRYPTION_MASTER_KEY` ✅
- `SEPOLIA_REPAYMENT_GATEWAY_ADDRESS` ✅
- `SEPOLIA_INVESTOR_VAULT_ADDRESS` ✅

#### ✅ Database Schema (Ready)
- Updated `backend/postgres/bootstrap.sql` with:
  - `investment` table + indexes
  - `loan_repayment` table + indexes
  - `test` table (fixed)

#### ✅ Git Commits
- Latest code pulled successfully
- All changes from commit `336c649` included

### 🔍 Error Details

**Backend Error Log:**
```
Error: A Creditcoin relayer or oracle-owner private key environment variable is required
    at new St (file:///app/dist/main.js:191:4533)
```

This error appeared initially but was resolved with environment variables. However, the Postgres crash is now the blocker.

**Database Connection Errors:**
```
Wallet login error: DrizzleQueryError: Failed query...
cause: AggregateError [ETIMEDOUT]
```

### 🎯 Next Steps

1. **Restart Railway PostgreSQL Service** (Critical)
   - This should resolve all backend connectivity issues
   
2. **Verify Backend Health**
   - Check: https://sanad-production-6fa3.up.railway.app/api/v1/health
   - Should return status 200 after Postgres restart

3. **Test Full Stack**
   - Frontend should be able to connect to backend
   - Database queries should work
   - WebSocket connections should establish

### 📊 Service Status Summary

| Service | Status | URL | Notes |
|---------|--------|-----|-------|
| **Frontend (Netlify)** | 🟢 Live | https://sanad-protocol.netlify.app | ✅ Deployed successfully |
| **Backend (Railway)** | 🟡 Running | https://sanad-production-6fa3.up.railway.app | ⚠️ Cannot connect to DB |
| **PostgreSQL (Railway)** | 🔴 Crashed | Internal | ❌ Needs restart |
| **Redis (Railway)** | 🟢 Online | Internal | ✅ Working |

### 🔗 Useful Links

**Railway Project:**
https://railway.app/project/6d6d4c8f-6af3-4872-8af7-c39f06066ce2

**Netlify Project:**
https://app.netlify.com/projects/sanad-protocol

**Latest Netlify Deploy:**
https://app.netlify.com/projects/sanad-protocol/deploys/6a9ff5c8967732e770b0509c

---

**Last Updated:** December 2024  
**Action Required:** Restart Railway PostgreSQL service
