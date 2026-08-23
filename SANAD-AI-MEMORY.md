# Sanad Finance — AI Agent Memory

> **Last Updated:** August 23, 2026
> **Project:** Sanad — Shariah-Compliant Gold Financing on Creditcoin
> **Hackathon:** BUIDL CTC 2026 Fall (https://dorahacks.io/hackathon/buidl-ctc-2026-fall/detail)
> **Deadline:** September 6, 2026

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Design System](#design-system)
4. [Session 2 Work (Aug 23)](#session-2-work-aug-23)
5. [File Map](#file-map)
6. [Smart Contract — SanadCreditOracle.sol](#smart-contract--sanadcreditoraclesol)
7. [Scoring Formula (Testnet-Optimized)](#scoring-formula-testnet-optimized)
8. [CreditTier Enum (Backend Dev's Version)](#credittier-enum-backend-devs-version)
9. [Bugs Found & Fixed](#bugs-found--fixed)
10. [Triple-Check Results (All Passed)](#triple-check-results-all-passed)
11. [Deployment Checklist](#deployment-checklist)
12. [Known Issues & TODOs](#known-issues--todos)
13. [Backend Tasks](#backend-tasks)
14. [Hackathon Submission Checklist](#hackathon-submission-checklist)
15. [Auth Flow](#auth-flow)
16. [Key Technical Decisions](#key-technical-decisions)
17. [Environment Variables](#environment-variables)

---

## Project Overview

Sanad is a Shariah-compliant DeFi lending platform built on Creditcoin CC3. Borrowers tokenize gold collateral as SAG NFTs, investors fund loans and earn yield, and the Attestcoin Protocol provides cryptographic on-chain credit scoring.

**Core Value Proposition:** First platform to use Attestcoin Protocol for cross-chain DeFi credit scoring in a Shariah-compliant gold financing context.

**Hackathon Tracks:** DeFi + RWA (Real World Assets)

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js)                    │
│  ETH Sepolia (user-facing) → deposits, repayments, auth  │
└─────────────────────┬───────────────────────────────────┘
                      │ API calls
┌─────────────────────▼───────────────────────────────────┐
│                    BACKEND (Express + Drizzle)            │
│  JWT auth, KYC, SAG management, credit oracle            │
└──────┬──────────────────────┬───────────────────────────┘
       │                      │
┌──────▼──────┐    ┌─────────▼──────────────────────────┐
│  PostgreSQL  │    │  Creditcoin CC3 Testnet             │
│  (Drizzle)   │    │  SanadCreditOracle contract         │
└─────────────┘    │  Attestcoin BlockProver (0xFD2)     │
                   │  Attestcoin ChainInfo (0xFD3)        │
                   └─────────────────────────────────────┘
```

**Network Architecture:**
- **ETH Sepolia (11155111)** — User-facing: deposits, repayments, wallet auth, DeFi discovery
- **Creditcoin CC3 (102031)** — Backend/internal: SAG minting, Attestcoin proofs, credit scoring
- **Backend bridges ETH→CTC internally** — users never touch CC3 directly

**DeFi Discovery Flow (3 Steps):**
1. ✅ **Discovery** — Backend fetches real DeFi events from Blockscout (Sepolia + Mainnet)
2. ✅ **Proof Fetching** — Backend fetches cryptographic proofs from Attestcoin Prover (no signature needed)
3. ❌ **Proof Submission** — Needs borrower's MetaMask signature + CTC gas on CC3

---

## Design System

### Color Palette
| Token | Hex | Usage |
|-------|-----|-------|
| Primary Dark | `#171414` | Text, buttons, borders |
| Rose Accent | `#E1BAC2` | Accents, active states, button text on dark |
| Cream Background | `#F5F5F3` | Page backgrounds |
| Muted Text | `#4A4A4A` | Secondary text |
| Card Background | `#FAFAF8` | Inner card surfaces |

### Component Classes (globals.css)
- **`glass-panel`** — Frosted glass effect: `rounded-3xl border border-[#171414]/15 bg-white/60 shadow-soft-editorial`
- **`flux-pill`** — Dark CTA button: `bg-[#171414] text-[#E1BAC2] font-mono text-[11px] font-bold uppercase tracking-[0.2em]`
- **`kicker-gold`** — Section label: `font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground`
- **`font-display`** — Headings (Manrope font)
- **`font-mono`** — Labels and code (JetBrains Mono)

### Typography
- **Font Sans:** Hanken Grotesk (body)
- **Font Display:** Manrope (headings)
- **Font Mono:** JetBrains Mono (labels, code)

---

## Session 2 Work (Aug 23)

### 1. DeFi Discovery — Volume Fix & Token Metadata
- Fixed `safeVolumeUSD()` to reject max uint256 (Aave "repay all" pattern) and NaN/Infinity
- Added real-time CoinGecko price fetching with 60s cache
- Added token metadata (USDC, DAI, WETH, AAVE, WBTC, EURC, etc.) for proper USD display
- Column header changed from "Volume" to "Value (USD)"
- "Try Demo Profiles" → "Try Sample Wallets" (these are real wallets)

### 2. KYC Flow — Sepolia + Signature Enforcement
- Changed all text from "Ethereum Mainnet" to "Ethereum Sepolia"
- Added `provingAttempted` flag to prevent infinite loop when MetaMask signature is cancelled
- Cancelled signature now **blocks** "Next Step" button — shows error + "Sign & Prove on CC3" retry button
- Going back to Step 1 and forward **rescans** fresh DeFi events
- No-history wallets get base 500/Unscored tier with guidance on how to build credit

### 3. Credit Profile Page — Signature Fix
- **CRITICAL FIX:** Credit profile page was signing a human-readable string (`personal_sign`), but contract expects `keccak256(borrower, oracle, chainId, nonce)` format
- Now uses `solidityPackedKeccak256` matching the KYC page format
- Added ethers import for signature generation

### 4. Scoring Formula — Testnet-Optimized
- Old formula required $1,000+ volume for any bonus — meaningless on Sepolia
- New formula: +50 per repayment, +20 per $100 repaid (cap 200), +20 per borrow (cap 40), +15 per collateral supply (cap 30), -40 per liquidation, -150 per default
- Added `collateralSupplyCount` to contract struct and scoring

### 5. CreditTier Enum Reordered (Backend Dev)
- Backend dev changed enum: `Unscored(0), Bronze(1), Silver(2), Gold(3), HighRisk(4)`
- Fixed relayer tiers array to match (was `['Unscored', 'HighRisk', 'Bronze', 'Silver', 'Gold']`)
- Fixed frontend `TIER_INFO` and `normalizeTier` to match

### 6. Event & Chain Key Naming (Backend Dev)
- `DeFiEventProven` → `EventProven` in contract
- `primarySourceChainKey` → `isSupportedChainKey` mapping (supports both Sepolia + Mainnet)
- Updated all ABIs and frontend references

### 7. Triple-Check Audit (3 rounds, all passed)
- Verified contract struct ↔ 4 ABI files (14 fields, exact order)
- Verified signature format across contract, KYC page, and credit profile page
- Verified event type + protocol enum mapping across all layers
- Verified volumeUSD type handling (number → parseUnits → uint256 → formatUnits → number)
- Verified edge cases: replay, max uint256, zero volume, zero address

---

## File Map

### Frontend — Auth
```
frontend/hooks/use-wallet-auth.ts    — Wallet connection, sign, login, auto-login
frontend/hooks/use-auth.ts           — Legacy auth hook (logout fixed — no server redirect)
frontend/components/auth/wallet-connect-card.tsx — Login card with auto-redirect
frontend/components/auth/protected-route.tsx     — Route guard
frontend/components/auth/auth-provider.tsx       — Placeholder (initializeAuth commented out)
frontend/lib/web3.ts                 — MetaMask utils, disconnectWallet(), network config
frontend/lib/axios-v1.ts             — API client with Bearer token interceptor
frontend/lib/auth/auth-store.ts      — Zustand store (suyula-auth-store)
frontend/store/atoms.ts              — Jotai atoms (userAtom, authStateAtom)
```

### Frontend — Pages
```
frontend/app/login/page.tsx                    — Role selector (Investor first)
frontend/app/login/investor/page.tsx           — Investor wallet login
frontend/app/login/borrower/page.tsx           — Borrower wallet login
frontend/app/login/pawnshop/page.tsx           — Pawnshop wallet login
frontend/app/admin/login/page.tsx              — Admin wallet login
frontend/app/register/page.tsx                 — Registration role selector
frontend/app/register/investor/page.tsx        — Investor registration form
frontend/app/register/pawnshop/page.tsx        — Pawnshop registration form
frontend/app/register/kyc/page.tsx             — KYC 4-step flow with Attestcoin (UPDATED)
frontend/app/dashboard/page.tsx                — Main investor dashboard
frontend/app/dashboard/browse/page.tsx         — NFT Listings grid
frontend/app/dashboard/wallet/page.tsx         — Wallet management
frontend/app/dashboard/profile/page.tsx        — User profile
frontend/app/dashboard/borrower/credit/page.tsx — Credit profile with Discover + Prove (UPDATED)
frontend/app/admin/kyc/page.tsx                — Admin KYC review
frontend/app/investor/(private)/dashboard/page.tsx  — Redirects to /dashboard
frontend/app/investor/(private)/wallet/page.tsx     — Redirects to /dashboard/wallet
frontend/app/investor/(private)/profile/page.tsx    — Redirects to /dashboard/profile
```

### Frontend — Components
```
frontend/components/header.tsx                  — Glassmorphism pill header
frontend/components/external-header.tsx         — Marketing header (no credit bureau)
frontend/components/conditional-layout.tsx      — Layout router (public/internal/full)
frontend/components/credit-score-card.tsx       — Sanad-styled credit score display
frontend/components/dashboard/dashboard-header.tsx
frontend/components/dashboard/overview.tsx      — Cash flow bar chart
frontend/components/dashboard/recent-activity.tsx
frontend/components/branded-loader.tsx
frontend/components/logo.tsx
frontend/components/footer.tsx
```

### Frontend — Core (Credit Bureau)
```
frontend/core/credit-bureau/credit-bureau-view.tsx  — Restyled to Sanad design
frontend/core/credit-bureau/sanad-credit-oracle.ts  — Contract addresses, ABIs (14 fields) (UPDATED)
frontend/core/credit-bureau/types.ts                — TypeScript interfaces
frontend/core/credit-bureau/index.ts                — Barrel exports
frontend/lib/contracts/sanad-credit-oracle.ts       — Contract ABI (14 fields) (UPDATED)
```

### Backend
```
backend/src/features/auth/auth.controller.ts        — Email/password auth + refresh
backend/src/features/auth/auth.routes.ts            — Auth routes
backend/src/features/auth/auth.repository.ts        — User lookup (WALLET case added)
backend/src/features/auth/wallet-auth.controller.ts — Wallet nonce, login, register
backend/src/features/kyc/kyc.model.ts              — Added credit bureau columns
backend/src/features/kyc/kyc.controller.ts          — Accepts credit bureau fields
backend/src/features/kyc/kyc.service.ts             — Stores credit bureau data
backend/src/features/kyc/kyc.routes.ts              — KYC routes
backend/src/features/sag/sag.controller.ts          — SAG token management
backend/src/core/credit-bureau/credit-oracle.controller.ts  — Credit oracle endpoints (5 routes)
backend/src/core/credit-bureau/credit-oracle.routes.ts      — Route registration
backend/src/core/credit-bureau/defi-discovery.service.ts    — DeFi event discovery (Sepolia + Mainnet)
backend/src/core/credit-bureau/attestcoin-oracle-relayer.service.ts — CC3 proof submission (UPDATED)
backend/src/core/credit-bureau/sanad-credit-oracle.ts       — Contract config
backend/src/contracts/SanadCreditOracle.sol                 — Smart contract (UPDATED)
```

---

## Smart Contract — SanadCreditOracle.sol

### CreditProfile Struct (14 fields — must match ABI exactly)
```solidity
struct CreditProfile {
    uint256 score;              // 0-1000
    CreditTier tier;            // enum: Unscored(0), Bronze(1), Silver(2), Gold(3), HighRisk(4)
    uint256 totalRepaidUSD;     // Cumulative USD repaid
    uint256 totalLiquidatedUSD; // Cumulative USD liquidated
    uint256 totalDefaultedUSD;  // Cumulative USD defaulted
    uint256 cleanRepaymentCount;
    uint256 liquidationCount;
    uint256 defaultCount;
    uint256 provenEventCount;
    uint256 lastUpdateBlock;
    uint256 activeBorrowCount;
    uint256 collateralSupplyCount;  // NEW — tracks collateral supplies
    uint256 totalBorrowedUSD;       // NEW — cumulative USD borrowed
    uint256 lastEventTimestamp;
}
```

### Event Types (enum)
```
0 = CleanRepayment
1 = OvercollateralizedLiquidation
2 = UndercollateralizedDefault
3 = CollateralSupply
4 = ActiveBorrowPosition
```

### Protocol Types (enum)
```
0 = AaveV3
1 = CompoundV3
2 = Morpho
3 = Spark
4 = MakerDAO
5 = EulerV2
6 = Fluid
7 = Maple
8 = Goldfinch
9 = Fraxlend
```

### Events
```solidity
event EventProven(address indexed borrower, uint8 protocol, uint8 eventType, uint256 volumeUSD, bytes32 sourceTxHash);
event CreditScoreUpdated(address indexed borrower, uint256 oldScore, uint256 newScore, CreditTier newTier);
```

### Key Functions
- `submitSingleProof(chainKey, height, borrower, eventPayload, signature)` — Submit one proof
- `submitBatchProof(chainKey, heights, borrowers, eventPayloads, signatures)` — Submit multiple proofs
- `getCreditProfile(borrower)` — Read credit profile
- `isSupportedChainKey(chainKey)` — Check if chain is supported (1=Sepolia, 3=Mainnet)
- `owner()` — Contract owner (relayer address)

### Authorization
- `msg.sender == borrower` (borrower signs) OR `msg.sender == owner()` (relayer can submit for anyone)

---

## Scoring Formula (Testnet-Optimized)

```
Base Score: 500

Per Clean Repayment:     +50
Per $100 repaid volume:  +20 (cap at 200 total from volume)
Per Active Borrow:       +20 (cap at 40 total)
Per Collateral Supply:   +15 (cap at 30 total)
Per Liquidation:         -40
Per Default:             -150

Final = clamp(base + bonuses - penalties, 0, 1000)
```

### Tier Thresholds
| Score | Tier |
|-------|------|
| 0-549 | HighRisk |
| 550-649 | Bronze |
| 650-749 | Silver |
| 750-1000 | Gold |

### Example: Sepolia Activity
| Event | Points |
|-------|--------|
| 1 Clean Repayment | +50 |
| $5 repaid volume | +0 (need $100) |
| 1 Active Borrow | +20 |
| 2 Collateral Supply | +30 |
| **Total** | **600 (Silver)** |

---

## CreditTier Enum (Backend Dev's Version)

```solidity
enum CreditTier {
    Unscored,    // 0
    Bronze,      // 1
    Silver,      // 2
    Gold,        // 3
    HighRisk     // 4
}
```

**Relayer tiers array:** `['Unscored', 'Bronze', 'Silver', 'Gold', 'HighRisk']`

**Frontend TIER_INFO:**
```typescript
0: { label: 'Unrated', color: 'text-gray-400' }
1: { label: 'Bronze', color: 'text-amber-600' }
2: { label: 'Silver', color: 'text-gray-500' }
3: { label: 'Gold', color: 'text-yellow-500' }
4: { label: 'HighRisk', color: 'text-red-500' }
```

---

## Bugs Found & Fixed

### Session 2 Bugs (Aug 23)

| # | Bug | Severity | File | Status |
|---|-----|----------|------|--------|
| 1 | `totalBorrowedUSD` missing from all 3 ABI files | **CRITICAL** | relayer.service.ts, sanad-credit-oracle.ts (x2) | Fixed |
| 2 | Credit profile page signed human-readable string instead of keccak256 | **CRITICAL** | credit/page.tsx | Fixed |
| 3 | `Active Borrow Position` missing from relayer eventTypes array | **MEDIUM** | relayer.service.ts | Fixed |
| 4 | `Active Borrow` missing from frontend EVENT_TYPE_NAMES | **LOW** | credit/page.tsx | Fixed |
| 5 | Relayer tiers array had old order after backend dev's push | **HIGH** | relayer.service.ts (line 199) | Fixed |
| 6 | Infinite loop when MetaMask signature cancelled in KYC | **HIGH** | kyc/page.tsx | Fixed |
| 7 | Volume showed raw wei for non-USD tokens | **MEDIUM** | defi-discovery.service.ts | Fixed |

### Pre-existing Issues (Not Our Scope)
- `pawnshop-profile.controller.ts` — string type error
- `test-sepolia-deposit-e2e.ts` / `test-sepolia-repay-e2e.ts` — undefined RPC vars (test scripts)

---

## Triple-Check Results (All Passed)

### Round 1 (Aug 23 — Initial)
All 8 checks passed. Found 4 bugs (items 1-4 above).

### Round 2 (Aug 23 — After Backend Dev Push)
All 10 checks passed. Found 1 bug (item 5 — tiers array).

### Round 3 (Aug 23 — Final Pre-Deploy)
All 20 checks passed:

| # | Check | Result |
|---|-------|--------|
| 1 | Contract CreditTier enum | Unscored(0) Bronze(1) Silver(2) Gold(3) HighRisk(4) PASS |
| 2 | Contract EventType enum | CleanRepayment(0)...ActiveBorrowPosition(4) PASS |
| 3 | Contract CreditProfile struct | 14 fields in order PASS |
| 4 | Contract chain key | isSupportedChainKey mapping, supports 1+3 PASS |
| 5 | Contract authorization | msg.sender == borrower or msg.sender == owner() PASS |
| 6 | Relayer ABI | 14 fields PASS |
| 7 | Frontend lib ABI | 14 fields PASS |
| 8 | Frontend core ABI | 14 fields PASS |
| 9 | Relayer tiers (line 199) | ['Unscored','Bronze','Silver','Gold','HighRisk'] PASS |
| 10 | Relayer tiers (line 228) | ['Unscored','Bronze','Silver','Gold','HighRisk'] PASS |
| 11 | Relayer eventTypes | 5 types with Active Borrow Position PASS |
| 12 | Frontend TIER_INFO | 0=Unrated 1=Bronze 2=Silver 3=Gold 4=HighRisk PASS |
| 13 | Frontend EVENT_TYPE_NAMES | 0-4 with Active Borrow PASS |
| 14 | Frontend normalizeTier | bronze->1 silver->2 gold->3 highrisk->4 PASS |
| 15 | Relayer ABI events | EventProven + CreditScoreUpdated PASS |
| 16 | Frontend core ABI events | EventProven + CreditScoreUpdated PASS |
| 17 | Frontend lib ABI events | EventProven + CreditScoreUpdated PASS |
| 18 | Signature: contract | keccak256(abi.encodePacked) + EIP-191 wrap |
| 19 | Signature: KYC page | solidityPackedKeccak256 + signMessage PASS MATCH |
| 20 | Signature: credit profile | Same as KYC page PASS MATCH |
| 21 | Typecheck frontend | Clean PASS |
| 22 | Typecheck backend | Clean PASS |

---

## Deployment Checklist

### For Backend Developer — CC3 Deployment

**Before deploying:**
```bash
# 1. Check if you have uncommitted changes
git status

# 2. If you have changes, stash them first
git stash

# 3. Pull our changes
git pull

# 4. If you stashed, pop them back
git stash pop
```

**If you get conflicts on SanadCreditOracle.sol:**
- Take **ours** for: `collateralSupplyCount` in struct, new scoring formula, `collateralSupplyCount++` in `_recordVerifiedEvent`
- Take **yours** for: CreditTier enum, chain key mapping, event names, authorization changes

**Deploy steps:**
1. Deploy updated `SanadCreditOracle.sol` to CC3
2. Update `SANAD_CREDIT_ORACLE_ADDRESS` in:
   - `backend/.env`
   - `frontend/.env.local`
   - `backend/src/features/creditcoin/creditcoin.config.ts`
3. Ensure `SOURCE_CHAIN_KEY=1` in `backend/.env`
4. Ensure `PRIVATE_KEY` or `CREDITCOIN_PRIVATE_KEY` is set with CTC gas
5. Restart backend + frontend

### Current Contract (Old — Will Be Replaced)
- Address: `0xa441351Ff94b45c3Da3456744798A86a782d2F34`
- Has corrupt data (phantom liquidation for wallet `0xF17cA945...`)
- New deployment = clean slate for all wallets

---

## Known Issues & TODOs

### Critical (Hackathon Blockers)
1. **CC3 contract needs redeployment** — Current contract has wrong scoring formula and corrupt data
2. **No demo video** — Required for submission
3. **No README** — Required for submission (GitHub repo must include README)
4. **No project deck/whitepaper** — Required for submission

### In Progress
5. **KYC flow text needs rewriting** — Some Sepolia/Mainnet text still inconsistent
6. **Credit profile page needs "Prove All" button** — Currently proves one event at a time
7. **No-history wallets need better guidance** — Should show how to build DeFi credit on Sepolia

### Nice to Have
8. IC document uploads are simulated (sends string, not real files)
9. Face liveness verification is simulated
10. No token refresh implemented (commented out in auth-store)
11. `ProtectedRoute` redirects to `/login` if profile fetch fails — should handle gracefully

---

## Backend Tasks

### For Backend Developer

**Priority 1 — CC3 Redeployment:**
- Deploy updated `SanadCreditOracle.sol` to CC3
- Update all contract addresses
- Verify `submitSingleProof()` is callable
- Verify `getCreditProfile()` returns valid data

**Priority 2 — Etherscan API Key:**
```bash
# backend/.env
ETHERSCAN_API_KEY=your_free_key_here
```
This enables `_queryLiveEtherscanEvents()` in `defi-discovery.service.ts` to return real DeFi lending history for any wallet.

**Priority 3 — Test All Endpoints:**
| Endpoint | Method | What to verify |
|----------|--------|----------------|
| `/auth/wallet/nonce` | POST | Returns nonce + message |
| `/auth/wallet/login` | POST | Returns JWT + refreshToken |
| `/auth/wallet/register` | POST | Creates user + returns JWT |
| `/kyc/submit` | POST | Stores credit bureau fields |
| `/credit-oracle/discover` | POST | Returns real DeFi events (with Etherscan key) |
| `/credit-oracle/fetch-proof` | POST | Generates proof from Attestcoin Prover |
| `/credit-oracle/prove-event` | POST | Generates proof + submits to CC3 |
| `/credit-oracle/profile/:addr` | GET | Returns on-chain credit profile |
| `/investor/nfts` | GET | Returns SAG tokens |
| `/investor/pool/data` | GET | Returns pool liquidity data |

---

## Hackathon Submission Checklist

### Required for Submission
- [ ] Project Name: **Sanad**
- [ ] Project Logo (image URL)
- [ ] Project Sector: **DeFi + RWA**
- [ ] Project Description
- [ ] **Attestcoin Protocol Integration Summary** — explain how the project uses Attestcoin
- [ ] GitHub Repository URL (must include README)
- [ ] Project Deck or Whitepaper (PDF URL)
- [ ] Prototype Demo Video URL
- [ ] Team Information (names, emails, bios, roles, countries)
- [ ] Must be deployed on testnet (CC3 testnet)
- [ ] Must integrate Attestcoin Protocol as core feature

### Attestcoin Integration Points (for submission writeup)
1. **BlockProver Precompile (0xFD2)** — Verify Ethereum Sepolia block headers on CC3
2. **ChainInfo Precompile (0xFD3)** — Cross-chain state verification
3. **Merkle Inclusion Proofs** — Prove specific DeFi transactions happened on Ethereum
4. **Continuity Roots** — Verify chain of blocks between proofs
5. **SanadCreditOracle Contract** — Stores credit scores computed from Attestcoin proofs
6. **10 Ethereum DeFi Protocols** — Aave, Compound, Morpho, Spark, MakerDAO, Euler, Fluid, Maple, Goldfinch, Fraxlend

### Demo Flow (for video)
1. User connects MetaMask on Sepolia
2. Signs wallet authentication message
3. Registers with profile details
4. KYC Step 1: Personal info
5. **KYC Step 2: Auto-scans wallet's DeFi history on Sepolia -> generates Attestcoin proof on CC3 -> shows credit score**
6. KYC Step 3-4: ID + Face (can be skipped in demo)
7. Dashboard shows credit score, ETH balance, SAG opportunities
8. Browse NFTs, view details
9. **Credit profile page: Discover events -> Sign & Prove on CC3 -> Score updates**

---

## Auth Flow

### Sign In (Returning User)
```
User visits /login/investor
  -> MetaMask already connected?
  -> Check localStorage.authState for valid token + matching wallet
  -> Both found -> Auto-redirect to /dashboard (no sign needed)
```

### Sign In (First Time)
```
User visits /login/investor
  -> Clicks "Connect MetaMask"
  -> Clicks "Sign & Login"
  -> Signs nonce message
  -> Backend verifies signature -> returns JWT
  -> Tokens stored in localStorage.authState + sessionStorage
  -> Redirect to /dashboard
```

### Sign Out
```
User clicks "Sign Out"
  -> wallet_revokePermissions() — MetaMask disconnects
  -> Clear in-memory state (userAtom)
  -> Redirect to /
  -> Tokens PERSIST in localStorage (for auto-login on reconnect)
```

### Auto-Login on Reconnect
```
User reconnects MetaMask
  -> useWalletAuth detects connected address
  -> Checks localStorage.authState + sessionStorage for token
  -> Token found + wallet matches -> walletAuthenticated = true
  -> WalletConnectCard auto-redirects to dashboard
```

**Key: Tokens are NOT cleared on sign-out.** Only MetaMask is disconnected. This allows auto-login when the user reconnects.

---

## Key Technical Decisions

### 1. Why tokens persist after sign-out
The old `logoutUser()` server action called `redirect('/en/admin/login')` which hijacked client navigation. Removed it. Now sign-out only disconnects MetaMask — JWT stays in localStorage for auto-login on reconnect.

### 2. Why `useWalletAuth` doesn't call `useAuthStore.login()`
The `login()` function fires a background API call with fake credentials (`username: walletAddress, password: '__wallet__'`). This fails and can interfere with auth state. Wallet auth writes directly to `localStorage.authState` instead.

### 3. Why `/dashboard` is the main route
The old `/investor/dashboard` had a separate sidebar layout. Unified to use the landing page header across all portals. `/investor/dashboard` now redirects to `/dashboard`.

### 4. Why credit bureau is not in the nav
The credit bureau is a backend service that feeds data into the dashboard. It's not customer-facing. The standalone page was restyled to Sanad design for demo/judge viewing, but removed from marketing nav.

### 5. Why KYC Step 2 auto-flows
The user shouldn't need to manually scan or generate proofs. The Attestcoin integration should be seamless — user arrives at Step 2, system auto-scans, auto-proves, shows result. This is better UX and demonstrates the protocol integration clearly.

### 6. Why scoring formula was changed
The original formula required $1,000+ volume for any bonus — meaningless on Sepolia where faucet tokens are limited. New formula gives meaningful scores for small testnet transactions.

### 7. Why owner() can submit proofs
The contract owner (backend relayer) can submit proofs on behalf of borrowers. This allows batch processing and avoids requiring every user to have CTC gas. The borrower's signature is still required for authorization, but the relayer pays the gas.

---

## Environment Variables

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:5002
NEXT_PUBLIC_CREDITCOIN_EXPLORER_URL=https://creditcoin-testnet.blockscout.com
NEXT_PUBLIC_SANAD_CREDIT_ORACLE_ADDRESS=<NEW_ADDRESS_AFTER_REDEPLOY>
NEXT_PUBLIC_SANAD_LIQUIDITY_POOL_ADDRESS=0x0Ba0B4cecb4c5Ad16043744b504059E95b1fCE70
NEXT_PUBLIC_SAG_TOKEN_ADDRESS=0x68359bD39Bf7A683a96808cAD38147d1baFa07f1
```

### Backend (.env)
```
ETHEREUM_RPC_URL=https://ethereum-rpc.publicnode.com
ETHERSCAN_API_KEY=<YOUR_KEY>
CREDITCOIN_PRIVATE_KEY=<YOUR_PRIVATE_KEY>
CREDITCOIN_RPC_URL=https://rpc.cc3-testnet.creditcoin.network
CREDITCOIN_PROOF_BUILDER_URL=https://prover.cc3-testnet.creditcoin.network
SOURCE_CHAIN_KEY=1
SANAD_CREDIT_ORACLE_ADDRESS=<NEW_ADDRESS_AFTER_REDEPLOY>
```

---

## Database Schema (Key Tables)

### main.user
- `user_id`, `user_email`, `user_contact_no`, `user_password`
- `ic_no`, `ic_front_picture`, `ic_back_picture`
- `user_first_name`, `user_last_name`, `gender`
- `wallet_id` (stores wallet address)
- `role_id` (INVESTOR, BORROWER, PAWNSHOP)
- `status` (ACTIVE, PENDING)

### main.kyc_submission
- `id`, `user_id`, `status` (submitted|screening|under_review|approved|rejected)
- `risk_score`, `aml_status`, `document_type`, `flags`
- `ethereum_wallet_address`, `credit_score`, `credit_tier`, `attestcoin_proof_tx`
- `reviewed_by`, `reviewed_at`, `reviewer_notes`

### main.compliance_audit_log
- `id`, `user_id`, `event_type`, `actor`, `details` (JSONB), `timestamp`

---

## Commands

```bash
# Start services
./start.sh

# Stop services
./stop.sh

# Frontend
cd frontend && npm run dev          # Start dev server (port 3000)
cd frontend && npx tsc --noEmit     # Typecheck

# Backend
cd backend && npx tsx watch src/main.ts  # Start with hot reload (port 5002)
cd frontend && npx tsc --noEmit           # Typecheck

# Clear .next cache (if UI not updating)
rm -rf frontend/.next && ./start.sh

# Database migration (credit bureau columns)
cd backend && npx tsx src/scripts/migrate-credit-bureau.ts

# Clear all user data (dev only)
cd backend && npx tsx src/scripts/clear-users.ts
```

---

## Contacts

- **Frontend Developer:** Olaoluwa (you)
- **Backend Developer:** (separate person — see backend tasks section)
- **Hackathon:** BUIDL CTC 2026 Fall
- **Discord:** https://discord.gg/Gu43zTfmtc
- **Email:** team@creditcoin.org

---

## Sample Wallets (For Testing)

| Wallet | Activity |
|--------|----------|
| `0x891775eDdcaBABdCE4b476E335a9EEF73123C75b` | Prime Borrower — 8 events, $4K+ repayment |
| `0xcad85e1ec294f71f3ca68ef3261f894f50c1c4c3` | Retail DeFi User — 6 events, $60 repayment |
| `0x424ae017b571e8ff8a...` | Collateral Supplier — supply events |
| `0x08cbf440...9281d5` | Liquidated Borrower — liquidation on Aave V2 |
| `0xF17cA94560018D6AE9d5e1Af15aEe8E14d615963` | Test wallet — 3 Sepolia Aave transactions |

---

*This file is the single source of truth for the Sanad project state. Update it as work progresses.*
