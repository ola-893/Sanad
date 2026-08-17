import { ethers } from 'ethers';
import { proofProvider } from '@gluwa/usc-sdk';
import { CreditcoinClient } from './creditcoin.client.js';
import { CREDITCOIN_CONFIG } from './creditcoin.config.js';
import { SANAD_LIQUIDITY_POOL_ABI } from './contracts/SanadLiquidityPool.abi.js';

export interface RelayerProofResult {
  success: boolean;
  blockHeight?: number;
  creditcoinTxHash?: string;
  sourceTxHash?: string;
  settledAmount?: string;
  error?: string;
}

export class AttestcoinRelayerService {
  private client: CreditcoinClient;
  private poolAddress: string;

  constructor() {
    this.client = CreditcoinClient.getInstance();
    this.poolAddress = CREDITCOIN_CONFIG.contracts.liquidityPoolAddress;
  }

  private getPoolContract(): ethers.Contract {
    const adminWallet = this.client.getAdminWallet();
    return new ethers.Contract(this.poolAddress, SANAD_LIQUIDITY_POOL_ABI, adminWallet);
  }

  /**
   * Generates a cryptographic Merkle + Continuity proof for a Sepolia repayment
   * and submits it to Creditcoin to synchronously execute the BlockProver precompile (0xFD2).
   * 
   * @param params.tokenId - The SAG gold collateral NFT token ID
   * @param params.sourceTxHash - The transaction hash on Ethereum Sepolia
   * @param params.repaidAmountUSD - The repayment amount in USD
   * @param params.sourceEvmChainId - Optional source chain EVM ID (defaults to Sepolia: 11155111)
   * @param onProgress - Optional callback to report step progress (e.g. for background jobs/websockets)
   */
  public async relayAndSettleRepayment(
    params: {
      tokenId: string;
      sourceTxHash: string;
      repaidAmountUSD: number;
      sourceEvmChainId?: number;
    },
    onProgress?: (stage: string, progress: number, message: string) => void
  ): Promise<RelayerProofResult> {
    try {
      // 1. Resolve source chain & Creditcoin-internal chainKey
      const sourceChainId = params.sourceEvmChainId || CREDITCOIN_CONFIG.sourceChain.chainId;
      const chainKey = await this.client.resolveChainKey(sourceChainId);

      onProgress?.('resolving_tx', 15, `Resolved chainKey ${chainKey} for source chainId ${sourceChainId}. Inspecting source tx...`);
      console.log(`[Attestcoin] Processing repayment for tokenId #${params.tokenId}, sourceTx: ${params.sourceTxHash} (chainKey: ${chainKey})`);

      // 2. Query source transaction on Ethereum Sepolia
      const sourceProvider = this.client.getSourceProvider();
      const tx = await sourceProvider.getTransaction(params.sourceTxHash);
      if (!tx || !tx.blockNumber) {
        throw new Error(`Source transaction ${params.sourceTxHash} not found or not yet mined on Sepolia`);
      }

      const blockNumber = tx.blockNumber;
      console.log(`[Attestcoin] Source transaction mined at block height ${blockNumber}. Connecting to Attestcoin Prover at ${CREDITCOIN_CONFIG.proverUrl}...`);

      // 3. Initialize official @gluwa/usc-sdk ProofBuilder
      const proofBuilder = new proofProvider.service.ProofBuilder(
        chainKey,
        CREDITCOIN_CONFIG.proverUrl,
        5000 // request timeout in ms
      );

      // 4. Wait for Creditcoin validators to attest the source-chain block
      onProgress?.('waiting_for_attestation', 40, `Waiting for Creditcoin validators to attest Sepolia block ${blockNumber}...`);
      console.log(`[Attestcoin] Calling waitUntilHeightAttested(chainKey: ${chainKey}, blockNumber: ${blockNumber})...`);
      
      await proofBuilder.waitUntilHeightAttested(chainKey, blockNumber);
      console.log(`[Attestcoin] Block ${blockNumber} is verified and attested on Creditcoin! Generating inclusion proof...`);

      // 5. Fetch inclusion proof from ProofBuilder
      onProgress?.('generating_proof', 65, `Block ${blockNumber} attested. Generating Merkle + Continuity proofs...`);
      const proofResult = await proofBuilder.getProof(params.sourceTxHash);
      
      if (!proofResult.success || !proofResult.data) {
        throw new Error(`Proof generation failed: ${proofResult.error || 'Unknown error'}`);
      }

      const proofData = proofResult.data;
      console.log(`[Attestcoin] Proof generated successfully: Header #${proofData.headerNumber}, txBytes length: ${proofData.txBytes.length}`);

      // 6. Submit proof payload to SanadLiquidityPool on CC3
      onProgress?.('submitting_to_creditcoin', 85, 'Submitting cryptographic proof to Creditcoin SanadLiquidityPool contract...');
      
      const poolContract = this.getPoolContract();
      const repaidScaled = ethers.parseUnits(params.repaidAmountUSD.toString(), 6);
      const sourceTxHashBytes32 = ethers.hexlify(ethers.toBeArray(params.sourceTxHash));

      const submitTx = await poolContract.verifyAndSettleRepayment(
        params.tokenId,
        proofData.chainKey,
        proofData.headerNumber,
        proofData.txBytes,
        proofData.merkleProof,
        proofData.continuityProof,
        sourceTxHashBytes32,
        repaidScaled
      );

      console.log(`[Attestcoin] Settlement transaction broadcast to CC3: ${submitTx.hash}. Awaiting confirmation...`);
      const receipt = await submitTx.wait();

      console.log(`[Attestcoin] Repayment verified and settled on Creditcoin in block ${receipt.blockNumber}!`);
      onProgress?.('settled', 100, `Repayment settled! Creditcoin tx: ${receipt.hash}`);

      return {
        success: true,
        blockHeight: proofData.headerNumber,
        creditcoinTxHash: receipt.hash,
        sourceTxHash: params.sourceTxHash,
        settledAmount: params.repaidAmountUSD.toString(),
      };
    } catch (error: any) {
      console.error('[Attestcoin] Relayer and settlement error:', error);
      return {
        success: false,
        sourceTxHash: params.sourceTxHash,
        error: error.message || 'Failed to verify and settle Attestcoin repayment on Creditcoin',
      };
    }
  }

  /**
   * Verifies if a source transaction has already been settled on Creditcoin
   */
  public async isTransactionProcessed(sourceTxHash: string): Promise<boolean> {
    try {
      const poolContract = new ethers.Contract(
        this.poolAddress,
        SANAD_LIQUIDITY_POOL_ABI,
        this.client.getCreditcoinProvider()
      );
      const sourceTxHashBytes32 = ethers.hexlify(ethers.toBeArray(sourceTxHash));
      return await poolContract.processedSourceTransactions(sourceTxHashBytes32);
    } catch (error) {
      console.error('[Attestcoin] Error checking processed transaction status:', error);
      return false;
    }
  }
}
