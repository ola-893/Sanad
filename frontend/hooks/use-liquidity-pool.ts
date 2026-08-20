'use client';

import { useState, useCallback, useEffect } from 'react';
import { ethers } from 'ethers';
import {
  SANAD_LIQUIDITY_POOL_ADDRESS,
  SANAD_LIQUIDITY_POOL_ABI,
} from '@/lib/contracts/sanad-liquidity-pool';
import { useCreditcoinWallet } from './use-creditcoin-wallet';

export interface PoolState {
  totalPoolLiquidityCTC: string;
  userLpBalanceCTC: string;
  isLoading: boolean;
  error: string | null;
}

export function useLiquidityPool() {
  const { address, isConnected, switchOrAddCreditcoin } = useCreditcoinWallet();
  const [totalLiquidity, setTotalLiquidity] = useState<string>('0.0');
  const [userLpBalance, setUserLpBalance] = useState<string>('0.0');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isTransacting, setIsTransacting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const getProvider = useCallback(() => {
    const rpcUrl = process.env.NEXT_PUBLIC_CREDITCOIN_RPC_URL || 'https://rpc.cc3-testnet.creditcoin.network';
    return new ethers.JsonRpcProvider(rpcUrl, {
      chainId: 102031,
      name: 'Creditcoin3Testnet',
    });
  }, []);

  const getSignerContract = useCallback(async () => {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      throw new Error('No EVM wallet extension detected. Please install MetaMask.');
    }
    await switchOrAddCreditcoin();
    const provider = new ethers.BrowserProvider((window as any).ethereum);
    const signer = await provider.getSigner();
    return new ethers.Contract(SANAD_LIQUIDITY_POOL_ADDRESS, SANAD_LIQUIDITY_POOL_ABI, signer);
  }, [switchOrAddCreditcoin]);

  const getReadOnlyContract = useCallback(() => {
    const provider = getProvider();
    return new ethers.Contract(SANAD_LIQUIDITY_POOL_ADDRESS, SANAD_LIQUIDITY_POOL_ABI, provider);
  }, [getProvider]);

  const fetchPoolData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const contract = getReadOnlyContract();
      const rawTotal = await contract.totalPoolLiquidity().catch(() => 0n);
      setTotalLiquidity(ethers.formatEther(rawTotal));

      if (address) {
        const rawUserBal = await contract.lpBalances(address).catch(() => 0n);
        setUserLpBalance(ethers.formatEther(rawUserBal));
      } else {
        setUserLpBalance('0.0');
      }
    } catch (err: any) {
      console.error('[LiquidityPool] Failed to fetch pool data:', err);
      setError(err.message || 'Failed to read liquidity pool state');
    } finally {
      setIsLoading(false);
    }
  }, [getReadOnlyContract, address]);

  useEffect(() => {
    fetchPoolData();
  }, [fetchPoolData]);

  /**
   * Deposit native CTC into SanadLiquidityPool (payable)
   */
  const depositLiquidity = async (amountCTC: string): Promise<{
    success: boolean;
    transactionHash?: string;
    blockNumber?: number;
    error?: string;
  }> => {
    setIsTransacting(true);
    setError(null);
    try {
      const contract = await getSignerContract();
      const parsedValue = ethers.parseEther(amountCTC);

      const tx = await contract.depositLiquidity({ value: parsedValue });
      const receipt = await tx.wait();

      await fetchPoolData();

      return {
        success: true,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
      };
    } catch (err: any) {
      console.error('[LiquidityPool] Deposit failed:', err);
      const errMsg = err.reason || err.data?.message || err.message || 'Deposit failed';
      setError(errMsg);
      return {
        success: false,
        error: errMsg,
      };
    } finally {
      setIsTransacting(false);
    }
  };

  /**
   * Withdraw native CTC from SanadLiquidityPool
   */
  const withdrawLiquidity = async (amountCTC: string): Promise<{
    success: boolean;
    transactionHash?: string;
    blockNumber?: number;
    error?: string;
  }> => {
    setIsTransacting(true);
    setError(null);
    try {
      const contract = await getSignerContract();
      const parsedValue = ethers.parseEther(amountCTC);

      const tx = await contract.withdrawLiquidity(parsedValue);
      const receipt = await tx.wait();

      await fetchPoolData();

      return {
        success: true,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
      };
    } catch (err: any) {
      console.error('[LiquidityPool] Withdrawal failed:', err);
      const errMsg = err.reason || err.data?.message || err.message || 'Withdrawal failed';
      setError(errMsg);
      return {
        success: false,
        error: errMsg,
      };
    } finally {
      setIsTransacting(false);
    }
  };

  /**
   * Directly repay a loan on Creditcoin CC3 using native CTC
   */
  const repayLoanDirect = async (tokenId: string, amountCTC: string): Promise<{
    success: boolean;
    transactionHash?: string;
    blockNumber?: number;
    error?: string;
  }> => {
    setIsTransacting(true);
    setError(null);
    try {
      const contract = await getSignerContract();
      const parsedValue = ethers.parseEther(amountCTC);

      const tx = await contract.repayLoanDirect(tokenId, { value: parsedValue });
      const receipt = await tx.wait();

      await fetchPoolData();

      return {
        success: true,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
      };
    } catch (err: any) {
      console.error('[LiquidityPool] Direct repayment failed:', err);
      const errMsg = err.reason || err.data?.message || err.message || 'Repayment failed';
      setError(errMsg);
      return {
        success: false,
        error: errMsg,
      };
    } finally {
      setIsTransacting(false);
    }
  };

  return {
    totalLiquidity,
    userLpBalance,
    isLoading,
    isTransacting,
    error,
    depositLiquidity,
    withdrawLiquidity,
    repayLoanDirect,
    fetchPoolData,
  };
}
