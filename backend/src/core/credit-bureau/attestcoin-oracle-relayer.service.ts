import { ethers } from 'ethers';
import { chainInfo, proofProvider } from '@gluwa/usc-sdk';
import dotenv from 'dotenv';
import { CREDITCOIN_CONFIG, DEMO_ETH_TO_CTC_RATE } from '@/features/creditcoin/creditcoin.config.js';
import { DEPLOYED_ADDRESSES } from '@/config/deployed-addresses.js';
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
  'function owner() external view returns (address)',
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

    const privateKey =
      process.env.PRIVATE_KEY ||
      process.env.CREDITCOIN_PRIVATE_KEY ||
      process.env.CREDITCOIN_ORACLE_OWNER_PRIVATE_KEY ||
      process.env.SANAD_CREDIT_ORACLE_OWNER_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('A Creditcoin relayer or oracle-owner private key environment variable is required');
    }
    this.signer = new ethers.Wallet(privateKey, this.cc3Provider);

    // Deployed SanadCreditOracle address
    this.oracleContractAddress = process.env.SANAD_CREDIT_ORACLE_ADDRESS || CREDITCOIN_CONFIG.contracts.creditOracleAddress || DEPLOYED_ADDRESSES.cc3.creditOracle;
    this.proofApiUrl = process.env.CREDITCOIN_PROOF_BUILDER_URL || CREDITCOIN_CONFIG.proofBuilderUrl || 'https://prover.cc3-testnet.creditcoin.network';
    // The credit-history discovery service indexes Ethereum Mainnet DeFi activity.
    // Keep SOURCE_CHAIN_KEY configurable for isolated testnet demos, but default to
    // the configured mainnet key instead of silently using the Sepolia key.
    this.sourceChainKey = Number(process.env.SOURCE_CHAIN_KEY) || CREDITCOIN_CONFIG.sourceChainKey;
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

  /**
   * Resolves the signing wallet reserved for owner-authorized credit-history batches.
   *
   * This is deliberately separate from the generic relayer signer: the deployed
   * oracle accepts an empty borrower signature only when msg.sender is owner().
   * The on-chain owner check below prevents a misconfigured relayer key from
   * turning an authorization problem into an opaque contract revert.
   */
  private getOracleOwnerSigner(): ethers.Wallet {
    const ownerPrivateKey =
      process.env.CREDITCOIN_ORACLE_OWNER_PRIVATE_KEY ||
      process.env.SANAD_CREDIT_ORACLE_OWNER_PRIVATE_KEY ||
      process.env.CREDITCOIN_DEPLOYER_PRIVATE_KEY ||
      process.env.CREDITCOIN_ADMIN_PRIVATE_KEY ||
      process.env.CREDITCOIN_PRIVATE_KEY ||
      process.env.PRIVATE_KEY;

    if (!ownerPrivateKey) {
      throw new Error(
        'CREDITCOIN_ORACLE_OWNER_PRIVATE_KEY is required to auto-prove DeFi history. ' +
        'Configure the private key for the SanadCreditOracle owner, not the relayer wallet.'
      );
    }

    return new ethers.Wallet(ownerPrivateKey, this.cc3Provider);
  }

  private async getOwnerAuthorizedOracleContract(): Promise<ethers.Contract> {
    const ownerSigner = this.getOracleOwnerSigner();
    const contract = new ethers.Contract(this.oracleContractAddress, SANAD_CREDIT_ORACLE_ABI, ownerSigner);
    const [configuredOwner, signerAddress] = await Promise.all([
      contract.owner(),
      ownerSigner.getAddress(),
    ]);

    if (configuredOwner.toLowerCase() !== signerAddress.toLowerCase()) {
      throw new Error(
        `Configured credit-oracle batch signer ${signerAddress} is not SanadCreditOracle owner ${configuredOwner}. ` +
        'Set CREDITCOIN_ORACLE_OWNER_PRIVATE_KEY to the deployed oracle owner key.'
      );
    }

    return contract;
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
    // Direct value transfer
    if (tx.value > 0n) {
      return tx.value;
    }
    // Delegation pattern: tx.value is 0, ETH forwarded via internal transactions
    // Look for the InvestorVault DepositMade event to extract the actual amount
    const vaultAddress = (process.env.NEXT_PUBLIC_SEPOLIA_INVESTOR_VAULT_ADDRESS || DEPLOYED_ADDRESSES.sepolia.investorVault).toLowerCase();
    const receipt = await provider.getTransactionReceipt(sourceTxHash);
    if (receipt) {
      // DepositMade(address indexed investor, uint256 amount, uint256 timestamp)
      const depositMadeTopic = '0x0b05f0d1cd0819f155b8a61f60baf7767c1ee49d04aeaab701df236140eb93f9';
      for (const log of receipt.logs) {
        if (log.address.toLowerCase() === vaultAddress && log.topics[0] === depositMadeTopic) {
          const amountHex = log.data.slice(2, 66);
          const value = BigInt('0x' + amountHex);
          if (value > 0n) {
            console.log(`[AttestcoinRelayer] Found delegated ETH value: ${ethers.formatEther(value)} ETH via DepositMade event`);
            return value;
          }
        }
      }
      // Fallback: standard Transfer event to vault
      const transferTopic = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
      for (const log of receipt.logs) {
        if (log.topics[0] === transferTopic && log.topics[2]) {
          const toAddr = '0x' + log.topics[2].slice(26);
          if (toAddr.toLowerCase() === vaultAddress) {
            const value = BigInt(log.data);
            if (value > 0n) {
              console.log(`[AttestcoinRelayer] Found delegated ETH value: ${ethers.formatEther(value)} ETH via Transfer event`);
              return value;
            }
          }
        }
      }
    }
    const code = await provider.getCode(tx.from);
    if (code && code.toLowerCase().startsWith('0xef0100')) {
      const delegationAddress = '0x' + code.slice(8, 48);
      throw new Error(
        `EIP-7702 Delegation Error: Sender wallet ${tx.from} has active delegation (${delegationAddress}). ` +
        `The transaction was routed through an intermediary DelegationManager with 0 outer msg.value and selector ${tx.data?.slice(0, 10)}, ` +
        `which cannot be verified by Attestcoin on Creditcoin CC3. Please revoke EIP-7702 delegation or use a standard EOA wallet.`
      );
    }
    throw new Error(`Source transaction ${sourceTxHash} has zero msg.value and no delegated ETH transfer found — nothing to back`);
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
   * Prove up to ten discovered DeFi events in one owner-authorized CC3 transaction.
   *
   * The ProofBuilder batch endpoint produces the one shared continuity proof that
   * SanadCreditOracle.submitBatchProof expects. The contract owner bypasses the
   * borrower-signature requirement, so the KYC flow never needs to request a
   * MetaMask signature for historical, already-indexed activity.
   */
  public async proveAndRecordEventsBatch(
    borrowerAddress: string,
    events: DiscoveredDeFiEvent[],
    sourceChainKey: number = this.sourceChainKey,
  ): Promise<OracleSubmissionResult> {
    try {
      if (!ethers.isAddress(borrowerAddress)) {
        throw new Error('A valid borrower address is required for batch proof submission');
      }
      if (events.length === 0) {
        throw new Error('At least one DeFi event is required for batch proof submission');
      }
      if (events.length > 10) {
        throw new Error('SanadCreditOracle supports at most 10 DeFi events per batch');
      }
      if (events.some((event) => event.sourceChainKey !== undefined && event.sourceChainKey !== sourceChainKey)) {
        throw new Error('A batch proof can only contain events from one Attestcoin source chain');
      }

      const requestedHashes = events.map((event) => ethers.hexlify(event.sourceTxHash));
      if (new Set(requestedHashes.map((hash) => hash.toLowerCase())).size !== requestedHashes.length) {
        throw new Error('Batch proof events must have unique source transaction hashes');
      }

      // Fail fast on a key/configuration mistake before spending time asking the
      // proof service to construct a batch that cannot be submitted.
      const ownerContract = await this.getOwnerAuthorizedOracleContract();
      const proofBuilder = new proofProvider.service.ProofBuilder(sourceChainKey, this.proofApiUrl);
      console.log(`[AttestcoinRelayer] Requesting one shared Attestcoin proof for ${events.length} DeFi events on chain ${sourceChainKey}...`);

      // Historical events are normally already indexed, so avoid an unnecessary
      // wait. If the first request is not ready, wait only once for the highest
      // required block and retry the batch as a whole.
      let proofResult = await proofBuilder.getBatchProof(requestedHashes);
      if (!proofResult.success || !proofResult.data) {
        const resolvedHeights = await Promise.all(events.map(async (event) => {
          if (Number.isSafeInteger(event.blockHeight) && event.blockHeight > 0) {
            return event.blockHeight;
          }
          return this.resolveSourceBlockHeight(event.sourceTxHash, sourceChainKey);
        }));
        const highestHeight = Math.max(...resolvedHeights.filter((height): height is number => typeof height === 'number' && height > 0));

        if (!Number.isFinite(highestHeight)) {
          throw new Error(`Batch proof is not indexed yet: ${proofResult.error || 'source block heights are unavailable'}`);
        }

        console.log(`[AttestcoinRelayer] Batch proof not ready; waiting up to 60 seconds for block #${highestHeight}...`);
        await proofBuilder.waitUntilHeightAttested(sourceChainKey, highestHeight, 5000, 60000, 2000);
        proofResult = await proofBuilder.getBatchProof(requestedHashes);
      }

      if (!proofResult.success || !proofResult.data) {
        throw new Error(`Failed to generate Attestcoin batch proof: ${proofResult.error || 'Proof not available'}`);
      }

      const proofData = proofResult.data;
      if (Number(proofData.chainKey) !== sourceChainKey) {
        throw new Error(`Proof builder returned chain key ${proofData.chainKey}, expected ${sourceChainKey}`);
      }

      // The SDK returns a height -> tx-index -> proof map. Flatten it in that
      // order (as required by its batch verifier), then attach each matching
      // event payload by hash so all calldata arrays remain perfectly aligned.
      const eventsByHash = new Map(events.map((event) => [ethers.hexlify(event.sourceTxHash).toLowerCase(), event]));
      const orderedProofs: Array<{
        event: DiscoveredDeFiEvent;
        sourceTxHash: string;
        proof: {
          height: number;
          txBytes: string;
          merkleProof: { root: string; siblings: { hash: string; isLeft: boolean }[] };
        };
      }> = [];
      for (const [height, proofsAtHeight] of proofData.merkleProofs.entries()) {
        for (const proofEntry of proofsAtHeight.values()) {
          const sourceTxHash = ethers.hexlify(proofEntry.txHash);
          const event = eventsByHash.get(sourceTxHash.toLowerCase());
          if (!event) {
            throw new Error(`Batch proof response contains an unexpected source transaction ${sourceTxHash}`);
          }
          orderedProofs.push({
            event,
            sourceTxHash,
            proof: {
              height,
              txBytes: proofEntry.txBytes,
              merkleProof: proofEntry.merkleProof,
            },
          });
        }
      }

      const returnedHashes = new Set(orderedProofs.map(({ sourceTxHash }) => sourceTxHash.toLowerCase()));
      if (orderedProofs.length !== events.length || returnedHashes.size !== events.length) {
        const missingHash = requestedHashes.find((hash) => !returnedHashes.has(hash.toLowerCase()));
        throw new Error(`Batch proof response is missing source transaction ${missingHash || 'data'}`);
      }

      const eventsData = orderedProofs.map(({ event, sourceTxHash }) => ({
        sourceTxHash,
        protocol: event.protocol,
        eventType: event.eventType,
        volumeUSD: ethers.parseUnits(event.volumeUSD.toString(), 6),
        timestamp: event.timestamp,
      }));

      console.log(`[AttestcoinRelayer] Submitting ${events.length}-event owner-authorized batch to SanadCreditOracle (${this.oracleContractAddress})...`);
      const tx = await ownerContract.submitBatchProof(
        proofData.chainKey,
        orderedProofs.map(({ proof }) => proof.height),
        orderedProofs.map(({ proof }) => proof.txBytes),
        orderedProofs.map(({ proof }) => proof.merkleProof),
        proofData.continuityProof,
        borrowerAddress,
        eventsData,
        '0x', // owner() caller bypasses borrower signature validation on the deployed oracle
      );

      console.log(`[AttestcoinRelayer] Broadcast batch proof ${tx.hash}. Awaiting confirmation...`);
      const receipt = await tx.wait();
      if (!receipt) {
        throw new Error(`Batch proof transaction ${tx.hash} was not confirmed`);
      }

      // Keep the local source-tx -> CC3-tx index in sync. All events in a batch
      // intentionally point to the same CC3 transaction hash.
      try {
        await Promise.all(orderedProofs.map(async ({ event, sourceTxHash, proof }) => {
          await db.insert(ProvenEvents).values({
            id: sourceTxHash,
            borrowerAddress,
            sourceTxHash,
            cc3TxHash: receipt.hash,
            blockHeight: proof.height,
            protocol: event.protocol,
            eventType: event.eventType,
            volumeUsd: event.volumeUSD.toString(),
            timestamp: event.timestamp || 0,
            chainKey: sourceChainKey,
          }).onConflictDoNothing();
        }));
      } catch (dbErr: any) {
        // The chain proof remains authoritative even when the optional index is
        // temporarily unavailable; on-chain queries can rebuild it later.
        console.warn('[AttestcoinRelayer] Failed to store one or more batch proof records in DB:', dbErr.message);
      }

      const profile = await ownerContract.getCreditProfile(borrowerAddress);
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
      console.error('[AttestcoinRelayer] Error in proveAndRecordEventsBatch:', err);
      return {
        success: false,
        error: err.message || 'Failed to submit Attestcoin batch proof to Creditcoin',
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
      
      // Short wait for block attestation — don't block for 10 minutes
      const targetHeight = await this.resolveSourceBlockHeight(sourceTxHash, chainKey);
      if (targetHeight) {
        try {
          await proofBuilder.waitUntilHeightAttested(chainKey, targetHeight, 5000, 60000, 3000);
          console.log(`[AttestcoinRelayer] Block #${targetHeight} confirmed attested in Prover cache!`);
        } catch {
          console.warn(`[AttestcoinRelayer] Block attestation wait timed out for #${targetHeight}, attempting proof with retries...`);
        }
      }

      // Retry proof generation (prover may still be indexing the block)
      let proofResult: any = null;
      for (let attempt = 1; attempt <= 10; attempt++) {
        proofResult = await proofBuilder.getProof(sourceTxHash);
        if (proofResult.success && proofResult.data) {
          console.log(`[AttestcoinRelayer] Repay proof generated on attempt ${attempt}`);
          break;
        }
        if (attempt < 10) {
          const delay = Math.min(attempt * 5000, 30000);
          console.log(`[AttestcoinRelayer] Repay proof not ready yet, retrying in ${delay/1000}s (attempt ${attempt}/10)...`);
          await new Promise(r => setTimeout(r, delay));
        }
      }

      if (!proofResult?.success || !proofResult?.data) {
        throw new Error(`Repay proof not available after 10 attempts. The Attestcoin Prover may not have indexed this block yet. Please try again in a few minutes.`);
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
      
      // Short wait for block attestation — don't block for 10 minutes
      const targetHeight = await this.resolveSourceBlockHeight(sourceTxHash, chainKey);
      if (targetHeight) {
        try {
          await proofBuilder.waitUntilHeightAttested(chainKey, targetHeight, 5000, 60000, 3000);
          console.log(`[AttestcoinRelayer] Block #${targetHeight} confirmed attested in Prover cache!`);
        } catch {
          console.warn(`[AttestcoinRelayer] Block attestation wait timed out for #${targetHeight}, attempting proof with retries...`);
        }
      }

      // Retry proof generation (prover may still be indexing the block)
      let proofResult: any = null;
      for (let attempt = 1; attempt <= 10; attempt++) {
        proofResult = await proofBuilder.getProof(sourceTxHash);
        if (proofResult.success && proofResult.data) {
          console.log(`[AttestcoinRelayer] Deposit proof generated on attempt ${attempt}`);
          break;
        }
        if (attempt < 10) {
          const delay = Math.min(attempt * 5000, 30000); // 5s, 10s, 15s... max 30s
          console.log(`[AttestcoinRelayer] Deposit proof not ready yet, retrying in ${delay/1000}s (attempt ${attempt}/10)...`);
          await new Promise(r => setTimeout(r, delay));
        }
      }

      if (!proofResult?.success || !proofResult?.data) {
        throw new Error(`Deposit proof not available after 10 attempts. The Attestcoin Prover may not have indexed this block yet. Please try again in a few minutes.`);
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
   * Prove a cross-chain Ethereum Sepolia (chainKey: 1) loan funding transaction on Creditcoin CC3.
   * Cryptographically verifies the fundLoan() transaction via Attestcoin BlockProver (0xFD2),
   * validates token appraisal valuation against SAGToken, and updates loanInvestor/loanBalance on CC3.
   */
  public async proveAndFundLoanCrossChain(
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
      console.log(`[AttestcoinRelayer] Generating proof for Sepolia (chainKey ${chainKey}) Loan Funding Tx: ${sourceTxHash}`);
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

      const txBytes = proofData.txBytes;

      console.log(`[AttestcoinRelayer] Calling verifyAndFundLoanCrossChain for Token #${tokenId} on CC3 pool (${CREDITCOIN_CONFIG.contracts.liquidityPoolAddress})...`);
      const tx = await poolContract.verifyAndFundLoanCrossChain(
        tokenId,
        proofData.chainKey,
        proofData.headerNumber,
        txBytes,
        proofData.merkleProof,
        proofData.continuityProof,
        sourceTxHash
      );

      console.log(`[AttestcoinRelayer] Loan Funding Settlement broadcast Tx: ${tx.hash}. Awaiting confirmation...`);
      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        explorerUrl: `https://creditcoin-testnet.blockscout.com/tx/${receipt.hash}`,
      };
    } catch (err: any) {
      console.error(`[AttestcoinRelayer] Error proving Sepolia loan funding:`, err);
      return {
        success: false,
        error: err.message || 'Failed to submit loan funding proof to Creditcoin',
      };
    }
  }

  /**
   * Prove a cross-chain Ethereum Sepolia (chainKey: 1) investor return distribution transaction on Creditcoin CC3.
   * Cryptographically verifies the settleInvestor() transaction via Attestcoin BlockProver (0xFD2),
   * and updates returnDistributed / returnAmountDistributed on CC3 SanadLiquidityPool.
   */
  public async proveAndRecordReturnDistribution(
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
      console.log(`[AttestcoinRelayer] Generating proof for Sepolia (chainKey ${chainKey}) Return Distribution Tx: ${sourceTxHash}`);
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

      const txBytes = proofData.txBytes;

      console.log(`[AttestcoinRelayer] Calling verifyAndRecordReturnDistribution for Token #${tokenId} on CC3 pool (${CREDITCOIN_CONFIG.contracts.liquidityPoolAddress})...`);
      const tx = await poolContract.verifyAndRecordReturnDistribution(
        tokenId,
        proofData.chainKey,
        proofData.headerNumber,
        txBytes,
        proofData.merkleProof,
        proofData.continuityProof,
        sourceTxHash
      );

      console.log(`[AttestcoinRelayer] Return Distribution Settlement broadcast Tx: ${tx.hash}. Awaiting confirmation...`);
      const receipt = await tx.wait();

      // Update database status if loan_return row exists
      try {
        const { updateLoanReturnByTxHash } = await import('@/features/loan-return/loan-return.repository.js');
        await updateLoanReturnByTxHash(sourceTxHash, {
          cc3TxHash: receipt.hash,
          status: 'completed',
          distributedAt: new Date(),
        });
      } catch (dbErr: any) {
        console.warn('[AttestcoinRelayer] Could not update loan_return row:', dbErr.message);
      }

      return {
        success: true,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        explorerUrl: `https://creditcoin-testnet.blockscout.com/tx/${receipt.hash}`,
      };
    } catch (err: any) {
      console.error(`[AttestcoinRelayer] Error proving Sepolia return distribution:`, err);
      try {
        const { updateLoanReturnByTxHash } = await import('@/features/loan-return/loan-return.repository.js');
        await updateLoanReturnByTxHash(sourceTxHash, {
          status: 'failed',
        });
      } catch {}
      return {
        success: false,
        error: err.message || 'Failed to submit return distribution proof to Creditcoin',
      };
    }
  }

  /**
   * Prepare unsigned CC3 transaction data for pawnshop payment proof.
   * Returns the data needed for MetaMask to sign and submit on CC3.
   */
  public async preparePawnshopProof(
    sourceTxHash: string,
    chainKey: number = 1,
    borrowerAddress?: string,
  ): Promise<{
    success: boolean;
    unsignedTx?: {
      to: string;
      data: string;
      value: string;
    };
    proofData?: any;
    error?: string;
  }> {
    try {
      console.log(`[AttestcoinRelayer] Preparing unsigned CC3 proof for: ${sourceTxHash}`);

      const proofBuilder = new proofProvider.service.ProofBuilder(chainKey, this.proofApiUrl);

      // Get block height and try to get proof with retries
      const targetHeight = await this.resolveSourceBlockHeight(sourceTxHash, chainKey);
      if (targetHeight) {
        try {
          await proofBuilder.waitUntilHeightAttested(chainKey, targetHeight, 5000, 180000, 3000);
        } catch {
          console.warn(`[AttestcoinRelayer] Block attestation wait failed, attempting proof anyway`);
        }
      }

      // Retry proof generation
      let proofResult: any = null;
      for (let attempt = 1; attempt <= 5; attempt++) {
        proofResult = await proofBuilder.getProof(sourceTxHash);
        if (proofResult.success && proofResult.data) break;
        if (attempt < 5) await new Promise(r => setTimeout(r, attempt * 10000));
      }

      if (!proofResult?.success || !proofResult?.data) {
        throw new Error('Proof not available yet. Please try again in a few minutes.');
      }

      const proofData = proofResult.data;
      const sourceEthWei = await this.resolveSourceTxValue(sourceTxHash, chainKey);
      const volumeUSD = Number(ethers.formatEther(sourceEthWei)) * 2700;

      const borrower = borrowerAddress || ethers.ZeroAddress;

      // Encode the submitSingleProof call
      const iface = new ethers.Interface(SANAD_CREDIT_ORACLE_ABI);
      const txData = iface.encodeFunctionData('submitSingleProof', [
        proofData.chainKey,
        proofData.headerNumber,
        proofData.txBytes,
        proofData.merkleProof,
        proofData.continuityProof,
        borrower,
        {
          sourceTxHash: sourceTxHash,
          protocol: 0,
          eventType: 0,
          volumeUSD: ethers.parseUnits(Math.round(volumeUSD).toString(), 6),
          timestamp: Math.floor(Date.now() / 1000),
        },
        '0x',
      ]);

      return {
        success: true,
        unsignedTx: {
          to: this.oracleContractAddress,
          data: txData,
          value: '0x0',
        },
        proofData: {
          sourceTxHash,
          borrower,
          volumeUSD: Math.round(volumeUSD),
          chainKey: proofData.chainKey,
          headerNumber: proofData.headerNumber,
        },
      };
    } catch (err: any) {
      console.error('[AttestcoinRelayer] Error preparing pawnshop proof:', err);
      return { success: false, error: err.message };
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
          await proofBuilder.waitUntilHeightAttested(chainKey, targetHeight, 5000, 180000, 3000);
          console.log(`[AttestcoinRelayer] Block #${targetHeight} attested!`);
        } catch (waitErr: any) {
          console.warn(`[AttestcoinRelayer] Block attestation wait failed, retrying proof generation:`, waitErr.message);
        }
      }

      // Retry proof generation with exponential backoff (up to 5 attempts)
      let proofResult: any = null;
      const maxAttempts = 5;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        console.log(`[AttestcoinRelayer] Proof attempt ${attempt}/${maxAttempts} for tx ${sourceTxHash}`);
        proofResult = await proofBuilder.getProof(sourceTxHash);
        if (proofResult.success && proofResult.data) {
          console.log(`[AttestcoinRelayer] Proof generated successfully on attempt ${attempt}`);
          break;
        }
        if (attempt < maxAttempts) {
          const delayMs = attempt * 10000; // 10s, 20s, 30s, 40s
          console.log(`[AttestcoinRelayer] Proof not ready, waiting ${delayMs / 1000}s before retry...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }

      if (!proofResult?.success || !proofResult?.data) {
        throw new Error(`Proof generation failed after ${maxAttempts} attempts for tx ${sourceTxHash}. Please try again later.`);
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
