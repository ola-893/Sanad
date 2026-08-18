import dotenv from 'dotenv';
dotenv.config();

/**
 * ============================================================================
 * CREDITCOIN 3 (CC3) TESTNET & ATTESTCOIN PROTOCOL CONFIGURATION
 * ============================================================================
 * Target Network: Creditcoin 3 (CC3) Testnet
 * Target SDK: @gluwa/usc-sdk @ ^0.18.0
 * 
 * ARCHITECTURAL DESIGN NOTE:
 * The dual-chain architecture (Ethereum Sepolia + Creditcoin CC3) routes cross-chain
 * repayments through Attestcoin Protocol.
 * ASSUMPTION: Assumes the hackathon rewards cross-chain/Attestcoin usage — not confirmed against real rubric text.
 * ============================================================================
 */

export interface CreditcoinNetworkConfig {
  rpcUrl: string;
  chainId: number;
  chainName: string;
  proverUrl: string;
  blockProverAddress: string;
  chainInfoAddress: string;
  explorerUrl: string;
  sourceChain: {
    name: string;
    rpcUrl: string;
    chainId: number;      // Sepolia EVM chainId: 11155111
    defaultChainKey: number; // Creditcoin-internal chainKey: 1
  };
  contracts: {
    sagTokenAddress: string;
    liquidityPoolAddress: string;
    sepoliaGatewayAddress: string;
  };
}

export const CREDITCOIN_CONFIG: CreditcoinNetworkConfig = {
  // Creditcoin CC3 Testnet JSON-RPC (EVM Layer)
  rpcUrl: process.env.CREDITCOIN_RPC_URL || 'https://rpc.cc3-testnet.creditcoin.network',
  chainId: Number(process.env.CREDITCOIN_CHAIN_ID || 102031),
  chainName: 'Creditcoin 3 Testnet',

  // Official Hosted Attestcoin Prover Service Endpoint
  proverUrl: process.env.ATTESTCOIN_PROVER_URL || 'https://prover.cc3-testnet.creditcoin.network',

  // Native Creditcoin Precompile Contracts
  blockProverAddress: '0x0000000000000000000000000000000000000FD2',
  chainInfoAddress: '0x0000000000000000000000000000000000000fd3',

  // Creditcoin CC3 Testnet Block Explorer (Blockscout)
  explorerUrl: 'https://creditcoin-testnet.blockscout.com/',

  // Source Chain for Cross-Chain Liquidity & Repayments (Ethereum Sepolia)
  sourceChain: {
    name: 'Ethereum Sepolia',
    rpcUrl: process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com',
    chainId: 11155111,
    defaultChainKey: 1, // Creditcoin-internal key for Sepolia on CC3 Testnet
  },

  // Deployed Contract Addresses
  contracts: {
    sagTokenAddress: process.env.SAG_TOKEN_ADDRESS || process.env.SAG_TOKEN_CONTRACT_ADDRESS || '0x8DA26C2b004f5962c0846f57d193de12f2F62612',
    liquidityPoolAddress: process.env.SANAD_LIQUIDITY_POOL_ADDRESS || process.env.LIQUIDITY_POOL_CONTRACT_ADDRESS || '0x62E0EC7483E779DA0fCa9B701872e4af8a0FEd87',
    sepoliaGatewayAddress: process.env.REPAYMENT_GATEWAY_SEPOLIA_ADDRESS || process.env.SEPOLIA_GATEWAY_CONTRACT_ADDRESS || '0x890A9C33A214699193fDA251d96c4626850a02c9',
  },
};
