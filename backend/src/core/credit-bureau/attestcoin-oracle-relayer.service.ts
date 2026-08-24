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
  'function getCreditProfile(address borrower) external view returns (tuple(address borrower, uint256 score, uint8 tier, uint256 totalRepaidUSD, uint256 totalLiquidatedUSD, uint256 totalDefaultedUSD, uint256 totalBorrowedUSD, uint32 cleanRepaymentCount, uint32 liquidationCount, uint32 defaultCount, uint32 activeBorrowCount, uint32 collateralSupplyCount, uint64 lastEvaluatedTimestamp, uint32 provenEventsCount))',
  'function getProvenEvents(address borrower) external view returns (tuple(bytes32 sourceTxHash, uint64 blockHeight, uint8 protocol, uint8 eventType, uint256 volumeUSD, uint64 timestamp)[])',
  'function isTxProven(bytes32 txHash) external view returns (bool)',
  'function isSupportedChainKey(uint64) external view returns (bool)',
  'event CreditScoreUpdated(address indexed borrower, uint256 oldScore, uint256 newScore, uint8 tier, bytes32 triggerTxHash)',
  'event EventProven(address indexed borrower, bytes32 indexed sourceTxHash, uint8 protocol, uint8 eventType, uint256 volumeUSD, uint64 blockHeight)'
];

export interface FetchProofResult {
  success: boolean;
  chainKey?: number;
  headerNumber?: number;
  txBytes?: string;
  merkleProof?: { root: string; siblings: { hash: string; isLeft: boolean }[] };
  continuityProof?: { lowerEndpointDigest: string; roots: string[] };
  sourceTxHash?: string;
  blockHeight?: number;
  error?: string;
}

export class AttestcoinOracleRelayerService {
  private cc3Provider: ethers.JsonRpcProvider;
  private signer: ethers.Wallet;
  private oracleContractAddress: string;
  private proofApiUrl: string;
  sourceChainKey: number;

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
    this.oracleContractAddress = process.env.SANAD_CREDIT_ORACLE_ADDRESS || CREDITCOIN_CONFIG.contracts.creditOracleAddress || '0xB7AfB0419AdA5820872701325e00015BFAD10023';
    this.proofApiUrl = process.env.CREDITCOIN_PROOF_BUILDER_URL || CREDITCOIN_CONFIG.proofBuilderUrl || 'https://prover.cc3-testnet.creditcoin.network';
    this.sourceChainKey = Number(process.env.SOURCE_CHAIN_KEY) || 1; // 1 = Sepolia, 3 = Mainnet (default Sepolia for testnet demo)
  }

  public getOracleAddress(): string {
    return this.oracleContractAddress;
  }

  /**
   * Fetch an Attestcoin proof for an Ethereum Mainnet transaction WITHOUT submitting to CC3.
   * This is steps 2+3 only: wait for attestation + fetch cryptographic proof.
   */
  public async fetchProof(
    sourceTxHash: string,
    blockHeight?: number,
  ): Promise<FetchProofResult> {
    try {
      console.log(`[AttestcoinRelayer] Fetching proof for tx: ${sourceTxHash}`);

      const proofBuilder = new proofProvider.service.ProofBuilder(this.sourceChainKey, this.proofApiUrl);

      const targetHeight = blockHeight || await this.resolveSourceBlockHeight(sourceTxHash, this.sourceChainKey);
      if (targetHeight) {
        console.log(`[AttestcoinRelayer] Waiting for block #${targetHeight} to be attested...`);
        try {
          await proofBuilder.waitUntilHeightAttested(this.sourceChainKey, targetHeight, 10000, 600000, 3000);
          console.log(`[AttestcoinRelayer] Block #${targetHeight} attested!`);
        } catch (waitErr: any) {
          throw new Error(`Block #${targetHeight} not yet attested. Please try again shortly.`);
        }
      }

      const proofResult = await proofBuilder.getProof(sourceTxHash);

      if (!proofResult.success || !proofResult.data) {
        throw new Error(proofResult.error || 'Proof not available');
      }

      const p = proofResult.data;
      return {
        success: true,
        chainKey: p.chainKey,
        headerNumber: p.headerNumber,
        txBytes: p.txBytes,
        merkleProof: p.merkleProof,
        continuityProof: p.continuityProof,
        sourceTxHash,
        blockHeight: targetHeight,
      };
    } catch (err: any) {
      console.error(`[AttestcoinRelayer] fetchProof error:`, err.message);
      return { success: false, error: err.message || 'Failed to fetch proof' };
    }
  }

  private getContract(): ethers.Contract {
    return new ethers.Contract(this.oracleContractAddress, SANAD_CREDIT_ORACLE_ABI, this.signer);
  }

  private async resolveSourceBlockHeight(sourceTxHash: string, chainKey: number): Promise<number | undefined> {
    try {
      const rpcUrl = chainKey === 1 
        ? (process.env.ETHEREUM_SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com')
        : (process.env.ETHEREUM_MAINNET_RPC_URL || 'https://eth.llamarpc.com');
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const receipt = await provider.getTransactionReceipt(sourceTxHash);
      return receipt?.blockNumber;
    } catch (err: any) {
      console.warn(`[AttestcoinRelayer] Failed to fetch source tx receipt for ${sourceTxHash} on chain ${chainKey}:`, err.message);
      return undefined;
    }
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
      
      const targetHeight = event.blockHeight || await this.resolveSourceBlockHeight(event.sourceTxHash, this.sourceChainKey);
      if (targetHeight) {
        try {
          console.log(`[AttestcoinRelayer] Waiting for block #${targetHeight} on chain ${this.sourceChainKey} to be attested by Attestcoin Prover...`);
          await proofBuilder.waitUntilHeightAttested(this.sourceChainKey, targetHeight, 10000, 600000, 3000);
          console.log(`[AttestcoinRelayer] Block #${targetHeight} confirmed attested in Prover cache!`);
        } catch (waitErr: any) {
          console.warn(`[AttestcoinRelayer] waitUntilHeightAttested notice for block #${targetHeight}:`, waitErr.message);
          throw new Error(`Attestation still pending for block #${targetHeight} after 10 minutes — please try again shortly.`);
        }
      }

      const proofResult = await proofBuilder.getProof(event.sourceTxHash);

      if (!proofResult.success || !proofResult.data) {
        throw new Error(`Failed to generate Attestcoin proof: ${proofResult.error || 'Proof not available'}`);
      }

      const proofData = proofResult.data;
      const contract = this.getContract();

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
        proofData.merkleProof,
        proofData.continuityProof,
        borrowerAddress,
        eventPayload,
        sig
      );

      console.log(`[AttestcoinRelayer] Broadcast Tx: ${tx.hash}. Awaiting confirmation...`);
      const receipt = await tx.wait();

      const profile = await contract.getCreditProfile(borrowerAddress);
      const tiers = ['Unscored', 'Bronze', 'Silver', 'Gold', 'HighRisk'];

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
      const tiers = ['Unscored', 'Bronze', 'Silver', 'Gold', 'HighRisk'];
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
      const eventTypes = ['Clean Repayment', 'Overcollateralized Liquidation', 'Undercollateralized Default', 'Collateral Supply', 'Active Borrow Position'];

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
        activeBorrowCount: Number(profile.activeBorrowCount),
        collateralSupplyCount: Number(profile.collateralSupplyCount),
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
      
      const targetHeight = await this.resolveSourceBlockHeight(sourceTxHash, chainKey);
      if (targetHeight) {
        try {
          console.log(`[AttestcoinRelayer] Waiting for block #${targetHeight} on chain ${chainKey} to be attested by Attestcoin Prover...`);
          await proofBuilder.waitUntilHeightAttested(chainKey, targetHeight, 10000, 600000, 3000);
          console.log(`[AttestcoinRelayer] Block #${targetHeight} confirmed attested in Prover cache!`);
        } catch (waitErr: any) {
          console.warn(`[AttestcoinRelayer] waitUntilHeightAttested notice for block #${targetHeight}:`, waitErr.message);
          throw new Error(`Attestation still pending for block #${targetHeight} after 10 minutes — please try again shortly.`);
        }
      }

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

      console.log(`[AttestcoinRelayer] Calling verifyAndSettleRepayment for Token #${tokenId} on CC3 pool (${CREDITCOIN_CONFIG.contracts.liquidityPoolAddress})...`);
      const tx = await poolContract.verifyAndSettleRepayment(
        tokenId,
        proofData.chainKey,
        proofData.headerNumber,
        proofData.txBytes,
        proofData.merkleProof,
        proofData.continuityProof,
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
      
      const targetHeight = await this.resolveSourceBlockHeight(sourceTxHash, chainKey);
      if (targetHeight) {
        try {
          console.log(`[AttestcoinRelayer] Waiting for block #${targetHeight} on chain ${chainKey} to be attested by Attestcoin Prover...`);
          await proofBuilder.waitUntilHeightAttested(chainKey, targetHeight, 10000, 600000, 3000);
          console.log(`[AttestcoinRelayer] Block #${targetHeight} confirmed attested in Prover cache!`);
        } catch (waitErr: any) {
          console.warn(`[AttestcoinRelayer] waitUntilHeightAttested notice for block #${targetHeight}:`, waitErr.message);
          throw new Error(`Attestation still pending for block #${targetHeight} after 10 minutes — please try again shortly.`);
        }
      }

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

      console.log(`[AttestcoinRelayer] Calling verifyAndRecordDeposit on CC3 pool (${CREDITCOIN_CONFIG.contracts.liquidityPoolAddress})...`);
      const tx = await poolContract.verifyAndRecordDeposit(
        proofData.chainKey,
        proofData.headerNumber,
        proofData.txBytes,
        proofData.merkleProof,
        proofData.continuityProof,
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
