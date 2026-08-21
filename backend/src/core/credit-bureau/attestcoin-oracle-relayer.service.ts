import { ethers } from 'ethers';
import { chainInfo, proofProvider } from '@gluwa/usc-sdk';
import dotenv from 'dotenv';
import { CREDITCOIN_CONFIG } from '@/features/creditcoin/creditcoin.config.js';
import { SANAD_LIQUIDITY_POOL_ABI } from '@/features/creditcoin/contracts/SanadLiquidityPool.abi.js';
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
    this.oracleContractAddress = process.env.SANAD_CREDIT_ORACLE_ADDRESS || '0x69E427dA9D4Fe741a9341e65a5e3DB6C5ae18eb5';
    this.proofApiUrl = process.env.CREDITCOIN_PROOF_BUILDER_URL || 'https://prover.cc3-testnet.creditcoin.network';
    this.sourceChainKey = 3; // Ethereum Mainnet
  }

  public getOracleAddress(): string {
    return this.oracleContractAddress;
  }

  /**
   * Resolve a protocol value to its numeric uint8 for the on-chain contract.
   * Handles both numeric enums (Protocol.AaveV3 = 0) and string names ("AaveV3", "Aave v3").
   */
  private resolveProtocolNumber(protocol: any): number {
    if (typeof protocol === 'number') return protocol;
    const name = String(protocol).trim();
    const map: Record<string, number> = {
      'AaveV3': 0, 'Aave v3': 0, 'Aave V3': 0,
      'CompoundV3': 1, 'Compound v3': 1, 'Compound V3': 1,
      'MorphoBlue': 2, 'Morpho Blue': 2,
      'SparkProtocol': 3, 'Spark Protocol': 3, 'Spark Protocol (Sky)': 3,
      'MakerDAO': 4, 'MakerDAO (Sky CDP)': 4,
      'EulerV2': 5, 'Euler v2': 5, 'Euler V2': 5,
      'Fluid': 6, 'Fluid (Instadapp)': 6,
      'MapleFinance': 7, 'Maple Finance': 7,
      'Goldfinch': 8, 'Goldfinch Protocol': 8,
      'Fraxlend': 9, 'Frax Lend': 9,
    };
    const val = map[name] ?? map[name.toLowerCase()] ?? 0;
    console.log(`[AttestcoinRelayer] Protocol: "${name}" → ${val}`);
    return val;
  }

  /**
   * Resolve an event type value to its numeric uint8 for the on-chain contract.
   * Handles both numeric enums (EventType.CleanRepayment = 0) and string names.
   */
  private resolveEventTypeNumber(eventType: any): number {
    if (typeof eventType === 'number') return eventType;
    const name = String(eventType).trim();
    const map: Record<string, number> = {
      'CleanRepayment': 0, 'Clean Repayment': 0,
      'OvercollateralizedLiquidation': 1, 'Liquidation Call': 1, 'Liquidation': 1,
      'UndercollateralizedDefault': 2, 'Undercollateralized Default': 2, 'Default': 2,
      'CollateralSupply': 3, 'Collateral Supply': 3, 'Deposit': 3,
    };
    const val = map[name] ?? map[name.toLowerCase()] ?? 0;
    console.log(`[AttestcoinRelayer] EventType: "${name}" → ${val}`);
    return val;
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
        protocol: this.resolveProtocolNumber(event.protocol),
        eventType: this.resolveEventTypeNumber(event.eventType),
        volumeUSD: ethers.parseUnits(event.volumeUSD.toString(), 6),
        timestamp: event.timestamp,
      };

      // Signature must come from the borrower's wallet — contract verifies signer == borrower
      if (!borrowerSignature || borrowerSignature.length !== 132) {
        throw new Error('Borrower signature required (personal_sign from MetaMask). Proof submission skipped.');
      }

      console.log(`[AttestcoinRelayer] Submitting proof to SanadCreditOracle (${this.oracleContractAddress}) on CC3...`);
      const tx = await contract.submitSingleProof(
        proofData.chainKey,
        proofData.headerNumber,
        proofData.txBytes,
        merkleProofTuple,
        continuityProofTuple,
        borrowerAddress,
        eventPayload,
        borrowerSignature
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

  /**
   * Prove a cross-chain Ethereum Sepolia (chainKey: 1) repayment transaction on Creditcoin CC3.
   * Cryptographically verifies the transaction via Attestcoin BlockProver (0xFD2),
   * decodes chunks[0] to bind to RepaymentGateway, checks selector and amount,
   * verifies receiptStatus == 1, and marks the loan settled.
   */
  public async proveAndSettleSepoliaRepayment(
    tokenId: number,
    sourceTxHash: string,
    chainKey: number = 1
  ): Promise<{
    success: boolean;
    transactionHash?: string;
    blockNumber?: number;
    explorerUrl?: string;
    error?: string;
  }> {
    try {
      console.log(`[AttestcoinRelayer] Generating proof for Sepolia (chainKey ${chainKey}) Repay Tx: ${sourceTxHash}`);
      const proofBuilder = new proofProvider.service.ProofBuilder(chainKey, this.proofApiUrl);
      const proofResult = await proofBuilder.getProof(sourceTxHash);

      if (!proofResult.success || !proofResult.data) {
        throw new Error(`Failed to generate Attestcoin proof: ${proofResult.error || 'Proof not available'}`);
      }

      const proofData = proofResult.data;
      const poolContract = new ethers.Contract(
        CREDITCOIN_CONFIG.contracts.liquidityPoolAddress,
        SANAD_LIQUIDITY_POOL_ABI,
        this.signer
      );

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

      console.log(`[AttestcoinRelayer] Calling verifyAndSettleRepayment for Token #${tokenId} on CC3 pool (${CREDITCOIN_CONFIG.contracts.liquidityPoolAddress})...`);
      const tx = await poolContract.verifyAndSettleRepayment(
        tokenId,
        proofData.chainKey,
        proofData.headerNumber,
        proofData.txBytes,
        merkleProofTuple,
        continuityProofTuple,
        sourceTxHash,
        0 // 0 allows pool to derive exact amount from decoded calldata
      );

      console.log(`[AttestcoinRelayer] Repayment Settlement broadcast Tx: ${tx.hash}. Awaiting confirmation...`);
      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        explorerUrl: `https://creditcoin-testnet.blockscout.com/tx/${receipt.hash}`,
      };
    } catch (err: any) {
      console.error(`[AttestcoinRelayer] Error proving Sepolia repayment:`, err);
      return {
        success: false,
        error: err.message || 'Failed to submit repayment proof to Creditcoin',
      };
    }
  }

  /**
   * Prove a cross-chain Ethereum Sepolia (chainKey: 1) investor deposit transaction on Creditcoin CC3.
   * Cryptographically verifies the transaction via Attestcoin BlockProver (0xFD2),
   * decodes chunks[0] to bind to InvestorVault, checks selector (deposit(uint256)) and amount,
   * verifies receiptStatus == 1, and credits the investor's LP share balance on Creditcoin.
   */
  public async proveAndRecordSepoliaDeposit(
    sourceTxHash: string,
    chainKey: number = 1
  ): Promise<{
    success: boolean;
    transactionHash?: string;
    blockNumber?: number;
    explorerUrl?: string;
    error?: string;
  }> {
    try {
      console.log(`[AttestcoinRelayer] Generating proof for Sepolia (chainKey ${chainKey}) Deposit Tx: ${sourceTxHash}`);
      const proofBuilder = new proofProvider.service.ProofBuilder(chainKey, this.proofApiUrl);
      const proofResult = await proofBuilder.getProof(sourceTxHash);

      if (!proofResult.success || !proofResult.data) {
        throw new Error(`Failed to generate Attestcoin proof: ${proofResult.error || 'Proof not available'}`);
      }

      const proofData = proofResult.data;
      const poolContract = new ethers.Contract(
        CREDITCOIN_CONFIG.contracts.liquidityPoolAddress,
        SANAD_LIQUIDITY_POOL_ABI,
        this.signer
      );

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

      console.log(`[AttestcoinRelayer] Calling verifyAndRecordDeposit on CC3 pool (${CREDITCOIN_CONFIG.contracts.liquidityPoolAddress})...`);
      const tx = await poolContract.verifyAndRecordDeposit(
        proofData.chainKey,
        proofData.headerNumber,
        proofData.txBytes,
        merkleProofTuple,
        continuityProofTuple,
        sourceTxHash,
        0 // 0 allows pool to derive exact amount from decoded calldata
      );

      console.log(`[AttestcoinRelayer] Deposit Settlement broadcast Tx: ${tx.hash}. Awaiting confirmation...`);
      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        explorerUrl: `https://creditcoin-testnet.blockscout.com/tx/${receipt.hash}`,
      };
    } catch (err: any) {
      console.error(`[AttestcoinRelayer] Error proving Sepolia deposit:`, err);
      return {
        success: false,
        error: err.message || 'Failed to submit deposit proof to Creditcoin',
      };
    }
  }
}
