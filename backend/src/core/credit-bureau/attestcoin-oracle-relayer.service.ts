import { ethers } from 'ethers';
import { chainInfo, proofProvider } from '@gluwa/usc-sdk';
import dotenv from 'dotenv';
import { CREDITCOIN_CONFIG, DEMO_ETH_TO_CTC_RATE } from '@/features/creditcoin/creditcoin.config.js';
import { SANAD_LIQUIDITY_POOL_ABI } from '@/features/creditcoin/contracts/SanadLiquidityPool.abi.js';
import { DiscoveredDeFiEvent, Protocol, EventType } from './defi-discovery.service.js';
import { db } from '@/db/index.js';
import { ProvenEvents } from '@/features/credit-bureau/proven-events.model.js';
import { eq } from 'drizzle-orm';

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
    this.oracleContractAddress = process.env.SANAD_CREDIT_ORACLE_ADDRESS || CREDITCOIN_CONFIG.contracts.creditOracleAddress || '0xE45e8F367C02B9d5f5A165827824351457Dd8353';
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
   * Fetch the actual ETH msg.value from a Sepolia source transaction.
   * This is the real amount of ETH the user sent, used to compute the CTC backing.
   */
  private async resolveSourceTxValue(sourceTxHash: string, chainKey: number): Promise<bigint> {
    const rpcUrl = chainKey === 1
      ? (process.env.ETHEREUM_SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com')
      : (process.env.ETHEREUM_MAINNET_RPC_URL || 'https://eth.llamarpc.com');
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const tx = await provider.getTransaction(sourceTxHash);
    if (!tx) {
      throw new Error(`Source transaction ${sourceTxHash} not found on chain ${chainKey}`);
    }
    if (tx.value === 0n) {
      throw new Error(`Source transaction ${sourceTxHash} has zero msg.value — nothing to back`);
    }
    return tx.value;
  }

  /**
   * Convert ETH (wei) to CTC (wei) using the fixed demo rate.
   * ethWei * DEMO_ETH_TO_CTC_RATE = ctcWei (both chains use 18-decimal native tokens).
   */
  private ethToCTC(ethWei: bigint): bigint {
    return ethWei * DEMO_ETH_TO_CTC_RATE;
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

      // Store CC3 tx hash in database
      try {
        const sourceTxHash = ethers.hexlify(event.sourceTxHash);
        await db.insert(ProvenEvents).values({
          id: sourceTxHash,
          borrowerAddress,
          sourceTxHash,
          cc3TxHash: receipt.hash,
          blockHeight: event.blockHeight || 0,
          protocol: event.protocol,
          eventType: event.eventType,
          volumeUsd: event.volumeUSD.toString(),
          timestamp: event.timestamp || 0,
          chainKey: this.sourceChainKey,
        }).onConflictDoNothing();
        console.log(`[AttestcoinRelayer] Stored CC3 proof tx ${receipt.hash.slice(0, 18)}... for source ${sourceTxHash.slice(0, 18)}...`);
      } catch (dbErr: any) {
        console.warn('[AttestcoinRelayer] Failed to store CC3 tx hash in DB:', dbErr.message);
      }

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

      // Get CC3 tx hashes — first from database, then fallback to Blockscout
      let cc3TxHashes: Record<string, string> = {};
      
      // 1. Try database first
      try {
        const dbEvents = await db.select().from(ProvenEvents)
          .where(eq(ProvenEvents.borrowerAddress, borrowerAddress));
        for (const row of dbEvents) {
          if (row.sourceTxHash && row.cc3TxHash) {
            cc3TxHashes[row.sourceTxHash.toLowerCase()] = row.cc3TxHash;
          }
        }
        console.log(`[AttestcoinRelayer] Found ${dbEvents.length} CC3 tx hashes in database for ${borrowerAddress}`);
      } catch (dbErr: any) {
        console.warn('[AttestcoinRelayer] Failed to read CC3 tx hashes from DB:', dbErr.message);
      }
      
      // 2. Fallback to Blockscout if database has no results
      if (Object.keys(cc3TxHashes).length === 0) {
        try {
          const blockscoutUrl = 'https://creditcoin-testnet.blockscout.com';
          const res = await fetch(`${blockscoutUrl}/api/v2/addresses/${this.oracleContractAddress}/logs`);
          if (res.ok) {
            const data = await res.json();
            const items = data?.items || [];
            const eventProvenTopic = ethers.id('EventProven(address,bytes32,uint8,uint8,uint256,uint64)');
            console.log(`[AttestcoinRelayer] Querying Blockscout logs for ${borrowerAddress}... Found ${items.length} total logs`);
            
            for (const log of items) {
              const topics = log.topics || [];
              if (topics[0]?.toLowerCase() === eventProvenTopic.toLowerCase() &&
                  topics[1]?.toLowerCase() === ethers.zeroPadValue(borrowerAddress, 32).toLowerCase()) {
                const sourceTxHash = topics[2];
                if (sourceTxHash) {
                  cc3TxHashes[sourceTxHash.toLowerCase()] = log.transaction_hash;
                  // Also store in database for future lookups
                  try {
                    await db.insert(ProvenEvents).values({
                      id: sourceTxHash,
                      borrowerAddress,
                      sourceTxHash,
                      cc3TxHash: log.transaction_hash,
                    }).onConflictDoNothing();
                  } catch {}
                }
              }
            }
          }
        } catch (logErr: any) {
          console.warn('[AttestcoinRelayer] Failed to fetch EventProven logs from Blockscout:', logErr.message);
        }
      }

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
        provenEvents: provenEvents.map((e: any) => {
          const srcHash = ethers.hexlify(e.sourceTxHash);
          const cc3TxHash = cc3TxHashes[srcHash.toLowerCase()] || '';
          return {
            sourceTxHash: srcHash,
            blockHeight: Number(e.blockHeight),
            protocol: protocols[Number(e.protocol)] || 'DeFi',
            eventType: eventTypes[Number(e.eventType)] || 'Event',
            volumeUSD: ethers.formatUnits(e.volumeUSD, 6),
            timestamp: Number(e.timestamp),
            etherscanUrl: `https://eth-sepolia.blockscout.com/tx/${srcHash}`,
            cc3TxHash,
            cc3ExplorerUrl: cc3TxHash ? `https://creditcoin-testnet.blockscout.com/tx/${cc3TxHash}` : '',
          };
        }),
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

      // Resolve the actual ETH sent in the Sepolia repayment tx and convert to CTC
      const sourceEthWei = await this.resolveSourceTxValue(sourceTxHash, chainKey);
      const ctcBackingWei = this.ethToCTC(sourceEthWei);
      console.log(`[AttestcoinRelayer] Sepolia repayment value: ${ethers.formatEther(sourceEthWei)} ETH → ${ethers.formatEther(ctcBackingWei)} CTC (rate: ${DEMO_ETH_TO_CTC_RATE})`);

      // Pre-flight: check relayer wallet has enough CTC to back this settlement
      const relayerBalance = await this.cc3Provider.getBalance(this.signer.address);
      if (relayerBalance < ctcBackingWei) {
        throw new Error(
          `Relayer wallet ${this.signer.address} has insufficient CTC to back repayment settlement. ` +
          `Required: ${ethers.formatEther(ctcBackingWei)} CTC, Available: ${ethers.formatEther(relayerBalance)} CTC. ` +
          `Fund the relayer wallet with testnet CTC from the faucet before retrying.`
        );
      }

      console.log(`[AttestcoinRelayer] Calling verifyAndSettleRepayment for Token #${tokenId} on CC3 pool (${CREDITCOIN_CONFIG.contracts.liquidityPoolAddress}), attaching ${ethers.formatEther(ctcBackingWei)} CTC...`);
      const tx = await poolContract.verifyAndSettleRepayment(
        tokenId,
        proofData.chainKey,
        proofData.headerNumber,
        proofData.txBytes,
        proofData.merkleProof,
        proofData.continuityProof,
        sourceTxHash,
        0, // 0 allows pool to derive exact amount from decoded calldata
        { value: ctcBackingWei }
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

      // Resolve the actual ETH sent in the Sepolia deposit tx
      const sourceEthWei = await this.resolveSourceTxValue(sourceTxHash, chainKey);
      console.log(`[AttestcoinRelayer] Sepolia deposit value: ${ethers.formatEther(sourceEthWei)} ETH (Cr3dX Separation: recorded on CC3 as proven reputation capital without unbacked native LP dilution)`);

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

  /**
   * Prove a pawnshop-to-borrower ETH payment on Sepolia via Attestcoin BlockProver.
   * Returns the CC3 proof transaction hash (the proof is recorded on-chain via the
   * SanadCreditOracle submitSingleProof, same as DeFi credit events).
   */
  public async provePawnshopPayment(
    sourceTxHash: string,
    chainKey: number = 1,
    borrowerAddress?: string,
  ): Promise<{
    success: boolean;
    cc3TxHash?: string;
    explorerUrl?: string;
    error?: string;
  }> {
    try {
      console.log(`[AttestcoinRelayer] Proving pawnshop payment on Sepolia: ${sourceTxHash}`);

      const proofBuilder = new proofProvider.service.ProofBuilder(chainKey, this.proofApiUrl);

      const targetHeight = await this.resolveSourceBlockHeight(sourceTxHash, chainKey);
      if (targetHeight) {
        try {
          console.log(`[AttestcoinRelayer] Waiting for block #${targetHeight} on chain ${chainKey} to be attested...`);
          await proofBuilder.waitUntilHeightAttested(chainKey, targetHeight, 10000, 600000, 3000);
          console.log(`[AttestcoinRelayer] Block #${targetHeight} attested!`);
        } catch (waitErr: any) {
          throw new Error(`Block #${targetHeight} not yet attested. Please try again shortly.`);
        }
      }

      const proofResult = await proofBuilder.getProof(sourceTxHash);
      if (!proofResult.success || !proofResult.data) {
        throw new Error(proofResult.error || 'Proof not available');
      }

      const proofData = proofResult.data;
      const contract = this.getContract();

      // Record the pawnshop payment as a verified event on CC3
      const sourceEthWei = await this.resolveSourceTxValue(sourceTxHash, chainKey);
      const volumeUSD = Number(ethers.formatEther(sourceEthWei)) * 2700; // approximate ETH→USD

      const eventPayload = {
        sourceTxHash: sourceTxHash,
        protocol: 0, // Aave v3 placeholder
        eventType: 0, // CleanRepayment (pawnshop payment is a positive event)
        volumeUSD: ethers.parseUnits(Math.round(volumeUSD).toString(), 6),
        timestamp: Math.floor(Date.now() / 1000),
      };

      const borrower = borrowerAddress || ethers.ZeroAddress;

      console.log(`[AttestcoinRelayer] Submitting pawnshop payment proof to SanadCreditOracle on CC3...`);
      const tx = await contract.submitSingleProof(
        proofData.chainKey,
        proofData.headerNumber,
        proofData.txBytes,
        proofData.merkleProof,
        proofData.continuityProof,
        borrower,
        eventPayload,
        '0x' // no borrower signature needed for pawnshop payment
      );

      const receipt = await tx.wait();
      console.log(`[AttestcoinRelayer] Pawnshop payment proof recorded on CC3: ${receipt.hash}`);

      // Store in proven_events table
      try {
        await db.insert(ProvenEvents).values({
          id: sourceTxHash,
          borrowerAddress: borrower.toLowerCase(),
          sourceTxHash,
          cc3TxHash: receipt.hash,
          blockHeight: targetHeight || 0,
          protocol: 0,
          eventType: 0,
          volumeUsd: Math.round(volumeUSD).toString(),
          timestamp: Math.floor(Date.now() / 1000),
          chainKey,
        }).onConflictDoNothing();
      } catch (dbErr: any) {
        console.warn('[AttestcoinRelayer] Failed to store pawnshop payment proof in DB:', dbErr.message);
      }

      return {
        success: true,
        cc3TxHash: receipt.hash,
        explorerUrl: `https://creditcoin-testnet.blockscout.com/tx/${receipt.hash}`,
      };
    } catch (err: any) {
      console.error('[AttestcoinRelayer] Error proving pawnshop payment:', err);
      return { success: false, error: err.message || 'Failed to prove pawnshop payment on CC3' };
    }
  }
}
