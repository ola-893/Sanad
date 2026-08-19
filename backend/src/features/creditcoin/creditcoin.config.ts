// Single-chain, Creditcoin only. Do not reintroduce Sepolia, USC, or Attestcoin without explicit sign-off.
import dotenv from 'dotenv';
dotenv.config();

/**
 * ============================================================================
 * CREDITCOIN 3 (CC3) TESTNET CONFIGURATION
 * ============================================================================
 * Target Network: Creditcoin 3 (CC3) Testnet (Chain ID: 102031)
 * Architecture: Single-chain, Creditcoin only.
 * ============================================================================
 */

export interface CreditcoinNetworkConfig {
  rpcUrl: string;
  chainId: number;
  chainName: string;
  explorerUrl: string;
  contracts: {
    sagTokenAddress: string;
    liquidityPoolAddress: string;
  };
}

export const CREDITCOIN_CONFIG: CreditcoinNetworkConfig = {
  // Creditcoin CC3 Testnet JSON-RPC (EVM Layer)
  rpcUrl: process.env.CREDITCOIN_RPC_URL || 'https://rpc.cc3-testnet.creditcoin.network',
  chainId: Number(process.env.CREDITCOIN_CHAIN_ID || 102031),
  chainName: 'Creditcoin 3 Testnet',

  // Creditcoin CC3 Testnet Block Explorer (Blockscout)
  explorerUrl: 'https://creditcoin-testnet.blockscout.com/',

  // Deployed Contract Addresses on Creditcoin 3 Testnet
  contracts: {
    sagTokenAddress: process.env.SAG_TOKEN_ADDRESS || process.env.SAG_TOKEN_CONTRACT_ADDRESS || '0xb663dc20bab958780b5F28E5b59A192Bbb5f8f2e',
    liquidityPoolAddress: process.env.SANAD_LIQUIDITY_POOL_ADDRESS || process.env.LIQUIDITY_POOL_CONTRACT_ADDRESS || '0x02D4F85301A2d1b3Bcc40BfD7937e6Fb2F5224a7',
  },
};
