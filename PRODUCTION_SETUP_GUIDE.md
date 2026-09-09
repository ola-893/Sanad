# Production Setup Guide - Sanad Protocol

## 🎯 Overview
This guide will help you complete the production deployment of Sanad Protocol on Railway (backend) and Netlify (frontend).

---

## 1️⃣ Database Setup (PostgreSQL on Railway)

### Create Missing Tables
Connect to your Railway PostgreSQL database and run the following SQL:

```sql
-- Investment table
CREATE TABLE IF NOT EXISTS main.investment (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(40) NOT NULL,
  sag_token_id VARCHAR(100) NOT NULL,
  pledge_request_id VARCHAR(40) NOT NULL,
  amount_usd NUMERIC NOT NULL,
  eth_amount NUMERIC,
  source_tx_hash VARCHAR(66),
  source_chain INTEGER DEFAULT 1,
  cc3_tx_hash VARCHAR(66),
  status VARCHAR(20) DEFAULT 'completed',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_investment_user ON main.investment (user_id);
CREATE INDEX IF NOT EXISTS idx_investment_sag ON main.investment (sag_token_id);
CREATE INDEX IF NOT EXISTS idx_investment_pledge ON main.investment (pledge_request_id);

-- Loan repayment table
CREATE TABLE IF NOT EXISTS main.loan_repayment (
  id SERIAL PRIMARY KEY,
  pledge_request_id VARCHAR(40) NOT NULL,
  borrower_id VARCHAR(40) NOT NULL,
  pawnshop_id VARCHAR(40) NOT NULL,
  amount_usd NUMERIC NOT NULL,
  tx_hash VARCHAR(66),
  cc3_tx_hash VARCHAR(66),
  notes TEXT DEFAULT '',
  status VARCHAR(20) DEFAULT 'completed',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loan_repayment_pledge ON main.loan_repayment (pledge_request_id);
CREATE INDEX IF NOT EXISTS idx_loan_repayment_borrower ON main.loan_repayment (borrower_id);

-- Test table
CREATE TABLE IF NOT EXISTS main.test (
  test_id VARCHAR(40) PRIMARY KEY,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### How to Access Railway PostgreSQL:
1. Go to your Railway dashboard
2. Select your PostgreSQL service
3. Click on "Query" tab or use the connection string to connect via `psql`
4. Run the SQL commands above

---

## 2️⃣ Railway Environment Variables

Go to your Railway backend service → Variables tab and set these:

| Variable | Value | Notes |
|----------|-------|-------|
| `NODE_ENV` | `production` | Required |
| `PORT` | `5001` | Or Railway's PORT variable |
| `CREDITCOIN_PRIVATE_KEY` | `0x9b03237620808ee0fd539300ca7d23894d67e82e903441ef3ea02ea52e5fb4b6` | From your .env |
| `CREDITCOIN_ADMIN_PRIVATE_KEY` | `0x9b03237620808ee0fd539300ca7d23894d67e82e903441ef3ea02ea52e5fb4b6` | Same as above |
| `PRIVATE_KEY` | `0x9b03237620808ee0fd539300ca7d23894d67e82e903441ef3ea02ea52e5fb4b6` | Same as above |
| `METALPRICE_API_KEY` | `YOUR_METAL_PRICE_API_KEY` | ⚠️ You need to provide this |
| `ETHERSCAN_API_KEY` | `YOUR_ETHERSCAN_API_KEY` | ⚠️ You need to provide this (or leave empty if not using) |
| `CORS_ORIGIN` | `https://sanad-protocol.netlify.app` | Your frontend URL |
| `JWT_SECRET` | `sanad_super_secret_jwt_key_2026_cc3` | From your .env |
| `ENCRYPTION_MASTER_KEY` | `0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef` | From your .env |
| `SAG_TOKEN_ADDRESS` | `0x80b9Ae7D0BEfB042a3eb8fDd1af0DCF6E53bEdE9` | From your .env |
| `SANAD_LIQUIDITY_POOL_ADDRESS` | `0x6370114EEda4AC8F43F6c7997cB6C75DF58F4316` | From your .env |
| `SANAD_CREDIT_ORACLE_ADDRESS` | `0x9B926B432bbEFA5405eC9EBB0F7515496c2095a5` | From your .env |
| `CREDITCOIN_CHAIN_ID` | `102031` | From your .env |
| `CREDITCOIN_CHAIN_ID_HEX` | `0x18e8f` | From your .env |
| `CREDITCOIN_PROOF_BUILDER_URL` | `https://prover.cc3-testnet.creditcoin.network` | From your .env |
| `PINATA_API_KEY` | `08501330fb59b3a26c40` | From your .env |
| `PINATA_SECRET_API_KEY` | `99a278901f1eb9f4355050fcc459bba9aa493406bf3e305e06a0e99de4a0dd5a` | From your .env |
| `PINATA_JWT` | See .env file | Long JWT token |
| `GEMINI_API_KEY` | `AIzaSyB3vp-m6q68dNO-UcyZoiNPtS0oD6qMWd0` | From your .env |
| `ETHEREUM_RPC_URL` | `https://ethereum-rpc.publicnode.com` | From your .env |
| `IPFS_GATEWAY_URL` | `https://gateway.pinata.cloud/ipfs` | From your .env |
| `SEPOLIA_REPAYMENT_GATEWAY_ADDRESS` | `0x662e21FfB91F35A1f16983e38a9cDAe90f537A80` | From your .env |
| `SEPOLIA_INVESTOR_VAULT_ADDRESS` | `0x0e243c2F556eFaDA6352f567AA658b6052F04eD4` | From your .env |

### Database Variables (Railway should auto-provide these):
- `DATABASE_URL` (from Railway PostgreSQL service)
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_HOST`
- `POSTGRES_PORT`
- `POSTGRES_DB`

### Redis Variables (if using Railway Redis):
- `REDIS_HOST`
- `REDIS_PORT`

---

## 3️⃣ Netlify Environment Variables

Go to your Netlify dashboard → Site settings → Environment variables:

| Variable | Value | Notes |
|----------|-------|-------|
| `NEXT_PUBLIC_API_URL` | `https://YOUR-RAILWAY-APP.up.railway.app` | Your Railway backend URL (without trailing slash) |
| `NEXT_PUBLIC_WS_URL` | `https://YOUR-RAILWAY-APP.up.railway.app` | Same as API URL for WebSocket |
| `NEXT_PUBLIC_ENV_URL` | `https://creditcoin-testnet.blockscout.com` | Creditcoin testnet explorer |

### How to Find Your Railway Backend URL:
1. Go to your Railway backend service
2. Click on "Settings" → "Domains"
3. Copy the generated URL (e.g., `sanad-production-6fa3.up.railway.app`)
4. Use `https://` + that domain

---

## 4️⃣ What Was Already Fixed in Code

✅ **Database migrations** - Tables auto-create on server boot via `bootstrap-database.mjs`  
✅ **Socket.IO CORS** - Now reads from `CORS_ORIGIN` env var (was hardcoded to localhost)  
✅ **CSP headers** - Include production domain  
✅ **SAG token minting** - Uses correct owner-authorized signer  
✅ **Frontend configuration** - Image proxy, API URLs, and WebSocket connections point to production  
✅ **NODE_ENV** - Fixed to use `production` in deployment  

---

## 5️⃣ Deployment Checklist

### Railway Backend:
- [ ] PostgreSQL database connected
- [ ] Run the 3 SQL table creation scripts above
- [ ] Set all environment variables from section 2
- [ ] Verify `CORS_ORIGIN` matches your Netlify URL exactly
- [ ] Redeploy the backend service
- [ ] Check logs for successful startup
- [ ] Test health endpoint: `https://YOUR-RAILWAY-URL/api/v1/health`

### Netlify Frontend:
- [ ] Set all 3 environment variables from section 3
- [ ] Verify `NEXT_PUBLIC_API_URL` matches your Railway URL (no trailing slash)
- [ ] Trigger a new deployment (or clear cache and redeploy)
- [ ] Test the frontend loads correctly
- [ ] Test API connectivity (check browser console for errors)

---

## 6️⃣ Testing Production

After deployment, test these critical flows:

1. **User Registration/Login** - Auth should work
2. **Pawnshop Borrowers Page** - Should load without database errors
3. **Investment Endpoints** - Should accept and record investments
4. **Repayment Recording** - Should create loan_repayment records
5. **WebSocket Connection** - Real-time updates should work
6. **SAG Token Operations** - Minting and transfers should work

---

## 7️⃣ Missing API Keys

⚠️ **You need to obtain these API keys:**

### METALPRICE_API_KEY
This is used for gold price validation. Options:
- **Metals.dev API** - https://metals.dev/
- **MetalpriceAPI** - https://metalpriceapi.com/
- **GoldAPI** - https://www.goldapi.io/

Sign up for one of these services and add the API key to Railway.

### ETHERSCAN_API_KEY
This is for Ethereum mainnet credit bureau discovery:
1. Go to https://etherscan.io/
2. Create an account
3. Go to API Keys section
4. Generate a free API key
5. Add to Railway (or leave empty if not using this feature)

---

## 8️⃣ Quick Command Reference

### Connect to Railway PostgreSQL via CLI:
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Get database connection string
railway variables

# Connect with psql
railway run psql
```

### Check Railway Logs:
```bash
railway logs
```

### Redeploy on Railway:
```bash
railway up
```

---

## 🆘 Troubleshooting

### Backend won't start:
- Check Railway logs for errors
- Verify DATABASE_URL is set correctly
- Ensure all required env vars are present

### Frontend can't connect to backend:
- Verify CORS_ORIGIN on backend matches Netlify URL exactly
- Check NEXT_PUBLIC_API_URL has no trailing slash
- Inspect browser console for CORS errors

### Database connection errors:
- Ensure PostgreSQL service is running on Railway
- Check DATABASE_URL format
- Verify tables were created successfully

### WebSocket not connecting:
- Check NEXT_PUBLIC_WS_URL matches backend URL
- Verify Socket.IO CORS settings
- Check browser console for connection errors

---

## 📞 Support

If you encounter issues:
1. Check Railway logs: `railway logs`
2. Check Netlify function logs
3. Inspect browser console for frontend errors
4. Verify all environment variables are set correctly

---

**Last Updated:** December 2024  
**Status:** Ready for Production Deployment 🚀
