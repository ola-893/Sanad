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
    sagTokenAddress: process.env.SAG_TOKEN_ADDRESS || process.env.SAG_TOKEN_CONTRACT_ADDRESS || '0x42d3cEB022f4f05467742D8826eceEA6c18bEf42',
    liquidityPoolAddress: process.env.SANAD_LIQUIDITY_POOL_ADDRESS || process.env.LIQUIDITY_POOL_CONTRACT_ADDRESS || '0x7d73e8A84c73dc06CfFf05a5942EeC1a9d7235bA',
    creditOracleAddress: process.env.SANAD_CREDIT_ORACLE_ADDRESS || '0xE45e8F367C02B9d5f5A165827824351457Dd8353',
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

