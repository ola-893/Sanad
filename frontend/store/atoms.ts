import { User, UserRole } from '@/lib/auth/auth-service';
import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

// ==================== TOKEN ATOMS ====================
export const accessTokenAtom = atom<string | null>(null);
export const refreshTokenAtom = atom<string | null>(null);
export const tokenExpiredAtAtom = atom<string | null>(null);

// ==================== WALLET ATOMS ====================
export const walletAddressAtom = atom<string | null>(null);
export const walletChainIdAtom = atom<number | null>(null);
export const walletBalanceAtom = atom<string | null>(null);

// ==================== AUTH STATE ====================
type AuthState = {
    user: User | null;
    role: UserRole | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    walletAddress?: string | null;
};

export const authStateAtom = atomWithStorage<AuthState>("authStorage", {
    user: null,
    role: null,
    isAuthenticated: false,
    isLoading: false,
    walletAddress: null,
});

export const userAtom = atom(
    (get) => get(authStateAtom).user,
    (get, set, user: User | null) => set(authStateAtom, { ...get(authStateAtom), user })
);
