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
  proofBuilderUrl: string;
  sourceChainKey: number;
  precompiles: {
    blockProver: string;
    chainInfo: string;
  };
  contracts: {
    sagTokenAddress: string;
    liquidityPoolAddress: string;
    creditOracleAddress: string;
  };
}

export const CREDITCOIN_CONFIG: CreditcoinNetworkConfig = {
  // Creditcoin CC3 Testnet JSON-RPC (EVM Layer)
  rpcUrl: process.env.CREDITCOIN_RPC_URL || 'https://rpc.cc3-testnet.creditcoin.network',
  chainId: Number(process.env.CREDITCOIN_CHAIN_ID || 102031),
  chainName: 'Creditcoin 3 Testnet',

  // Creditcoin CC3 Testnet Block Explorer (Blockscout)
  explorerUrl: 'https://creditcoin-testnet.blockscout.com/',

  // Attestcoin Proof Builder API
  proofBuilderUrl: process.env.CREDITCOIN_PROOF_BUILDER_URL || 'https://prover.cc3-testnet.creditcoin.network',
  sourceChainKey: 3, // Ethereum Mainnet (Chain Key 3 on CC3 Testnet)

  // CC3 Precompiles
  precompiles: {
    blockProver: '0x0000000000000000000000000000000000000FD2',
    chainInfo: '0x0000000000000000000000000000000000000fD3',
  },

  // Deployed Contract Addresses on Creditcoin 3 Testnet
  contracts: {
    sagTokenAddress: process.env.SAG_TOKEN_ADDRESS || process.env.SAG_TOKEN_CONTRACT_ADDRESS || '0xC005Db1A74d39073367925FC53D3B85b635A7DD5',
    liquidityPoolAddress: process.env.SANAD_LIQUIDITY_POOL_ADDRESS || process.env.LIQUIDITY_POOL_CONTRACT_ADDRESS || '0xfa453F00056153F2b209BbAE156cd3ad45e5B686',
    creditOracleAddress: process.env.SANAD_CREDIT_ORACLE_ADDRESS || '0x69E427dA9D4Fe741a9341e65a5e3DB6C5ae18eb5',
  },
};
