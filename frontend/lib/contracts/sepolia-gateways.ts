import { ethers } from 'ethers';

export const SEPOLIA_CHAIN_ID = 11155111;
export const SEPOLIA_HEX_CHAIN_ID = '0xaa36a7';
export const SEPOLIA_RPC_URL = 'https://ethereum-sepolia-rpc.publicnode.com';
export const SEPOLIA_EXPLORER_URL = 'https://sepolia.etherscan.io';

export const SEPOLIA_INVESTOR_VAULT_ADDRESS =
  process.env.NEXT_PUBLIC_SEPOLIA_INVESTOR_VAULT_ADDRESS ||
  '0x218565BeC68691178FC61B28FCaEb78592088FDF';

export const SEPOLIA_REPAYMENT_GATEWAY_ADDRESS =
  process.env.NEXT_PUBLIC_SEPOLIA_REPAYMENT_GATEWAY_ADDRESS ||
  '0x42F25F256762f17FAD2de8b2c6d650f87c8fe699';

export const INVESTOR_VAULT_ABI = [
  'function deposit(uint256 amount) external payable',
  'function fundLoan(uint256 tokenId, address pawnshop, uint256 appraisedValueUSD) external payable',
  'function disburseLoan(uint256 tokenId, address borrower, uint256 amount) external payable',
  'function loanFunders(uint256 tokenId) external view returns (address)',
  'function loanPawnshops(uint256 tokenId) external view returns (address)',
  'function loanAppraisedValue(uint256 tokenId) external view returns (uint256)',
  'function loanDisbursed(uint256 tokenId) external view returns (bool)',
  'event DepositMade(address indexed investor, uint256 amount, uint256 timestamp)',
  'event LoanFunded(uint256 indexed tokenId, address indexed investor, address indexed pawnshop, uint256 amount, uint256 appraisedValueUSD, uint256 timestamp)',
  'event LoanDisbursed(uint256 indexed tokenId, address indexed pawnshop, address indexed borrower, uint256 amount, uint256 appraisedValueUSD, uint256 timestamp)'
] as const;

export const REPAYMENT_GATEWAY_ABI = [
  'function repay(uint256 tokenId, uint256 amount) external payable',
  'function settleInvestor(uint256 tokenId, uint256 amount) external payable',
  'function totalRepaidForToken(uint256 tokenId) external view returns (uint256)',
  'function investorVaultAddress() external view returns (address)',
  'event RepaymentMade(address indexed borrower, uint256 indexed tokenId, uint256 amount, uint256 timestamp)',
  'event InvestorSettled(uint256 indexed tokenId, address indexed pawnshop, address indexed investor, uint256 amount, uint256 timestamp)'
] as const;

/**
 * Switch or add Ethereum Sepolia network in MetaMask
 */
export async function switchOrAddSepoliaNetwork(): Promise<boolean> {
  if (typeof window === 'undefined' || !(window as any).ethereum) {
    throw new Error('MetaMask or EVM wallet extension not detected');
  }

  const ethereum = (window as any).ethereum;

  try {
    await ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: SEPOLIA_HEX_CHAIN_ID }],
    });
    return true;
  } catch (switchError: any) {
    // Error code 4902 indicates that the chain has not been added to MetaMask
    if (switchError.code === 4902 || switchError?.data?.originalError?.code === 4902) {
      try {
        await ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: SEPOLIA_HEX_CHAIN_ID,
              chainName: 'Ethereum Sepolia Testnet',
              nativeCurrency: {
                name: 'Sepolia Ether',
                symbol: 'ETH',
                decimals: 18,
              },
              rpcUrls: [SEPOLIA_RPC_URL],
              blockExplorerUrls: [SEPOLIA_EXPLORER_URL],
            },
          ],
        });
        return true;
      } catch (addError) {
        console.error('Failed to add Ethereum Sepolia network:', addError);
        return false;
      }
    }
    console.error('Failed to switch to Ethereum Sepolia network:', switchError);
    return false;
  }
}

/**
 * Detects whether an address has active EIP-7702 delegation designation code.
 * EIP-7702 sets account code starting with `0xef0100` (magic bytes `0xef0100` + 20-byte implementation).
 */
export async function checkEip7702Delegation(
  provider: ethers.Provider,
  address: string
): Promise<{ isDelegated: boolean; delegatedAddress?: string; rawCode?: string }> {
  try {
    const code = await provider.getCode(address);
    if (code && code.toLowerCase().startsWith('0xef0100')) {
      const delegatedAddress = '0x' + code.slice(8, 48);
      return {
        isDelegated: true,
        delegatedAddress,
        rawCode: code,
      };
    }
    return { isDelegated: false };
  } catch (err) {
    console.warn('Failed to check EIP-7702 delegation status:', err);
    return { isDelegated: false };
  }
}
