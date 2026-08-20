# MetaMask Wallet Login — Implementation Plan

## Overview

Replace the existing email/password authentication system with **MetaMask wallet-based login** across all 4 user portals (Admin, Investor, Pawnshop, Borrower). This enables:

- **ETH deposits** that the backend bridges internally to CTC via smart contracts
- **Attestcoin Protocol integration** — wallet address is the key to verifying cross-chain credit history
- **User-owned wallets** — no more server-generated private keys

---

## Current State (What We're Replacing)

| Component | Current | Problem |
|-----------|---------|---------|
| **Login** | Email + password across all 4 portals | No wallet = no ETH deposits, no Attestcoin data |
| **Registration** | Email/password form → backend generates EVM wallet | Wallet is server-side, user never holds keys |
| **JWT model** | `{ username, loginType: 'EMAIL', roleName }` | No wallet address in token |
| **User DB** | 3 tables (`user`, `company_admin`, `super_admin`) all with `userPassword` field | Passwords become unnecessary |
| **Wallet service** | `CreditcoinWalletService.createRandom()` generates keys on signup | Should be user's own MetaMask wallet |

---

## New Architecture

### Auth Flow (All Roles)

```
User clicks "Connect MetaMask"
    → Wallet address obtained from window.ethereum
    → Backend receives: { walletAddress, signature, nonce }
    → Backend verifies EIP-191 signature (proves ownership)
    → If new wallet → redirect to role-specific registration
    → If existing wallet → issue JWT, redirect to role dashboard
```

### The 4 Role Flows

#### 1. Admin Login (`/admin/login`)

```
Connect MetaMask → Sign message → Backend verifies
→ If wallet is in super_admin table → JWT → /admin/dashboard
→ If wallet not found → reject ("Not authorized as admin")
```

- Admins are **pre-seeded** in the database — no self-registration
- Only authorized wallet addresses can access admin portal

#### 2. Investor Login (`/investor/login`)

```
Connect MetaMask → Sign message → Backend verifies
→ If wallet is in investor table → JWT → /investor/dashboard
→ If new wallet → /register/investor → fill profile → KYC → done
```

- Investor dashboard displays available SAG tokens to invest in
- Registration requires profile + KYC verification

#### 3. Pawnshop Login (`/pawnshop/login`)

```
Connect MetaMask → Sign message → Backend verifies
→ If wallet is in pawnshop table → JWT → /pawnshop/dashboard
→ If new wallet → /register/pawnshop → fill business info → done
```

- Pawnshop owners manage borrowers, verify gold custody
- They create SAG tokens from pledged gold and list them for investors

#### 4. Borrower Login (`/login`)

```
Connect MetaMask → Sign message → Backend verifies
→ If wallet is in user table → JWT → /dashboard
→ If new wallet → /register → fill profile → done
```

- Borrowers manage their financing applications
- Wallet address links to their on-chain credit history via Attestcoin

---

## Implementation Phases

### Phase 1: Backend — Wallet Auth Service

#### New File: `backend/src/features/auth/wallet-auth.service.ts`

Core wallet authentication service:

```typescript
// Key methods:
generateNonce(walletAddress: string): string
  // Returns random nonce for user to sign
  // Stored in DB with expiry (5 minutes)

verifyWalletSignature(walletAddress: string, message: string, signature: string): boolean
  // Uses ethers.verifyMessage() for EIP-191 verification

findUserByWallet(walletAddress: string): User | null
  // Looks up across all 3 tables (user, company_admin, super_admin)

loginOrCreateWallet(walletAddress: string, role: string, profileData?: any): JWT
  // If existing → issue JWT
  // If new + role provided → create user + issue JWT
  // If new + no role → return needsRegistration flag
```

#### Modify: `backend/src/features/auth/auth.model.ts`

- Make `userPassword`, `companyAdminPassword`, `superAdminPassword` **nullable**
- Add `walletAddress` index for fast lookups
- Keep email fields optional (for notifications, not auth)

```typescript
// User table changes
userPassword: varchar('user_password', { length: 100 }),  // Remove .notNull()
walletAddress: varchar('wallet_address', { length: 42 }).unique(),  // NEW

// Same for CompanyAdmin and SuperAdmin
```

#### Modify: `backend/src/features/auth/auth.routes.ts`

```typescript
// NEW routes
router.post('/wallet/nonce', generateNonce);        // Get signing nonce
router.post('/wallet/login', walletLogin);           // Verify signature + JWT
router.post('/wallet/register', walletRegister);     // Create account with wallet

// KEEP existing (backward compat during transition)
router.post('/login', userLogin);
router.post('/admin/login', adminLogin);
```

#### Modify: `backend/src/features/auth/auth.controller.ts`

```typescript
// NEW controllers
export const generateNonce = async (req, res) => {
  // 1. Get walletAddress from body
  // 2. Generate random nonce
  // 3. Store nonce with 5-min expiry
  // 4. Return { nonce, message: "Sign this to verify: <nonce>" }
}

export const walletLogin = async (req, res) => {
  // 1. Get { walletAddress, signature } from body
  // 2. Retrieve stored nonce
  // 3. Verify signature matches walletAddress
  // 4. Look up user across all tables
  // 5. If found → generate JWT + return
  // 6. If not found → return { needsRegistration: true }
}

export const walletRegister = async (req, res) => {
  // 1. Get { walletAddress, signature, role, profileData } from body
  // 2. Verify signature
  // 3. Create user in appropriate table based on role
  // 4. Generate JWT + return
}
```

#### Modify: `backend/src/features/jwt/jwt.model.ts`

```typescript
// Old
type UserTokenInfo = {
  username: string;
  loginType: 'EMAIL' | 'CONTACT_NO';
  roleName: string;
}

// New
type UserTokenInfo = {
  walletAddress: string;
  loginType: 'WALLET';
  roleName: string;
  role: 'admin' | 'investor' | 'pawnshop' | 'borrower';
}
```

#### Modify: `backend/src/features/creditcoin/creditcoin-wallet.service.ts`

- **Remove** `createWallet()` — users bring their own MetaMask
- **Keep** `getBalance()` — still need to query CC3 balance
- **Keep** `getSigner()` — still needed for admin/contract operations

---

### Phase 2: Frontend — Web3 Auth Infrastructure

#### New File: `frontend/lib/web3.ts`

Browser-side Web3 utilities:

```typescript
// Connect to MetaMask
export async function connectWallet(): Promise<{ address: string; chainId: number }>

// Sign a message (EIP-191)
export async function signMessage(address: string, message: string): Promise<string>

// Get ETH balance
export async function getETHBalance(address: string): Promise<string>

// Switch to Creditcoin CC3 network
export async function switchToCreditcoin(): Promise<void>

// Check if MetaMask is installed
export function isMetaMaskInstalled(): boolean
```

#### New File: `frontend/hooks/use-wallet-auth.ts`

React hook for wallet authentication:

```typescript
export function useWalletAuth() {
  return {
    // State
    walletAddress: string | null,
    isConnected: boolean,
    isSigning: boolean,
    chainId: number | null,
    error: string | null,

    // Methods
    connect: () => Promise<void>,           // Connect MetaMask
    signAndLogin: (role: string) => Promise<void>,  // Sign + authenticate
    disconnect: () => void,                  // Clear state
    getBalance: () => Promise<string>,       // Get ETH balance
  }
}
```

#### Modify: `frontend/store/atoms.ts`

```typescript
// ADD wallet atoms
export const walletAddressAtom = atom<string | null>(null);
export const walletChainIdAtom = atom<number | null>(null);
export const walletBalanceAtom = atom<string | null>(null);

// UPDATE auth state type
type AuthState = {
  user: User | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  walletAddress: string | null;  // NEW
}
```

#### Modify: `frontend/hooks/use-auth.ts`

Replace email/password auth with wallet auth:

```typescript
// Old
export function useAuth() {
  const authenticateUser = async ({ email, password }) => { ... }
  return { authenticateUser }
}

// New
export function useAuth() {
  const authenticateWithWallet = async ({ walletAddress, signature, nonce }) => {
    // POST /auth/wallet/login
    // Store JWT + walletAddress
    // Update auth state
  }
  return { authenticateWithWallet }
}
```

---

### Phase 3: Login Pages — Replace with Wallet Connect

Each login page gets the same base structure, different role-specific messaging:

#### `frontend/app/login/page.tsx` (Borrower)

```tsx
<AuthShell title="Borrower Login" subtitle="Connect your wallet to access financing">
  <Card>
    {!isConnected ? (
      <ConnectMetaMaskButton onClick={connect} />
    ) : (
      <>
        <WalletBadge address={walletAddress} balance={balance} />
        <SignMessageButton onClick={() => signAndLogin('borrower')} />
      </>
    )}
    <Link href="/register">Create Account</Link>
  </Card>
</AuthShell>
```

#### `frontend/app/investor/login/page.tsx`

```tsx
<AuthShell title="Investor Login" subtitle="Connect to browse SAG tokens">
  {/* Same wallet connect flow */}
  {/* Redirects to /investor/dashboard on success */}
</AuthShell>
```

#### `frontend/app/pawnshop/login/page.tsx`

```tsx
<AuthShell title="Pawnshop Login" subtitle="Manage your branch and create SAG tokens">
  {/* Same wallet connect flow */}
  {/* Redirects to /pawnshop/dashboard on success */}
</AuthShell>
```

#### `frontend/app/admin/login/page.tsx`

```tsx
<AuthShell title="Admin Access" subtitle="Platform administration">
  {/* Same wallet connect flow */}
  {/* Only pre-registered wallets allowed */}
  {/* Redirects to /admin/dashboard on success */}
</AuthShell>
```

#### Shared Component: `frontend/components/auth/wallet-connect-card.tsx` (NEW)

Reusable wallet connect UI component used across all 4 login pages:

```tsx
interface WalletConnectCardProps {
  role: 'admin' | 'investor' | 'pawnshop' | 'borrower';
  title: string;
  description: string;
  onLoginSuccess: ( walletAddress: string) => void;
  registerHref: string;
}
```

---

### Phase 4: Registration Pages — Role-Specific

#### `frontend/app/register/page.tsx` (MODIFY)

Step-by-step registration:

```
Step 1: Connect MetaMask
Step 2: Choose role (Borrower / Investor / Pawnshop)
Step 3: Fill role-specific profile form
Step 4: Sign message to verify wallet ownership
Step 5: Submit → backend creates user with wallet address
```

#### `frontend/app/register/investor/page.tsx` (NEW)

```
Connect wallet → Fill profile (name, email for notifications, phone)
→ KYC verification → Sign → Submit
```

#### `frontend/app/register/pawnshop/page.tsx` (NEW)

```
Connect wallet → Fill business profile (business name, branch address, license)
→ Sign → Submit
```

#### `frontend/app/register/kyc/page.tsx` (MODIFY)

- Remove password field
- Add wallet address display (read-only, from MetaMask)
- Keep existing KYC document upload flow

---

### Phase 5: Remove Server-Generated Wallets

#### `backend/src/features/auth/auth.controller.ts`

In `registerUser`:

```typescript
// OLD
const walletService = new CreditcoinWalletService();
const evmWallet = walletService.createWallet();
userData.accountId = evmWallet.address;

// NEW
userData.accountId = walletAddress; // From MetaMask
```

---

## Database Migration

```sql
-- Make password fields nullable (existing data preserved)
ALTER TABLE "user" ALTER COLUMN "user_password" DROP NOT NULL;
ALTER TABLE "company_admin" ALTER COLUMN "company_admin_password" DROP NOT NULL;
ALTER TABLE "super_admin" ALTER COLUMN "super_admin_password" DROP NOT NULL;

-- Add wallet address column if not using existing account_id
ALTER TABLE "user" ADD COLUMN "wallet_address" varchar(42) UNIQUE;
ALTER TABLE "company_admin" ADD COLUMN "wallet_address" varchar(42) UNIQUE;
ALTER TABLE "super_admin" ADD COLUMN "wallet_address" varchar(42) UNIQUE;

-- Indexes for fast wallet lookups
CREATE INDEX idx_user_wallet ON "user" (wallet_address);
CREATE INDEX idx_company_admin_wallet ON "company_admin" (wallet_address);
CREATE INDEX idx_super_admin_wallet ON "super_admin" (wallet_address);

-- Nonce storage for signature verification
CREATE TABLE wallet_nonces (
  wallet_address varchar(42) PRIMARY KEY,
  nonce varchar(64) NOT NULL,
  expires_at timestamp NOT NULL,
  created_at timestamp DEFAULT NOW()
);
```

---

## Files Changed Summary

| File | Action | Phase | Priority |
|------|--------|-------|----------|
| `backend/src/features/auth/wallet-auth.service.ts` | **NEW** | 1 | P0 |
| `backend/src/features/auth/auth.routes.ts` | MODIFY | 1 | P0 |
| `backend/src/features/auth/auth.controller.ts` | MODIFY | 1 | P0 |
| `backend/src/features/auth/auth.model.ts` | MODIFY | 1 | P0 |
| `backend/src/features/jwt/jwt.model.ts` | MODIFY | 1 | P0 |
| `frontend/lib/web3.ts` | **NEW** | 2 | P0 |
| `frontend/hooks/use-wallet-auth.ts` | **NEW** | 2 | P0 |
| `frontend/components/auth/wallet-connect-card.tsx` | **NEW** | 3 | P0 |
| `frontend/store/atoms.ts` | MODIFY | 2 | P0 |
| `frontend/app/login/page.tsx` | REWRITE | 3 | P0 |
| `frontend/app/investor/login/page.tsx` | REWRITE | 3 | P0 |
| `frontend/app/pawnshop/login/page.tsx` | REWRITE | 3 | P0 |
| `frontend/app/admin/login/page.tsx` | REWRITE | 3 | P0 |
| `frontend/app/register/page.tsx` | MODIFY | 4 | P1 |
| `frontend/app/register/investor/page.tsx` | **NEW** | 4 | P1 |
| `frontend/app/register/pawnshop/page.tsx` | **NEW** | 4 | P1 |
| `frontend/hooks/use-auth.ts` | MODIFY | 5 | P1 |
| `frontend/lib/auth/auth-service.ts` | MODIFY | 5 | P1 |
| `backend/src/features/creditcoin/creditcoin-wallet.service.ts` | MODIFY | 5 | P1 |

---

## Dependencies

### Frontend

No new dependencies required — MetaMask is browser-native via `window.ethereum`.

Optional (for better DX):
```bash
npm install wagmi viem @rainbow-me/rainbowkit
```

### Backend

Already has `ethers` — no new deps needed. `ethers.verifyMessage()` handles EIP-191.

---

## Security Considerations

1. **Nonce expiry** — Nonces expire after 5 minutes to prevent replay attacks
2. **Signature verification** — Always verify on backend, never trust client-side
3. **Wallet address validation** — Checksum validation via `ethers.getAddress()`
4. **Rate limiting** — Limit nonce generation and login attempts per IP
5. **JWT still used** — Wallet auth is only for initial login; subsequent requests use JWT Bearer tokens (existing flow)

---

## Estimated Effort

| Phase | Description | Time |
|-------|-------------|------|
| Phase 1 | Backend wallet auth service | 4-6 hours |
| Phase 2 | Frontend Web3 infrastructure | 3-4 hours |
| Phase 3 | Rewrite 4 login pages | 4-6 hours |
| Phase 4 | Registration flows | 3-4 hours |
| Phase 5 | Cleanup & migration | 2-3 hours |
| **Total** | | **2-3 days** |

---

## Testing Checklist

- [ ] MetaMask connects on all 4 login pages
- [ ] Nonce generation and expiry works
- [ ] EIP-191 signature verification works on backend
- [ ] Existing users can login with wallet (if email matches)
- [ ] New users can register with wallet for each role
- [ ] JWT tokens include walletAddress
- [ ] Admin portal rejects unauthorized wallets
- [ ] Redirect works correctly after login for each role
- [ ] Wallet balance displays correctly
- [ ] Creditcoin CC3 network switch works
- [ ] Existing email/password login still works (backward compat)
- [ ] KYC flow works with wallet-based registration
