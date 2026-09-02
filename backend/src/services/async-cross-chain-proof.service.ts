import { Job } from 'bullmq';
import { AttestcoinOracleRelayerService } from '../core/credit-bureau/attestcoin-oracle-relayer.service.js';
import { getSocketService } from './socket.service.js';

export type CrossChainProofJobType = 'deposit' | 'repayment' | 'loan-funding' | 'pawnshop-payment';

export interface CrossChainProofJobData {
  type: CrossChainProofJobType;
  sourceTxHash: string;
  chainKey?: number;
  tokenId?: number;
  borrowerAddress?: string;
  userId?: string;
}

export interface CrossChainProofResult {
  success: boolean;
  type: CrossChainProofJobType;
  sourceTxHash: string;
  transactionHash?: string;
  cc3TxHash?: string;
  blockNumber?: number;
  explorerUrl?: string;
  error?: string;
}

const relayerService = new AttestcoinOracleRelayerService();

export async function processCrossChainProofJob(
  job: Job<CrossChainProofJobData>
): Promise<CrossChainProofResult> {
  const { type, sourceTxHash, chainKey = 1, tokenId, borrowerAddress, userId } = job.data;
  
  let socketService: any = null;
  try {
    socketService = getSocketService();
  } catch {}

  console.log(`[${new Date().toISOString()}] [BullMQ] Processing cross-chain proof job #${job.id} (type: ${type}, sourceTx: ${sourceTxHash}) attempt ${job.attemptsMade + 1}`);

  try {
    // Stage 1: Initiating & Resolving Block Height (15%)
    await updateProgress(job, socketService, userId, 'resolving_block', 15, `Resolving block height for source tx ${sourceTxHash.slice(0, 10)}...`);

    // Stage 2: Waiting for Attestation & Generating Attestcoin Proof (45%)
    await updateProgress(job, socketService, userId, 'fetching_proof', 45, 'Verifying Attestcoin cryptographic attestation and generating Merkle proof...');

    let result: any = null;

    switch (type) {
      case 'deposit': {
        // Stage 3: Broadcasting Settlement Tx on CC3 (75%)
        await updateProgress(job, socketService, userId, 'submitting_to_cc3', 75, 'Submitting deposit proof to CC3 SanadLiquidityPool (verifyAndRecordDeposit)...');
        result = await relayerService.proveAndRecordSepoliaDeposit(sourceTxHash, Number(chainKey));
        break;
      }

      case 'repayment': {
        if (!tokenId) {
          throw new Error('tokenId is required for repayment proof settlement');
        }
        await updateProgress(job, socketService, userId, 'submitting_to_cc3', 75, `Submitting repayment proof for Token #${tokenId} to CC3 SanadLiquidityPool (verifyAndSettleRepayment)...`);
        result = await relayerService.proveAndSettleSepoliaRepayment(Number(tokenId), sourceTxHash, Number(chainKey));
        break;
      }

      case 'loan-funding': {
        if (!tokenId) {
          throw new Error('tokenId is required for loan funding proof settlement');
        }
        await updateProgress(job, socketService, userId, 'submitting_to_cc3', 75, `Submitting loan funding proof for Token #${tokenId} to CC3 SanadLiquidityPool (verifyAndFundLoanCrossChain)...`);
        result = await relayerService.proveAndFundLoanCrossChain(Number(tokenId), sourceTxHash, Number(chainKey));
        break;
      }

      case 'pawnshop-payment': {
        await updateProgress(job, socketService, userId, 'submitting_to_cc3', 75, 'Submitting pawnshop payment proof to CC3 SanadCreditOracle...');
        result = await relayerService.provePawnshopPayment(sourceTxHash, Number(chainKey), borrowerAddress);
        break;
      }

      default:
        throw new Error(`Unsupported cross-chain proof job type: ${type}`);
    }

    if (!result || !result.success) {
      const errMsg = result?.error || 'Unknown error occurred during proof verification';
      console.warn(`[BullMQ] Proof attempt failed for job #${job.id}: ${errMsg}`);
      throw new Error(errMsg);
    }

    const txHash = result.transactionHash || result.cc3TxHash || '';

    // Stage 4: Confirmed & Completed (100%)
    await updateProgress(job, socketService, userId, 'complete', 100, `Cross-chain ${type} proof verified and settled on Creditcoin CC3! Tx: ${txHash.slice(0, 14)}...`);

    return {
      success: true,
      type,
      sourceTxHash,
      transactionHash: txHash,
      cc3TxHash: txHash,
      blockNumber: result.blockNumber,
      explorerUrl: result.explorerUrl || `https://creditcoin-testnet.blockscout.com/tx/${txHash}`,
    };
  } catch (error: any) {
    console.error(`[BullMQ] Error in cross-chain proof job #${job.id} (attempt ${job.attemptsMade + 1}):`, error.message);
    try {
      if (socketService?.io && userId) {
        socketService.io.to(`user-${userId}`).emit('creditcoin:proof_error', {
          type,
          sourceTxHash,
          error: error.message,
        });
      }
    } catch {}
    // Re-throw so BullMQ triggers native retry/backoff
    throw error;
  }
}

async function updateProgress(
  job: Job,
  socketService: any,
  userId: string | undefined,
  stage: string,
  progress: number,
  message: string
) {
  await job.updateProgress(progress);
  try {
    if (socketService?.io) {
      const payload = {
        jobId: job.id,
        stage,
        progress,
        message,
        timestamp: new Date().toISOString(),
      };
      socketService.io.emit('creditcoin:proof_progress', payload);
      if (userId) {
        socketService.io.to(`user-${userId}`).emit('creditcoin:proof_progress', payload);
      }
    }
  } catch {}
}
