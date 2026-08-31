// Single-chain, Creditcoin only. Do not reintroduce Sepolia, USC, or Attestcoin without explicit sign-off.
import dotenv from 'dotenv';
import { DEPLOYED_ADDRESSES } from '@/config/deployed-addresses.js';
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
    sagTokenAddress: process.env.SAG_TOKEN_ADDRESS || process.env.SAG_TOKEN_CONTRACT_ADDRESS || DEPLOYED_ADDRESSES.cc3.sagToken,
    liquidityPoolAddress: process.env.SANAD_LIQUIDITY_POOL_ADDRESS || process.env.LIQUIDITY_POOL_CONTRACT_ADDRESS || DEPLOYED_ADDRESSES.cc3.liquidityPool,
    creditOracleAddress: process.env.SANAD_CREDIT_ORACLE_ADDRESS || DEPLOYED_ADDRESSES.cc3.creditOracle,
  },
};

/**
 * Fixed demo conversion rate for cross-chain liquidity pool rebalancing.
 * 1 ETH = 2,500 CTC (e.g. $2,500 ETH / $1.00 CTC).
 * 
 * NOTE: This is a fixed demo rate for hackathon cross-chain liquidity provisioning.
 * Production architecture connects to decentralized oracle price feeds (e.g. Pyth / Chainlink).
 */
export const DEMO_ETH_TO_CTC_RATE = 2500n;

