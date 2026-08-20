import { ethers } from 'ethers';
import { chainInfo, proofProvider } from '@gluwa/usc-sdk';
import dotenv from 'dotenv';
import { CREDITCOIN_CONFIG } from '@/features/creditcoin/creditcoin.config.js';
import { DiscoveredDeFiEvent, Protocol, EventType } from './defi-discovery.service.js';

dotenv.config();

export interface OracleSubmissionResult {
  success: boolean;
  transactionHash?: string;
  blockNumber?: number;
  explorerUrl?: string;
  score?: number;
  tier?: string;
  provenEventsCount?: number;
  totalRepaidUSD?: string;
  error?: string;
}

export const SANAD_CREDIT_ORACLE_ABI = [
  'function submitSingleProof(uint64 chainKey, uint64 height, bytes calldata encodedTransaction, tuple(bytes32 root, tuple(bytes32 hash, bool isLeft)[] siblings) calldata merkleProof, tuple(bytes32 lowerEndpointDigest, bytes32[] roots) calldata continuityProof, address borrower, tuple(bytes32 sourceTxHash, uint8 protocol, uint8 eventType, uint256 volumeUSD, uint64 timestamp) calldata eventData, bytes calldata borrowerSignature) external returns (bool)',
  'function submitBatchProof(uint64 chainKey, uint64[] calldata heights, bytes[] calldata encodedTransactions, tuple(bytes32 root, tuple(bytes32 hash, bool isLeft)[] siblings)[] calldata merkleProofs, tuple(bytes32 lowerEndpointDigest, bytes32[] roots) calldata sharedContinuityProof, address borrower, tuple(bytes32 sourceTxHash, uint8 protocol, uint8 eventType, uint256 volumeUSD, uint64 timestamp)[] calldata eventsData, bytes calldata borrowerSignature) external returns (bool)',
  'function getCreditProfile(address borrower) external view returns (tuple(address borrower, uint256 score, uint8 tier, uint256 totalRepaidUSD, uint256 totalLiquidatedUSD, uint256 totalDefaultedUSD, uint32 cleanRepaymentCount, uint32 liquidationCount, uint32 defaultCount, uint64 lastEvaluatedTimestamp, uint32 provenEventsCount))',
  'function getProvenEvents(address borrower) external view returns (tuple(bytes32 sourceTxHash, uint64 blockHeight, uint8 protocol, uint8 eventType, uint256 volumeUSD, uint64 timestamp)[])',
  'function isTxProven(bytes32 txHash) external view returns (bool)',
  'function primarySourceChainKey() external view returns (uint64)',
  'event CreditScoreUpdated(address indexed borrower, uint256 oldScore, uint256 newScore, uint8 tier, bytes32 indexed txHash)',
  'event DeFiEventProven(address indexed borrower, bytes32 indexed sourceTxHash, uint8 protocol, uint8 eventType, uint256 volumeUSD, uint64 blockHeight)'
];

export class AttestcoinOracleRelayerService {
  private cc3Provider: ethers.JsonRpcProvider;
  private signer: ethers.Wallet;
  private oracleContractAddress: string;
  private proofApiUrl: string;
  private sourceChainKey: number;

  constructor() {
    const rpcUrl = process.env.CREDITCOIN_RPC_URL || 'https://rpc.cc3-testnet.creditcoin.network';
    this.cc3Provider = new ethers.JsonRpcProvider(rpcUrl, 102031, {
      staticNetwork: ethers.Network.from(102031),
    });

    const privateKey = process.env.PRIVATE_KEY || process.env.CREDITCOIN_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('PRIVATE_KEY or CREDITCOIN_PRIVATE_KEY environment variable is required');
    }
    this.signer = new ethers.Wallet(privateKey, this.cc3Provider);

    // Deployed SanadCreditOracle address
    this.oracleContractAddress = process.env.SANAD_CREDIT_ORACLE_ADDRESS || '0x866d812a57ef13866b85D09a8633218678dAeff3';
    this.proofApiUrl = process.env.CREDITCOIN_PROOF_BUILDER_URL || 'https://proof-gen-api.cc3-testnet.creditcoin.network';
    this.sourceChainKey = 3; // Ethereum Mainnet
  }

  public getOracleAddress(): string {
    return this.oracleContractAddress;
  }

  private getContract(): ethers.Contract {
    return new ethers.Contract(this.oracleContractAddress, SANAD_CREDIT_ORACLE_ABI, this.signer);
  }

  /**
   * Prove a single Ethereum DeFi event on Creditcoin CC3 and record credit score
   */
  public async proveAndRecordEvent(
    borrowerAddress: string,
    event: DiscoveredDeFiEvent,
    borrowerSignature?: string
  ): Promise<OracleSubmissionResult> {
    try {
      console.log(`[AttestcoinRelayer] Generating proof for Ethereum Mainnet Tx: ${event.sourceTxHash}`);
      
      const proofBuilder = new proofProvider.service.ProofBuilder(this.sourceChainKey, this.proofApiUrl);
      const proofResult = await proofBuilder.getProof(event.sourceTxHash);

      if (!proofResult.success || !proofResult.data) {
        throw new Error(`Failed to generate Attestcoin proof: ${proofResult.error || 'Proof not available'}`);
      }

      const proofData = proofResult.data;
      const contract = this.getContract();

      const merkleProofTuple = {
        root: proofData.merkleProof.root,
        siblings: proofData.merkleProof.siblings.map((s: any) => ({
          hash: s.hash,
          isLeft: s.isLeft,
        })),
      };

      const continuityProofTuple = {
        lowerEndpointDigest: proofData.continuityProof.lowerEndpointDigest,
        roots: proofData.continuityProof.roots,
      };

      const eventPayload = {
        sourceTxHash: event.sourceTxHash,
        protocol: event.protocol,
        eventType: event.eventType,
        volumeUSD: ethers.parseUnits(event.volumeUSD.toString(), 6),
        timestamp: event.timestamp,
      };

      const sig = borrowerSignature && borrowerSignature.length === 132 ? borrowerSignature : '0x';

      console.log(`[AttestcoinRelayer] Submitting proof to SanadCreditOracle (${this.oracleContractAddress}) on CC3...`);
      const tx = await contract.submitSingleProof(
        proofData.chainKey,
        proofData.headerNumber,
        proofData.txBytes,
        merkleProofTuple,
        continuityProofTuple,
        borrowerAddress,
        eventPayload,
        sig
      );

      console.log(`[AttestcoinRelayer] Broadcast Tx: ${tx.hash}. Awaiting confirmation...`);
      const receipt = await tx.wait();

      const profile = await contract.getCreditProfile(borrowerAddress);
      const tiers = ['Unscored', 'HighRisk', 'Bronze', 'Silver', 'Gold'];

      return {
        success: true,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        explorerUrl: `https://creditcoin-testnet.blockscout.com/tx/${receipt.hash}`,
        score: Number(profile.score),
        tier: tiers[Number(profile.tier)] || 'Unscored',
        provenEventsCount: Number(profile.provenEventsCount),
        totalRepaidUSD: ethers.formatUnits(profile.totalRepaidUSD, 6),
      };
    } catch (err: any) {
      console.error('[AttestcoinRelayer] Error in proveAndRecordEvent:', err);
      return {
        success: false,
        error: err.message || 'Failed to submit Attestcoin proof to Creditcoin',
      };
    }
  }

  /**
   * Fetch on-chain credit profile directly from Creditcoin CC3
   */
  public async getOnChainCreditProfile(borrowerAddress: string): Promise<any> {
    try {
      const contract = this.getContract();
      const profile = await contract.getCreditProfile(borrowerAddress);
      const provenEvents = await contract.getProvenEvents(borrowerAddress);
      const tiers = ['Unscored', 'HighRisk', 'Bronze', 'Silver', 'Gold'];
      const protocols = [
        'Aave v3',
        'Compound v3',
        'Morpho Blue',
        'Spark Protocol (Sky)',
        'MakerDAO (Sky CDP)',
        'Euler v2',
        'Fluid (Instadapp)',
        'Maple Finance',
        'Goldfinch Protocol',
        'Fraxlend'
      ];
      const eventTypes = ['Clean Repayment', 'Overcollateralized Liquidation', 'Undercollateralized Default', 'Collateral Supply'];

      return {
        borrower: profile.borrower,
        score: Number(profile.score),
        tier: tiers[Number(profile.tier)] || 'Unscored',
        totalRepaidUSD: ethers.formatUnits(profile.totalRepaidUSD, 6),
        totalLiquidatedUSD: ethers.formatUnits(profile.totalLiquidatedUSD, 6),
        totalDefaultedUSD: ethers.formatUnits(profile.totalDefaultedUSD, 6),
        cleanRepaymentCount: Number(profile.cleanRepaymentCount),
        liquidationCount: Number(profile.liquidationCount),
        defaultCount: Number(profile.defaultCount),
        provenEventsCount: Number(profile.provenEventsCount),
        lastEvaluatedTimestamp: Number(profile.lastEvaluatedTimestamp),
        provenEvents: provenEvents.map((e: any) => ({
          sourceTxHash: e.sourceTxHash,
          blockHeight: Number(e.blockHeight),
          protocol: protocols[Number(e.protocol)] || 'DeFi',
          eventType: eventTypes[Number(e.eventType)] || 'Event',
          volumeUSD: ethers.formatUnits(e.volumeUSD, 6),
          timestamp: Number(e.timestamp),
          etherscanUrl: `https://etherscan.io/tx/${e.sourceTxHash}`,
        })),
        oracleAddress: this.oracleContractAddress,
      };
    } catch (err: any) {
      console.error(`[AttestcoinRelayer] Failed to fetch credit profile for ${borrowerAddress}:`, err);
      throw err;
    }
  }
}
