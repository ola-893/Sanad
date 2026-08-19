'use client';

import { useState, useEffect, useCallback } from 'react';

export const CREDITCOIN_CC3_PARAMS = {
  chainId: process.env.NEXT_PUBLIC_CREDITCOIN_CHAIN_ID_HEX || '0x18e8f',
  chainName: 'Creditcoin 3 Testnet',
  nativeCurrency: {
    name: 'Testnet Creditcoin',
    symbol: 'tCTC',
    decimals: 18,
  },
  rpcUrls: [process.env.NEXT_PUBLIC_CREDITCOIN_RPC_URL || 'https://rpc.cc3-testnet.creditcoin.network'],
  blockExplorerUrls: [process.env.NEXT_PUBLIC_CREDITCOIN_EXPLORER_URL || 'https://creditcoin-testnet.blockscout.com/'],
};

export function useCreditcoinWallet() {
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string>('0.0');
  const [chainId, setChainId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const checkConnection = useCallback(async () => {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      return;
    }
    try {
      const ethereum = (window as any).ethereum;
      const accounts = await ethereum.request({ method: 'eth_accounts' });
      if (accounts.length > 0) {
        setAddress(accounts[0]);
        setIsConnected(true);
        const currentChain = await ethereum.request({ method: 'eth_chainId' });
        setChainId(currentChain);
        await fetchBalance(accounts[0]);
      }
    } catch (err: any) {
      console.error('[Wallet] Error checking connection:', err);
    }
  }, []);

  const fetchBalance = async (accAddress: string) => {
    try {
      const ethereum = (window as any).ethereum;
      const rawBalance = await ethereum.request({
        method: 'eth_getBalance',
        params: [accAddress, 'latest'],
      });
      const parsedCTC = (parseInt(rawBalance, 16) / 1e18).toFixed(4);
      setBalance(parsedCTC);
    } catch (err) {
      console.error('[Wallet] Failed to fetch balance:', err);
    }
  };

  const switchOrAddCreditcoin = async () => {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      throw new Error('MetaMask or standard EVM wallet not detected');
    }
    const ethereum = (window as any).ethereum;
    try {
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: CREDITCOIN_CC3_PARAMS.chainId }],
      });
    } catch (switchError: any) {
      // 4902 error code means chain has not been added yet
      if (switchError.code === 4902) {
        await ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [CREDITCOIN_CC3_PARAMS],
        });
      } else {
        throw switchError;
      }
    }
  };

  const connectWallet = async () => {
    setIsConnecting(true);
    setError(null);
    try {
      if (typeof window === 'undefined' || !(window as any).ethereum) {
        throw new Error('Please install MetaMask or another EVM wallet extension');
      }

      const ethereum = (window as any).ethereum;
      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });

      // Automatically switch / add Creditcoin CC3 network
      await switchOrAddCreditcoin();

      setAddress(accounts[0]);
      setIsConnected(true);
      await fetchBalance(accounts[0]);
    } catch (err: any) {
      console.error('[Wallet] Connection failed:', err);
      setError(err.message || 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setAddress(null);
    setIsConnected(false);
    setBalance('0.0');
  };

  useEffect(() => {
    checkConnection();

    if (typeof window !== 'undefined' && (window as any).ethereum) {
      const ethereum = (window as any).ethereum;
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnectWallet();
        } else {
          setAddress(accounts[0]);
          setIsConnected(true);
          fetchBalance(accounts[0]);
        }
      };

      const handleChainChanged = (newChainId: string) => {
        setChainId(newChainId);
        if (address) fetchBalance(address);
      };

      ethereum.on('accountsChanged', handleAccountsChanged);
      ethereum.on('chainChanged', handleChainChanged);

      return () => {
        ethereum.removeListener('accountsChanged', handleAccountsChanged);
        ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, [checkConnection, address]);

  return {
    address,
    balance,
    chainId,
    isConnected,
    isConnecting,
    error,
    connectWallet,
    disconnectWallet,
    switchOrAddCreditcoin,
  };
}
