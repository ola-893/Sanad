# Sanad Protocol - Deployment Information for Testing

**Deployment Date:** September 7, 2026  
**Last Updated Commit:** `080aa5c`  
**Status:** ✅ All services operational

---

## 🌐 Live Deployment URLs

### Frontend (Netlify)
- **URL:** https://sanad-protocol.netlify.app
- **Status:** ✅ Live
- **Framework:** Next.js 16.3.4
- **Features:** MetaMask wallet integration, loan application flow, gold-backed financing

### Backend API (Railway)
- **Base URL:** https://sanad-production-6fa3.up.railway.app
- **Health Check:** https://sanad-production-6fa3.up.railway.app/api/v1/health
- **Status:** ✅ Responding (returns "OK")
- **Port:** 9487
- **Features:** REST API, WebSocket support, Creditcoin indexer

### Database Services (Railway)
- **PostgreSQL:** ✅ Online - Initialized with schema
- **Redis:** ✅ Online - Session & queue management

---

## 🔧 API Endpoints for Testing

### Health & Info
```bash
# Health check
curl https://sanad-production-6fa3.up.railway.app/api/v1/health

# API info (returns network details)
curl https://sanad-production-6fa3.up.railway.app/
```

### Authentication
```bash
# Register (example - adjust payload as needed)
curl -X POST https://sanad-production-6fa3.up.railway.app/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'

# Login
curl -X POST https://sanad-production-6fa3.up.railway.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'
```

---

## 🧪 Testing Checklist

### ✅ Infrastructure Tests (Completed)
- [x] Frontend loads and renders
- [x] Backend health endpoint responds
- [x] Database connection works
- [x] Redis connection works
- [x] CORS configured correctly
- [x] WebSocket connections available

### 🔲 Feature Tests (Needs Test Account)
- [ ] **Wallet Connection:** Connect MetaMask to Creditcoin testnet
- [ ] **Authentication:** Register/login flow
- [ ] **KYC Process:** Submit KYC documents
- [ ] **Loan Application:** Create gold-backed loan request
- [ ] **On-chain Proof:** Verify Creditcoin proof generation
- [ ] **Loan Lifecycle:** Test approval, disbursement, repayment

---

## 🔑 Test Environment Details

### Network Configuration
- **Blockchain:** Creditcoin 3 Testnet (CC3)
- **Chain ID:** 102031 (hex: 0x18e8f)
- **RPC URL:** https://rpc.cc3-testnet.creditcoin.network
- **Explorer:** https://creditcoin-testnet.subscan.io/

### Deployed Smart Contracts
- **SAGToken:** `0x8892e1C5D1643E2F086Ad530B742Da3BCdE1cb0C`
- **SanadLiquidityPool:** `0x41c6145316Cb4963465BEA2618932d67FC816aB2`
- **SanadCreditOracle:** `0x9B926B432bbEFA5405eC9EBB0F7515496c2095a5`

---

## 💰 Test Wallet Setup

### Required for Full Testing
1. **Install MetaMask:** Browser extension
2. **Add Creditcoin Testnet:** Use network details above
3. **Get Test CTC Tokens:** Request from Creditcoin faucet
4. **Wallet Address:** Use any testnet address

### MetaMask Network Configuration
```
Network Name: Creditcoin Testnet
RPC URL: https://rpc.cc3-testnet.creditcoin.network
Chain ID: 102031
Currency Symbol: CTC
Block Explorer: https://creditcoin-testnet.subscan.io/
```

---

## 🐛 Known Limitations

### Current State
- ✅ All infrastructure deployed and operational
- ✅ Database schema initialized
- ✅ API endpoints responding
- ✅ CORS configured for frontend access
- ⚠️ **Full KYC/on-chain flow:** Requires test wallet with CTC tokens

### What Works
- Frontend UI navigation
- Backend API calls
- Health monitoring
- Database queries
- WebSocket connections
- Creditcoin indexer (monitoring blockchain events)

### What Needs Testing
- Complete user registration + KYC flow
- Loan creation with on-chain proof
- Smart contract interactions
- Token transfers and approvals
- Oracle updates

---

## 📊 Monitoring & Debugging

### Railway Dashboard
- **Project:** https://railway.com/project/6d6d4c8f-6af3-4872-8af7-c39f06066ce2
- **Account:** merciedebbie1809@gmail.com

### View Backend Logs
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login (browserless)
railway login --browserless

# View logs
railway logs --project 6d6d4c8f-6af3-4872-8af7-c39f06066ce2
```

### Common Issues & Solutions

**502 Bad Gateway:**
- ✅ Fixed - App now listens on correct port (9487)

**CORS Errors:**
- ✅ Fixed - Frontend domain whitelisted

**Database Connection:**
- ✅ Fixed - Using Railway's DATABASE_URL reference

**Indexer Errors:**
- ✅ Fixed - Filter expiration handled gracefully

---

## 📝 Test Account Recommendations

### Create Test Accounts With
1. **Email:** Use temp email services (e.g., `tester@example.com`)
2. **Password:** Test123! (or similar strong password)
3. **Wallet:** MetaMask with Creditcoin testnet configured
4. **KYC Docs:** Test documents (not validated in testnet)

### Test User Roles
- **Borrower:** Request gold-backed loans
- **Investor:** (Future) Provide liquidity
- **Pawnshop:** (Future) Verify gold collateral

---

## 🔗 Additional Resources

- **GitHub Repo:** https://github.com/ola-893/Sanad
- **Architecture Diagram:** See `architecture-diagram.png` in repo
- **API Documentation:** Auto-generated at `/api-docs` (if enabled)
- **Creditcoin Docs:** https://docs.creditcoin.org/

---

## ✅ Deployment Summary

**What Was Fixed (Commit 080aa5c):**
1. Backend 502 errors resolved (port configuration)
2. Database initialized with full schema
3. Health checks passing
4. Redis connection verified
5. CORS configured for frontend domain
6. WebSocket support enabled
7. SDK startup crash fixed
8. Creditcoin indexer errors handled
9. Frontend rebuilt with correct backend API URL

**Test Keys Used:**
- All keys in deployment are test/development keys
- No production credentials exposed
- Safe for public testnet usage

---

## 🚀 Quick Start for Testers

1. **Open Frontend:** https://sanad-protocol.netlify.app
2. **Connect Wallet:** Use MetaMask with Creditcoin testnet
3. **Create Account:** Register with email/password
4. **Explore UI:** Navigate through loan application flow
5. **Report Issues:** Document any errors or unexpected behavior

**Need Help?**
- Check Railway logs for backend errors
- Browser console for frontend errors
- Network tab for API call failures

---

**Last Updated:** September 7, 2026  
**Deployment Status:** Production-ready for testnet usage  
**Next Milestone:** Full KYC/on-chain proof workflow testing
