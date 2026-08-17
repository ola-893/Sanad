import { AttestcoinRelayerService, RelayerProofResult } from '../features/creditcoin/attestcoin-relayer.service.js';
import { getSocketService } from './socket.service.js';

export interface RepaymentJobState {
  jobId: string;
  tokenId: string;
  sourceTxHash: string;
  repaidAmountUSD: number;
  userId?: string;
  status: 'QUEUED' | 'WAITING_FOR_ATTESTATION' | 'GENERATING_PROOF' | 'SUBMITTING_ON_CHAIN' | 'COMPLETED' | 'FAILED';
  progress: number;
  currentMessage: string;
  result?: RelayerProofResult;
  createdAt: string;
  completedAt?: string;
}

const relayerService = new AttestcoinRelayerService();
const activeRepaymentJobs = new Map<string, RepaymentJobState>();

/**
 * Initiates an asynchronous background worker task for Attestcoin proof generation & settlement.
 * Returns immediately with a jobId so HTTP API endpoints never block or timeout.
 */
export function queueAsyncAttestcoinRepayment(params: {
  tokenId: string;
  sourceTxHash: string;
  repaidAmountUSD: number;
  userId?: string;
  sourceEvmChainId?: number;
}): { jobId: string; status: string } {
  const jobId = `repay-${Date.now()}-${params.tokenId}`;
  let socketService: any = null;
  try {
    socketService = getSocketService();
  } catch (e) {}

  const jobState: RepaymentJobState = {
    jobId,
    tokenId: params.tokenId,
    sourceTxHash: params.sourceTxHash,
    repaidAmountUSD: params.repaidAmountUSD,
    userId: params.userId,
    status: 'QUEUED',
    progress: 5,
    currentMessage: 'Repayment job queued for background Attestcoin proof processing',
    createdAt: new Date().toISOString(),
  };

  activeRepaymentJobs.set(jobId, jobState);

  // Trigger background execution without awaiting
  (async () => {
    try {
      console.log(`[AsyncRepayment] Starting background worker for Job ${jobId}`);

      const result = await relayerService.relayAndSettleRepayment(
        {
          tokenId: params.tokenId,
          sourceTxHash: params.sourceTxHash,
          repaidAmountUSD: params.repaidAmountUSD,
          sourceEvmChainId: params.sourceEvmChainId,
        },
        (stage, progress, message) => {
          jobState.progress = progress;
          jobState.currentMessage = message;
          if (stage === 'waiting_for_attestation') jobState.status = 'WAITING_FOR_ATTESTATION';
          else if (stage === 'generating_proof') jobState.status = 'GENERATING_PROOF';
          else if (stage === 'submitting_to_creditcoin') jobState.status = 'SUBMITTING_ON_CHAIN';

          if (params.userId && socketService?.io) {
            socketService.io.to(`user-${params.userId}`).emit('creditcoin:repayment_progress', {
              jobId,
              tokenId: params.tokenId,
              stage,
              progress,
              message,
            });
          }
        }
      );

      if (result.success) {
        jobState.status = 'COMPLETED';
        jobState.progress = 100;
        jobState.currentMessage = 'Repayment cryptographically verified by BlockProver (0xFD2) and settled on Creditcoin';
        jobState.result = result;
        jobState.completedAt = new Date().toISOString();

        if (params.userId && socketService?.io) {
          socketService.io.to(`user-${params.userId}`).emit('creditcoin:repayment_complete', jobState);
        }
      } else {
        jobState.status = 'FAILED';
        jobState.currentMessage = result.error || 'Proof verification failed';
        jobState.result = result;
        jobState.completedAt = new Date().toISOString();

        if (params.userId && socketService?.io) {
          socketService.io.to(`user-${params.userId}`).emit('creditcoin:repayment_failed', jobState);
        }
      }
    } catch (err: any) {
      console.error(`[AsyncRepayment] Job ${jobId} failed with exception:`, err);
      jobState.status = 'FAILED';
      jobState.currentMessage = err.message;
      jobState.completedAt = new Date().toISOString();

      if (params.userId && socketService?.io) {
        socketService.io.to(`user-${params.userId}`).emit('creditcoin:repayment_failed', jobState);
      }
    }
  })();

  return { jobId, status: 'QUEUED' };
}

export function getRepaymentJobStatus(jobId: string): RepaymentJobState | undefined {
  return activeRepaymentJobs.get(jobId);
}
