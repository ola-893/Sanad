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
  'function getInvestorDeposits(address investor) external view returns (uint256)',
  'event DepositMade(address indexed investor, uint256 amount, uint256 timestamp)'
] as const;

export const REPAYMENT_GATEWAY_ABI = [
  'function repay(uint256 tokenId, uint256 amount) external payable',
  'function totalRepaidForToken(uint256 tokenId) external view returns (uint256)',
  'event RepaymentMade(address indexed borrower, uint256 indexed tokenId, uint256 amount, uint256 timestamp)'
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
