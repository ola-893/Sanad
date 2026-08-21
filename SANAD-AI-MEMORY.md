# Sanad Finance — AI Agent Memory

> **Last Updated:** August 20, 2026
> **Project:** Sanad — Shariah-Compliant Gold Financing on Creditcoin
> **Hackathon:** BUIDL CTC 2026 Fall (https://dorahacks.io/hackathon/buidl-ctc-2026-fall/detail)
> **Deadline:** September 6, 2026

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Design System](#design-system)
4. [What Was Built This Session](#what-was-built-this-session)
5. [File Map](#file-map)
6. [Known Issues & TODOs](#known-issues--todos)
7. [Backend Tasks](#backend-tasks)
8. [Hackathon Submission Checklist](#hackathon-submission-checklist)
9. [Auth Flow](#auth-flow)
10. [Key Technical Decisions](#key-technical-decisions)

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
- **ETH Sepolia (11155111)** — User-facing: deposits, repayments, wallet auth
- **Creditcoin CC3 (102031)** — Backend/internal: SAG minting, Attestcoin proofs, credit scoring
- **Backend bridges ETH→CTC internally** — users never touch CC3 directly

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

## What Was Built This Session

### 1. Wallet-Based Auth System (Complete)
- **Sign out disconnects MetaMask** via `wallet_revokePermissions`
- **Auto-login on reconnect** — if wallet connected + valid JWT in storage → auto-redirect to dashboard
- **No re-signing needed** after first login (tokens persist across sign-outs)
- **All roles:** Investor, Borrower, Pawnshop (same flow)
- **Admin:** Separate `/admin/login` — unaffected

### 2. Investor Portal (Complete)
- `/login` → Role selector (Investor first, Borrower, Pawnshop, Admin subtle)
- `/dashboard` — Stats (ETH Balance, Pool Stake, NFT Holdings, Total Financed) + Cash Flow chart + Recent Activity
- `/dashboard/browse` → NFT Listings grid with detail modal
- `/dashboard/wallet` — Wallet address copy, ETH balance, network info
- `/dashboard/profile` — User details, wallet info
- **Header:** Glassmorphism pill nav with active state highlighting
- **Mobile responsive** throughout

### 3. KYC Page — Restyled to Sanad Design (Complete)
- Was: Dark theme (`#0E1117`, `#E5A93C`) — completely different design
- Now: Sanad glass-panel, `#171414`/`#E1BAC2` palette
- Step 2: Attestcoin Protocol credit screening with auto-flow
- Real-time progress steps during scan + proof generation
- Demo mode indicator when using curated profiles
- "Next Step" button hidden until credit verification completes

### 4. Credit Bureau Integration (Complete)
- `CreditScoreCard` component — Sanad-styled score gauge (0-1000), tier badge, stats
- `useCreditProfile` hook — fetches from `/credit-oracle/profile/:address`
- Added to investor dashboard
- Standalone `/credit-bureau` page restyled to Sanad design
- Removed from marketing nav and sidebar (not customer-facing)

### 5. Backend KYC — Credit Bureau Fields (Complete)
- Added columns: `ethereum_wallet_address`, `credit_score`, `credit_tier`, `attestcoin_proof_tx`
- Migration ran successfully
- Controller + service accept and store these fields

### 6. Header & Navigation (Complete)
- Landing page header (glassmorphism pill) used across all portals
- Portal nav: Dashboard | NFT Listings | Wallet | Profile
- Active state: `bg-[#171414] text-[#E1BAC2]` (exact match, not prefix)
- Sign out button with text + loading spinner
- Mobile hamburger menu

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
frontend/app/register/kyc/page.tsx             — KYC 4-step flow with Attestcoin
frontend/app/dashboard/page.tsx                — Main investor dashboard
frontend/app/dashboard/browse/page.tsx         — NFT Listings grid
frontend/app/dashboard/wallet/page.tsx         — Wallet management
frontend/app/dashboard/profile/page.tsx        — User profile
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

### Frontend — Hooks
```
frontend/hooks/use-wallet-auth.ts    — Wallet auth (connect, sign, auto-login)
frontend/hooks/use-auth.ts           — Legacy auth (email/password)
frontend/hooks/use-credit-profile.ts — Credit score from backend
frontend/hooks/use-investor-nfts.ts  — NFT data from backend
frontend/hooks/use-audit-logs.ts     — On-chain audit logs
frontend/hooks/use-liquidity-pool.ts — Pool data
frontend/hooks/use-language.tsx      — i18n
frontend/hooks/use-local-storage.ts  — localStorage hook
```

### Frontend — Core
```
frontend/core/credit-bureau/credit-bureau-view.tsx  — Restyled to Sanad design
frontend/core/credit-bureau/sanad-credit-oracle.ts  — Contract addresses, ABIs
frontend/core/credit-bureau/types.ts                — TypeScript interfaces
frontend/core/credit-bureau/index.ts                — Barrel exports
```

### Backend
```
backend/src/features/auth/auth.controller.ts        — Email/password auth + refresh
backend/src/features/auth/auth.routes.ts            — Auth routes
backend/src/features/auth/auth.repository.ts        — User lookup (WALLET case added)
backend/src/features/auth/wallet-auth.controller.ts — Wallet nonce, login, register (NEW)
backend/src/features/kyc/kyc.model.ts              — Added credit bureau columns
backend/src/features/kyc/kyc.controller.ts          — Accepts credit bureau fields
backend/src/features/kyc/kyc.service.ts             — Stores credit bureau data
backend/src/features/kyc/kyc.routes.ts              — KYC routes
backend/src/features/sag/sag.controller.ts          — SAG token management
backend/src/core/credit-bureau/credit-oracle.controller.ts  — Credit oracle endpoints
backend/src/core/credit-bureau/defi-discovery.service.ts    — DeFi event discovery
backend/src/core/credit-bureau/attestcoin-oracle-relayer.service.ts — CC3 proof submission
backend/src/core/credit-bureau/sanad-credit-oracle.ts       — Contract config
```

---

## Known Issues & TODOs

### Critical (Hackathon Blockers)
1. **No Etherscan API key** — DeFi discovery returns mock data for unknown wallets
   - Fix: Add `ETHERSCAN_API_KEY=your_key` to `backend/.env`
   - Free key: https://etherscan.io/myapikey
2. **CC3 testnet gas** — `proveAndRecordEvent()` needs CTC for gas
   - Fix: Fund the CC3 private key address with testnet CTC
   - Faucet: https://docs.creditcoin.org/creditcoin-usc/usc-chains-environments
3. **No demo video** — Required for submission
4. **No README** — Required for submission (GitHub repo must include README)
5. **No project deck/whitepaper** — Required for submission

### Nice to Have
6. IC document uploads are simulated (sends string, not real files)
7. Face liveness verification is simulated
8. No token refresh implemented (commented out in auth-store)
9. `ProtectedRoute` redirects to `/login` if profile fetch fails — should handle gracefully
10. `ConditionalLayout` doesn't include `/dashboard` in `fullLayoutRoutes` — header shows correctly

---

## Backend Tasks

### For Backend Developer

**Priority 1 — Etherscan API Key:**
```bash
# backend/.env
ETHERSCAN_API_KEY=your_free_key_here
```
This enables `_queryLiveEtherscanEvents()` in `defi-discovery.service.ts` to return real DeFi lending history for any wallet.

**Priority 2 — CC3 Testnet Gas:**
The `CREDITCOIN_PRIVATE_KEY` in `.env` needs CTC tokens on CC3 testnet to pay for `submitSingleProof()` transactions.

**Priority 3 — Verify Smart Contract:**
- Contract: `0x866d812a57ef13866b85D09a8633218678dAeff3` on CC3
- Verify it's deployed: https://creditcoin-testnet.blockscout.com/address/0x866d812a57ef13866b85D09a8633218678dAeff3
- Verify `submitSingleProof()` is callable
- Verify `getCreditProfile()` returns valid data

**Priority 4 — Test All Endpoints:**
| Endpoint | Method | What to verify |
|----------|--------|----------------|
| `/auth/wallet/nonce` | POST | Returns nonce + message |
| `/auth/wallet/login` | POST | Returns JWT + refreshToken |
| `/auth/wallet/register` | POST | Creates user + returns JWT |
| `/kyc/submit` | POST | Stores credit bureau fields |
| `/credit-oracle/discover` | POST | Returns real DeFi events (with Etherscan key) |
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
1. **BlockProver Precompile (0xFD2)** — Verify Ethereum Mainnet block headers on CC3
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
5. **KYC Step 2: Auto-scans wallet's DeFi history across 10 protocols → generates Attestcoin proof on CC3 → shows credit score**
6. KYC Step 3-4: ID + Face (can be skipped in demo)
7. Dashboard shows credit score, ETH balance, SAG opportunities
8. Browse NFTs, view details

---

## Auth Flow

### Sign In (Returning User)
```
User visits /login/investor
  → MetaMask already connected?
  → Check localStorage.authState for valid token + matching wallet
  → Both found → Auto-redirect to /dashboard (no sign needed)
```

### Sign In (First Time)
```
User visits /login/investor
  → Clicks "Connect MetaMask"
  → Clicks "Sign & Login"
  → Signs nonce message
  → Backend verifies signature → returns JWT
  → Tokens stored in localStorage.authState + sessionStorage
  → Redirect to /dashboard
```

### Sign Out
```
User clicks "Sign Out"
  → wallet_revokePermissions() — MetaMask disconnects
  → Clear in-memory state (userAtom)
  → Redirect to /
  → Tokens PERSIST in localStorage (for auto-login on reconnect)
```

### Auto-Login on Reconnect
```
User reconnects MetaMask
  → useWalletAuth detects connected address
  → Checks localStorage.authState + sessionStorage for token
  → Token found + wallet matches → walletAuthenticated = true
  → WalletConnectCard auto-redirects to dashboard
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

---

## Environment Variables

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_CREDITCOIN_EXPLORER_URL=https://creditcoin-testnet.blockscout.com
NEXT_PUBLIC_SANAD_CREDIT_ORACLE_ADDRESS=0x74357E5FED91D6dDdd39847304b8651634693A00
NEXT_PUBLIC_SANAD_LIQUIDITY_POOL_ADDRESS=0x0Ba0B4cecb4c5Ad16043744b504059E95b1fCE70
NEXT_PUBLIC_SAG_TOKEN_ADDRESS=0x68359bD39Bf7A683a96808cAD38147d1baFa07f1
```

### Backend (.env)
```
ETHEREUM_RPC_URL=https://ethereum-rpc.publicnode.com
ETHERSCAN_API_KEY=your_key_here  # NEEDED — currently empty
CREDITCOIN_PRIVATE_KEY=0xce44c9cf...  # For CC3 transactions
CREDITCOIN_PROOF_BUILDER_URL=https://prover.cc3-testnet.creditcoin.network
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
- **NEW:** `ethereum_wallet_address`, `credit_score`, `credit_tier`, `attestcoin_proof_tx`
- `reviewed_by`, `reviewed_at`, `reviewer_notes`

### main.compliance_audit_log
- `id`, `user_id`, `event_type`, `actor`, `details` (JSONB), `timestamp`

---

## Commands

```bash
# Frontend
cd frontend && npm run dev          # Start dev server (port 3000)
cd frontend && npx tsc --noEmit     # Typecheck

# Backend
cd backend && npx tsx watch src/main.ts  # Start with hot reload (port 5000)
cd backend && npx tsc --noEmit           # Typecheck

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

*This file is the single source of truth for the Sanad project state. Update it as work progresses.*
