/**
 * Web3 Utilities — MetaMask connection, EIP-191 signing
 * 
 * This module provides browser-side utilities for interacting with MetaMask.
 * It does NOT handle backend auth — use use-wallet-auth hook for that.
 * 
 * Network architecture:
 *   - Users connect on ETH Sepolia (chain 11155111) for deposits/repayments
 *   - Backend bridges ETH → CTC on Creditcoin CC3 internally
 *   - Attestcoin protocol runs on top of Creditcoin for credit scoring
 */

// ============================================================
// Network Configurations
// ============================================================

// ETH Sepolia Testnet — primary user-facing network
export const SEPOLIA_CHAIN_ID = 11155111;
const SEPOLIA_NETWORK = {
  chainId: `0x${SEPOLIA_CHAIN_ID.toString(16)}`,
  chainName: 'Sepolia Testnet',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: ['https://rpc.sepolia.org', 'https://ethereum-sepolia-rpc.publicnode.com'],
  blockExplorerUrls: ['https://sepolia.etherscan.io/'],
};

// Creditcoin CC3 Testnet — backend/internal use only
export const CC3_CHAIN_ID = 102031;
const CC3_NETWORK = {
  chainId: `0x${CC3_CHAIN_ID.toString(16)}`,
  chainName: 'Creditcoin 3 Testnet',
  nativeCurrency: {
    name: 'Creditcoin',
    symbol: 'CTC',
    decimals: 18,
  },
  rpcUrls: ['https://rpc.cc3-testnet.creditcoin.network'],
  blockExplorerUrls: ['https://creditcoin-testnet.blockscout.com/'],
};

interface EIP1193Provider {
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  on: (event: string, callback: (...args: any[]) => void) => void;
  removeListener: (event: string, callback: (...args: any[]) => void) => void;
  isMetaMask?: boolean;
  providers?: EIP1193Provider[];
}

declare global {
  interface Window {
    ethereum?: EIP1193Provider & {
      providers?: EIP1193Provider[];
    };
  }
}

/**
 * Get the MetaMask provider from window.ethereum.
 * Handles the multi-provider case (e.g. MetaMask + Brave Wallet).
 */
function getMetaMaskProvider(): EIP1193Provider | null {
  if (typeof window === 'undefined') return null;
  if (!window.ethereum) return null;

  // Multiple wallets installed — find MetaMask explicitly
  if (window.ethereum.providers?.length) {
    return window.ethereum.providers.find((p) => p.isMetaMask) || null;
  }

  // Single provider — check if it's MetaMask
  if (window.ethereum.isMetaMask) {
    return window.ethereum;
  }

  // Provider exists but isn't MetaMask (e.g. Brave Wallet)
  return null;
}

/**
 * Check if MetaMask is installed
 */
export function isMetaMaskInstalled(): boolean {
  return getMetaMaskProvider() !== null;
}

/**
 * Get the connected wallet address
 */
export async function getConnectedWallet(): Promise<string | null> {
  const provider = getMetaMaskProvider();
  if (!provider) return null;
  
  try {
    const accounts = await provider.request({
      method: 'eth_accounts',
    });
    return accounts?.[0] || null;
  } catch {
    return null;
  }
}

/**
 * Connect to MetaMask — prompts user to approve.
 * Auto-switches to Sepolia if on the wrong network.
 * Handles multi-wallet scenarios and includes timeout protection.
 */
export async function connectWallet(): Promise<{ address: string; chainId: number }> {
  const provider = getMetaMaskProvider();

  if (!provider) {
    throw new Error('MetaMask is not installed. Please install MetaMask to continue.');
  }

  // Wrap with a timeout so the UI doesn't hang if MetaMask doesn't respond
  const accounts = await Promise.race<Promise<string[]>>([
    provider.request({ method: 'eth_requestAccounts' }),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('MetaMask request timed out. Please open MetaMask and try again.')), 30000)
    ),
  ]);

  if (!accounts || accounts.length === 0) {
    throw new Error('No accounts found. Please unlock MetaMask and try again.');
  }

  const chainIdHex = await provider.request({ method: 'eth_chainId' });
  const chainId = parseInt(chainIdHex, 16);

  // Auto-switch to Sepolia if user is on a different network
  if (chainId !== SEPOLIA_CHAIN_ID) {
    try {
      await switchToSepolia();
      // Re-read chainId after switch
      const newChainIdHex = await provider.request({ method: 'eth_chainId' });
      return {
        address: accounts[0],
        chainId: parseInt(newChainIdHex, 16),
      };
    } catch {
      // If switch fails, continue with current network
      // (user may have rejected the switch prompt)
    }
  }

  return {
    address: accounts[0],
    chainId,
  };
}

/**
 * Sign a message using EIP-191 (personal_sign)
 * Used for wallet ownership verification
 */
export async function signMessage(address: string, message: string): Promise<string> {
  const provider = getMetaMaskProvider();
  if (!provider) {
    throw new Error('MetaMask is not installed');
  }

  const signature = await provider.request({
    method: 'personal_sign',
    params: [message, address],
  });

  return signature;
}

/**
 * Get ETH balance for an address
 */
export async function getETHBalance(address: string): Promise<string> {
  const provider = getMetaMaskProvider();
  if (!provider) {
    throw new Error('MetaMask is not installed');
  }

  const balanceHex = await provider.request({
    method: 'eth_getBalance',
    params: [address, 'latest'],
  });

  // Convert hex wei to ETH
  const balanceWei = parseInt(balanceHex, 16);
  const balanceETH = (balanceWei / 1e18).toFixed(4);
  return balanceETH;
}

/**
 * Switch to ETH Sepolia Testnet — the primary user-facing network.
 * All deposits and repayments happen on Sepolia.
 */
export async function switchToSepolia(): Promise<void> {
  const provider = getMetaMaskProvider();
  if (!provider) {
    throw new Error('MetaMask is not installed');
  }

  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: SEPOLIA_NETWORK.chainId }],
    });
  } catch (switchError: any) {
    // Chain not added yet — add it
    if (switchError.code === 4902) {
      await provider.request({
        method: 'wallet_addEthereumChain',
        params: [SEPOLIA_NETWORK],
      });
    } else {
      throw switchError;
    }
  }
}

/**
 * Switch to Creditcoin CC3 Testnet (backend/internal use).
 * Users should NOT need this — the backend handles ETH→CTC bridging.
 */
export async function switchToCreditcoin(): Promise<void> {
  const provider = getMetaMaskProvider();
  if (!provider) {
    throw new Error('MetaMask is not installed');
  }

  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: CC3_NETWORK.chainId }],
    });
  } catch (switchError: any) {
    if (switchError.code === 4902) {
      await provider.request({
        method: 'wallet_addEthereumChain',
        params: [CC3_NETWORK],
      });
    } else {
      throw switchError;
    }
  }
}

/**
 * Get the current chain ID
 */
export async function getChainId(): Promise<number> {
  const provider = getMetaMaskProvider();
  if (!provider) {
    throw new Error('MetaMask is not installed');
  }

  const chainIdHex = await provider.request({ method: 'eth_chainId' });
  return parseInt(chainIdHex, 16);
}

/**
 * Listen for account changes
 */
export function onAccountsChanged(callback: (accounts: string[]) => void): () => void {
  const provider = getMetaMaskProvider();
  if (!provider) return () => {};
  
  const handler = (accounts: string[]) => callback(accounts);
  provider.on('accountsChanged', handler);
  
  return () => {
    provider.removeListener('accountsChanged', handler);
  };
}

/**
 * Listen for chain changes
 */
export function onChainChanged(callback: (chainId: string) => void): () => void {
  const provider = getMetaMaskProvider();
  if (!provider) return () => {};
  
  const handler = (chainId: string) => callback(chainId);
  provider.on('chainChanged', handler);
  
  return () => {
    provider.removeListener('chainChanged', handler);
  };
}

/**
 * Truncate an address for display: 0x1234...5678
 */
export function truncateAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Check if the user is on the correct network (Sepolia)
 */
export async function isOnSepolia(): Promise<boolean> {
  const chainId = await getChainId();
  return chainId === SEPOLIA_CHAIN_ID;
}

/**
 * Get the network name for display
 */
export function getNetworkName(chainId: number): string {
  if (chainId === SEPOLIA_CHAIN_ID) return 'ETH Sepolia';
  if (chainId === CC3_CHAIN_ID) return 'Creditcoin CC3';
  return `Chain ${chainId}`;
}

/**
 * Copy address to clipboard
 */
export async function copyAddress(address: string): Promise<void> {
  await navigator.clipboard.writeText(address);
}
