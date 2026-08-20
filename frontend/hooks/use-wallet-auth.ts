'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  connectWallet,
  getConnectedWallet,
  signMessage,
  getETHBalance,
  onAccountsChanged,
  onChainChanged,
  isMetaMaskInstalled,
  truncateAddress,
} from '@/lib/web3';
import apiInstance from '@/lib/axios-v1';
import { useAuthStore } from '@/lib/auth/auth-store';
import { useRouter } from 'next/navigation';

export type UserRole = 'admin' | 'investor' | 'pawnshop' | 'borrower';

interface WalletAuthState {
  walletAddress: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  isSigning: boolean;
  chainId: number | null;
  balance: string | null;
  error: string | null;
  isMetaMaskAvailable: boolean;
}

interface WalletAuthActions {
  connect: () => Promise<void>;
  signAndLogin: (role: UserRole) => Promise<{ success: boolean; needsRegistration?: boolean; error?: string }>;
  signAndRegister: (role: UserRole, profileData: Record<string, any>) => Promise<{ success: boolean; error?: string }>;
  disconnect: () => void;
  refreshBalance: () => Promise<void>;
  truncateAddress: (addr: string) => string;
}

export function useWalletAuth(): WalletAuthState & WalletAuthActions {
  const router = useRouter();
  const { login, logout, isAuthenticated } = useAuthStore();
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [chainId, setChainId] = useState<number | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Re-check MetaMask on each render (extension may load late)
  const [isMetaMaskAvailable, setIsMetaMaskAvailable] = useState(false);
  useEffect(() => {
    setIsMetaMaskAvailable(isMetaMaskInstalled());
  });

  // Check for existing connection on mount
  useEffect(() => {
    async function checkConnection() {
      if (!window.ethereum) return;
      try {
        const existing = await getConnectedWallet();
        if (existing) {
          setWalletAddress(existing);
          setIsConnected(true);
          const bal = await getETHBalance(existing);
          setBalance(bal);
        }
      } catch {
        // Not connected
      }
    }
    checkConnection();
  }, []);

  // Listen for account/chain changes
  useEffect(() => {
    const unsubAccounts = onAccountsChanged((accounts) => {
      if (accounts.length === 0) {
        // Disconnected
        setWalletAddress(null);
        setIsConnected(false);
        setBalance(null);
      } else {
        setWalletAddress(accounts[0]);
        setIsConnected(true);
        getETHBalance(accounts[0]).then(setBalance).catch(() => {});
      }
    });

    const unsubChain = onChainChanged(() => {
      // Reload on chain change
      window.location.reload();
    });

    return () => {
      unsubAccounts();
      unsubChain();
    };
  }, []);

  const connect = useCallback(async () => {
    setError(null);
    setIsConnecting(true);
    try {
      // Small delay to let MetaMask inject if loading late
      if (!window.ethereum) {
        await new Promise((r) => setTimeout(r, 500));
      }
      const { address, chainId: cid } = await connectWallet();
      setWalletAddress(address);
      setIsConnected(true);
      setChainId(cid);
      const bal = await getETHBalance(address);
      setBalance(bal);
    } catch (err: any) {
      const message = err.message || 'Failed to connect wallet';
      setError(message);
      // Re-throw so callers can handle it (e.g., toast)
      throw new Error(message);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const signAndLogin = useCallback(async (role: UserRole) => {
    if (!walletAddress) {
      return { success: false, error: 'Wallet not connected' };
    }

    setError(null);
    setIsSigning(true);

    try {
      // 1. Get nonce from backend
      const nonceResponse = await apiInstance.post('/auth/wallet/nonce', {
        walletAddress,
      });

      const { nonce, message } = nonceResponse.data.data;

      // 2. Sign the message with MetaMask
      const signature = await signMessage(walletAddress, message);

      // 3. Send signature to backend for verification
      const loginResponse = await apiInstance.post('/auth/wallet/login', {
        walletAddress,
        signature,
        nonce,
        role,
      });

      const { data } = loginResponse.data;

      if (data.needsRegistration) {
        return { success: false, needsRegistration: true };
      }

      // 4. Store auth tokens
      login(
        { username: walletAddress, password: '__wallet__' },
        role
      );

      // Also store in sessionStorage for compatibility
      sessionStorage.setItem('accessToken', data.accessToken);
      sessionStorage.setItem('refreshToken', data.refreshToken);
      sessionStorage.setItem('expiredAt', data.expiredAt.toString());
      sessionStorage.setItem('userType', role);
      sessionStorage.setItem('walletAddress', walletAddress);

      // Store in localStorage for axios interceptor
      localStorage.setItem('authState', JSON.stringify({
        isAuthenticated: true,
        token: data.accessToken,
        userType: role,
        refreshToken: data.refreshToken,
        walletAddress,
      }));

      return { success: true };
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Login failed';
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsSigning(false);
    }
  }, [walletAddress, login]);

  const signAndRegister = useCallback(async (role: UserRole, profileData: Record<string, any>) => {
    if (!walletAddress) {
      return { success: false, error: 'Wallet not connected' };
    }

    setError(null);
    setIsSigning(true);

    try {
      // 1. Get nonce
      const nonceResponse = await apiInstance.post('/auth/wallet/nonce', {
        walletAddress,
      });

      const { nonce, message } = nonceResponse.data.data;

      // 2. Sign
      const signature = await signMessage(walletAddress, message);

      // 3. Register
      const registerResponse = await apiInstance.post('/auth/wallet/register', {
        walletAddress,
        signature,
        nonce,
        role,
        ...profileData,
      });

      const { data } = registerResponse.data;

      // 4. Store auth tokens
      login(
        { username: walletAddress, password: '__wallet__' },
        role
      );

      sessionStorage.setItem('accessToken', data.accessToken);
      sessionStorage.setItem('refreshToken', data.refreshToken);
      sessionStorage.setItem('expiredAt', data.expiredAt.toString());
      sessionStorage.setItem('userType', role);
      sessionStorage.setItem('walletAddress', walletAddress);

      localStorage.setItem('authState', JSON.stringify({
        isAuthenticated: true,
        token: data.accessToken,
        userType: role,
        refreshToken: data.refreshToken,
        walletAddress,
      }));

      return { success: true };
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Registration failed';
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsSigning(false);
    }
  }, [walletAddress, login]);

  const disconnect = useCallback(() => {
    setWalletAddress(null);
    setIsConnected(false);
    setBalance(null);
    setChainId(null);
    setError(null);
    // Don't logout of the app — just disconnect wallet
  }, []);

  const refreshBalance = useCallback(async () => {
    if (walletAddress) {
      const bal = await getETHBalance(walletAddress);
      setBalance(bal);
    }
  }, [walletAddress]);

  return {
    walletAddress,
    isConnected,
    isConnecting,
    isSigning,
    chainId,
    balance,
    error,
    isMetaMaskAvailable,
    connect,
    signAndLogin,
    signAndRegister,
    disconnect,
    refreshBalance,
    truncateAddress,
  };
}
